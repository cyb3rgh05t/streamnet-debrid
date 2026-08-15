package com.arflix.tv.ui.screens.home

import com.arflix.tv.data.model.Category
import com.arflix.tv.data.model.MediaItem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class HomeStartupCacheTest {
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
