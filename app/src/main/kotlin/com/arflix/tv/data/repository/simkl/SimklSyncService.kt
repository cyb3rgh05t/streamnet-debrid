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
import java.text.Normalizer
import javax.inject.Inject
import javax.inject.Singleton
import java.time.Instant
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.abs

@Singleton
class SimklSyncService @Inject constructor(
    private val simklApi: SimklApi,
    private val authManager: SimklAuthManager,
    private val tmdbApi: TmdbApi
) {
    companion object {
        private const val SNAPSHOT_TTL_MS = 15 * 60 * 1000L
        private const val FAILED_SYNC_BACKOFF_MS = 60 * 1000L
        private val DIACRITICS_REGEX = Regex("\\p{M}+")
        private val NON_ALPHA_NUM_REGEX = Regex("[^a-z0-9]+")
    }

    private val clientId: String get() = Constants.SIMKL_CLIENT_ID

    private val syncMutex = Mutex()
    private var activeTokenScope: Int? = null
    private var hasInitialSnapshot = false
    private var lastActivityTimestamp: String? = null
    private var lastActivityCheckTime: Long = 0L
    private var lastSyncAttemptTime: Long = 0L

    private var snapshotMovies: SimklAllItemsResponse? = null
    private var snapshotShows: SimklAllItemsResponse? = null
    private var snapshotAnime: SimklAllItemsResponse? = null
    private var snapshotPlayback: List<com.arflix.tv.data.api.SimklPlaybackItem>? = null

    private val cachedWatchedMovies = mutableSetOf<Int>()
    private val cachedWatchedEpisodes = mutableSetOf<String>()
    private val cachedWatchlist = mutableMapOf<Pair<MediaType, Int>, MediaItem>()
    private val cachedContinueWatching = mutableMapOf<Pair<MediaType, Int>, ContinueWatchingItem>()
    private val cachedLibraryItems = mutableMapOf<String, LinkedHashMap<Pair<MediaType, Int>, MediaItem>>()
    private val resolvedExternalIds = ConcurrentHashMap<String, Int>()

    private fun episodeKey(tmdbId: Int, season: Int, episode: Int): String =
        "show_tmdb:$tmdbId:$season:$episode"

    private fun episodePrefix(tmdbId: Int): String = "show_tmdb:$tmdbId:"

    /**
     * Follows official Simkl sync guidelines:
     * Phase 1: Fetch libraries separately without date_from on initial load.
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
        if (!force && hasInitialSnapshot && now - lastActivityCheckTime < SNAPSHOT_TTL_MS) {
            return@withLock
        }
        if (!force && now - lastSyncAttemptTime < FAILED_SYNC_BACKOFF_MS) {
            return@withLock
        }
        lastSyncAttemptTime = now

        try {
            val activities = simklApi.getActivities(authHeader, clientId)
            val currentActivityDate = activities.all
                ?: activities.movies?.all
                ?: activities.shows?.all
                ?: activities.anime?.all

            if (force || !hasInitialSnapshot || currentActivityDate != lastActivityTimestamp) {
                AppLogger.d("SimklSyncService", "Refreshing complete Simkl snapshot")
                val outcome = refreshSnapshot(authHeader)
                hasInitialSnapshot = outcome.hasUsableSnapshot
                if (outcome.complete) {
                    lastActivityTimestamp = currentActivityDate
                    lastActivityCheckTime = now
                } else {
                    // Keep partial/previous data visible and retry after the short failure backoff.
                    lastActivityCheckTime = 0L
                }
            } else {
                AppLogger.d("SimklSyncService", "Simkl activities unchanged ($currentActivityDate). Skipping sync.")
                lastActivityCheckTime = now
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            AppLogger.e("SimklSyncService", "Error during Simkl sync: ${e.message}")
        }
    }

    private data class SnapshotFetch<T>(val value: T?, val succeeded: Boolean)

    private data class SnapshotRefreshOutcome(
        val hasUsableSnapshot: Boolean,
        val complete: Boolean
    )

    private suspend fun <T> fetchSnapshotPart(label: String, block: suspend () -> T): SnapshotFetch<T> {
        return try {
            SnapshotFetch(block(), true)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            AppLogger.e("SimklSyncService", "$label sync failed: ${e.message}")
            SnapshotFetch(null, false)
        }
    }

    private suspend fun refreshSnapshot(authHeader: String): SnapshotRefreshOutcome = coroutineScope {
        val moviesRequest = async {
            fetchSnapshotPart("Movies") { simklApi.getAllItems(authHeader, clientId, "movies") }
        }
        val showsRequest = async {
            fetchSnapshotPart("Shows") { simklApi.getAllItems(authHeader, clientId, "shows") }
        }
        val animeRequest = async {
            fetchSnapshotPart("Anime") { simklApi.getAllItems(authHeader, clientId, "anime") }
        }
        val playbackRequest = async {
            fetchSnapshotPart("Playback") { simklApi.getPlayback(authHeader, clientId) }
        }

        val movies = moviesRequest.await()
        val shows = showsRequest.await()
        val anime = animeRequest.await()
        val playback = playbackRequest.await()

        if (movies.succeeded) snapshotMovies = movies.value
        if (shows.succeeded) snapshotShows = shows.value
        if (anime.succeeded) snapshotAnime = anime.value
        if (playback.succeeded) snapshotPlayback = playback.value

        val stagedMovies = snapshotMovies ?: SimklAllItemsResponse()
        val stagedShows = snapshotShows ?: SimklAllItemsResponse()
        val stagedAnime = snapshotAnime ?: SimklAllItemsResponse()
        val stagedPlayback = snapshotPlayback.orEmpty()
        val hasUsableSnapshot = snapshotMovies != null || snapshotShows != null ||
            snapshotAnime != null || snapshotPlayback != null

        if (hasUsableSnapshot) {
            resolveMissingTmdbIds(stagedMovies, stagedShows, stagedAnime, stagedPlayback)
            rebuildCaches(stagedMovies, stagedShows, stagedAnime, stagedPlayback)
        }

        SnapshotRefreshOutcome(
            hasUsableSnapshot = hasUsableSnapshot,
            complete = movies.succeeded && shows.succeeded && anime.succeeded
        )
    }

    private fun rebuildCaches(
        movies: SimklAllItemsResponse,
        shows: SimklAllItemsResponse,
        anime: SimklAllItemsResponse,
        playback: List<com.arflix.tv.data.api.SimklPlaybackItem>
    ) {
        cachedWatchedMovies.clear()
        cachedWatchedEpisodes.clear()
        cachedWatchlist.clear()
        cachedContinueWatching.clear()
        cachedLibraryItems.clear()
        processMoviesResponse(movies)
        processShowsResponse(shows)
        processShowsResponse(anime)
        processPlayback(playback)
    }

    private fun clearCachedState() {
        activeTokenScope = null
        hasInitialSnapshot = false
        lastActivityTimestamp = null
        lastActivityCheckTime = 0L
        lastSyncAttemptTime = 0L
        snapshotMovies = null
        snapshotShows = null
        snapshotAnime = null
        snapshotPlayback = null
        cachedWatchedMovies.clear()
        cachedWatchedEpisodes.clear()
        cachedWatchlist.clear()
        cachedContinueWatching.clear()
        cachedLibraryItems.clear()
    }

    private fun processMoviesResponse(response: SimklAllItemsResponse) {
        response.movies?.forEach { movieItem ->
            val movie = movieItem.movie ?: return@forEach
            val tmdbId = resolvedTmdbId(movie.ids, MediaType.MOVIE, movie.title, movie.year) ?: return@forEach
            val status = movieItem.status
            cacheLibraryItem(
                status = status,
                key = MediaType.MOVIE to tmdbId,
                item = MediaItem(
                    id = tmdbId,
                    title = movie.title.orEmpty(),
                    year = movie.year?.toString().orEmpty(),
                    mediaType = MediaType.MOVIE
                )
            )
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
            val showTmdb = resolvedTmdbId(show.ids, MediaType.TV, show.title, show.year) ?: return@forEach
            val status = showItem.status
            cacheLibraryItem(
                status = status,
                key = MediaType.TV to showTmdb,
                item = MediaItem(
                    id = showTmdb,
                    title = show.title.orEmpty(),
                    year = show.year?.toString().orEmpty(),
                    mediaType = MediaType.TV
                )
            )
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

    private fun cacheLibraryItem(
        status: String?,
        key: Pair<MediaType, Int>,
        item: MediaItem
    ) {
        val normalized = status?.trim()?.lowercase()?.takeIf { it.isNotBlank() } ?: return
        cachedLibraryItems.getOrPut(normalized) { linkedMapOf() }[key] = item
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
                val tmdbId = resolvedTmdbId(movie.ids, MediaType.MOVIE, movie.title, movie.year) ?: return@forEach
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
            val tmdbId = resolvedTmdbId(show.ids, MediaType.TV, show.title, show.year) ?: return@forEach
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

    private fun resolutionKey(
        ids: SimklIds,
        mediaType: MediaType,
        title: String? = null,
        year: Int? = null
    ): String? = externalKey(ids, mediaType)
        ?: ids.simkl?.let { "${mediaType.name}:simkl:$it" }
        ?: normalizeTitle(title.orEmpty()).takeIf { it.isNotBlank() }
            ?.let { "${mediaType.name}:title:$it:${year ?: 0}" }

    private fun resolvedTmdbId(
        ids: SimklIds,
        mediaType: MediaType,
        title: String? = null,
        year: Int? = null
    ): Int? = ids.tmdb ?: resolutionKey(ids, mediaType, title, year)?.let(resolvedExternalIds::get)

    private data class TmdbResolutionCandidate(
        val mediaType: MediaType,
        val ids: SimklIds,
        val title: String?,
        val year: Int?
    )

    private suspend fun resolveMissingTmdbIds(
        movies: SimklAllItemsResponse,
        shows: SimklAllItemsResponse,
        anime: SimklAllItemsResponse,
        playback: List<com.arflix.tv.data.api.SimklPlaybackItem>
    ) = coroutineScope {
        val candidates = buildList<TmdbResolutionCandidate> {
            movies.movies.orEmpty().mapNotNullTo(this) { row ->
                row.movie?.let { TmdbResolutionCandidate(MediaType.MOVIE, it.ids, it.title, it.year) }
            }
            (shows.shows.orEmpty() + shows.anime.orEmpty() + anime.shows.orEmpty() + anime.anime.orEmpty())
                .mapNotNullTo(this) { row ->
                    row.show?.let { TmdbResolutionCandidate(MediaType.TV, it.ids, it.title, it.year) }
                }
            playback.forEach { row ->
                row.movie?.let { add(TmdbResolutionCandidate(MediaType.MOVIE, it.ids, it.title, it.year)) }
                (row.show ?: row.anime)?.let {
                    add(TmdbResolutionCandidate(MediaType.TV, it.ids, it.title, it.year))
                }
            }
        }.filter { candidate ->
            candidate.ids.tmdb == null && resolutionKey(
                candidate.ids,
                candidate.mediaType,
                candidate.title,
                candidate.year
            )?.let { !resolvedExternalIds.containsKey(it) } == true
        }.distinctBy { candidate ->
            resolutionKey(candidate.ids, candidate.mediaType, candidate.title, candidate.year)
        }

        val permits = Semaphore(6)
        candidates.map { candidate ->
            async {
                permits.withPermit {
                    val key = resolutionKey(
                        candidate.ids,
                        candidate.mediaType,
                        candidate.title,
                        candidate.year
                    ) ?: return@withPermit
                    val tmdbId = resolveCandidate(candidate)
                    if (tmdbId != null) {
                        resolvedExternalIds[key] = tmdbId
                    }
                }
            }
        }.forEach { it.await() }
    }

    private suspend fun resolveCandidate(candidate: TmdbResolutionCandidate): Int? {
        val externalMatch = try {
            val result = when {
                !candidate.ids.imdb.isNullOrBlank() -> tmdbApi.findByExternalId(
                    candidate.ids.imdb,
                    Constants.TMDB_API_KEY,
                    "imdb_id"
                )
                !candidate.ids.tvdb.isNullOrBlank() -> tmdbApi.findByExternalId(
                    candidate.ids.tvdb,
                    Constants.TMDB_API_KEY,
                    "tvdb_id"
                )
                else -> null
            }
            if (candidate.mediaType == MediaType.MOVIE) {
                result?.movieResults?.maxByOrNull { it.popularity }?.id
            } else {
                result?.tvResults?.maxByOrNull { it.popularity }?.id
            }?.takeIf { it > 0 }
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            null
        }
        if (externalMatch != null) return externalMatch

        val title = candidate.title?.trim().orEmpty()
        if (title.isBlank()) return null
        return searchTmdbCandidate(candidate, constrainYear = true)
            ?: candidate.year?.let { searchTmdbCandidate(candidate, constrainYear = false) }
    }

    private suspend fun searchTmdbCandidate(
        candidate: TmdbResolutionCandidate,
        constrainYear: Boolean
    ): Int? {
        val title = candidate.title?.trim().orEmpty()
        if (title.isBlank()) return null
        val year = candidate.year.takeIf { constrainYear }
        val results = try {
            when (candidate.mediaType) {
                MediaType.MOVIE -> tmdbApi.searchMovies(
                    apiKey = Constants.TMDB_API_KEY,
                    query = title,
                    page = 1,
                    primaryReleaseYear = year,
                    year = year
                ).results
                MediaType.TV -> tmdbApi.searchTv(
                    apiKey = Constants.TMDB_API_KEY,
                    query = title,
                    page = 1,
                    firstAirDateYear = year
                ).results
            }
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            return null
        }

        val requestedTitle = normalizeTitle(title)
        return results.map { result ->
            val titleScore = listOfNotNull(
                result.title,
                result.name,
                result.originalTitle,
                result.originalName
            ).maxOfOrNull { candidateTitle ->
                val normalized = normalizeTitle(candidateTitle)
                when {
                    normalized == requestedTitle -> 120
                    normalized.isNotBlank() && requestedTitle.isNotBlank() &&
                        (normalized in requestedTitle || requestedTitle in normalized) -> 60
                    else -> 0
                }
            } ?: 0
            val resultYear = (result.releaseDate ?: result.firstAirDate)?.take(4)?.toIntOrNull()
            val yearScore = when {
                candidate.year == null || resultYear == null -> 0
                candidate.year == resultYear -> 35
                abs(candidate.year - resultYear) == 1 -> 15
                else -> -70
            }
            result to (titleScore + yearScore + result.popularity.toInt().coerceIn(0, 20))
        }.maxByOrNull { it.second }
            ?.takeIf { it.second >= 85 }
            ?.first
            ?.id
            ?.takeIf { it > 0 }
    }

    private fun normalizeTitle(value: String): String = Normalizer.normalize(value, Normalizer.Form.NFD)
        .replace(DIACRITICS_REGEX, "")
        .lowercase(Locale.US)
        .replace("&", " and ")
        .replace(NON_ALPHA_NUM_REGEX, " ")
        .trim()

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

    suspend fun getLibraryItems(status: String, forceRefresh: Boolean = false): List<MediaItem> {
        syncIfNeeded(forceRefresh)
        return cachedLibraryItems[status.trim().lowercase()]?.values?.toList().orEmpty()
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
                val resolvedId = if (mediaType == MediaType.MOVIE) {
                    row.movie?.let { resolvedTmdbId(it.ids, mediaType, it.title, it.year) }
                } else {
                    (row.show ?: row.anime)?.let { resolvedTmdbId(it.ids, mediaType, it.title, it.year) }
                }
                if (resolvedId != tmdbId) return@filter false
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
