package com.arflix.tv.ui.screens.watchlist

import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType
import org.junit.Assert.assertEquals
import org.junit.Test

class WatchlistReleaseSortTest {
    @Test
    fun `release key understands iso dates, english dates and plain years`() {
        assertEquals("2025-11-28", watchlistReleaseSortKey(MediaItem(id = 1, title = "A", releaseDate = "2025-11-28T00:00:00Z")))
        assertEquals("2024-03-05", watchlistReleaseSortKey(MediaItem(id = 2, title = "B", releaseDate = "5 Mar 2024")))
        assertEquals("2023-01-01", watchlistReleaseSortKey(MediaItem(id = 3, title = "C", year = "2023", mediaType = MediaType.TV)))
        assertEquals("", watchlistReleaseSortKey(MediaItem(id = 4, title = "D")))
    }

    @Test
    fun `newest first with undated titles last`() {
        val items = listOf(
            MediaItem(id = 1, title = "old", year = "2020"),
            MediaItem(id = 2, title = "undated"),
            MediaItem(id = 3, title = "new", releaseDate = "2026-01-02", mediaType = MediaType.TV)
        )
        assertEquals(listOf("new", "old", "undated"), items.sortedByDescending(::watchlistReleaseSortKey).map { it.title })
    }
}
