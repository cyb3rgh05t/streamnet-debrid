package com.arflix.tv.ui.screens.home

import com.arflix.tv.data.model.Category
import com.arflix.tv.data.model.MediaItem
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class HomeRowStateTest {

    @Test
    fun `row key depends on catalog identity and not its position`() {
        assertThat(stableHomeRowKey("tv", "trending_movies"))
            .isEqualTo("tv_home_row_trending_movies")
        assertThat(stableHomeRowKey("mobile", "trending_movies"))
            .isEqualTo("mobile_home_row_trending_movies")
    }

    @Test
    fun `focused catalog follows its id when rows are inserted above it`() {
        val updatedRows = listOf("continue_watching", "sports", "trending_movies", "trending_tv")

        val resolvedIndex = resolveHomeCategoryIndex(
            categoryIds = updatedRows,
            preferredCategoryId = "trending_tv",
            fallbackIndex = 2
        )

        assertThat(resolvedIndex).isEqualTo(3)
    }

    @Test
    fun `focused catalog follows its id when rows are reordered`() {
        val reorderedRows = listOf("trending_tv", "continue_watching", "trending_movies")

        val resolvedIndex = resolveHomeCategoryIndex(
            categoryIds = reorderedRows,
            preferredCategoryId = "trending_movies",
            fallbackIndex = 0
        )

        assertThat(resolvedIndex).isEqualTo(2)
    }

    @Test
    fun `missing focused catalog keeps a clamped fallback row`() {
        val resolvedIndex = resolveHomeCategoryIndex(
            categoryIds = listOf("continue_watching", "trending_movies"),
            preferredCategoryId = "removed_catalog",
            fallbackIndex = 8
        )

        assertThat(resolvedIndex).isEqualTo(1)
    }

    @Test
    fun `cold start prefers real continue watching over all other rows`() {
        val categories = listOf(
            Category("favorite_tv", "Favorite TV", listOf(MediaItem(10, "Channel"))),
            Category("trending_movies", "Trending Movies", listOf(MediaItem(20, "Movie"))),
            Category("continue_watching", "Continue Watching", listOf(MediaItem(30, "Resume"))),
        )

        assertThat(preferredHomeStartRowIndex(categories)).isEqualTo(2)
    }

    @Test
    fun `cold start falls back to trending movies and not IPTV`() {
        val categories = listOf(
            Category("recent_tv", "Recently Watched TV", listOf(MediaItem(10, "Channel"))),
            Category("favorite_tv", "Favorite TV", listOf(MediaItem(11, "Favorite"))),
            Category("trending_movies", "Trending Movies", listOf(MediaItem(-1, "", isPlaceholder = true))),
        )

        assertThat(preferredHomeStartRowIndex(categories)).isEqualTo(2)
    }

    @Test
    fun `touch hero uses only continue watching items`() {
        val continueWatching = MediaItem(id = 1, title = "Continue")
        val recentlyWatchedTv = MediaItem(id = 2, title = "Recent TV")
        val categories = listOf(
            Category("recent_tv", "Recently Watched TV", listOf(recentlyWatchedTv)),
            Category("continue_watching", "Continue Watching", listOf(continueWatching)),
        )

        assertThat(mobileHeroItems(categories)).containsExactly(continueWatching)
    }

    @Test
    fun `recent TV row is hidden until it has real items`() {
        val placeholder = MediaItem(id = -1, title = "", isPlaceholder = true)

        assertThat(shouldDisplayHomeCategory(Category("recent_tv", "Recent", listOf(placeholder)))).isFalse()
        assertThat(shouldDisplayHomeCategory(Category("recent_tv", "Recent", listOf(MediaItem(2, "Channel"))))).isTrue()
    }
}
