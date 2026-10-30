package com.arflix.tv.ui.screens.home

import com.arflix.tv.data.model.Category
import com.arflix.tv.data.model.MediaItem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class HomeStartupCacheTest {
    @Test
    fun `partial continue watching refresh keeps badges but updates playback state`() {
        val visible = MediaItem(
            id = 1, title = "Movie", year = "1997", releaseDate = "12 Dec 1997",
            duration = "2h 0m", genreIds = listOf(27, 53), imdbRating = "7.9",
            certification = "FSK 18", budget = 24_000_000L,
            primaryNetworkLogo = "provider-logo", progress = 20,
        )
        val partial = MediaItem(
            id = 1, title = "Movie", duration = "0m", releaseDate = "",
            certification = "", budget = 0L, progress = 55, isPartiallyWatched = true,
        )
        val refreshed = mergeHomeHeroMetadata(partial, visible)

        assertEquals(
            visible.copy(progress = 55, isPartiallyWatched = true),
            refreshed,
        )
        assertEquals(refreshed, mergeHomeHeroMetadata(partial, refreshed))
    }

    @Test
    fun `catalog refresh preserves hydrated hero genres`() {
        val visible = MediaItem(id = 1, title = "Movie", genreIds = listOf(27, 53))
        val incoming = MediaItem(id = 1, title = "Movie")

        assertEquals(visible.genreIds, mergeHomeHeroMetadata(incoming, visible).genreIds)
    }

    @Test
    fun `fresh hero genres replace previous genres without leaking across titles`() {
        val visible = MediaItem(id = 1, title = "Movie", genreIds = listOf(27))
        val incoming = MediaItem(id = 1, title = "Movie", genreIds = listOf(28))

        assertEquals(listOf(28), mergeHomeHeroMetadata(incoming, visible).genreIds)
        assertEquals(
            emptyList<Int>(),
            mergeHomeHeroMetadata(MediaItem(id = 2, title = "Other"), visible).genreIds
        )
    }

    @Test
    fun `cache keeps a compact first page for every populated category`() {
        val categories = listOf(
            Category(
                id = "trending_movies",
                title = "Trending Movies",
                items = (1..40).map { MediaItem(id = it, title = "Movie $it") }
            ),
            Category(
                id = "trending_shows",
                title = "Trending Shows",
                items = (41..80).map { MediaItem(id = it, title = "Show $it") }
            )
        )

        val cached = compactHomeCategoriesForCache(categories, maxItemsPerCategory = 12)

        assertEquals(listOf("trending_movies", "trending_shows"), cached.map { it.id })
        assertEquals(listOf(12, 12), cached.map { it.items.size })
        assertEquals(1, cached.first().items.first().id)
        assertEquals(12, cached.first().items.last().id)
    }

    @Test
    fun `cache excludes skeletons and malformed cards without dropping valid rows`() {
        val cached = compactHomeCategoriesForCache(
            categories = listOf(
                Category(
                    id = "continue_watching",
                    title = "Continue Watching",
                    items = listOf(
                        MediaItem(id = -1, title = "", isPlaceholder = true),
                        MediaItem(id = 10, title = "Ready")
                    )
                ),
                Category(
                    id = "loading_only",
                    title = "Loading",
                    items = listOf(MediaItem(id = -2, title = "", isPlaceholder = true))
                )
            ),
            maxItemsPerCategory = 12
        )

        assertEquals(1, cached.size)
        assertEquals("continue_watching", cached.single().id)
        assertEquals(listOf("Ready"), cached.single().items.map { it.title })
        assertFalse(cached.single().items.any { it.isPlaceholder })
    }
}
