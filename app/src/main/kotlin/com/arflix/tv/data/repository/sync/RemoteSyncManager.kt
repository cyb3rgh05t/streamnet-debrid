package com.arflix.tv.data.repository.sync

import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.repository.ContinueWatchingItem
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Single entry point the app uses to talk to whichever remote sync provider the
 * current profile is connected to. ViewModels and the sync service call this
 * instead of reaching for TraktRepository directly.
 *
 * Resolution is per-profile and preserves legacy behavior: profiles that
 * connected to Trakt before this feature existed have no `sync_provider` pref
 * (NONE) but do have a Trakt token, so NONE resolves to Trakt-when-connected.
 * MDBList is only active when explicitly selected AND a key is present.
 */
@Singleton
class RemoteSyncManager @Inject constructor(
    private val store: SyncProviderStore,
    private val traktProvider: TraktRemoteProvider,
    private val mdbListProvider: MdbListRemoteProvider,
    private val simklProvider: SimklRemoteProvider
) {
    private fun providerFor(provider: SyncProvider): RemoteSyncProvider? = when (provider) {
        SyncProvider.TRAKT -> traktProvider
        SyncProvider.MDBLIST -> mdbListProvider
        SyncProvider.SIMKL -> simklProvider
        SyncProvider.NONE -> null
    }

    private suspend fun connected(providers: Set<SyncProvider>): List<RemoteSyncProvider> =
        providers.mapNotNull(::providerFor).filter { it.isConnected() }

    /** The provider explicitly selected for this profile (may be NONE). */
    suspend fun selectedProvider(): SyncProvider = store.getProvider()

    /**
     * The active, connected provider for the current profile, or null when the
     * profile has no connected remote (local/Supabase-only).
     */
    suspend fun active(): RemoteSyncProvider? {
        val selected = store.readProviders(TrackingFeature.WATCHLIST)
        return connected(selected).firstOrNull()
            ?: traktProvider.takeIf { it.isConnected() }
    }

    suspend fun isRemoteConnected(): Boolean =
        connected(store.readProviders(TrackingFeature.WATCHLIST) + store.writeProviders()).isNotEmpty()

    // ===== Watchlist =====

    suspend fun addToWatchlist(mediaType: MediaType, tmdbId: Int, isAnime: Boolean = false): Boolean =
        writeResults { it.addToWatchlist(mediaType, tmdbId, isAnime) }

    suspend fun removeFromWatchlist(mediaType: MediaType, tmdbId: Int, isAnime: Boolean = false): Boolean =
        writeResults { it.removeFromWatchlist(mediaType, tmdbId, isAnime) }

    suspend fun getWatchlist(): RemoteWatchlistResult? = coroutineScope {
        val providers = connected(store.readProviders(TrackingFeature.WATCHLIST))
        if (providers.isEmpty()) return@coroutineScope null
        val results = providers.map { provider ->
            async {
                try {
                    provider.getWatchlist()
                } catch (e: CancellationException) {
                    throw e
                } catch (_: Exception) {
                    null
                }
            }
        }.awaitAll().filterNotNull()
        if (results.isEmpty()) return@coroutineScope RemoteWatchlistResult(true, null, 0)
        val items = results.flatMap { it.items.orEmpty() }
            .distinctBy { it.mediaType to it.id }
        RemoteWatchlistResult(
            connected = results.any { it.connected },
            items = items,
            rawCount = results.sumOf { it.rawCount }
        )
    }

    private suspend fun writeResults(block: suspend (RemoteSyncProvider) -> Boolean): Boolean = coroutineScope {
        val providers = connected(store.writeProviders())
        providers.map { provider ->
            async {
                try {
                    block(provider)
                } catch (e: CancellationException) {
                    throw e
                } catch (_: Exception) {
                    false
                }
            }
        }.awaitAll().any { it }
    }

    private suspend fun writeAll(block: suspend (RemoteSyncProvider) -> Unit) = coroutineScope {
        connected(store.writeProviders()).map { provider ->
            async {
                try {
                    block(provider)
                } catch (e: CancellationException) {
                    throw e
                } catch (_: Exception) {
                    Unit
                }
            }
        }.awaitAll()
        Unit
    }

    // ===== Scrobble (no-op when no remote is connected) =====

    suspend fun scrobbleStart(
        mediaType: MediaType,
        tmdbId: Int,
        progress: Float,
        season: Int? = null,
        episode: Int? = null,
        isAnime: Boolean = false
    ) {
        writeAll { it.scrobbleStart(mediaType, tmdbId, progress, season, episode, isAnime) }
    }

    suspend fun scrobblePause(
        mediaType: MediaType,
        tmdbId: Int,
        progress: Float,
        season: Int? = null,
        episode: Int? = null,
        isAnime: Boolean = false
    ) {
        writeAll { it.scrobblePause(mediaType, tmdbId, progress, season, episode, isAnime) }
    }

    suspend fun scrobbleProgress(
        mediaType: MediaType,
        tmdbId: Int,
        progress: Float,
        season: Int? = null,
        episode: Int? = null,
        isAnime: Boolean = false
    ) {
        writeAll { it.scrobbleProgress(mediaType, tmdbId, progress, season, episode, isAnime) }
    }

    suspend fun scrobbleStop(
        mediaType: MediaType,
        tmdbId: Int,
        progress: Float,
        season: Int? = null,
        episode: Int? = null,
        isAnime: Boolean = false
    ) {
        writeAll { it.scrobbleStop(mediaType, tmdbId, progress, season, episode, isAnime) }
    }

    // ===== Watched reads =====

    suspend fun getWatchedMovies(): Set<Int> = readSets { it.getWatchedMovies() }

    suspend fun getWatchedEpisodes(): Set<String> = readSets { it.getWatchedEpisodes() }

    private suspend fun <T> readSets(block: suspend (RemoteSyncProvider) -> Set<T>): Set<T> = coroutineScope {
        connected(store.readProviders(TrackingFeature.WATCHED)).map { provider ->
            async {
                try {
                    block(provider)
                } catch (e: CancellationException) {
                    throw e
                } catch (_: Exception) {
                    emptySet()
                }
            }
        }.awaitAll().flatten().toSet()
    }

    // ===== Continue Watching =====

    suspend fun getContinueWatching(forceRefresh: Boolean = false): List<ContinueWatchingItem> = coroutineScope {
        connected(store.readProviders(TrackingFeature.CONTINUE_WATCHING)).map { provider ->
            async {
                try {
                    provider.getContinueWatching(forceRefresh)
                } catch (e: CancellationException) {
                    throw e
                } catch (_: Exception) {
                    emptyList()
                }
            }
        }.awaitAll().flatten()
            .groupBy { it.mediaType to it.id }
            .map { (_, matches) ->
                matches.maxWithOrNull(
                    compareBy<ContinueWatchingItem> { it.updatedAtMs }
                        .thenBy { it.resumePositionSeconds }
                        .thenBy { it.progress }
                ) ?: matches.first()
            }
            .sortedByDescending { it.updatedAtMs }
    }

    suspend fun dismissContinueWatching(
        mediaType: MediaType,
        tmdbId: Int,
        season: Int? = null,
        episode: Int? = null
    ): Boolean = writeResults {
        it.dismissContinueWatching(mediaType, tmdbId, season, episode)
    }
}
