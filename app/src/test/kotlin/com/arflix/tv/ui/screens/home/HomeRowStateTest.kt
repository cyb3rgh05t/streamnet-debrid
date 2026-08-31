package com.arflix.tv.ui.screens.home

import com.arflix.tv.data.model.Category
import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.repository.MediaRepository
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class HomeRowStateTest {

    @Test
    fun `IPTV Home category fallback uses artwork but never country flags`() {
        assertThat(iptvHomeCategoryBackdrop("SKY Premium")).endsWith("sky_premium.webp")
        assertThat(iptvHomeCategoryBackdrop("Regional Fussball")).endsWith("fussball.webp")
        assertThat(iptvHomeCategoryBackdrop("Portugal")).isNull()
    }

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
    fun `cold start prepares the first visible home rail`() {
        val categories = listOf(
            Category("favorite_tv", "Favorite TV", listOf(MediaItem(10, "Channel"))),
            Category("trending_movies", "Trending Movies", listOf(MediaItem(20, "Movie"))),
            Category("continue_watching", "Continue Watching", listOf(MediaItem(30, "Resume"))),
        )

        assertThat(preferredHomeStartRowIndex(categories)).isEqualTo(0)
    }

    @Test
    fun `cold start skips hidden rows before the first visible rail`() {
        val categories = listOf(
            Category("recent_tv", "Recently Watched TV", listOf(MediaItem(-1, "", isPlaceholder = true))),
            Category("favorite_tv", "Favorite TV", listOf(MediaItem(11, "Favorite"))),
            Category("trending_movies", "Trending Movies", listOf(MediaItem(20, "Movie"))),
        )

        assertThat(preferredHomeStartRowIndex(categories)).isEqualTo(1)
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

    @Test
    fun `IPTV hero never auto plays on touch devices`() {
        assertThat(
            shouldPlayIptvHomeHero(
                isTouchDevice = true,
                userHasNavigated = true,
                suppressPlayback = false,
                categoryId = "other_iptv",
            )
        ).isFalse()
        assertThat(
            shouldPlayIptvHomeHero(
                isTouchDevice = false,
                userHasNavigated = true,
                suppressPlayback = false,
                categoryId = "other_iptv",
            )
        ).isTrue()
    }

    @Test
    fun `IPTV hero does not auto play in favorite or recent TV rails`() {
        listOf(
            HomeViewModel.FAVORITE_TV_CATEGORY_ID,
            HomeViewModel.RECENT_TV_CATEGORY_ID,
        ).forEach { categoryId ->
            assertThat(
                shouldPlayIptvHomeHero(
                    isTouchDevice = false,
                    userHasNavigated = true,
                    suppressPlayback = false,
                    categoryId = categoryId,
                )
            ).isFalse()
        }
    }

    @Test
    fun `static collection rails never show pagination skeletons`() {
        listOf("service", "franchise", "studio", "network", "genre").forEach { group ->
            assertThat(canPaginateHomeCategory("collection_row_$group", hasMore = true)).isFalse()
        }
        assertThat(canPaginateHomeCategory("trending_movies", hasMore = true)).isTrue()
    }

    @Test
    fun `continue watching cards keep progress renderer when trailer is available`() {
        assertThat(
            canExpandHomeCardToFeatured(
                categoryId = "continue_watching",
                isIptvCategory = false,
                usesPosterCards = false,
                trailerKey = "trailer-key",
            )
        ).isFalse()

        assertThat(
            canExpandHomeCardToFeatured(
                categoryId = "trending_movies",
                isIptvCategory = false,
                usesPosterCards = false,
                trailerKey = "trailer-key",
            )
        ).isTrue()
    }

    @Test
    fun `cached first collection item resolves intro without transient map`() {
        val defaults = MediaRepository.buildPreinstalledDefaults().associateBy { it.id }
        val cachedItem = MediaItem(
            id = 42,
            title = "Netflix",
            status = "collection:collection_service_netflix"
        )

        val catalog = resolveCachedCollectionCatalog(
            item = cachedItem,
            catalogsByMediaId = emptyMap(),
            catalogById = defaults::get,
        )

        assertThat(catalog?.collectionHeroVideoUrl).endsWith("networks%20videos/netflix.mp4")
    }

    fun `poster keys do not change when unrelated items are inserted`() {
        val original = listOf(mediaItem(1), mediaItem(2), mediaItem(3))
        val updated = listOf(mediaItem(99)) + original

        val originalKeys = stableHomeRowItemKeys("trending", original)
        val updatedKeys = stableHomeRowItemKeys("trending", updated)

        assertThat(updatedKeys.drop(1)).containsExactlyElementsIn(originalKeys).inOrder()
    }

    @Test
    fun `duplicate poster keys remain unique and deterministic`() {
        val duplicates = listOf(mediaItem(7), mediaItem(7), mediaItem(7))

        val keys = stableHomeRowItemKeys("trending", duplicates)

        assertThat(keys).containsExactly(
            "MOVIE-7",
            "MOVIE-7#duplicate1",
            "MOVIE-7#duplicate2"
        ).inOrder()
    }

    @Test
    fun `focused poster follows its identity when catalog is reordered`() {
        val reorderedKeys = stableHomeRowItemKeys(
            "trending",
            listOf(mediaItem(3), mediaItem(1), mediaItem(2))
        )

        val resolvedIndex = resolveHomeItemIndex(
            itemKeys = reorderedKeys,
            preferredItemKey = "MOVIE-2",
            fallbackIndex = 1,
            hasMore = false
        )

        assertThat(resolvedIndex).isEqualTo(2)
    }

    @Test
    fun `empty refreshing catalog preserves pending poster index`() {
        val resolvedIndex = resolveHomeItemIndex(
            itemKeys = emptyList(),
            preferredItemKey = "MOVIE-20",
            fallbackIndex = 19,
            hasMore = true
        )

        assertThat(resolvedIndex).isEqualTo(19)
    }

    @Test
    fun `partial paged catalog preserves pending poster index`() {
        val resolvedIndex = resolveHomeItemIndex(
            itemKeys = stableHomeRowItemKeys("trending", List(10) { mediaItem(it + 1) }),
            preferredItemKey = "MOVIE-20",
            fallbackIndex = 19,
            hasMore = true
        )

        assertThat(resolvedIndex).isEqualTo(19)
    }

    @Test
    fun `completed shorter catalog clamps poster index`() {
        val resolvedIndex = resolveHomeItemIndex(
            itemKeys = stableHomeRowItemKeys("trending", List(10) { mediaItem(it + 1) }),
            preferredItemKey = "MOVIE-20",
            fallbackIndex = 19,
            hasMore = false
        )

        assertThat(resolvedIndex).isEqualTo(9)
    }

    private fun mediaItem(id: Int) = MediaItem(
        id = id,
        title = "Title $id",
        mediaType = MediaType.MOVIE
    )
}
