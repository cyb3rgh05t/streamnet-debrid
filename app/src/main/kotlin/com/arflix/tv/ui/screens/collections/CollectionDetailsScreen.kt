package com.arflix.tv.ui.screens.collections
import com.arflix.tv.ui.skin.resolveAccentColor

import android.content.res.Configuration
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Movie
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.tv.foundation.lazy.grid.TvGridCells
import androidx.tv.foundation.lazy.grid.TvLazyVerticalGrid
import androidx.tv.foundation.lazy.grid.itemsIndexed
import androidx.tv.foundation.lazy.grid.rememberTvLazyGridState
import coil.compose.AsyncImage
import com.arflix.tv.R
import com.arflix.tv.data.model.CatalogConfig
import com.arflix.tv.data.model.CatalogKind
import com.arflix.tv.data.model.CatalogSourceType
import com.arflix.tv.data.model.CollectionGroupKind
import com.arflix.tv.data.model.CollectionSourceConfig
import com.arflix.tv.data.model.CollectionSourceKind
import com.arflix.tv.data.model.CollectionTileShape
import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.repository.CatalogRepository
import com.arflix.tv.data.repository.GenreFanartRepository
import com.arflix.tv.data.repository.IptvRepository
import com.arflix.tv.data.repository.MediaRepository
import com.arflix.tv.data.repository.TraktRepository
import com.arflix.tv.ui.screens.home.resolveHomeWatchedBadgeState
import com.arflix.tv.ui.components.CardLayoutMode
import com.arflix.tv.ui.components.MediaCard
import com.arflix.tv.ui.components.rememberCatalogueRowLayoutMode
import com.arflix.tv.ui.focus.arvioDpadFocusGroup
import com.arflix.tv.ui.theme.ArflixTypography
import com.arflix.tv.ui.theme.NeutralLogoBrandGradient
import com.arflix.tv.ui.theme.logoBrandGradient
import com.arflix.tv.ui.theme.appBackgroundDark
import com.arflix.tv.ui.theme.TextPrimary
import com.arflix.tv.ui.theme.TextSecondary
import com.arflix.tv.util.LocalDeviceType
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import javax.inject.Inject

enum class CollectionTab { TIMELINE, MOVIES, SERIES }

/**
 * Sentinel stored in [CollectionDetailsUiState.error] when a collection page fails to load.
 * The ViewModel has no Context, so the human-readable message is resolved with
 * [stringResource] at the @Composable display point (see CollectionDetailsScreen).
 */
private const val COLLECTION_LOAD_FAILED_ERROR = "__collection_load_failed__"
private const val COLLECTION_NOT_FOUND_ERROR = "__collection_not_found__"

data class CollectionDetailsUiState(
    val catalog: CatalogConfig? = null,
    val movieItems: List<MediaItem> = emptyList(),
    val seriesItems: List<MediaItem> = emptyList(),
    val timelineItems: List<MediaItem> = emptyList(),
    val supportsMovies: Boolean = false,
    val supportsSeries: Boolean = false,
    val supportsTimeline: Boolean = false,
    val isLoadingMovies: Boolean = true,
    val isLoadingSeries: Boolean = true,
    val isLoadingTimeline: Boolean = true,
    val isLoadingMoreMovies: Boolean = false,
    val isLoadingMoreSeries: Boolean = false,
    val isLoadingMoreTimeline: Boolean = false,
    val hasMoreMovies: Boolean = false,
    val hasMoreSeries: Boolean = false,
    val hasMoreTimeline: Boolean = false,
    val loadedMovieOffset: Int = 0,
    val loadedSeriesOffset: Int = 0,
    val loadedTimelineOffset: Int = 0,
    val error: String? = null
) {
    val hasMovies: Boolean get() = movieItems.isNotEmpty()
    val hasSeries: Boolean get() = seriesItems.isNotEmpty()
    val hasTimeline: Boolean get() = timelineItems.isNotEmpty()
}

