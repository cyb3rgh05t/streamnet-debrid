package com.arflix.tv.ui.screens.watchlist

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.arflix.tv.R
import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType.MOVIE
import com.arflix.tv.data.model.MediaType.TV
import com.arflix.tv.data.repository.CloudSyncRepository
import com.arflix.tv.data.repository.MediaRepository
import com.arflix.tv.data.repository.HomeServerCatalogCandidate
import com.arflix.tv.data.repository.HomeServerKind
import com.arflix.tv.data.repository.HomeServerLibrarySort
import com.arflix.tv.data.repository.HomeServerRepository
import com.arflix.tv.data.repository.TraktRepository
import com.arflix.tv.data.repository.WatchlistRepository
import com.arflix.tv.util.AppLogger
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withTimeoutOrNull
import javax.inject.Inject

enum class ToastType {
    SUCCESS, ERROR, INFO
}

data class WatchlistUiState(
    val isLoading: Boolean = true,
    val movies: List<MediaItem> = emptyList(),
    val series: List<MediaItem> = emptyList(),
    val error: String? = null,
    val toastMessage: String? = null,
    val toastType: ToastType = ToastType.INFO
) {
    val isEmpty: Boolean get() = movies.isEmpty() && series.isEmpty()
    val allItems: List<MediaItem> get() = movies + series
}

data class HomeLibraryUiState(
    val providers: List<HomeServerKind> = emptyList(),
    val libraries: List<HomeServerCatalogCandidate> = emptyList(),
    val selectedProvider: HomeServerKind? = null,
    val selectedSourceRef: String? = null,
    val items: List<MediaItem> = emptyList(),
    val isLoading: Boolean = false,
    val isLoadingMore: Boolean = false,
    val hasMore: Boolean = false,
    val sort: HomeServerLibrarySort = HomeServerLibrarySort.RECENTLY_ADDED,
    val searchQuery: String = "",
    val error: String? = null
)

internal fun watchlistLogoKey(item: MediaItem): String {
    return if (item.id > 0) {
        "tmdb:${item.mediaType.name}:${item.id}"
    } else {
        "home:${item.homeServerSourceRef.orEmpty()}:${item.homeServerItemId.orEmpty()}:${item.mediaType.name}"
    }
}

