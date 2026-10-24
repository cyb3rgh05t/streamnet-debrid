package com.arflix.tv.ui.screens.home

import com.arflix.tv.data.model.Category
import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.repository.MediaRepository
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.launch

class HomeRowStateTest {
    @Test
    fun `new catalog rails follow continue watching before existing TV rails`() {
        val cw = Category("continue_watching", "Continue watching", listOf(MediaItem(1, "Resume")))
        val newRail = Category("custom_new", "New list", listOf(MediaItem(2, "New")))
        val favorites = Category("favorite_tv", "TV favorites", listOf(MediaItem(3, "TV")))
        val recent = Category("recent_tv", "Recent TV", listOf(MediaItem(4, "Recent")))
        val existing = Category("custom_existing", "Existing", listOf(MediaItem(5, "Existing")))
        val order = listOf(newRail.id, favorites.id, recent.id, existing.id)

        val ordered = orderHomeCategories(listOf(existing, recent, cw, favorites, newRail), order)
        assertThat(ordered.map { it.id }).containsExactly(
            cw.id, newRail.id, favorites.id, recent.id, existing.id
        ).inOrder()
        val refreshed = mergeIptvHomeCategories(
            ordered,
            mapOf(favorites.id to favorites, recent.id to recent),
            order
        )
        assertThat(refreshed).isEqualTo(ordered)
        assertThat(orderHomeCategories(ordered.filterNot { it.id == cw.id }, order).first()).isEqualTo(newRail)
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    @Test
    fun `artwork warmup waits for navigation to settle and is cancellable`() = runTest {
        var lastNavigation = 100L
        var loaded = false
        val job = launch {
            awaitHomeArtworkIdle({ lastNavigation }, { testScheduler.currentTime + 100L })
            loaded = true
        }
        runCurrent()
        advanceTimeBy(800L)
        lastNavigation = testScheduler.currentTime + 100L
        advanceTimeBy(200L)
        runCurrent()
        assertThat(loaded).isFalse()
        advanceTimeBy(800L)
        runCurrent()
        assertThat(loaded).isTrue()
        job.join()

        loaded = false
        lastNavigation = testScheduler.currentTime + 100L
        val cancelled = launch {
            awaitHomeArtworkIdle({ lastNavigation }, { testScheduler.currentTime + 100L })
            loaded = true
        }
        runCurrent()
        cancelled.cancel()
        advanceTimeBy(1_000L)
        runCurrent()
        assertThat(loaded).isFalse()
    }

    @Test
    fun `hero refresh preserves known metadata while accepting new playback progress`() {
        val visible = MediaItem(
            10, "Resume", image = "poster", backdrop = "backdrop", year = "2025",
            overview = "Overview", duration = "120m", releaseDate = "2025-01-01",
            imdbRating = "8.0", certification = "FSK 12", progress = 20
        )
        val incoming = MediaItem(10, "Resume", backdrop = "", releaseDate = "", progress = 40)
        val merged = mergeHomeHeroMetadata(incoming, visible)
        assertThat(merged.year).isEqualTo("2025")
        assertThat(merged.image).isEqualTo("poster")
        assertThat(merged.backdrop).isEqualTo("backdrop")
        assertThat(merged.releaseDate).isEqualTo("2025-01-01")
        assertThat(merged.certification).isEqualTo("FSK 12")
        assertThat(merged.overview).isEqualTo("Overview")
        assertThat(merged.progress).isEqualTo(40)
        assertThat(mergeHomeHeroMetadata(incoming.copy(id = 11), visible).year).isEmpty()
        assertThat(mergeHomeHeroMetadata(incoming.copy(mediaType = MediaType.TV), visible).year).isEmpty()
    }

    @Test
    fun `startup preserves the visible continue watching hero even before its logo loads`() {
        val resume = MediaItem(10, "Resume", year = "2025", overview = "Hydrated overview")
        val state = HomeUiState(heroItem = resume)
        val merged = preserveStartupHomeHero(state, MediaItem(11, "Trending"), "other-logo")
        assertThat(merged.heroItem).isEqualTo(resume)
        assertThat(merged.heroLogoUrl).isNull()
        val same = preserveStartupHomeHero(state, resume.copy(year = "", overview = ""), "resume-logo")
        assertThat(same.heroItem).isEqualTo(resume)
        assertThat(same.heroLogoUrl).isEqualTo("resume-logo")
        val differentType = preserveStartupHomeHero(state, resume.copy(mediaType = MediaType.TV), "tv-logo")
        assertThat(differentType.heroLogoUrl).isNull()
        assertThat(preserveStartupHomeHero(HomeUiState(), resume, "resume-logo").heroItem).isEqualTo(resume)
        val rawResume = resume.copy(year = "", overview = "", progress = 40)
        val enriched = preserveStartupHomeHero(HomeUiState(heroItem = rawResume), resume, "resume-logo")
        assertThat(enriched.heroItem?.year).isEqualTo("2025")
        assertThat(enriched.heroItem?.overview).isEqualTo("Hydrated overview")
        assertThat(enriched.heroItem?.progress).isEqualTo(40)
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    @Test
    fun `ready rows publish first content immediately and coalesce later updates`() = runTest {
        val batches = mutableListOf<List<Category>>()
        val publisher = HomeCategoryBatcher(this, publish = { batches.add(it) })
        val first = Category("movies", "Movies", listOf(MediaItem(1, "First")))
        val second = Category("series", "Series", listOf(MediaItem(2, "Second")))
        publisher.offer(first, immediately = true)
        assertThat(batches).containsExactly(listOf(first))
        publisher.offer(second, immediately = false)
        publisher.offer(first, immediately = false)
        val newest = second.copy(title = "New series title")
        publisher.offer(newest, immediately = false)
        runCurrent()
        advanceTimeBy(119L)
        runCurrent()
        assertThat(batches).hasSize(1)
        advanceTimeBy(1L)
        runCurrent()
        assertThat(batches).containsExactly(listOf(first), listOf(newest, first)).inOrder()
        publisher.offer(second, immediately = false)
        publisher.cancel()
        advanceTimeBy(200L)
        runCurrent()
        assertThat(batches).hasSize(2)
        publisher.offer(second, immediately = false)
        publisher.flush()
        advanceTimeBy(200L)
        runCurrent()
        assertThat(batches).hasSize(3)
        assertThat(batches.last()).containsExactly(second)
    }

    @Test
    fun `trailer cache retains successful keys across focus changes and allows retry after misses`() {
        val cache = HomeTrailerCache(maxEntries = 2)
        cache.record("de:movie:1", "trailer-one", 0L)
        cache.record("de:movie:2", null, 100L)
        assertThat(cache.trailerKey("de:movie:1")).isEqualTo("trailer-one")
        assertThat(cache.shouldLoad("de:movie:1", 100_000L)).isFalse()
        assertThat(cache.shouldLoad("de:movie:2", 60_099L)).isFalse()
        assertThat(cache.shouldLoad("de:movie:2", 60_100L)).isTrue()
        assertThat(cache.shouldLoad("en:movie:1", 100L)).isTrue()
        cache.record("de:movie:3", "trailer-three", 200L)
        assertThat(cache.shouldLoad("de:movie:1", 200L)).isTrue()
        cache.clear()
        assertThat(cache.trailerKey("de:movie:3")).isNull()
    }

    @Test
    fun `first item loading retriggers when placeholder becomes real without moving focus`() {
        val placeholder = Category("trending_movies", "Movies", listOf(MediaItem(-1, "", isPlaceholder = true)))
        val ready = placeholder.copy(items = listOf(MediaItem(10, "Movie")))
        assertThat(homeFocusedItemLoadKey(listOf(placeholder), 0, 0)).isNull()
        val readyKey = homeFocusedItemLoadKey(listOf(ready), 0, 0)
        assertThat(readyKey).isNotNull()
        assertThat(homeFocusedItemLoadKey(listOf(ready, placeholder), 0, 0)).isEqualTo(readyKey)
        assertThat(homeFocusedItemLoadKey(listOf(ready.copy(id = "other_row")), 0, 0)).isNotEqualTo(readyKey)
        assertThat(homeFocusedItemLoadKey(listOf(ready.copy(items = listOf(MediaItem(11, "Next")))), 0, 0))
            .isNotEqualTo(readyKey)
    }

    @Test
    fun `missing Home overview stays empty instead of injecting English fallback`() {
        assertThat(cleanOverviewText("")).isEmpty()
        assertThat(cleanOverviewText("  \n\t ")).isEmpty()
        assertThat(cleanOverviewText("<p>\u00A0</p>")).isEmpty()
    }

    @Test
    fun `Home overview removes markup and normalizes spaces without changing language`() {
        assertThat(cleanOverviewText("<p>Eine</p>\u00A0Beschreibung.\n Weitere Details."))
            .isEqualTo("Eine Beschreibung. Weitere Details.")
    }

    @Test
    fun `reload burst queues only one follow up without cancelling current work`() {
        val gate = HomeReloadGate()
        assertThat(gate.request()).isTrue()
        repeat(20) { assertThat(gate.request()).isFalse() }
        assertThat(gate.finish()).isTrue()
        assertThat(gate.request()).isTrue()
        assertThat(gate.finish()).isFalse()
    }

    @Test
    fun `profile or language reset discards queued reloads`() {
        val gate = HomeReloadGate()
        gate.request()
        gate.request()
        gate.reset()
        assertThat(gate.request()).isTrue()
        assertThat(gate.finish()).isFalse()
    }

    @Test
    fun `ready row preserves other rows and follows configured order`() {
        val tv = Category("favorite_tv", "TV", listOf(MediaItem(1, "Channel")))
        val movie = Category("trending_movies", "Movies", listOf(MediaItem(2, "Movie")))
        val custom = Category("custom_list", "List", listOf(MediaItem(3, "Title")))
        assertThat(mergeReadyHomeCategory(
            listOf(tv, movie), custom, listOf("favorite_tv", "custom_list", "trending_movies"),
        )).containsExactly(tv, custom, movie).inOrder()
    }

    @Test
    fun `empty or unconfigured ready row cannot erase usable content`() {
        val movie = Category("trending_movies", "Movies", listOf(MediaItem(2, "Movie")))
        assertThat(mergeReadyHomeCategory(
            listOf(movie), movie.copy(items = emptyList()), listOf(movie.id),
        )).containsExactly(movie)
        assertThat(mergeReadyHomeCategory(emptyList(), movie, emptyList())).isEmpty()
    }

    @Test
    fun `late initial row does not truncate pages already loaded while scrolling`() {
        val items = (1..60).map { MediaItem(it, "Item $it") }
        val current = Category("trending_movies", "Movies", items)
        assertThat(mergeReadyHomeCategory(
            listOf(current), current.copy(items = items.take(40)), listOf(current.id),
        ).single().items).containsExactlyElementsIn(items).inOrder()
    }

    @Test
    fun `changed catalog contents replace previous row instead of appending stale pages`() {
        val old = Category("custom", "List", listOf(MediaItem(1, "Old"), MediaItem(2, "Older")))
        val ready = old.copy(items = listOf(MediaItem(3, "New")))
        assertThat(mergeReadyHomeCategory(listOf(old), ready, listOf(old.id))).containsExactly(ready)
    }

    @Test
    fun `late catalog result preserves newer TV guide and continue watching`() {
        val freshTv = Category("favorite_tv", "Favorite TV", listOf(MediaItem(10, "Fresh guide")))
        val freshResume = Category("continue_watching", "Continue Watching", listOf(MediaItem(11, "Resume")))
        val staleTv = freshTv.copy(items = listOf(MediaItem(10, "Old guide")))
        val movie = Category("trending_movies", "Movies", listOf(MediaItem(12, "Movie")))
        assertThat(preserveLiveHomeRows(
            current = listOf(freshTv, freshResume),
            incoming = listOf(movie, staleTv),
            catalogOrder = listOf("favorite_tv", "trending_movies"),
        )).containsExactly(freshResume, freshTv, movie).inOrder()
    }

    @Test
    fun `late catalog result does not restore removed favorites or resume`() {
        val staleTv = Category("favorite_tv", "Favorite TV", listOf(MediaItem(10, "Old")))
        val movie = Category("trending_movies", "Movies", listOf(MediaItem(12, "Movie")))
        assertThat(preserveLiveHomeRows(
            current = emptyList(),
            incoming = listOf(staleTv, movie),
            catalogOrder = listOf("favorite_tv", "trending_movies"),
        )).containsExactly(movie)
    }

    @Test
    fun `recently watched titles use watched change time before fallback order`() {
        assertThat(recentlyWatchedFirst(listOf(12, 80, 35), mapOf(12 to 300L, 35 to 200L)))
            .containsExactly(12, 35, 80).inOrder()
        assertThat(recentlyWatchedFirst(listOf(12, 80, 35), emptyMap()))
            .containsExactly(35, 80, 12).inOrder()
    }

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
    fun `cold start prioritizes continue watching`() {
        val categories = listOf(
            Category("favorite_tv", "Favorite TV", listOf(MediaItem(10, "Channel"))),
            Category("trending_movies", "Trending Movies", listOf(MediaItem(20, "Movie"))),
            Category("continue_watching", "Continue Watching", listOf(MediaItem(30, "Resume"))),
        )

        assertThat(preferredHomeStartRowIndex(categories)).isEqualTo(2)
    }

    @Test
    fun `cold start prioritizes TV favorites when continue watching is absent`() {
        val categories = listOf(
            Category("recent_tv", "Recently Watched TV", listOf(MediaItem(-1, "", isPlaceholder = true))),
            Category("favorite_tv", "Favorite TV", listOf(MediaItem(11, "Favorite"))),
            Category("trending_movies", "Trending Movies", listOf(MediaItem(20, "Movie"))),
        )

        assertThat(preferredHomeStartRowIndex(categories)).isEqualTo(1)
    }

    @Test
    fun `cold start falls back to the first visible configured rail`() {
        val categories = listOf(
            Category("recent_tv", "Recently Watched TV", listOf(MediaItem(-1, "", isPlaceholder = true))),
            Category("trending_tv", "Trending Shows", listOf(MediaItem(20, "Show"))),
            Category("trending_movies", "Trending Movies", listOf(MediaItem(30, "Movie"))),
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
    fun `favorite and recent TV rows are fixed landscape rails`() {
        assertThat(isFixedLandscapeHomeCategory(HomeViewModel.FAVORITE_TV_CATEGORY_ID)).isTrue()
        assertThat(isFixedLandscapeHomeCategory(HomeViewModel.RECENT_TV_CATEGORY_ID)).isTrue()
        assertThat(isFixedLandscapeHomeCategory("trending_movies")).isFalse()
    }

    @Test
    fun `watched badges are hidden on continue and recently watched rails`() {
        assertThat(shouldShowWatchedBadge("continue_watching")).isFalse()
        assertThat(shouldShowWatchedBadge(HomeViewModel.RECENTLY_WATCHED_MOVIES_CATEGORY_ID)).isFalse()
        assertThat(shouldShowWatchedBadge(HomeViewModel.RECENTLY_WATCHED_SERIES_CATEGORY_ID)).isFalse()
        assertThat(shouldShowWatchedBadge("trending_movies")).isTrue()
    }

    @Test
    fun `movie badge reflects watched movie cache`() {
        val item = MediaItem(id = 42, title = "Movie", mediaType = MediaType.MOVIE)

        assertThat(resolveHomeWatchedBadgeState(item, setOf(42), 0).isWatched).isTrue()
        assertThat(resolveHomeWatchedBadgeState(item, emptySet(), 0).isWatched).isFalse()
    }

    @Test
    fun `started series uses partial badge until every episode is watched`() {
        val item = MediaItem(id = 7, title = "Series", mediaType = MediaType.TV)

        val partial = resolveHomeWatchedBadgeState(item, emptySet(), 4, seriesEpisodeCount = 10)
        val complete = resolveHomeWatchedBadgeState(item, emptySet(), 10, seriesEpisodeCount = 10)
        val unknownTotal = resolveHomeWatchedBadgeState(item, emptySet(), 10, seriesEpisodeCount = null)

        assertThat(partial.isPartiallyWatched).isTrue()
        assertThat(partial.isWatched).isFalse()
        assertThat(complete.isWatched).isTrue()
        assertThat(complete.isPartiallyWatched).isFalse()
        assertThat(unknownTotal.isPartiallyWatched).isTrue()
        assertThat(unknownTotal.isWatched).isFalse()
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
            fallbackIndex = 1
        )

        assertThat(resolvedIndex).isEqualTo(2)
    }

    @Test
    fun `focus follows the same title when its episode suffix changes`() {
        val keys = listOf("TV-5_S1E3", "MOVIE-2", "TV-9_S2E1")

        val resolvedIndex = resolveHomeItemIndex(
            itemKeys = keys,
            preferredItemKey = "TV-9_S2E4",
            fallbackIndex = 0
        )

        assertThat(resolvedIndex).isEqualTo(2)
    }

    @Test
    fun `empty refreshing catalog resets poster index`() {
        val resolvedIndex = resolveHomeItemIndex(
            itemKeys = emptyList(),
            preferredItemKey = "MOVIE-20",
            fallbackIndex = 19
        )

        assertThat(resolvedIndex).isEqualTo(0)
    }

    @Test
    fun `partial paged catalog clamps poster index to real items`() {
        val resolvedIndex = resolveHomeItemIndex(
            itemKeys = stableHomeRowItemKeys("trending", List(10) { mediaItem(it + 1) }),
            preferredItemKey = "MOVIE-20",
            fallbackIndex = 19
        )

        assertThat(resolvedIndex).isEqualTo(9)
    }

    @Test
    fun `page append preserves latest watched item copies`() {
        val latest = listOf(mediaItem(1).copy(isWatched = true))
        val stalePage = listOf(mediaItem(1), mediaItem(2))

        val merged = appendUniqueHomePageItems(latest, stalePage)

        assertThat(merged.map { it.id }).containsExactly(1, 2).inOrder()
        assertThat(merged.first().isWatched).isTrue()
    }

    @Test
    fun `completed shorter catalog clamps poster index`() {
        val resolvedIndex = resolveHomeItemIndex(
            itemKeys = stableHomeRowItemKeys("trending", List(10) { mediaItem(it + 1) }),
            preferredItemKey = "MOVIE-20",
            fallbackIndex = 19
        )

        assertThat(resolvedIndex).isEqualTo(9)
    }

    @Test
    fun `remembered index ignores trailing placeholders`() {
        val items = List(4) { mediaItem(it + 1) } + MediaItem(
            id = -1,
            title = "",
            mediaType = MediaType.MOVIE,
            isPlaceholder = true
        )

        assertThat(clampHomeItemIndex(items, 8)).isEqualTo(3)
    }

    private fun mediaItem(id: Int) = MediaItem(
        id = id,
        title = "Title $id",
        mediaType = MediaType.MOVIE
    )
}