@HiltViewModel
class CollectionDetailsViewModel @Inject constructor(
    private val catalogRepository: CatalogRepository,
    private val mediaRepository: MediaRepository,
    private val traktRepository: TraktRepository,
    private val genreFanartRepository: GenreFanartRepository,
    private val iptvRepository: IptvRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(CollectionDetailsUiState())
    val uiState: StateFlow<CollectionDetailsUiState> = _uiState.asStateFlow()
    private val _cardLogoUrls = MutableStateFlow<Map<String, String>>(emptyMap())
    val cardLogoUrls: StateFlow<Map<String, String>> = _cardLogoUrls.asStateFlow()
    private var iptvOnlyMode = true
    private var iptvVodAvailability: IptvRepository.XtreamVodAvailability? = null

    private data class CollectionPage(
        val items: List<MediaItem>,
        val hasMore: Boolean,
        val nextOffset: Int,
    )

    private companion object {
        const val FIRST_PAGE = 8
        const val PAGE_STEP = 12
        const val BACKGROUND_PREFETCH_DELAY_MS = 350L
        const val TMDB_COLLECTION_PREFIX = "tmdb_collection:"
    }

    fun load(catalogId: String) {
        viewModelScope.launch {
            val normalizedCatalogId = normalizeCatalogId(catalogId)
            // Skip reload if this catalog is already loaded — the composable is re-entered
            // after back navigation (Navigation Compose tears down composables on forward nav)
            // and we want to preserve all paginated data so saved scroll positions stay valid.
            val current = _uiState.value
            if (current.catalog?.id == normalizedCatalogId && !current.isLoadingMovies && !current.isLoadingSeries) return@launch

            _uiState.value = CollectionDetailsUiState(isLoadingMovies = true, isLoadingSeries = true, isLoadingTimeline = true)
            iptvOnlyMode = iptvRepository.observeConfig().first().iptvOnlyMode
            iptvVodAvailability = if (iptvOnlyMode) {
                runCatching { iptvRepository.getXtreamVodAvailability(allowNetwork = false) }.getOrNull()
            } else {
                null
            }
            val baseCatalog = catalogRepository.getCatalogs()
                .firstOrNull { it.id == normalizedCatalogId || it.id == catalogId }
                ?: syntheticTmdbCollectionCatalog(normalizedCatalogId)
            val catalog = baseCatalog?.let {
                genreFanartRepository.decorateCatalogs(listOf(it)).first()
            }
            if (catalog == null) {
                _uiState.value = CollectionDetailsUiState(
                    isLoadingMovies = false,
                    isLoadingSeries = false,
                    error = COLLECTION_NOT_FOUND_ERROR
                )
                return@launch
            }
            _uiState.value = CollectionDetailsUiState(
                catalog = catalog,
                supportsMovies = supportsTab(catalog, CollectionTab.MOVIES),
                supportsSeries = supportsTab(catalog, CollectionTab.SERIES),
                supportsTimeline = supportsTab(catalog, CollectionTab.TIMELINE),
                isLoadingMovies = true,
                isLoadingSeries = true,
                isLoadingTimeline = true
            )

            val primaryTab = when {
                _uiState.value.supportsTimeline -> CollectionTab.TIMELINE
                _uiState.value.supportsMovies -> CollectionTab.MOVIES
                _uiState.value.supportsSeries -> CollectionTab.SERIES
                else -> CollectionTab.MOVIES
            }
            loadInitialTab(catalog, primaryTab)
            launch {
                delay(1200L)
                listOf(CollectionTab.TIMELINE, CollectionTab.MOVIES, CollectionTab.SERIES)
                    .filter { it != primaryTab }
                    .filter { supportsTab(catalog, it) }
                    .forEach { loadInitialTab(catalog, it) }
            }
        }
    }

    private fun normalizeCatalogId(catalogId: String): String {
        val trimmed = catalogId.trim()
        return runCatching {
            java.net.URLDecoder.decode(trimmed, "UTF-8")
        }.getOrDefault(trimmed)
    }

    private fun syntheticTmdbCollectionCatalog(catalogId: String): CatalogConfig? {
        if (!catalogId.startsWith(TMDB_COLLECTION_PREFIX)) return null

        val payload = catalogId.removePrefix(TMDB_COLLECTION_PREFIX)
        val collectionId = payload.substringBefore(":").toIntOrNull() ?: return null
        val collectionName = payload.substringAfter(":", missingDelimiterValue = "")
            .trim()
            .takeIf { it.isNotBlank() }
            ?: "Collection"

        return CatalogConfig(
            id = catalogId,
            title = collectionName,
            sourceType = CatalogSourceType.PREINSTALLED,
            isPreinstalled = true,
            kind = CatalogKind.COLLECTION,
            collectionGroup = CollectionGroupKind.FRANCHISE,
            collectionTileShape = CollectionTileShape.POSTER,
            collectionSources = listOf(
                CollectionSourceConfig(
                    kind = CollectionSourceKind.TMDB_COLLECTION,
                    mediaType = "movie",
                    tmdbCollectionId = collectionId
                )
            )
        )
    }

    private suspend fun loadInitialTab(catalog: CatalogConfig, tab: CollectionTab) {
        val page = runCatching { loadCollectionPage(catalog, tab, offset = 0, limit = FIRST_PAGE) }.getOrNull()
        val pageItems = when (tab) {
            CollectionTab.MOVIES -> page?.items.orEmpty().filter { it.mediaType == MediaType.MOVIE }
            CollectionTab.SERIES -> page?.items.orEmpty().filter { it.mediaType == MediaType.TV }
            CollectionTab.TIMELINE -> page?.items.orEmpty()
        }
        val decoratedPageItems = sortCollectionItems(tab, decorateWatchedBadges(pageItems))
        val decoratedCatalog = catalog
        _uiState.value = when (tab) {
            CollectionTab.MOVIES -> _uiState.value.copy(
                catalog = decoratedCatalog,
                movieItems = decoratedPageItems,
                isLoadingMovies = false,
                hasMoreMovies = page?.hasMore == true,
                loadedMovieOffset = page?.nextOffset ?: 0,
                error = _uiState.value.error ?: if (page == null) COLLECTION_LOAD_FAILED_ERROR else null
            )
            CollectionTab.SERIES -> _uiState.value.copy(
                catalog = decoratedCatalog,
                seriesItems = decoratedPageItems,
                isLoadingSeries = false,
                hasMoreSeries = page?.hasMore == true,
                loadedSeriesOffset = page?.nextOffset ?: 0,
                error = _uiState.value.error ?: if (page == null) COLLECTION_LOAD_FAILED_ERROR else null
            )
            CollectionTab.TIMELINE -> _uiState.value.copy(
                catalog = decoratedCatalog,
                timelineItems = decoratedPageItems,
                isLoadingTimeline = false,
                hasMoreTimeline = page?.hasMore == true,
                loadedTimelineOffset = page?.nextOffset ?: 0,
                error = _uiState.value.error ?: if (page == null) COLLECTION_LOAD_FAILED_ERROR else null
            )
        }
        preloadLogos(decoratedPageItems.take(2))
        val hasMore = when (tab) {
            CollectionTab.MOVIES -> _uiState.value.hasMoreMovies
            CollectionTab.SERIES -> _uiState.value.hasMoreSeries
            CollectionTab.TIMELINE -> _uiState.value.hasMoreTimeline
        }
        if (hasMore) {
            viewModelScope.launch {
                delay(BACKGROUND_PREFETCH_DELAY_MS)
                loadMoreIfNeeded(tab)
            }
        }
    }

    fun loadMoreIfNeeded(tab: CollectionTab) {
        val state = _uiState.value
        val catalog = state.catalog ?: return
        val isBusy = when (tab) {
            CollectionTab.MOVIES -> state.isLoadingMovies || state.isLoadingMoreMovies || !state.hasMoreMovies
            CollectionTab.SERIES -> state.isLoadingSeries || state.isLoadingMoreSeries || !state.hasMoreSeries
            CollectionTab.TIMELINE -> state.isLoadingTimeline || state.isLoadingMoreTimeline || !state.hasMoreTimeline
        }
        if (isBusy) return
        _uiState.value = when (tab) {
            CollectionTab.MOVIES -> state.copy(isLoadingMoreMovies = true)
            CollectionTab.SERIES -> state.copy(isLoadingMoreSeries = true)
            CollectionTab.TIMELINE -> state.copy(isLoadingMoreTimeline = true)
        }
        viewModelScope.launch {
            val pageCatalog = catalogForTab(catalog, tab)
            val nextOffset = when (tab) {
                CollectionTab.MOVIES -> state.loadedMovieOffset
                CollectionTab.SERIES -> state.loadedSeriesOffset
                CollectionTab.TIMELINE -> state.loadedTimelineOffset
            }
            val next = runCatching { loadCollectionPage(pageCatalog, tab, offset = nextOffset, limit = PAGE_STEP) }.getOrNull()
            val freshItems = when (tab) {
                CollectionTab.MOVIES -> next?.items.orEmpty().filter { it.mediaType == MediaType.MOVIE }
                CollectionTab.SERIES -> next?.items.orEmpty().filter { it.mediaType == MediaType.TV }
                CollectionTab.TIMELINE -> next?.items.orEmpty()
            }
            val decoratedFreshItems = sortCollectionItems(tab, decorateWatchedBadges(freshItems))
            val existingIds = when (tab) {
                CollectionTab.MOVIES -> state.movieItems.mapTo(HashSet()) { it.id to it.mediaType }
                CollectionTab.SERIES -> state.seriesItems.mapTo(HashSet()) { it.id to it.mediaType }
                CollectionTab.TIMELINE -> state.timelineItems.mapTo(HashSet()) { it.id to it.mediaType }
            }
            val uniqueNew = decoratedFreshItems.filter { (it.id to it.mediaType) !in existingIds }
            _uiState.value = when (tab) {
                CollectionTab.MOVIES -> _uiState.value.copy(
                    movieItems = sortCollectionItems(tab, state.movieItems + uniqueNew),
                    isLoadingMoreMovies = false,
                    hasMoreMovies = next?.hasMore == true,
                    loadedMovieOffset = next?.nextOffset ?: state.loadedMovieOffset
                )
                CollectionTab.SERIES -> _uiState.value.copy(
                    seriesItems = sortCollectionItems(tab, state.seriesItems + uniqueNew),
                    isLoadingMoreSeries = false,
                    hasMoreSeries = next?.hasMore == true,
                    loadedSeriesOffset = next?.nextOffset ?: state.loadedSeriesOffset
                )
                CollectionTab.TIMELINE -> _uiState.value.copy(
                    timelineItems = state.timelineItems + uniqueNew,
                    isLoadingMoreTimeline = false,
                    hasMoreTimeline = next?.hasMore == true,
                    loadedTimelineOffset = next?.nextOffset ?: state.loadedTimelineOffset
                )
            }
            preloadLogos(uniqueNew)
        }
    }

    private suspend fun decorateWatchedBadges(items: List<MediaItem>): List<MediaItem> {
        if (items.isEmpty()) return items
        traktRepository.initializeWatchedCache()
        val watchedMovies = traktRepository.getWatchedMoviesFromCache()
        val watchedEpisodeCounts = traktRepository.getWatchedEpisodesFromCache()
            .mapNotNull { key ->
                key.removePrefix("show_tmdb:")
                    .substringBefore(':')
                    .toIntOrNull()
            }
            .groupingBy { it }
            .eachCount()
        val watchedSeries = items.filter {
            it.mediaType == MediaType.TV && (watchedEpisodeCounts[it.id] ?: 0) > 0
        }
        val detailSemaphore = Semaphore(5)
        val episodeTotals = coroutineScope {
            watchedSeries.distinctBy { it.id }.map { item ->
                async {
                    val total = item.seriesEpisodeCount
                        ?: mediaRepository.getCachedFullItem(MediaType.TV, item.id)?.seriesEpisodeCount
                        ?: detailSemaphore.withPermit {
                            runCatching { mediaRepository.getTvDetails(item.id).seriesEpisodeCount }.getOrNull()
                        }
                    item.id to total
                }
            }.awaitAll().mapNotNull { (id, total) -> total?.let { id to it } }.toMap()
        }
        return items.map { item ->
            val badge = resolveHomeWatchedBadgeState(
                item = item,
                watchedMovies = watchedMovies,
                watchedEpisodeCount = watchedEpisodeCounts[item.id] ?: 0,
                seriesEpisodeCount = episodeTotals[item.id] ?: item.seriesEpisodeCount,
            )
            if (item.isWatched == badge.isWatched && item.isPartiallyWatched == badge.isPartiallyWatched) {
                item
            } else {
                item.copy(isWatched = badge.isWatched, isPartiallyWatched = badge.isPartiallyWatched)
            }
        }
    }

    private fun sortCollectionItems(tab: CollectionTab, items: List<MediaItem>): List<MediaItem> =
        if (tab == CollectionTab.TIMELINE) items else items.sortedWith(
            compareByDescending<MediaItem> { it.popularity }
                .thenByDescending { it.tmdbRating.toFloatOrNull() ?: 0f }
                .thenBy { it.title.lowercase() }
        )

    fun preloadLogos(items: List<MediaItem>) {
        if (items.isEmpty()) return
        viewModelScope.launch {
            val current = _cardLogoUrls.value.toMutableMap()
            val missing = items
                .filter { item ->
                    val key = "${item.mediaType}_${item.id}"
                    key !in current
                }
                .take(2)
            if (missing.isEmpty()) return@launch

            missing.forEach { item ->
                mediaRepository.peekCachedLogoUrl(item.mediaType, item.id)?.let { cached ->
                    current["${item.mediaType}_${item.id}"] = cached
                }
            }
            _cardLogoUrls.value = current.toMap()

            val remoteMissing = missing.filter { item ->
                val key = "${item.mediaType}_${item.id}"
                key !in current
            }
            if (remoteMissing.isEmpty()) return@launch

            val fetched = remoteMissing.map { item ->
                async {
                    val key = "${item.mediaType}_${item.id}"
                    val logo = runCatching {
                        mediaRepository.getLogoUrl(item.mediaType, item.id)
                    }.getOrNull()
                    if (logo.isNullOrBlank()) null else key to logo
                }
            }.awaitAll().filterNotNull()

            if (fetched.isNotEmpty()) {
                _cardLogoUrls.value = (_cardLogoUrls.value + fetched).toMap()
            }
        }
    }

    private suspend fun loadCollectionPage(
        catalog: CatalogConfig,
        tab: CollectionTab,
        offset: Int,
        limit: Int
    ): CollectionPage {
        val pageCatalog = catalogForTab(catalog, tab)
        val availability = iptvVodAvailability
        if (!iptvOnlyMode || availability == null) {
            val page = mediaRepository.loadCollectionCatalogPage(pageCatalog, offset, limit)
            return CollectionPage(page.items, page.hasMore, offset + page.items.size)
        }

        val availableItems = mutableListOf<MediaItem>()
        var sourceOffset = offset
        var hasMore = true
        var pagesScanned = 0
        while (availableItems.size < limit && hasMore && pagesScanned < 12) {
            val page = mediaRepository.loadCollectionCatalogPage(
                pageCatalog,
                offset = sourceOffset,
                limit = maxOf(limit, PAGE_STEP),
            )
            if (page.items.isEmpty()) {
                hasMore = false
                break
            }
            sourceOffset += page.items.size
            availableItems += page.items.filter(availability::contains)
            hasMore = page.hasMore
            pagesScanned++
        }
        return CollectionPage(availableItems, hasMore, sourceOffset)
    }

    private fun catalogForTab(catalog: CatalogConfig, tab: CollectionTab): CatalogConfig {
        val filteredSources = catalog.collectionSources.flatMap { source ->
            if (source.kind == CollectionSourceKind.CURATED_IDS && source.mediaType.isNullOrBlank()) {
                val refs = source.curatedRefs.orEmpty().filter { ref ->
                    when (ref.substringBefore(':').lowercase()) {
                        "movie" -> tab == CollectionTab.MOVIES
                        "tv", "series", "show" -> tab == CollectionTab.SERIES
                        else -> false
                    }
                }
                if (refs.isEmpty()) emptyList() else listOf(source.copy(curatedRefs = refs))
            } else if (sourceMatchesTab(source, tab)) {
                listOf(source)
            } else {
                emptyList()
            }
        }
        return catalog.copy(collectionSources = filteredSources)
    }

    private fun supportsTab(catalog: CatalogConfig, tab: CollectionTab): Boolean {
        if (catalog.collectionGroup == CollectionGroupKind.NETWORK) {
            return tab == CollectionTab.SERIES
        }
        return catalog.collectionSources.any { sourceMatchesTab(it, tab) }
    }

    private fun sourceMatchesTab(source: com.arflix.tv.data.model.CollectionSourceConfig, tab: CollectionTab): Boolean {
        source.collectionTab?.trim()?.lowercase()?.let { configuredTab ->
            return when (tab) {
                CollectionTab.MOVIES -> configuredTab == "movie"
                CollectionTab.SERIES -> configuredTab == "series"
                CollectionTab.TIMELINE -> configuredTab == "timeline"
            }
        }
        val mediaType = source.mediaType?.trim()?.lowercase()
        if (mediaType != null) {
            if (mediaType == "all" || mediaType == "any" || mediaType == "both" || mediaType == "mixed") {
                return true
            }
            return when (tab) {
                CollectionTab.MOVIES -> mediaType == "movie" || mediaType == "film"
                CollectionTab.SERIES -> mediaType == "series" || mediaType == "tv" || mediaType == "show" || mediaType == "anime"
                CollectionTab.TIMELINE -> mediaType == "all" || mediaType == "any" || mediaType == "both" || mediaType == "mixed"
            }
        }

        return when (source.kind) {
            com.arflix.tv.data.model.CollectionSourceKind.TMDB_COLLECTION -> tab == CollectionTab.MOVIES
            else -> tab != CollectionTab.TIMELINE
        }
    }
}