@HiltViewModel
class WatchlistViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val watchlistRepository: WatchlistRepository,
    private val cloudSyncRepository: CloudSyncRepository,
    private val traktRepository: TraktRepository,
    private val remoteSyncManager: com.arflix.tv.data.repository.sync.RemoteSyncManager,
    private val mediaRepository: MediaRepository,
    private val homeServerRepository: HomeServerRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(WatchlistUiState())
    val uiState: StateFlow<WatchlistUiState> = _uiState.asStateFlow()

    private val _logoUrls = MutableStateFlow<Map<String, String>>(emptyMap())
    val logoUrls: StateFlow<Map<String, String>> = _logoUrls.asStateFlow()
    private val _libraryState = MutableStateFlow(HomeLibraryUiState())
    val libraryState: StateFlow<HomeLibraryUiState> = _libraryState.asStateFlow()
    private val libraryCache = linkedMapOf<String, Pair<List<MediaItem>, Boolean>>()
    private var libraryLoadJob: Job? = null
    private var librarySearchJob: Job? = null
    private var libraryRequestId = 0
    private var traktSyncInFlight = false
    private var initialLoadComplete = false
    private var enrichmentInFlight = false
    private var enrichmentRequested = false
    private val logoRequestsInFlight = mutableSetOf<String>()

    private fun watchlistDiagnosticContext(
        phase: String,
        extra: Map<String, String> = emptyMap()
    ): Map<String, String> = mutableMapOf(
        "error_area" to "Watchlist",
        "watchlist_phase" to phase,
        "visible_count" to _uiState.value.allItems.size.toString()
    ).apply { putAll(extra) }

    private fun List<MediaItem>.watchlistDisplayOrder(): List<MediaItem> {
        return sortedWith(
            compareBy<MediaItem> { it.sourceOrder }
                .thenByDescending { it.addedAt }
        )
    }

    private fun List<MediaItem>.needsArtworkEnrichment(): Boolean {
        return any { item -> item.image.isBlank() && item.backdrop.isNullOrBlank() }
    }

    private fun List<MediaItem>.toSplitState(
        isLoading: Boolean = false,
        error: String? = null,
        toastMessage: String? = null,
        toastType: ToastType = ToastType.INFO
    ): WatchlistUiState = WatchlistUiState(
        isLoading = isLoading,
        movies = filter { it.mediaType == MOVIE },
        series = filter { it.mediaType == TV },
        error = error,
        toastMessage = toastMessage,
        toastType = toastType
    )

    init {
        observeWatchlistChanges()
        observeHomeServers()
        loadWatchlistInstant()
    }

    private fun observeWatchlistChanges() {
        viewModelScope.launch {
            watchlistRepository.watchlistItems.collect { items ->
                if (traktSyncInFlight) return@collect
                val current = _uiState.value
                if (items.isNotEmpty() || !current.isLoading) {
                    val orderedItems = items.watchlistDisplayOrder()
                    _uiState.value = orderedItems.toSplitState(isLoading = false)
                    fetchLogos(orderedItems)
                }
            }
        }
    }

    private fun fetchLogos(items: List<MediaItem>) {
        viewModelScope.launch {
            val pending = items
                .distinctBy(::watchlistLogoKey)
                .filter { item ->
                    val key = watchlistLogoKey(item)
                    key !in _logoUrls.value && logoRequestsInFlight.add(key)
                }
            if (pending.isEmpty()) return@launch

            val limiter = Semaphore(5)
            val resolved = try {
                coroutineScope {
                    pending.map { item ->
                        async {
                            limiter.withPermit {
                                watchlistLogoKey(item) to runCatching {
                                    mediaRepository.getLogoUrl(item)
                                }.getOrNull()
                            }
                        }
                    }.awaitAll()
                }
            } finally {
                pending.forEach { logoRequestsInFlight.remove(watchlistLogoKey(it)) }
            }
            val found = resolved.mapNotNull { (key, url) -> url?.let { key to it } }.toMap()
            if (found.isNotEmpty()) {
                _logoUrls.value = _logoUrls.value + found
            }
        }
    }

    fun ensureLogo(item: MediaItem) = fetchLogos(listOf(item))

    private fun observeHomeServers() {
        viewModelScope.launch {
            homeServerRepository.connections.collect { connections ->
                val providers = connections
                    .filter { it.isUsable }
                    .map { it.serverKind }
                    .distinct()
                    .sortedBy { kind ->
                        when (kind) {
                            HomeServerKind.PLEX -> 0
                            HomeServerKind.JELLYFIN -> 1
                            HomeServerKind.EMBY -> 2
                            HomeServerKind.UNKNOWN -> 3
                        }
                    }
                val candidates = runCatching { homeServerRepository.getCatalogCandidates() }
                    .getOrDefault(emptyList())
                    .filter { candidate ->
                        candidate.serverKind in providers &&
                            candidate.collectionType.lowercase() in BROWSABLE_LIBRARY_TYPES
                    }
                val current = _libraryState.value
                val selectedProvider = current.selectedProvider?.takeIf { it in providers }
                val selectedSource = current.selectedSourceRef?.takeIf { source ->
                    candidates.any { it.sourceRef == source && it.serverKind == selectedProvider }
                }
                _libraryState.value = current.copy(
                    providers = providers,
                    libraries = candidates,
                    selectedProvider = selectedProvider,
                    selectedSourceRef = selectedSource,
                    items = if (selectedProvider == null) emptyList() else current.items
                )
            }
        }
    }

    fun selectLibraryProvider(provider: HomeServerKind?) {
        val current = _libraryState.value
        if (current.selectedProvider == provider) return
        libraryLoadJob?.cancel()
        if (provider == null) {
            _libraryState.value = current.copy(
                selectedProvider = null,
                selectedSourceRef = null,
                items = emptyList(),
                isLoading = false,
                isLoadingMore = false,
                error = null
            )
            return
        }
        val firstLibrary = current.libraries.firstOrNull { it.serverKind == provider }
        _libraryState.value = current.copy(
            selectedProvider = provider,
            selectedSourceRef = firstLibrary?.sourceRef,
            error = null
        )
        if (firstLibrary != null) loadLibraryFirstPage()
    }

    fun selectLibrary(sourceRef: String) {
        if (_libraryState.value.selectedSourceRef == sourceRef) return
        _libraryState.value = _libraryState.value.copy(selectedSourceRef = sourceRef, error = null)
        loadLibraryFirstPage()
    }

    fun setLibrarySort(sort: HomeServerLibrarySort) {
        if (_libraryState.value.sort == sort) return
        _libraryState.value = _libraryState.value.copy(sort = sort, error = null)
        loadLibraryFirstPage()
    }

    fun setLibrarySearch(query: String) {
        if (_libraryState.value.searchQuery == query) return
        libraryRequestId++
        libraryLoadJob?.cancel()
        _libraryState.value = _libraryState.value.copy(searchQuery = query)
        librarySearchJob?.cancel()
        librarySearchJob = viewModelScope.launch {
            delay(300)
            loadLibraryFirstPage()
        }
    }

    fun refreshLibrary() = loadLibraryFirstPage(force = true)

    private fun libraryCacheKey(state: HomeLibraryUiState): String = listOf(
        state.selectedSourceRef.orEmpty(),
        state.sort.name,
        state.searchQuery.trim().lowercase()
    ).joinToString("|")

    private fun loadLibraryFirstPage(force: Boolean = false) {
        val snapshot = _libraryState.value
        val sourceRef = snapshot.selectedSourceRef ?: return
        val cacheKey = libraryCacheKey(snapshot)
        val cached = libraryCache[cacheKey]
        if (cached != null && !force) {
            _libraryState.value = snapshot.copy(items = cached.first, hasMore = cached.second, isLoading = false, error = null)
        } else {
            _libraryState.value = snapshot.copy(isLoading = true, isLoadingMore = false, error = null)
        }
        val requestId = ++libraryRequestId
        libraryLoadJob?.cancel()
        libraryLoadJob = viewModelScope.launch {
            runCatching {
                mediaRepository.loadHomeServerLibraryPage(
                    sourceRef = sourceRef,
                    offset = 0,
                    limit = LIBRARY_PAGE_SIZE,
                    sort = snapshot.sort,
                    searchQuery = snapshot.searchQuery
                )
            }.onSuccess { page ->
                if (requestId != libraryRequestId) return@onSuccess
                libraryCache[cacheKey] = page.items to page.hasMore
                while (libraryCache.size > 12) libraryCache.remove(libraryCache.keys.first())
                _libraryState.value = _libraryState.value.copy(
                    items = page.items,
                    hasMore = page.hasMore,
                    isLoading = false,
                    isLoadingMore = false,
                    error = null
                )
                fetchLogos(page.items.take(LIBRARY_LOGO_INITIAL_PREFETCH))
            }.onFailure { error ->
                if (requestId != libraryRequestId) return@onFailure
                _libraryState.value = _libraryState.value.copy(
                    items = if (cached == null) emptyList() else _libraryState.value.items,
                    isLoading = false,
                    isLoadingMore = false,
                    error = if (cached == null) error.message ?: context.getString(R.string.homeserver_connection_failed) else null
                )
            }
        }
    }

    fun loadMoreLibrary() {
        val snapshot = _libraryState.value
        val sourceRef = snapshot.selectedSourceRef ?: return
        if (!snapshot.hasMore || snapshot.isLoading || snapshot.isLoadingMore) return
        val requestId = libraryRequestId
        val cacheKey = libraryCacheKey(snapshot)
        _libraryState.value = snapshot.copy(isLoadingMore = true)
        viewModelScope.launch {
            runCatching {
                mediaRepository.loadHomeServerLibraryPage(
                    sourceRef = sourceRef,
                    offset = snapshot.items.size,
                    limit = LIBRARY_PAGE_SIZE,
                    sort = snapshot.sort,
                    searchQuery = snapshot.searchQuery
                )
            }.onSuccess { page ->
                if (requestId != libraryRequestId) return@onSuccess
                val current = _libraryState.value
                val existing = current.items.mapTo(HashSet()) { "${it.mediaType}:${it.id}:${it.homeServerItemId}" }
                val fresh = page.items.filter { "${it.mediaType}:${it.id}:${it.homeServerItemId}" !in existing }
                val merged = current.items + fresh
                val next = current.copy(items = merged, hasMore = page.hasMore, isLoadingMore = false)
                _libraryState.value = next
                libraryCache[cacheKey] = merged to page.hasMore
                fetchLogos(fresh.take(LIBRARY_LOGO_INITIAL_PREFETCH))
            }.onFailure {
                if (requestId == libraryRequestId) {
                    _libraryState.value = _libraryState.value.copy(isLoadingMore = false)
                }
            }
        }
    }

    private fun loadWatchlistInstant() {
        viewModelScope.launch {
            val initialLocalItems = watchlistRepository.getLocalWatchlistItems().watchlistDisplayOrder()
            if (initialLocalItems.isNotEmpty()) {
                _uiState.value = initialLocalItems.toSplitState(isLoading = false)
                fetchLogos(initialLocalItems)
            }

            if (initialLocalItems.isEmpty()) {
                withTimeoutOrNull(3_500) {
                    runCatching { cloudSyncRepository.pullFromCloud() }
                        .onFailure { error ->
                            AppLogger.recordException(
                                throwable = error,
                                context = watchlistDiagnosticContext("startup_cloud_pull")
                            )
                        }
                }
                val cloudItems = watchlistRepository.getLocalWatchlistItems().watchlistDisplayOrder()
                if (cloudItems.isNotEmpty()) {
                    _uiState.value = cloudItems.toSplitState(isLoading = false)
                    fetchLogos(cloudItems)
                }
            }

            val remoteConnected = runCatching { remoteSyncManager.isRemoteConnected() }.getOrDefault(false)
            if (!remoteConnected) {
                val items = watchlistRepository.getLocalWatchlistItems().watchlistDisplayOrder()
                _uiState.value = items.toSplitState(isLoading = false)
                if (items.isNotEmpty()) fetchLogos(items)
                if (items.isNotEmpty()) enrichLocalWatchlistInBackground()
                initialLoadComplete = true
                return@launch
            }

            val visibleItems = watchlistRepository.getLocalWatchlistItems().watchlistDisplayOrder()
            _uiState.value = visibleItems.toSplitState(isLoading = visibleItems.isEmpty())
            if (visibleItems.isNotEmpty()) fetchLogos(visibleItems)
            if (visibleItems.needsArtworkEnrichment()) enrichLocalWatchlistInBackground()
            initialLoadComplete = true

            // Trakt is authoritative when connected, but it must not hold the page hostage.
            val syncedFromTrakt = withTimeoutOrNull(12_000) {
                syncTraktWatchlistSuspend()
            } ?: false

            if (!syncedFromTrakt) {
                val fallbackItems = watchlistRepository.getLocalWatchlistItems().watchlistDisplayOrder()
                if (fallbackItems.isNotEmpty()) {
                    _uiState.value = fallbackItems.toSplitState(isLoading = false)
                    fetchLogos(fallbackItems)
                    enrichLocalWatchlistInBackground()
                } else {
                    _uiState.value = WatchlistUiState(
                        isLoading = false,
                        error = context.getString(R.string.watchlist_error_load_trakt)
                    )
                }
            } else {
                enrichLocalWatchlistInBackground()
            }
        }
    }

    private fun enrichLocalWatchlistInBackground() {
        if (enrichmentInFlight) {
            enrichmentRequested = true
            return
        }
        enrichmentInFlight = true
        viewModelScope.launch {
            try {
                do {
                    enrichmentRequested = false
                    val enrichedItems = watchlistRepository.refreshWatchlistItems().watchlistDisplayOrder()
                    if (enrichedItems.isNotEmpty()) {
                        _uiState.value = enrichedItems.toSplitState(isLoading = false)
                        fetchLogos(enrichedItems)
                    } else if (_uiState.value.isLoading) {
                        _uiState.value = WatchlistUiState(isLoading = false)
                    }
                } while (enrichmentRequested)
            } catch (error: Exception) {
                if (error is kotlinx.coroutines.CancellationException) throw error
                AppLogger.recordException(
                    throwable = error,
                    context = watchlistDiagnosticContext("background_enrich")
                )
                if (_uiState.value.isLoading) {
                    val fallbackItems = watchlistRepository.getLocalWatchlistItems().watchlistDisplayOrder()
                    _uiState.value = fallbackItems.toSplitState(isLoading = false)
                }
            } finally {
                enrichmentInFlight = false
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            val hadItems = _uiState.value.allItems.isNotEmpty()
            _uiState.value = _uiState.value.copy(isLoading = !hadItems)
            try {
                val remoteConnected = runCatching { remoteSyncManager.isRemoteConnected() }.getOrDefault(false)
                val syncedFromTrakt = if (remoteConnected) {
                    withTimeoutOrNull(15_000) { syncTraktWatchlistSuspend() } ?: false
                } else {
                    false
                }
                if (!syncedFromTrakt && !remoteConnected) {
                    val items = watchlistRepository.refreshWatchlistItems().watchlistDisplayOrder()
                    _uiState.value = items.toSplitState(isLoading = false)
                } else if (!syncedFromTrakt) {
                    showLocalWatchlistOrError(context.getString(R.string.watchlist_error_load_trakt))
                } else {
                    enrichLocalWatchlistInBackground()
                }
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e

                AppLogger.recordException(
                    throwable = e,
                    context = watchlistDiagnosticContext("refresh")
                )
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    toastMessage = context.getString(R.string.watchlist_error_refresh),
                    toastType = ToastType.ERROR
                )
            }
        }
    }

    fun refreshAfterResume() {
        if (!initialLoadComplete) return
        viewModelScope.launch {
            val remoteConnected = runCatching { remoteSyncManager.isRemoteConnected() }.getOrDefault(false)
            if (!remoteConnected || traktSyncInFlight) return@launch
            val syncedFromTrakt = withTimeoutOrNull(10_000) { syncTraktWatchlistSuspend() } ?: false
            if (!syncedFromTrakt && _uiState.value.isLoading) {
                val fallbackItems = watchlistRepository.getLocalWatchlistItems().watchlistDisplayOrder()
                _uiState.value = fallbackItems.toSplitState(isLoading = false)
            }
        }
    }

    private suspend fun showLocalWatchlistOrError(message: String) {
        val cachedItems = watchlistRepository.getLocalWatchlistItems().watchlistDisplayOrder()
        if (cachedItems.isNotEmpty()) {
            _uiState.value = cachedItems.toSplitState(isLoading = false)
            fetchLogos(cachedItems)
        } else {
            _uiState.value = WatchlistUiState(isLoading = false, error = message)
        }
    }

    fun removeFromWatchlist(item: MediaItem) {
        viewModelScope.launch {
            try {
                val remoteConnected = runCatching { remoteSyncManager.isRemoteConnected() }.getOrDefault(false)
                val isAnime = item.mediaType == TV &&
                    item.originalLanguage.equals("ja", ignoreCase = true) &&
                    item.genreIds.contains(16)
                if (remoteConnected && !remoteSyncManager.removeFromWatchlist(item.mediaType, item.id, isAnime)) {
                    throw IllegalStateException(context.getString(R.string.watchlist_failed_remove_trakt))
                }

                watchlistRepository.removeFromWatchlist(item.mediaType, item.id)

                // Optimistic update - remove from local state immediately
                val current = _uiState.value
                _uiState.value = current.copy(
                    movies = current.movies.filter { it.id != item.id || it.mediaType != item.mediaType },
                    series = current.series.filter { it.id != item.id || it.mediaType != item.mediaType },
                    toastMessage = context.getString(R.string.watchlist_toast_removed),
                    toastType = ToastType.SUCCESS
                )
                val cloudPushResult: Result<Unit> = runCatching {
                    cloudSyncRepository.pushLocalSnapshotToCloud()
                }.getOrElse { Result.failure(it) }
                cloudPushResult
                    .onFailure { error ->
                        AppLogger.recordException(
                            throwable = error,
                            context = watchlistDiagnosticContext("remove_cloud_push")
                        )
                    }
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e

                AppLogger.recordException(
                    throwable = e,
                    context = watchlistDiagnosticContext(
                        phase = "remove",
                        extra = mapOf("media_type" to item.mediaType.name.lowercase())
                    )
                )
                _uiState.value = _uiState.value.copy(
                    toastMessage = context.getString(R.string.watchlist_failed_remove),
                    toastType = ToastType.ERROR
                )
            }
        }
    }

    /**
     * Pull Trakt watchlist and mirror it locally. Trakt is the source of truth
     * for both order and IDs when connected.
     */
    private suspend fun syncTraktWatchlistSuspend(): Boolean {
        if (traktSyncInFlight) return true
        traktSyncInFlight = true
        return try {
            val syncResult = remoteSyncManager.getWatchlist()
            val hasTraktAuth = syncResult?.connected == true
            if (!hasTraktAuth) {
                AppLogger.breadcrumb(
                    tag = "Watchlist",
                    message = "trakt_sync_no_auth",
                    severity = "info"
                )
                false
            } else {
                val traktItems = syncResult?.items.orEmpty()
                val rawCount = syncResult?.rawCount ?: 0
                AppLogger.breadcrumb(
                    tag = "Watchlist",
                    message = "trakt_sync_result raw=$rawCount hydrated=${traktItems.size}",
                    severity = "info"
                )
                if (traktItems.isNotEmpty()) {
                    watchlistRepository.clearWatchlistCache()
                    val orderedTraktItems = traktItems.watchlistDisplayOrder()
                    watchlistRepository.syncFromTraktOrder(orderedTraktItems)
                    val mergedItems = watchlistRepository.getLocalWatchlistItems().watchlistDisplayOrder()
                    _uiState.value = mergedItems.toSplitState(isLoading = false)
                    fetchLogos(mergedItems)
                    runCatching { cloudSyncRepository.pushToCloud() }
                        .onFailure { error ->
                            AppLogger.recordException(
                                throwable = error,
                                context = watchlistDiagnosticContext(
                                    phase = "trakt_sync_cloud_push",
                                    extra = mapOf(
                                        "raw_count" to rawCount.toString(),
                                        "hydrated_count" to orderedTraktItems.size.toString()
                                    )
                                )
                            )
                        }
                } else if (rawCount == 0) {
                    val cachedItems = (watchlistRepository.getCachedItems().ifEmpty {
                        watchlistRepository.getWatchlistItems()
                    }).watchlistDisplayOrder()
                    _uiState.value = cachedItems.toSplitState(isLoading = false)
                    if (cachedItems.isNotEmpty()) {
                        fetchLogos(cachedItems)
                    } else {
                        _uiState.value = WatchlistUiState(isLoading = false)
                    }
                } else {
                    AppLogger.recordException(
                        throwable = IllegalStateException("Trakt watchlist hydrated zero items"),
                        context = watchlistDiagnosticContext(
                            phase = "trakt_hydration_empty",
                            extra = mapOf(
                                "raw_count" to rawCount.toString(),
                                "cached_count" to watchlistRepository.getCachedItems().size.toString()
                            )
                        )
                    )
                    val cachedItems = watchlistRepository.getWatchlistItems().watchlistDisplayOrder()
                    _uiState.value = cachedItems.toSplitState(isLoading = false)
                    fetchLogos(cachedItems)
                }
                true
            }
        } catch (error: Exception) {
            if (error is kotlinx.coroutines.CancellationException) throw error
            AppLogger.recordException(
                throwable = error,
                context = watchlistDiagnosticContext("trakt_sync")
            )
            false
        } finally {
            traktSyncInFlight = false
        }
    }

    fun dismissToast() {
        _uiState.value = _uiState.value.copy(toastMessage = null)
    }

    companion object {
        private const val LIBRARY_PAGE_SIZE = 60
        private const val LIBRARY_LOGO_INITIAL_PREFETCH = 12
        private val BROWSABLE_LIBRARY_TYPES = setOf(
            "",
            "movie",
            "movies",
            "show",
            "shows",
            "series",
            "tvshows",
            "mixed"
        )
    }
}
