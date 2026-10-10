package com.arflix.tv.data.repository

import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.model.CollectionSourceKind
import com.arflix.tv.data.model.collectionCardKey
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.security.MessageDigest

class MarvelWatchlistTimelineTest {
    @Test
    fun `metadata failure in phase four does not block later phases or consume missing cards`() {
        val cards = MarvelWatchlistTimeline.entries.indices.map { position ->
            val entry = MarvelWatchlistTimeline.entries[position]
            val metadata = if (position >= 122) null else MediaItem(
                id = entry.tmdbId, title = "Metadata", mediaType = entry.mediaType
            )
            MarvelWatchlistTimeline.card(metadata, position)
        }
        assertEquals(168, cards.size)
        assertEquals((0 until 168).toList(), cards.map { it.sourceOrder })
        assertTrue(cards.drop(122).all { it.timelineMetadataUnavailable })
        assertEquals("[Film] AVENGERS: DOOMSDAY", cards.last().title)
        assertEquals(1003596, cards.last().id)
        assertTrue(cards.none { it.isPlaceholder })
    }

    @Test
    fun `complete labels match the reviewed website snapshot byte for byte`() {
        val labels = MarvelWatchlistTimeline.entries.joinToString("\n") { it.label }
        val digest = MessageDigest.getInstance("SHA-256")
            .digest(labels.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
        assertEquals("fbccfd4dcc03d78ac65c459e9c5ecf0d2ecafc0509daeb510570dcb3bea4a67b", digest)
    }

    @Test
    fun `all 168 entries survive pagination and card deduplication`() {
        var offset = 0
        var limit = 8
        val loaded = mutableListOf<MediaItem>()
        do {
            val page = MarvelWatchlistTimeline.page(offset, limit)
            val existingKeys = loaded.mapTo(HashSet()) { it.collectionCardKey }
            val cards = page.map { (position, entry) ->
                MarvelWatchlistTimeline.decorate(
                    MediaItem(id = entry.tmdbId, title = "Localized title", mediaType = entry.mediaType),
                    position
                )
            }
            loaded += cards.filter { it.collectionCardKey !in existingKeys }
            offset = collectionPageNextOffset(offset, page.size)
            limit = 12
        } while (offset < MarvelWatchlistTimeline.entries.size)

        assertEquals(168, loaded.size)
        assertEquals(168, loaded.map { it.collectionCardKey }.distinct().size)
        assertEquals((0 until 168).toList(), loaded.map { it.sourceOrder })
        assertEquals(MarvelWatchlistTimeline.entries.map { it.label }, loaded.map { it.title })
        assertTrue(MarvelWatchlistTimeline.page(offset, limit).isEmpty())
    }

    @Test
    fun `MD labels retain type seasons and all six episode blocks`() {
        val entries = MarvelWatchlistTimeline.entries
        assertEquals("[Film] Captain America: The First Avenger", entries.first().label)
        assertEquals("[Film] AVENGERS: DOOMSDAY", entries.last().label)
        val expected = mapOf(
            52 to "[TV] Agents of S.H.I.E.L.D. (Season 1) - Folgen 1–16",
            55 to "[TV] Agents of S.H.I.E.L.D. (Season 1) - Folgen 17–22",
            58 to "[TV] Agents of S.H.I.E.L.D. (Season 2) - Folgen 1–19",
            62 to "[TV] Agents of S.H.I.E.L.D. (Season 2) - Folgen 20–22",
            65 to "[TV] Agents of S.H.I.E.L.D. (Season 3) - Folgen 1–19",
            69 to "[TV] Agents of S.H.I.E.L.D. (Season 3) - Folgen 20–22"
        )
        expected.forEach { (position, label) -> assertEquals(label, entries[position - 1].label) }
        assertEquals(6, entries.count { " - Folgen " in it.label })
        assertTrue(entries.all { it.tmdbId > 0 })
    }

    @Test
    fun `credits and season cards keep real navigation identity and canonical metadata unchanged`() {
        val positions = listOf(0, 43, 45, 46, 108, 109, 114, 122)
        positions.forEach { position ->
            val entry = MarvelWatchlistTimeline.entries[position]
            val canonical = MediaItem(
                id = entry.tmdbId, title = "Canonical title", mediaType = entry.mediaType,
                image = "poster", overview = "overview", isWatched = true
            )
            val card = MarvelWatchlistTimeline.decorate(canonical, position)
            assertEquals(canonical.id, card.id)
            assertEquals(canonical.mediaType, card.mediaType)
            assertEquals(canonical.image, card.image)
            assertEquals(canonical.overview, card.overview)
            assertTrue(card.isWatched)
            assertEquals("Canonical title", canonical.title)
            assertNull(canonical.timelineEntryId)
        }
        assertEquals(10138, MarvelWatchlistTimeline.entries[43].tmdbId)
        assertEquals(1771, MarvelWatchlistTimeline.entries[45].tmdbId)
        assertEquals(MediaType.TV, MarvelWatchlistTimeline.entries[114].mediaType)
        assertEquals(85271, MarvelWatchlistTimeline.entries[114].tmdbId)
    }

    @Test
    fun `Marvel replaces only timeline source and excludes legacy fallbacks from timeline tab`() {
        val defaults = MediaRepository.buildPreinstalledDefaults()
        val marvel = defaults.single { it.title == "Marvel" }
        val timeline = MarvelWatchlistTimeline.catalogForTimeline(marvel)!!
        assertEquals(1, timeline.collectionSources.size)
        assertEquals(CollectionSourceKind.MARVEL_WATCHLIST_TIMELINE, timeline.collectionSources.single().kind)
        assertTrue(marvel.collectionSources.any { it.collectionTab == "movie" && it.addonCatalogId == "movies" })
        assertTrue(marvel.collectionSources.any { it.collectionTab == "series" && it.addonCatalogId == "series" })
        for (title in listOf("DC Universe", "Star Wars", "Harry Potter")) {
            assertNull(MarvelWatchlistTimeline.catalogForTimeline(defaults.single { it.title == title }))
        }
    }
}