@Composable
fun CollectionDetailsScreen(
    catalogId: String,
    currentProfile: com.arflix.tv.data.model.Profile? = null,
    viewModel: CollectionDetailsViewModel = hiltViewModel(),
    onNavigateToDetails: (MediaType, Int) -> Unit,
    onNavigateToPlayer: (MediaType, Int, String, String?, String?) -> Unit,
    onNavigateToHome: () -> Unit,
    onNavigateToSearch: () -> Unit,
    onNavigateToWatchlist: () -> Unit,
    onNavigateToTv: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onSwitchProfile: () -> Unit = {},
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val cardLogoUrls by viewModel.cardLogoUrls.collectAsStateWithLifecycle()
    val context = LocalContext.current
    LaunchedEffect(catalogId) { viewModel.load(catalogId) }
    BackHandler(onBack = onBack)

    val rowKey = remember(catalogId) { "collection:$catalogId" }
    val usePosterCards = uiState.catalog?.collectionGroup !in setOf(
        CollectionGroupKind.GENRE,
        CollectionGroupKind.MOVIE_GENRE,
        CollectionGroupKind.TV_GENRE,
        CollectionGroupKind.STUDIO,
        CollectionGroupKind.NETWORK
    ) &&
        rememberCatalogueRowLayoutMode(rowKey) == CardLayoutMode.POSTER
    val configuration = LocalConfiguration.current
    val isMobile = LocalDeviceType.current.isTouchDevice()
    val isLandscape = configuration.orientation == Configuration.ORIENTATION_LANDSCAPE
    val cardWidth = if (usePosterCards) {
        if (isMobile) 138.dp else when {
            configuration.screenWidthDp >= 2200 -> 196.dp
            configuration.screenWidthDp >= 1600 -> 184.dp
            else -> 172.dp
        }
    } else if (isMobile) 220.dp else 260.dp
    val gridColumns = if (isMobile) {
        if (isLandscape) {
            if (usePosterCards) 4 else 3
        } else if (usePosterCards) {
            3
        } else {
            2
        }
    } else if (usePosterCards) {
        when {
            configuration.screenWidthDp >= 2200 -> 8
            configuration.screenWidthDp >= 1600 -> 7
            else -> 5
        }
    } else {
        when {
            configuration.screenWidthDp >= 2200 -> 6
            configuration.screenWidthDp >= 1600 -> 5
            else -> 4
        }
    }

    val initialTab = when {
        uiState.supportsTimeline -> CollectionTab.TIMELINE
        uiState.supportsMovies -> CollectionTab.MOVIES
        uiState.supportsSeries -> CollectionTab.SERIES
        else -> CollectionTab.MOVIES
    }
    var selectedTab by rememberSaveable(uiState.catalog?.id) { mutableStateOf(initialTab) }
    val moviesGridState = rememberTvLazyGridState()
    val seriesGridState = rememberTvLazyGridState()
    val moviesTabFocusRequester = remember { FocusRequester() }
    val seriesTabFocusRequester = remember { FocusRequester() }
    val timelineTabFocusRequester = remember { FocusRequester() }
    // True after the first focus has been delivered; subsequent ON_RESUME uses saved index.
    var hasReceivedInitialFocus by rememberSaveable { mutableStateOf(false) }
    // Index (within the items list) of the last card the user focused per tab.
    var lastFocusedMovieIndex by rememberSaveable { mutableStateOf(-1) }
    var lastFocusedSeriesIndex by rememberSaveable { mutableStateOf(-1) }
    // Set on back-navigation to trigger focus on the specific card after scrolling to it.
    var pendingFocusIndex by remember { mutableStateOf(-1) }

    LaunchedEffect(uiState.catalog?.id, uiState.supportsMovies, uiState.supportsSeries) {
        val resolvedTab = when {
            selectedTab == CollectionTab.TIMELINE && uiState.supportsTimeline -> CollectionTab.TIMELINE
            selectedTab == CollectionTab.MOVIES && uiState.supportsMovies -> CollectionTab.MOVIES
            selectedTab == CollectionTab.SERIES && uiState.supportsSeries -> CollectionTab.SERIES
            uiState.supportsTimeline -> CollectionTab.TIMELINE
            uiState.supportsMovies -> CollectionTab.MOVIES
            uiState.supportsSeries -> CollectionTab.SERIES
            else -> CollectionTab.MOVIES
        }
        if (resolvedTab != selectedTab) {
            selectedTab = resolvedTab
        }
    }

    val lifecycleOwner = LocalLifecycleOwner.current
    val coroutineScope = rememberCoroutineScope()
    val currentTab by rememberUpdatedState(selectedTab)
    val currentSupportsMovies by rememberUpdatedState(uiState.supportsMovies)
    val currentSupportsSeries by rememberUpdatedState(uiState.supportsSeries)
    val currentSupportsTimeline by rememberUpdatedState(uiState.supportsTimeline)

    fun requestTabFocus() {
        coroutineScope.launch {
            // 300ms clears the 250ms pop-enter animation before touching the focus tree
            kotlinx.coroutines.delay(300)
            if (!hasReceivedInitialFocus) {
                // First entry: focus the tab chip so D-pad works from the start
                runCatching {
                    when (currentTab) {
                        CollectionTab.TIMELINE -> if (currentSupportsTimeline) timelineTabFocusRequester.requestFocus()
                        CollectionTab.MOVIES -> if (currentSupportsMovies) moviesTabFocusRequester.requestFocus()
                        CollectionTab.SERIES -> if (currentSupportsSeries) seriesTabFocusRequester.requestFocus()
                    }
                }
                hasReceivedInitialFocus = true
            } else {
                // Returning from back navigation: scroll back to the saved card index and
                // set pendingFocusIndex so the card requests focus once it's in composition.
                // focusRestorer() can't be used here because lazy grid recycles off-screen
                // items, making saved focus nodes stale by the time we return.
                val savedIndex = when (currentTab) {
                    CollectionTab.TIMELINE -> lastFocusedMovieIndex
                    CollectionTab.MOVIES -> lastFocusedMovieIndex
                    CollectionTab.SERIES -> lastFocusedSeriesIndex
                }
                if (savedIndex >= 0) {
                    val currentGridState = when (currentTab) {
                        CollectionTab.TIMELINE -> moviesGridState
                        CollectionTab.MOVIES -> moviesGridState
                        CollectionTab.SERIES -> seriesGridState
                    }
                    // Grid has 2 header items (tab bar + spacer) before the media cards
                    runCatching { currentGridState.scrollToItem(savedIndex + 2) }
                    pendingFocusIndex = savedIndex
                } else {
                    runCatching {
                        when (currentTab) {
                            CollectionTab.TIMELINE -> if (currentSupportsTimeline) timelineTabFocusRequester.requestFocus()
                            CollectionTab.MOVIES -> if (currentSupportsMovies) moviesTabFocusRequester.requestFocus()
                            CollectionTab.SERIES -> if (currentSupportsSeries) seriesTabFocusRequester.requestFocus()
                        }
                    }
                }
            }
        }
    }

    LaunchedEffect(selectedTab) { pendingFocusIndex = -1 }

    // Fires on fresh composition (first entry or recreation after back navigation)
    LaunchedEffect(Unit) { requestTabFocus() }

    // Fires when the screen resumes from STARTED (back navigation without recreation)
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) requestTabFocus()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    BackHandler {
        onBack()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(appBackgroundDark())
            .onPreviewKeyEvent { event ->
                if (event.type == KeyEventType.KeyDown &&
                    (event.key == Key.Back || event.key == Key.Escape)
                ) {
                    onBack()
                    true
                } else {
                    false
                }
            }
    ) {
        CollectionBackdrop(catalog = uiState.catalog)
        val activeTab = selectedTab
        val items = when (activeTab) {
            CollectionTab.TIMELINE -> uiState.timelineItems
            CollectionTab.MOVIES -> uiState.movieItems
            CollectionTab.SERIES -> uiState.seriesItems
        }
        val isTabLoading = when (activeTab) {
            CollectionTab.TIMELINE -> uiState.isLoadingTimeline
            CollectionTab.MOVIES -> uiState.isLoadingMovies
            CollectionTab.SERIES -> uiState.isLoadingSeries
        }
        val isTabLoadingMore = when (activeTab) {
            CollectionTab.TIMELINE -> uiState.isLoadingMoreTimeline
            CollectionTab.MOVIES -> uiState.isLoadingMoreMovies
            CollectionTab.SERIES -> uiState.isLoadingMoreSeries
        }
        val gridState = when (activeTab) {
            CollectionTab.TIMELINE, CollectionTab.MOVIES -> moviesGridState
            CollectionTab.SERIES -> seriesGridState
        }
        CollectionItemsGrid(
            items = items,
            gridColumns = gridColumns,
            cardWidth = cardWidth,
            usePosterCards = usePosterCards,
            gridState = gridState,
            pendingFocusIndex = pendingFocusIndex,
            onClearPendingFocus = { pendingFocusIndex = -1 },
            hasMovies = uiState.supportsMovies,
            hasSeries = uiState.supportsSeries,
            hasTimeline = uiState.supportsTimeline,
            cardLogoUrls = cardLogoUrls,
            selectedTab = selectedTab,
            moviesTabFocusRequester = moviesTabFocusRequester,
            seriesTabFocusRequester = seriesTabFocusRequester,
            timelineTabFocusRequester = timelineTabFocusRequester,
            onTabSelected = { selectedTab = it },
            onItemClick = { item ->
                onNavigateToDetails(item.mediaType, item.id)
            },
            onItemFocused = { item, index ->
                viewModel.preloadLogos(listOf(item))
                when (activeTab) {
                    CollectionTab.TIMELINE, CollectionTab.MOVIES -> lastFocusedMovieIndex = index
                    CollectionTab.SERIES -> lastFocusedSeriesIndex = index
                }
            },
            onVisibleItemsChanged = { visibleItems -> viewModel.preloadLogos(visibleItems) },
            onNearEnd = { viewModel.loadMoreIfNeeded(activeTab) },
            isLoading = isTabLoading,
            isLoadingMore = isTabLoadingMore,
            loadingAccent = resolveAccentColor(
                fallback = collectionAccentColor(uiState.catalog?.collectionGroup),
            ),
            emptyMessage = when (uiState.error) {
                null -> stringResource(R.string.collection_empty)
                COLLECTION_LOAD_FAILED_ERROR -> stringResource(R.string.collection_failed_load)
                COLLECTION_NOT_FOUND_ERROR -> stringResource(R.string.collection_not_found)
                else -> uiState.error!!
            },
            topContentPadding = if (isMobile) 18.dp else if (usePosterCards) 22.dp else 10.dp
        )
    }
}

