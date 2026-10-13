package com.arflix.tv.data.repository

import com.arflix.tv.data.model.CatalogConfig
import com.arflix.tv.data.model.CatalogSourceType
import com.arflix.tv.data.model.CollectionGroupKind
import com.arflix.tv.data.model.CollectionSourceConfig
import com.arflix.tv.data.model.CollectionSourceKind
import com.arflix.tv.data.model.MediaType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

class CollectionOrderingTest {
    @Test
    fun `Marvel IMDb lookup accepts Punisher movie despite the addon declaring a series`() {
        val response = com.google.gson.Gson().fromJson(
            """{"movie_results":[{"id":1439930,"popularity":38.28,"title":"The Punisher: One Last Kill"}],"tv_results":[]}""",
            com.arflix.tv.data.api.TmdbFindResponse::class.java
        )
        val meta = com.arflix.tv.data.api.StremioMetaPreview(
            id = "tt36042156", name = "The Punisher: One Last Kill", type = "series"
        )
        val ref = marvelTimelineImdbRef(response)
        assertEquals(MediaType.MOVIE to 1439930, ref)
        assertEquals(MediaType.MOVIE, marvelAddonTimelineCard(meta, ref, 83).mediaType)
        assertFalse(marvelAddonTimelineCard(meta, ref, 83).timelineMetadataUnavailable)
        assertNull(marvelTimelineImdbRef(com.arflix.tv.data.api.TmdbFindResponse()))
    }

    @Test
    fun `all 87 real addon entries keep their order and separate season cards across pages`() {
        val resource = requireNotNull(javaClass.getResourceAsStream("/marvel-addon-timeline.json"))
        val response = resource.bufferedReader().use {
            com.google.gson.Gson().fromJson(
                it,
                com.arflix.tv.data.api.StremioCatalogResponse::class.java
            )
        }
        val metas = requireNotNull(response.metas)
        assertEquals(87, metas.size)
        val cards = metas.withIndex().chunked(12).flatMap { page ->
            page.map { (position, meta) ->
                val type = if (meta.type == "series") MediaType.TV else MediaType.MOVIE
                val ref = meta.tmdbId?.toIntOrNull()?.let { type to it }
                marvelAddonTimelineCard(meta, ref, position)
            }
        }
        assertEquals(metas.map { it.name }, cards.map { it.title })
        assertEquals((0 until 87).toList(), cards.map { it.sourceOrder })
        assertEquals(87, cards.map { it.timelineEntryId }.distinct().size)
        assertEquals(87, cards.distinctBy { it.timelineEntryId }.size)
        assertEquals(
            listOf("Eyes of Wakanda", "Captain America: The First Avenger",
                "Marvel One-Shot: Agent Carter", "Marvel's Agent Carter", "Captain Marvel"),
            cards.take(5).map { it.title }
        )
        assertTrue(cards.any { it.timelineMetadataUnavailable })
        assertTrue(cards.all { it.backdrop == null })
    }

    @Test
    fun `repeated resolved series keep separate keys and landscape artwork does not replace addon labels`() {
        val meta = com.arflix.tv.data.api.StremioMetaPreview(
            id = "tt3322312", type = "series", name = "Daredevil – Staffel 2", poster = "portrait"
        )
        val details = com.arflix.tv.data.model.MediaItem(
            id = 61889, title = "Canonical title", mediaType = MediaType.TV, backdrop = "landscape"
        )
        val first = marvelAddonTimelineCard(meta, MediaType.TV to 61889, 10, details)
        val second = marvelAddonTimelineCard(meta, MediaType.TV to 61889, 20, details)
        assertEquals("landscape", first.backdrop)
        assertEquals(meta.name, first.title)
        assertEquals(2, listOf(first, second).distinctBy { it.timelineEntryId }.size)
        assertEquals(first.id, second.id)
    }

    @Test
    fun `Marvel camel case TMDB ids deserialize and addon cards retain exact metadata`() {
        val meta = com.google.gson.Gson().fromJson(
            """{"id":"tt3067038","type":"movie","name":"Marvel One-Shot: Agent Carter","tmdbId":211387,"poster":"addon-poster","description":"addon-description","releaseInfo":"2013"}""",
            com.arflix.tv.data.api.StremioMetaPreview::class.java
        )
        assertEquals("211387", meta.tmdbId)
        val card = marvelAddonTimelineCard(meta, MediaType.MOVIE to 211387, 2)
        assertEquals(211387, card.id)
        assertEquals("Marvel One-Shot: Agent Carter", card.title)
        assertEquals("addon-poster", card.image)
        assertEquals("addon-description", card.overview)
        assertEquals(2, card.sourceOrder)
        assertEquals("2013", card.year)
        val snakeCase = com.google.gson.Gson().fromJson(
            """{"tmdb_id":"1771"}""",
            com.arflix.tv.data.api.StremioMetaPreview::class.java
        )
        assertEquals("1771", snakeCase.tmdbId)
    }

