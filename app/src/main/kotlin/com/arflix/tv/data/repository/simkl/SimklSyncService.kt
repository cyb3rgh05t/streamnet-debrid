package com.arflix.tv.data.repository.simkl

import com.arflix.tv.data.api.SimklAddToListBody
import com.arflix.tv.data.api.SimklAllItemsResponse
import com.arflix.tv.data.api.SimklApi
import com.arflix.tv.data.api.SimklEpisodeRef
import com.arflix.tv.data.api.SimklIds
import com.arflix.tv.data.api.SimklMovieRef
import com.arflix.tv.data.api.SimklSeasonRef
import com.arflix.tv.data.api.SimklShowRef
import com.arflix.tv.data.api.SimklSyncHistoryBody
import com.arflix.tv.data.api.TmdbApi
import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.repository.ContinueWatchingItem
import com.arflix.tv.util.AppLogger
import com.arflix.tv.util.Constants
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.sync.withPermit
import javax.inject.Inject
import javax.inject.Singleton
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

@Singleton
class SimklSyncService @Inject constructor(
    private val simklApi: SimklApi,
    private val authManager: SimklAuthManager,
    private val tmdbApi: TmdbApi
) {
    private val clientId: String get() = Constants.SIMKL_CLIENT_ID

    private val syncMutex = Mutex()
    private var activeTokenScope: Int? = null
    private var hasInitialSnapshot = false
    private var lastActivityTimestamp: String? = null
    private var lastActivityCheckTime: Long = 0L

    private val cachedWatchedMovies = mutableSetOf<Int>()
    private val cachedWatchedEpisodes = mutableSetOf<String>()
    private val cachedWatchlist = mutableMapOf<Pair<MediaType, Int>, MediaItem>()
    private val cachedContinueWatching = mutableMapOf<Pair<MediaType, Int>, ContinueWatchingItem>()
    private val resolvedExternalIds = ConcurrentHashMap<String, Int>()
    private val unresolvedExternalIds = ConcurrentHashMap.newKeySet<String>()

    private fun episodeKey(tmdbId: Int, season: Int, episode: Int): String =
        "show_tmdb:$tmdbId:$season:$episode"

    private fun episodePrefix(tmdbId: Int): String = "show_tmdb:$tmdbId:"

    /**
     * Follows official Simkl sync guidelines:
     * Phase 1: Fetch libraries separately and sequentially without date_from on initial load.
     * Phase 2: Check /sync/activities first. If timestamp changed, fetch delta using /sync/all-items/?date_from=...
     * Throttles background checks to once every 15 minutes unless forced.
     */
    suspend fun syncIfNeeded(force: Boolean = false) = syncMutex.withLock {
        val token = authManager.getAccessToken()
        if (token.isNullOrBlank()) {
            clearCachedState()
            return@withLock
        }
        val tokenScope = token.hashCode()
        if (activeTokenScope != tokenScope) {
            clearCachedState()
            activeTokenScope = tokenScope
        }
        val authHeader = "Bearer $token"

        val now = System.currentTimeMillis()
        if (!force && hasInitialSnapshot && now - lastActivityCheckTime < 15 * 60 * 1000L) {
            return@withLock
        }

        try {
            val activities = simklApi.getActivities(authHeader, clientId)
            val currentActivityDate = activities.all
                ?: activities.movies?.all
                ?: activities.shows?.all
                ?: activities.anime?.all

            if (force || !hasInitialSnapshot || currentActivityDate != lastActivityTimestamp) {
                AppLogger.d("SimklSyncService", "Refreshing complete Simkl snapshot")
                refreshSnapshot(authHeader)
                hasInitialSnapshot = true
                lastActivityTimestamp = currentActivityDate
            } else {
                AppLogger.d("SimklSyncService", "Simkl activities unchanged ($currentActivityDate). Skipping sync.")
            }
            lastActivityCheckTime = now
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            lastActivityCheckTime = 0L
            AppLogger.e("SimklSyncService", "Error during Simkl sync: ${e.message}")
        }
    }

    private suspend fun refreshSnapshot(authHeader: String) = coroutineScope {
        val movies = async { simklApi.getAllItems(authHeader, clientId, "movies") }
        val shows = async { simklApi.getAllItems(authHeader, clientId, "shows") }
        val anime = async { simklApi.getAllItems(authHeader, clientId, "anime") }
        val playback = async {
            runCatching { simklApi.getPlayback(authHeader, clientId) }
                .onFailure { AppLogger.e("SimklSyncService", "Playback sync failed: ${it.message}") }
                .getOrDefault(emptyList())
        }
        val stagedMovies = movies.await()
        val stagedShows = shows.await()
        val stagedAnime = anime.await()
        val stagedPlayback = playback.await()

        resolveMissingTmdbIds(stagedMovies, stagedShows, stagedAnime, stagedPlayback)

        cachedWatchedMovies.clear()
        cachedWatchedEpisodes.clear()
        cachedWatchlist.clear()
        cachedContinueWatching.clear()
        processMoviesResponse(stagedMovies)
        processShowsResponse(stagedShows)
        processShowsResponse(stagedAnime)
        processPlayback(stagedPlayback)
    }

    private fun clearCachedState() {
        activeTokenScope = null
        hasInitialSnapshot = false
        lastActivityTimestamp = null
        lastActivityCheckTime = 0L
        cachedWatchedMovies.clear()
        cachedWatchedEpisodes.clear()
        cachedWatchlist.clear()
        cachedContinueWatching.clear()
    }

    private fun processMoviesResponse(response: SimklAllItemsResponse) {
        response.movies?.forEach { movieItem ->
            val movie = movieItem.movie ?: return@forEach
            val tmdbId = resolvedTmdbId(movie.ids, MediaType.MOVIE) ?: return@forEach
            val status = movieItem.status
            if (status == "completed") {
                cachedWatchedMovies.add(tmdbId)
            }
            if (status == "plantowatch") {
                cachedWatchlist[MediaType.MOVIE to tmdbId] = MediaItem(
                    id = tmdbId,
                    title = movie.title.orEmpty(),
                    mediaType = MediaType.MOVIE
                )
            } else if (status != null) {
                cachedWatchlist.remove(MediaType.MOVIE to tmdbId)
            }
        }
    }

    private fun processShowsResponse(response: SimklAllItemsResponse) {
        val allShows = (response.shows.orEmpty() + response.anime.orEmpty())
        allShows.forEach { showItem ->
            val show = showItem.show ?: return@forEach
            val showTmdb = resolvedTmdbId(show.ids, MediaType.TV) ?: return@forEach
            val status = showItem.status
            if (status == "plantowatch") {
                cachedWatchlist[MediaType.TV to showTmdb] = MediaItem(
                    id = showTmdb,
                    title = show.title.orEmpty(),
                    mediaType = MediaType.TV
                )
            } else if (status != null) {
                cachedWatchlist.remove(MediaType.TV to showTmdb)
            }
            showItem.seasons?.forEach { season ->
                season.episodes.forEach { episode ->
                    cachedWatchedEpisodes.add(episodeKey(showTmdb, season.number, episode.number))
                }
            }
            val next = showItem.nextToWatchInfo ?: parseNextToWatch(showItem.nextToWatch)
            if (next != null && status == "watching") {
                val season = next.season ?: 1
                val episode = next.episode ?: return@forEach
                cachedContinueWatching[MediaType.TV to showTmdb] = ContinueWatchingItem(
                    id = showTmdb,
                    title = show.title.orEmpty(),
                    mediaType = MediaType.TV,
                    progress = 0,
                    season = season,
                    episode = episode,
                    episodeTitle = next.title?.takeIf { it.isNotBlank() } ?: "Episode $episode",
                    year = show.year?.toString().orEmpty(),
                    durationSeconds = show.runtime?.times(60L) ?: 0L,
                    isUpNext = true,
                    updatedAtMs = parseTimestamp(showItem.lastWatchedAt),
                    watchedEpisodes = showItem.watchedEpisodesCount ?: 0,
                    totalEpisodes = showItem.totalEpisodesCount ?: 0
                )
            }
        }
    }

    private fun parseNextToWatch(value: String?): com.arflix.tv.data.api.SimklNextToWatchInfo? {
        val raw = value?.trim()?.uppercase().orEmpty()
        if (raw.isBlank()) return null
        val match = Regex("^(?:S(\\d+))?E(\\d+)$").matchEntire(raw) ?: return null
        val season = match.groupValues[1].toIntOrNull() ?: 1
        val episode = match.groupValues[2].toIntOrNull() ?: return null
        return com.arflix.tv.data.api.SimklNextToWatchInfo(season = season, episode = episode)
    }

    private fun processPlayback(items: List<com.arflix.tv.data.api.SimklPlaybackItem>) {
        items.forEach { row ->
            val movie = row.movie
            if (movie != null) {
                val tmdbId = resolvedTmdbId(movie.ids, MediaType.MOVIE) ?: return@forEach
                val progress = row.progress.toInt().coerceIn(0, 100)
                val durationSeconds = movie.runtime?.times(60L) ?: 0L
                cachedContinueWatching[MediaType.MOVIE to tmdbId] = ContinueWatchingItem(
                    id = tmdbId,
                    title = movie.title.orEmpty(),
                    mediaType = MediaType.MOVIE,
                    progress = progress,
                    resumePositionSeconds = durationSeconds * progress / 100L,
                    durationSeconds = durationSeconds,
                    year = movie.year?.toString().orEmpty(),
                    updatedAtMs = parseTimestamp(row.pausedAt)
                )
                return@forEach
            }

            val show = row.show ?: row.anime ?: return@forEach
            val tmdbId = resolvedTmdbId(show.ids, MediaType.TV) ?: return@forEach
            val season = row.episode?.season ?: return@forEach
            val episode = row.episode.number ?: return@forEach
            val progress = row.progress.toInt().coerceIn(0, 100)
            val durationSeconds = show.runtime?.times(60L) ?: 0L
            cachedContinueWatching[MediaType.TV to tmdbId] = ContinueWatchingItem(
                id = tmdbId,
                title = show.title.orEmpty(),
                mediaType = MediaType.TV,
                progress = progress,
                resumePositionSeconds = durationSeconds * progress / 100L,
                durationSeconds = durationSeconds,
                season = season,
                episode = episode,
                episodeTitle = row.episode.title ?: "Episode $episode",
                year = show.year?.toString().orEmpty(),
                updatedAtMs = parseTimestamp(row.pausedAt)
            )
        }
    }

    private fun externalKey(ids: SimklIds, mediaType: MediaType): String? = when {
        !ids.imdb.isNullOrBlank() -> "${mediaType.name}:imdb:${ids.imdb}"
        !ids.tvdb.isNullOrBlank() -> "${mediaType.name}:tvdb:${ids.tvdb}"
        else -> null
    }

    private fun resolvedTmdbId(ids: SimklIds, mediaType: MediaType): Int? =
        ids.tmdb ?: externalKey(ids, mediaType)?.let(resolvedExternalIds::get)

    private suspend fun resolveMissingTmdbIds(
        movies: SimklAllItemsResponse,
        shows: SimklAllItemsResponse,
        anime: SimklAllItemsResponse,
        playback: List<com.arflix.tv.data.api.SimklPlaybackItem>
    ) = coroutineScope {
        if (Constants.TMDB_API_KEY.isBlank()) return@coroutineScope
        val candidates = buildList<Pair<MediaType, SimklIds>> {
            movies.movies.orEmpty().mapNotNullTo(this) { row ->
                row.movie?.ids?.let { MediaType.MOVIE to it }
            }
            (shows.shows.orEmpty() + shows.anime.orEmpty() + anime.shows.orEmpty() + anime.anime.orEmpty())
                .mapNotNullTo(this) { row -> row.show?.ids?.let { MediaType.TV to it } }
            playback.forEach { row ->
                row.movie?.ids?.let { add(MediaType.MOVIE to it) }
                (row.show ?: row.anime)?.ids?.let { add(MediaType.TV to it) }
            }
        }.filter { (type, ids) ->
            ids.tmdb == null && externalKey(ids, type)?.let { key ->
                !resolvedExternalIds.containsKey(key) && !unresolvedExternalIds.contains(key)
            } == true
        }.distinctBy { (type, ids) -> externalKey(ids, type) }

        val permits = Semaphore(6)
        candidates.map { (mediaType, ids) ->
            async {
                permits.withPermit {
                    val key = externalKey(ids, mediaType) ?: return@withPermit
                    val result = runCatching {
                        when {
                            !ids.imdb.isNullOrBlank() -> tmdbApi.findByExternalId(
                                ids.imdb,
                                Constants.TMDB_API_KEY,
                                "imdb_id"
                            )
                            !ids.tvdb.isNullOrBlank() -> tmdbApi.findByExternalId(
                                ids.tvdb,
                                Constants.TMDB_API_KEY,
                                "tvdb_id"
                            )
                            else -> null
                        }
                    }.getOrNull()
                    val tmdbId = if (mediaType == MediaType.MOVIE) {
                        result?.movieResults?.maxByOrNull { it.popularity }?.id
                    } else {
                        result?.tvResults?.maxByOrNull { it.popularity }?.id
                    }?.takeIf { it > 0 }
                    if (tmdbId != null) {
                        resolvedExternalIds[key] = tmdbId
                    } else {
                        unresolvedExternalIds.add(key)
                    }
                }
            }
        }.forEach { it.await() }
    }

    private fun parseTimestamp(value: String?): Long = runCatching {
        value?.let(Instant::parse)?.toEpochMilli()
    }.getOrNull() ?: 0L

    suspend fun getWatchedMovies(): Set<Int> {
        syncIfNeeded()
        return cachedWatchedMovies.toSet()
    }

    suspend fun getWatchedEpisodes(): Set<String> {
        syncIfNeeded()
        return cachedWatchedEpisodes.toSet()
    }

    suspend fun getWatchlistItems(): List<MediaItem> {
        syncIfNeeded()
        return cachedWatchlist.values.toList()
    }

    suspend fun getContinueWatching(forceRefresh: Boolean = false): List<ContinueWatchingItem> {
        syncIfNeeded(forceRefresh)
        return cachedContinueWatching.values
            .filter { it.progress < 95 }
            .sortedByDescending { it.updatedAtMs }
    }

    suspend fun addToWatchlist(mediaType: MediaType, tmdbId: Int, isAnime: Boolean = false): Boolean {
        val token = authManager.getAccessToken() ?: return false
        val authHeader = "Bearer $token"
        val body = if (mediaType == MediaType.MOVIE) {
            com.arflix.tv.data.api.SimklAddToListBody(
                movies = listOf(com.arflix.tv.data.api.SimklAddToListMovie(to = "plantowatch", ids = SimklIds(tmdb = tmdbId)))
            )
        } else if (isAnime) {
            SimklAddToListBody(
                anime = listOf(com.arflix.tv.data.api.SimklAddToListShow(to = "plantowatch", ids = SimklIds(tmdb = tmdbId)))
            )
        } else {
            com.arflix.tv.data.api.SimklAddToListBody(
                shows = listOf(com.arflix.tv.data.api.SimklAddToListShow(to = "plantowatch", ids = SimklIds(tmdb = tmdbId)))
            )
        }
        return try {
            val res = simklApi.addToList(authHeader, clientId, body)
            if (res.isSuccessful) {
                cachedWatchlist[mediaType to tmdbId] = MediaItem(id = tmdbId, title = "", mediaType = mediaType)
                lastActivityCheckTime = 0L // Request activity refresh on next check
                true
            } else {
                AppLogger.e("SimklSyncService", "Failed adding to watchlist: code=${res.code()} msg=${res.message()}")
                false
            }
        } catch (e: Exception) {
            AppLogger.e("SimklSyncService", "Error adding to watchlist: ${e.message}")
            false
        }
    }

    suspend fun removeFromWatchlist(mediaType: MediaType, tmdbId: Int, isAnime: Boolean = false): Boolean {
        val token = authManager.getAccessToken() ?: return false
        val authHeader = "Bearer $token"

        val isWatched = if (mediaType == MediaType.MOVIE) {
            cachedWatchedMovies.contains(tmdbId)
        } else {
            cachedWatchedEpisodes.any { it.startsWith(episodePrefix(tmdbId)) }
        }

        return try {
            val res = if (isWatched) {
                // If it was already watched, restore its status to "completed" so watch history is preserved
                val body = if (mediaType == MediaType.MOVIE) {
                    com.arflix.tv.data.api.SimklAddToListBody(
                        movies = listOf(com.arflix.tv.data.api.SimklAddToListMovie(to = "completed", ids = SimklIds(tmdb = tmdbId)))
                    )
                } else if (isAnime) {
                    SimklAddToListBody(
                        anime = listOf(com.arflix.tv.data.api.SimklAddToListShow(to = "completed", ids = SimklIds(tmdb = tmdbId)))
                    )
                } else {
                    com.arflix.tv.data.api.SimklAddToListBody(
                        shows = listOf(com.arflix.tv.data.api.SimklAddToListShow(to = "completed", ids = SimklIds(tmdb = tmdbId)))
                    )
                }
                simklApi.addToList(authHeader, clientId, body)
            } else {
                // Not watched, remove item completely from Simkl library
                val body = if (mediaType == MediaType.MOVIE) {
                    SimklSyncHistoryBody(movies = listOf(SimklMovieRef(ids = SimklIds(tmdb = tmdbId))))
                } else if (isAnime) {
                    SimklSyncHistoryBody(anime = listOf(SimklShowRef(ids = SimklIds(tmdb = tmdbId))))
                } else {
                    SimklSyncHistoryBody(shows = listOf(SimklShowRef(ids = SimklIds(tmdb = tmdbId))))
                }
                simklApi.removeFromHistory(authHeader, clientId, body)
            }

            if (res.isSuccessful) {
                cachedWatchlist.remove(mediaType to tmdbId)
                lastActivityCheckTime = 0L
                true
            } else {
                AppLogger.e("SimklSyncService", "Failed removing from watchlist: code=${res.code()} msg=${res.message()}")
                false
            }
        } catch (e: Exception) {
            AppLogger.e("SimklSyncService", "Error removing from watchlist: ${e.message}")
            false
        }
    }

    suspend fun markWatched(mediaType: MediaType, tmdbId: Int, season: Int? = null, episode: Int? = null): Boolean {
        val token = authManager.getAccessToken() ?: return false
        val authHeader = "Bearer $token"
        val body = if (mediaType == MediaType.MOVIE) {
            SimklSyncHistoryBody(movies = listOf(SimklMovieRef(ids = SimklIds(tmdb = tmdbId))))
        } else {
            SimklSyncHistoryBody(
                shows = listOf(
                    SimklShowRef(
                        ids = SimklIds(tmdb = tmdbId),
                        seasons = if (season != null && episode != null) {
                            listOf(SimklSeasonRef(number = season, episodes = listOf(SimklEpisodeRef(number = episode))))
                        } else null
                    )
                )
            )
        }
        return try {
            val res = simklApi.addToHistory(authHeader, clientId, body)
            if (res.isSuccessful) {
                if (mediaType == MediaType.MOVIE) {
                    cachedWatchedMovies.add(tmdbId)
                } else if (season != null && episode != null) {
                    cachedWatchedEpisodes.add(episodeKey(tmdbId, season, episode))
                }
                lastActivityCheckTime = 0L
                true
            } else {
                AppLogger.e("SimklSyncService", "Failed marking watched: code=${res.code()} msg=${res.message()}")
                false
            }
        } catch (e: Exception) {
            AppLogger.e("SimklSyncService", "Error marking watched: ${e.message}")
            false
        }
    }

    suspend fun markUnwatched(mediaType: MediaType, tmdbId: Int, season: Int? = null, episode: Int? = null): Boolean {
        val token = authManager.getAccessToken() ?: return false
        val authHeader = "Bearer $token"
        val body = if (mediaType == MediaType.MOVIE) {
            SimklSyncHistoryBody(movies = listOf(SimklMovieRef(ids = SimklIds(tmdb = tmdbId))))
        } else {
            SimklSyncHistoryBody(
                shows = listOf(
                    SimklShowRef(
                        ids = SimklIds(tmdb = tmdbId),
                        seasons = if (season != null && episode != null) {
                            listOf(SimklSeasonRef(number = season, episodes = listOf(SimklEpisodeRef(number = episode))))
                        } else null
                    )
                )
            )
        }
        return try {
            val res = simklApi.removeFromHistory(authHeader, clientId, body)
            if (res.isSuccessful) {
                if (mediaType == MediaType.MOVIE) {
                    cachedWatchedMovies.remove(tmdbId)
                } else if (season != null && episode != null) {
                    cachedWatchedEpisodes.remove(episodeKey(tmdbId, season, episode))
                }
                lastActivityCheckTime = 0L
                true
            } else {
                AppLogger.e("SimklSyncService", "Failed marking unwatched: code=${res.code()} msg=${res.message()}")
                false
            }
        } catch (e: Exception) {
            AppLogger.e("SimklSyncService", "Error marking unwatched: ${e.message}")
            false
        }
    }

    suspend fun markSeasonWatched(
        showTmdbId: Int,
        season: Int,
        episodes: List<Int>,
        watched: Boolean
    ): Boolean {
        if (episodes.isEmpty()) return true
        val token = authManager.getAccessToken() ?: return false
        val authHeader = "Bearer $token"
        val body = SimklSyncHistoryBody(
            shows = listOf(
                SimklShowRef(
                    ids = SimklIds(tmdb = showTmdbId),
                    seasons = listOf(
                        SimklSeasonRef(
                            number = season,
                            episodes = episodes.distinct().map { SimklEpisodeRef(number = it) }
                        )
                    )
                )
            )
        )
        return try {
            val response = if (watched) {
                simklApi.addToHistory(authHeader, clientId, body)
            } else {
                simklApi.removeFromHistory(authHeader, clientId, body)
            }
            if (response.isSuccessful) {
                episodes.forEach { episode ->
                    val key = episodeKey(showTmdbId, season, episode)
                    if (watched) cachedWatchedEpisodes.add(key) else cachedWatchedEpisodes.remove(key)
                }
                cachedContinueWatching.remove(MediaType.TV to showTmdbId)
                lastActivityCheckTime = 0L
                true
            } else {
                AppLogger.e(
                    "SimklSyncService",
                    "Failed marking season ${if (watched) "watched" else "unwatched"}: code=${response.code()}"
                )
                false
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            AppLogger.e("SimklSyncService", "Error updating season history: ${e.message}")
            false
        }
    }

    suspend fun dismissContinueWatching(
        mediaType: MediaType,
        tmdbId: Int,
        season: Int? = null,
        episode: Int? = null
    ): Boolean {
        val token = authManager.getAccessToken() ?: return false
        val authHeader = "Bearer $token"
        return try {
            val playback = simklApi.getPlayback(authHeader, clientId)
            val matches = playback.filter { row ->
                val ids = if (mediaType == MediaType.MOVIE) row.movie?.ids else (row.show ?: row.anime)?.ids
                if (resolvedTmdbId(ids ?: return@filter false, mediaType) != tmdbId) return@filter false
                if (mediaType == MediaType.MOVIE) return@filter true
                val rowEpisode = row.episode ?: return@filter false
                (season == null || rowEpisode.season == season) &&
                    (episode == null || rowEpisode.number == episode)
            }
            val successful = matches.mapNotNull { it.id }.all { id ->
                simklApi.deletePlayback(authHeader, clientId, id).isSuccessful
            }
            if (successful) {
                cachedContinueWatching.remove(mediaType to tmdbId)
                lastActivityCheckTime = 0L
            }
            successful
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            AppLogger.e("SimklSyncService", "Error deleting playback: ${e.message}")
            false
        }
    }
}