@Composable
private fun CollectionBackdrop(catalog: CatalogConfig?) {
    val showAsLogo = catalog?.collectionGroup == CollectionGroupKind.STUDIO ||
        catalog?.collectionGroup == CollectionGroupKind.NETWORK
    val backdrop = catalog?.collectionHeroImageUrl
        ?.takeIf { it.isNotBlank() }
        ?: catalog?.collectionCoverImageUrl?.takeIf { it.isNotBlank() }
    var logoGradient by remember(backdrop) { mutableStateOf(NeutralLogoBrandGradient) }
    val accent = if (showAsLogo) logoGradient.first() else collectionAccentColor(catalog?.collectionGroup)

    Box(modifier = Modifier.fillMaxSize()) {
        if (showAsLogo) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.linearGradient(
                            logoGradient
                        )
                    )
            )
        }
        if (backdrop != null) {
            AsyncImage(
                model = backdrop,
                contentDescription = null,
                modifier = Modifier
                    .fillMaxSize()
                    .then(
                        if (showAsLogo) Modifier.padding(horizontal = 180.dp, vertical = 100.dp)
                        else Modifier
                    ),
                contentScale = if (showAsLogo) {
                    androidx.compose.ui.layout.ContentScale.Fit
                } else {
                    androidx.compose.ui.layout.ContentScale.Crop
                },
                alpha = if (showAsLogo) 0.32f else 0.2f,
                onSuccess = { success ->
                    if (showAsLogo) {
                        logoGradient = logoBrandGradient(
                            success.result.drawable,
                            allowLightBackground = false,
                        )
                    }
                },
            )
        }
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            accent.copy(alpha = 0.32f),
                            accent.copy(alpha = 0.1f),
                            Color.Transparent
                        )
                    )
                )
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            appBackgroundDark().copy(alpha = 0.62f),
                            accent.copy(alpha = 0.12f),
                            appBackgroundDark().copy(alpha = 0.88f),
                            appBackgroundDark()
                        )
                    )
                )
        )
    }
}

