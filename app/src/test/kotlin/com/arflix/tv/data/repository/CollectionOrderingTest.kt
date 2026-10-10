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
