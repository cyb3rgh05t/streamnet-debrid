package com.arflix.tv.ui.screens.collections

import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.repository.MarvelWatchlistTimeline
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CollectionGridEntriesTest {
    @Test
    fun `timeline labels localize UI terms without changing titles or episode ranges`() {
        assertEquals("[Movie] Iron Man", localizedTimelineLabel("[Film] Iron Man", "Movie", "Episodes"))
        val label = "[TV] Agents of S.H.I.E.L.D. (Season 1) - Folgen 1–16"
        assertEquals(
            "[TV] Agents of S.H.I.E.L.D. (Season 1) - Episodes 1–16",
            localizedTimelineLabel(label, "Movie", "Episodes")
        )
        assertEquals(label, localizedTimelineLabel(label, "Film", "Folgen"))
        val german = MarvelWatchlistTimeline.sections.values.toList()
        german.forEach { assertEquals(it, localizedTimelineSection(it, german)) }
        val translated = german.indices.map { "English section $it" }
        german.forEachIndexed { index, title ->
            assertEquals(translated[index], localizedTimelineSection(title, translated))
        }
    }

    private fun cards() = MarvelWatchlistTimeline.entries.mapIndexed { position, entry ->
        MarvelWatchlistTimeline.decorate(
            MediaItem(id = entry.tmdbId, title = entry.label, mediaType = entry.mediaType),
            position
        )
    }

    @Test
    fun `all website sections appear once without changing the 168 card order`() {
        val cards = cards()
        val rows = collectionGridEntries(cards)
        val headings = rows.filterIsInstance<CollectionGridEntry.Heading>()
        assertEquals(15, headings.size)
        assertEquals(MarvelWatchlistTimeline.sections.values.toList(), headings.map { it.title })
        assertEquals(cards, rows.filterIsInstance<CollectionGridEntry.Card>().map { it.item })
        assertEquals(183, rows.map { it.key }.distinct().size)
        assertEquals("Vermächtnis: WKII & die 1940er", headings.first().title)
        assertEquals("Phase 6 — Doomsday (2026)", headings.last().title)
    }

    @Test
    fun `restored card grid positions account for every preceding heading`() {
        val cards = cards()
        val rows = collectionGridEntries(cards)
        cards.indices.forEach { index ->
            val row = rows[collectionCardGridIndex(cards, index) - 2]
            assertTrue(row is CollectionGridEntry.Card)
            assertEquals(index, (row as CollectionGridEntry.Card).mediaIndex)
        }
        assertEquals(3, collectionCardGridIndex(cards, 0))
        assertEquals(8, collectionCardGridIndex(cards, 4))
        assertEquals(184, collectionCardGridIndex(cards, 167))
        assertEquals(4, collectionFirstRowCount(cards, 6))
        assertEquals(3, collectionFirstRowCount(cards, 3))
    }

    @Test
    fun `pagination inside a section does not repeat headings when appended`() {
        val cards = cards()
        assertEquals(2, collectionGridEntries(cards.take(8)).filterIsInstance<CollectionGridEntry.Heading>().size)
        assertEquals(2, collectionGridEntries(cards.take(12)).filterIsInstance<CollectionGridEntry.Heading>().size)
        assertEquals(3, collectionGridEntries(cards.take(14)).filterIsInstance<CollectionGridEntry.Heading>().size)
    }

    @Test
    fun `other collections keep flat grid and original scroll offsets`() {
        val cards = (1..20).map { MediaItem(id = it, title = "Film $it") }
        assertTrue(collectionGridEntries(cards).all { it is CollectionGridEntry.Card })
        cards.indices.forEach { assertEquals(it + 2, collectionCardGridIndex(cards, it)) }
        assertEquals(6, collectionFirstRowCount(cards, 6))
    }
}