private fun collectionAccentColor(group: CollectionGroupKind?): Color = when (group) {
    CollectionGroupKind.FEATURED -> Color(0xFFE6A23C)
    CollectionGroupKind.SERVICE -> Color(0xFF1AA7EC)
    CollectionGroupKind.GENRE,
    CollectionGroupKind.MOVIE_GENRE,
    CollectionGroupKind.TV_GENRE -> Color(0xFFC65D3B)
    CollectionGroupKind.DECADE -> Color(0xFFB98B32)
    CollectionGroupKind.FRANCHISE -> Color(0xFF2F9C95)
    CollectionGroupKind.STUDIO,
    CollectionGroupKind.NETWORK -> NeutralLogoBrandGradient.first()
    null -> Color.White
}

@Composable
private fun CollectionTabBar(
    hasMovies: Boolean,
    hasSeries: Boolean,
    hasTimeline: Boolean,
    selectedTab: CollectionTab,
    moviesTabFocusRequester: FocusRequester,
    seriesTabFocusRequester: FocusRequester,
    timelineTabFocusRequester: FocusRequester,
    onTabSelected: (CollectionTab) -> Unit
) {
    val showTimeline = hasTimeline
    val showMovies = hasMovies || !hasSeries
    val showSeries = hasSeries || !hasMovies
    val onlyOne = showTimeline.not() && (showMovies xor showSeries)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .arvioDpadFocusGroup()
            .padding(start = 42.dp, end = 42.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        if (showTimeline) {
            CollectionTabChip(
                label = when (selectedTab) {
                    CollectionTab.TIMELINE -> "Timeline"
                    else -> "Timeline"
                },
                isSelected = selectedTab == CollectionTab.TIMELINE,
                focusRequester = timelineTabFocusRequester,
                onClick = { onTabSelected(CollectionTab.TIMELINE) }
            )
        }
        if (showMovies) {
            CollectionTabChip(
                label = stringResource(R.string.movies),
                isSelected = selectedTab == CollectionTab.MOVIES || onlyOne,
                focusRequester = moviesTabFocusRequester,
                onClick = { onTabSelected(CollectionTab.MOVIES) }
            )
        }
        if (showSeries) {
            CollectionTabChip(
                label = stringResource(R.string.series),
                isSelected = selectedTab == CollectionTab.SERIES || onlyOne,
                focusRequester = seriesTabFocusRequester,
                onClick = { onTabSelected(CollectionTab.SERIES) }
            )
        }
    }
}