    @Test
    fun `marvelAddonTimelineCard prefers meta released but falls back to details releaseDate`() {
        val metaWithoutReleased = com.arflix.tv.data.api.StremioMetaPreview(
            id = "tt0458339", type = "movie", name = "Captain America: The First Avenger", releaseInfo = "2011"
        )
        val details = com.arflix.tv.data.model.MediaItem(
            id = 1771, title = "Captain America: The First Avenger", mediaType = MediaType.MOVIE, releaseDate = "22 Jul 2011"
        )
        val card = marvelAddonTimelineCard(metaWithoutReleased, MediaType.MOVIE to 1771, 0, details)
        assertEquals("22 Jul 2011", card.releaseDate)
        assertEquals("2011", card.year)

        val metaWithReleased = com.arflix.tv.data.api.StremioMetaPreview(
            id = "tt0458339", type = "movie", name = "Captain America: The First Avenger", released = "2011-07-22T00:00:00.000Z"
        )
        val cardWithMeta = marvelAddonTimelineCard(metaWithReleased, MediaType.MOVIE to 1771, 0, details)
        assertEquals("2011-07-22T00:00:00.000Z", cardWithMeta.releaseDate)
    }

    @Test
    fun `mixed direct and IMDb resolved Marvel entries keep the addon order`() {
        val wakanda = MediaType.TV to 283378
        val captainAmerica = MediaType.MOVIE to 1771
        val agentCarterShort = MediaType.MOVIE to 211387
        val agentCarterSeries = MediaType.TV to 61550
        val captainMarvel = MediaType.MOVIE to 299537
        assertEquals(
            listOf(wakanda, captainAmerica, agentCarterShort, agentCarterSeries, captainMarvel),
            mergeAddonRefsInCatalogOrder(
                direct = listOf(null, captainAmerica, agentCarterShort, null, captainMarvel),
                resolved = listOf(wakanda, null, null, agentCarterSeries, null)
            )
        )
    }

    @Test
    fun `unresolved entries and duplicate refs do not reorder later addon titles`() {
        val movie = MediaType.MOVIE to 1771
        val series = MediaType.TV to 61550
        assertEquals(
            listOf(movie, series),
            mergeAddonRefsInCatalogOrder(
                direct = listOf(movie, null, null, movie),
                resolved = listOf(null, null, series, null)
            )
        )
    }

    @Test
    fun `only franchise movie and series sources use release ordering`() {
        val catalog = CatalogConfig(
            id = "franchise",
            title = "Franchise",
            sourceType = CatalogSourceType.PREINSTALLED,
            collectionGroup = CollectionGroupKind.FRANCHISE,
            collectionSources = listOf(
                CollectionSourceConfig(kind = CollectionSourceKind.ADDON_CATALOG, collectionTab = "movie"),
                CollectionSourceConfig(kind = CollectionSourceKind.ADDON_CATALOG, collectionTab = "series")
            )
        )
        assertTrue(usesFranchiseReleaseOrder(catalog))
        for (group in CollectionGroupKind.entries.filter { it != CollectionGroupKind.FRANCHISE }) {
            assertFalse(usesFranchiseReleaseOrder(catalog.copy(collectionGroup = group)))
        }
        assertFalse(usesFranchiseReleaseOrder(catalog.copy(
            collectionSources = listOf(
                CollectionSourceConfig(kind = CollectionSourceKind.ADDON_CATALOG, collectionTab = "timeline")
            )
        )))
    }

    @Test
    fun `API and cached display dates resolve to the same day`() {
        val expected = LocalDate.of(2025, 1, 12)
        assertEquals(expected, collectionReleaseDate("2025-01-12"))
        assertEquals(expected, collectionReleaseDate("12 Jan 2025"))
        assertEquals(expected, collectionReleaseDate("12.01.2025"))
        assertEquals(expected, collectionReleaseDate("2025-01-12", "2000"))
        assertEquals(LocalDate.of(2024, 1, 1), collectionReleaseDate(null, "2024"))
        assertNull(collectionReleaseDate(""))
        assertNull(collectionReleaseDate("invalid", "invalid"))
    }

    @Test
    fun `release order is oldest first across page boundary and beyond old 32 item lookahead`() {
        val refs = (1..40).map { MediaType.MOVIE to it } + (MediaType.TV to 41)
        val dates = refs.associateWith { LocalDate.of(2000 + it.second, 1, 1) }
        val sorted = sortFranchiseReleaseRefs(refs.reversed(), dates)
        assertEquals(refs, sorted)
        val paged = sorted.chunked(8).flatten()
        assertEquals(refs, paged)
        assertEquals(MediaType.TV to 41, paged.last())
        assertEquals(41, paged.distinct().size)
    }

    @Test
    fun `full date wins within same year and unknown dates are stable at end`() {
        val refs = (1..5).map { MediaType.TV to it }
        val dates = mapOf(
            refs[0] to LocalDate.of(2025, 1, 1),
            refs[1] to null,
            refs[2] to LocalDate.of(2025, 12, 1),
            refs[3] to LocalDate.of(2025, 12, 1)
        )
        assertEquals(
            listOf(refs[0], refs[2], refs[3], refs[1], refs[4]),
            sortFranchiseReleaseRefs(refs, dates)
        )
    }
}