@Composable
private fun CollectionTabChip(
    label: String,
    isSelected: Boolean,
    focusRequester: FocusRequester,
    onClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }
    val accent = resolveAccentColor(fallback = TextPrimary)
    val shape = RoundedCornerShape(50)
    val bg = when {
        isSelected -> accent.copy(alpha = 0.28f)
        isFocused -> Color.Transparent
        else -> Color.White.copy(alpha = 0.08f)
    }
    val fg = when {
        isSelected -> Color.White
        isFocused -> Color.White
        else -> TextPrimary.copy(alpha = 0.75f)
    }
    val borderColor = when {
        isFocused -> accent
        else -> Color.Transparent
    }
    val borderWidth = when {
        isFocused -> 2.dp
        else -> 0.dp
    }
    Box(
        modifier = Modifier
            .clip(shape)
            .background(bg)
            .border(width = borderWidth, color = borderColor, shape = shape)
            .focusRequester(focusRequester)
            .onFocusChanged { isFocused = it.isFocused }
            .onPreviewKeyEvent { event ->
                event.type == KeyEventType.KeyDown && event.key == Key.DirectionUp
            }
            .focusable()
            .clickable(onClick = onClick)
            .padding(horizontal = 22.dp, vertical = 10.dp)
    ) {
        androidx.tv.material3.Text(
            text = label,
            style = ArflixTypography.sectionTitle.copy(
                fontSize = 14.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.SemiBold,
                letterSpacing = 0.4.sp
            ),
            color = fg
        )
    }
}

@Composable
private fun CollectionItemsGrid(
    items: List<MediaItem>,
    gridColumns: Int,
    cardWidth: androidx.compose.ui.unit.Dp,
    usePosterCards: Boolean,
    gridState: androidx.tv.foundation.lazy.grid.TvLazyGridState,
    pendingFocusIndex: Int,
    onClearPendingFocus: () -> Unit,
    hasMovies: Boolean,
    hasSeries: Boolean,
    hasTimeline: Boolean,
    cardLogoUrls: Map<String, String>,
    selectedTab: CollectionTab,
    moviesTabFocusRequester: FocusRequester,
    seriesTabFocusRequester: FocusRequester,
    timelineTabFocusRequester: FocusRequester,
    onTabSelected: (CollectionTab) -> Unit,
    onItemClick: (MediaItem) -> Unit,
    onItemFocused: (MediaItem, Int) -> Unit,
    onVisibleItemsChanged: (List<MediaItem>) -> Unit,
    onNearEnd: () -> Unit,
    isLoading: Boolean,
    isLoadingMore: Boolean,
    loadingAccent: Color,
    emptyMessage: String,
    topContentPadding: androidx.compose.ui.unit.Dp
) {
    val cardContentType = if (usePosterCards) "poster_card" else "landscape_card"
    val focusBleedPadding = if (usePosterCards) 10.dp else 6.dp
    val latestItems by rememberUpdatedState(items)
    val latestGridColumns by rememberUpdatedState(gridColumns)
    val latestOnVisibleItemsChanged by rememberUpdatedState(onVisibleItemsChanged)
    val latestOnNearEnd by rememberUpdatedState(onNearEnd)
    // Collect scroll position without restarting on page-load-size changes —
    // items.size used to live in the key, which relaunched the snapshotFlow on
    // every page append and caused a stutter frame during scroll.
    LaunchedEffect(gridState) {
        snapshotFlow {
            val layout = gridState.layoutInfo
            val last = layout.visibleItemsInfo.lastOrNull()?.index ?: 0
            val mediaIndexes = layout.visibleItemsInfo
                .asSequence()
                .map { it.index - 2 }
                .filter { it >= 0 }
                .toList()
            Triple(last, layout.totalItemsCount, mediaIndexes)
        }.distinctUntilChanged().collect { (last, total, mediaIndexes) ->
            if (total > 12 && last >= total - 3) latestOnNearEnd()
            if (mediaIndexes.isNotEmpty()) {
                val start = (mediaIndexes.minOrNull() ?: 0).coerceAtLeast(0)
                val currentItems = latestItems
                val end = ((mediaIndexes.maxOrNull() ?: start) + latestGridColumns)
                    .coerceAtMost(currentItems.lastIndex)
                if (start <= end) {
                    latestOnVisibleItemsChanged(currentItems.subList(start, end + 1))
                }
            }
        }
    }

    TvLazyVerticalGrid(
        columns = TvGridCells.Fixed(gridColumns),
        state = gridState,
        modifier = Modifier.fillMaxSize().arvioDpadFocusGroup().clipToBounds(),
        contentPadding = PaddingValues(
            start = 42.dp,
            top = topContentPadding,
            end = 42.dp,
            bottom = 48.dp + focusBleedPadding
        ),
        verticalArrangement = Arrangement.spacedBy(if (usePosterCards) 18.dp else 14.dp),
        horizontalArrangement = Arrangement.spacedBy(if (usePosterCards) 18.dp else 14.dp)
    ) {
        item(
            span = { androidx.tv.foundation.lazy.grid.TvGridItemSpan(maxLineSpan) },
            contentType = "tabs"
        ) {
            CollectionTabBar(
                hasMovies = hasMovies,
                hasSeries = hasSeries,
                hasTimeline = hasTimeline,
                selectedTab = selectedTab,
                moviesTabFocusRequester = moviesTabFocusRequester,
                seriesTabFocusRequester = seriesTabFocusRequester,
                timelineTabFocusRequester = timelineTabFocusRequester,
                onTabSelected = onTabSelected
            )
        }
        item(
            span = { androidx.tv.foundation.lazy.grid.TvGridItemSpan(maxLineSpan) },
            contentType = "tabs_gap"
        ) {
            Box(modifier = Modifier.height(6.dp))
        }

        if (isLoading) {
            item(
                span = { androidx.tv.foundation.lazy.grid.TvGridItemSpan(maxLineSpan) },
                contentType = "loading_indicator"
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    androidx.compose.material3.CircularProgressIndicator(
                        color = loadingAccent,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
            val cardHeight = if (usePosterCards) cardWidth * 1.5f else cardWidth * 9f / 16f
            itemsIndexed((1..gridColumns * 3).toList(), contentType = { _, _ -> "skeleton" }) { _, _ ->
                Box(
                    modifier = Modifier
                        .height(cardHeight)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color.White.copy(alpha = 0.05f))
                )
            }
        } else if (items.isEmpty() && !isLoadingMore) {
            item(
                span = { androidx.tv.foundation.lazy.grid.TvGridItemSpan(maxLineSpan) },
                contentType = "empty"
            ) {
                CollectionEmptyState(message = emptyMessage)
            }
        } else {
            itemsIndexed(
                items,
                key = { _, item -> "${item.mediaType}-${item.id}" },
                contentType = { _, _ -> cardContentType }
            ) { index, item ->
                val cardLogoUrl = cardLogoUrls["${item.mediaType}_${item.id}"]
                val itemFocusRequester = remember { FocusRequester() }

                // Fires when scrollToItem brings this card into composition on back-navigation.
                // pendingFocusIndex is set by requestTabFocus() after scrolling to this item.
                LaunchedEffect(pendingFocusIndex) {
                    if (pendingFocusIndex == index) {
                        delay(50)
                        runCatching { itemFocusRequester.requestFocus() }
                        onClearPendingFocus()
                    }
                }

                MediaCard(
                    item = item,
                    width = cardWidth,
                    isLandscape = !usePosterCards,
                    logoImageUrl = cardLogoUrl,
                    showTitle = true,
                    titleMaxLines = if (usePosterCards) 2 else 1,
                    onFocused = {
                        onItemFocused(item, index)
                        if (items.size > 10 && index >= items.size - 2) onNearEnd()
                    },
                    onClick = { onItemClick(item) },
                    modifier = Modifier.focusRequester(itemFocusRequester)
                )
            }
        }

        if (isLoadingMore) {
            item(
                span = { androidx.tv.foundation.lazy.grid.TvGridItemSpan(maxLineSpan) },
                contentType = "loading_more"
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    androidx.compose.material3.CircularProgressIndicator(
                        color = loadingAccent,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun CollectionEmptyState(message: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(320.dp),
        contentAlignment = Alignment.Center
    ) {
        val accent = resolveAccentColor(NeutralLogoBrandGradient.first())
        Row(
            modifier = Modifier
                .padding(horizontal = 24.dp)
                .background(
                    color = Color.White.copy(alpha = 0.055f),
                    shape = RoundedCornerShape(14.dp)
                )
                .border(
                    width = 1.dp,
                    color = accent.copy(alpha = 0.35f),
                    shape = RoundedCornerShape(14.dp)
                )
                .padding(horizontal = 28.dp, vertical = 22.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .background(accent.copy(alpha = 0.12f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                androidx.compose.material3.Icon(
                    imageVector = Icons.Default.Movie,
                    contentDescription = null,
                    tint = accent,
                    modifier = Modifier.size(32.dp)
                )
            }
            androidx.tv.material3.Text(
                text = message,
                color = TextPrimary,
                style = ArflixTypography.body.copy(fontWeight = FontWeight.SemiBold)
            )
        }
    }
}
