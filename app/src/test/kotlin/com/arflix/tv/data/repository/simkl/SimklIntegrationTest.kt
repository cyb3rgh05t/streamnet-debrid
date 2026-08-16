package com.arflix.tv.data.repository.simkl

import com.arflix.tv.data.api.SimklApi
import com.arflix.tv.data.api.SimklPinPollResponse
import com.arflix.tv.data.api.SimklPinResponse
import com.arflix.tv.data.api.SimklActivitiesResponse
import com.arflix.tv.data.api.SimklAllItemsResponse
import com.arflix.tv.data.api.SimklScrobbleBody
import com.arflix.tv.data.api.SimklScrobbleResponse
import com.arflix.tv.data.api.TmdbApi
import com.arflix.tv.data.api.TmdbListResponse
import com.arflix.tv.data.api.TmdbMediaItem
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.repository.sync.SyncProviderStore
import com.google.gson.Gson
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import io.mockk.slot
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.io.IOException

class SimklIntegrationTest {

    private lateinit var simklApi: SimklApi
    private lateinit var syncProviderStore: SyncProviderStore
    private lateinit var authManager: SimklAuthManager
    private lateinit var scrobbler: SimklScrobbler
    private lateinit var syncService: SimklSyncService
    private lateinit var tmdbApi: TmdbApi

    @Before
    fun setUp() {
        simklApi = mockk(relaxed = true)
        syncProviderStore = mockk(relaxed = true)
        authManager = SimklAuthManager(simklApi, syncProviderStore)
        scrobbler = SimklScrobbler(simklApi, authManager)
        scrobbler.elapsedRealtimeMs = { 0L }
        tmdbApi = mockk(relaxed = true)
        syncService = SimklSyncService(simklApi, authManager, tmdbApi)
    }

    @Test
    fun testStartPinAuthReturnsResponse() = runBlocking {
        val expected = SimklPinResponse(
            userCode = "SIMKL-123",
            verificationUrl = "https://simkl.com/pin",
            expiresIn = 600
        )
        coEvery { simklApi.getPinCode(any()) } returns expected

        val result = authManager.startPinAuth()
        assertEquals("SIMKL-123", result.userCode)
        assertEquals("https://simkl.com/pin", result.verificationUrl)
    }

    @Test
    fun testPollPinAuthSuccessStoresToken() = runBlocking {
        val pollRes = SimklPinPollResponse(
            result = "OK",
            accessToken = "token_abc123"
        )
        coEvery { simklApi.pollPinToken(any(), any()) } returns pollRes

        val success = authManager.pollPinAuth("SIMKL-123")
        assertTrue(success)
        coVerify { syncProviderStore.setSimklAccessToken("token_abc123") }
        coVerify { syncProviderStore.setMdbListApiKey(null) }
        coVerify { syncProviderStore.onProviderConnected(com.arflix.tv.data.repository.sync.SyncProvider.SIMKL) }
    }

    @Test
    fun testDisconnectClearsToken() = runBlocking {
        authManager.disconnect()
        coEvery { syncProviderStore.getSimklAccessToken() } returns null
        assertFalse(authManager.isConnected())
        coVerify { syncProviderStore.setSimklAccessToken(null) }
        coVerify { syncProviderStore.onProviderDisconnected(com.arflix.tv.data.repository.sync.SyncProvider.SIMKL) }
    }

    @Test
    fun testAddToWatchlistCallsAddToList() = runBlocking {
        coEvery { syncProviderStore.getSimklAccessToken() } returns "token_123"
        coEvery { simklApi.addToList(any(), any(), any()) } returns retrofit2.Response.success(
            mockk<okhttp3.ResponseBody>()
        )

        val success = syncService.addToWatchlist(com.arflix.tv.data.model.MediaType.MOVIE, 12345)
        assertTrue(success)
        coVerify { simklApi.addToList("Bearer token_123", any(), any()) }
    }

    @Test
    fun testRemoveFromWatchlistCallsRemoveFromHistory() = runBlocking {
        coEvery { syncProviderStore.getSimklAccessToken() } returns "token_123"
        coEvery { simklApi.removeFromHistory(any(), any(), any()) } returns retrofit2.Response.success(
            mockk<okhttp3.ResponseBody>()
        )

        val success = syncService.removeFromWatchlist(com.arflix.tv.data.model.MediaType.MOVIE, 12345)
        assertTrue(success)
        coVerify { simklApi.removeFromHistory("Bearer token_123", any(), any()) }
    }

    @Test
    fun testMarkUnwatchedCallsRemoveFromHistory() = runBlocking {
        coEvery { syncProviderStore.getSimklAccessToken() } returns "token_123"
        coEvery { simklApi.removeFromHistory(any(), any(), any()) } returns retrofit2.Response.success(
            mockk<okhttp3.ResponseBody>()
        )

        val success = syncService.markUnwatched(com.arflix.tv.data.model.MediaType.MOVIE, 12345)
        assertTrue(success)
        coVerify { simklApi.removeFromHistory("Bearer token_123", any(), any()) }
    }

    @Test
    fun testEpisodeScrobbleIncludesSeasonAndEpisode() = runBlocking {
        coEvery { syncProviderStore.getSimklAccessToken() } returns "token_123"
        val body = slot<SimklScrobbleBody>()
        coEvery { simklApi.scrobbleStart(any(), any(), capture(body)) } returns
            retrofit2.Response.success(SimklScrobbleResponse(action = "scrobble"))

        scrobbler.scrobbleStart(
            mediaType = com.arflix.tv.data.model.MediaType.TV,
            tmdbId = 456,
            progress = 25f,
            season = 3,
            episode = 7
        )

        assertEquals(456, body.captured.show?.ids?.tmdb)
        assertEquals(3, body.captured.episode?.season)
        assertEquals(7, body.captured.episode?.number)
        assertTrue(body.captured.show?.seasons.isNullOrEmpty())
    }

    @Test
    fun testAnimeEpisodeScrobbleUsesAnimePayload() = runBlocking {
        coEvery { syncProviderStore.getSimklAccessToken() } returns "token_123"
        val body = slot<SimklScrobbleBody>()
        coEvery { simklApi.scrobbleStart(any(), any(), capture(body)) } returns
            retrofit2.Response.success(SimklScrobbleResponse(action = "scrobble"))

        scrobbler.scrobbleStart(
            mediaType = com.arflix.tv.data.model.MediaType.TV,
            tmdbId = 789,
            progress = 50f,
            season = 2,
            episode = 4,
            isAnime = true
        )

        assertEquals(null, body.captured.show)
        assertEquals(789, body.captured.anime?.ids?.tmdb)
        assertEquals(2, body.captured.episode?.season)
        assertEquals(4, body.captured.episode?.number)
    }

    @Test
    fun testInitialSyncRequestsFullEpisodeHistory() = runBlocking {
        coEvery { syncProviderStore.getSimklAccessToken() } returns "token_123"
        coEvery { simklApi.getActivities(any(), any()) } returns SimklActivitiesResponse(all = "2026-08-12T10:00:00Z")
        coEvery { simklApi.getAllItems(any(), any(), any(), any(), any(), any(), any(), any(), any()) } returns
            SimklAllItemsResponse()

        syncService.syncIfNeeded(force = true)

        coVerify(exactly = 3) {
            simklApi.getAllItems(
                any(),
                any(),
                any(),
                status = "all",
                dateFrom = null,
                extended = "full",
                episodeWatchedAt = "yes",
                includeAllEpisodes = "yes",
                nextWatchInfo = "yes"
            )
        }
    }

    @Test
    fun testEmptyAccountSnapshotIsNotReloadedOnEveryRead() = runBlocking {
        coEvery { syncProviderStore.getSimklAccessToken() } returns "token_123"
        coEvery { simklApi.getActivities(any(), any()) } returns SimklActivitiesResponse(all = null)
        coEvery { simklApi.getAllItems(any(), any(), any(), any(), any(), any(), any(), any(), any()) } returns
            SimklAllItemsResponse()

        syncService.syncIfNeeded()
        syncService.syncIfNeeded()

        coVerify(exactly = 3) { simklApi.getAllItems(any(), any(), any(), any(), any(), any(), any(), any(), any()) }
    }

    @Test
    fun testOneFailedCategoryKeepsSuccessfulSimklLibraryAndStopsImmediateRetry() = runBlocking {
        coEvery { syncProviderStore.getSimklAccessToken() } returns "token_123"
        coEvery { simklApi.getActivities(any(), any()) } returns
            SimklActivitiesResponse(all = "2026-08-16T10:00:00Z")
        coEvery { simklApi.getAllItems(any(), any(), any(), any(), any(), any(), any(), any(), any()) } returns
            SimklAllItemsResponse()
        coEvery {
            simklApi.getAllItems(any(), any(), "movies", any(), any(), any(), any(), any(), any())
        } throws IOException("temporary Simkl failure")
        coEvery {
            simklApi.getAllItems(any(), any(), "shows", any(), any(), any(), any(), any(), any())
        } returns Gson().fromJson(
            """{"shows":[{"status":"watching","show":{"title":"Available Show","year":2025,"ids":{"tmdb":440}} ,"next_to_watch":"S01E02"}]}""",
            SimklAllItemsResponse::class.java
        )
        coEvery { simklApi.getPlayback(any(), any()) } returns emptyList()

        val library = syncService.getLibraryItems("watching", forceRefresh = true)
        val continueWatching = syncService.getContinueWatching()

        assertEquals(listOf(440), library.map { it.id })
        assertEquals(listOf(440), continueWatching.map { it.id })
        coVerify(exactly = 1) { simklApi.getActivities(any(), any()) }
        coVerify(exactly = 1) {
            simklApi.getAllItems(any(), any(), "movies", any(), any(), any(), any(), any(), any())
        }
    }

    @Test
    fun testTransientRefreshFailurePreservesPreviousSimklSnapshot() = runBlocking {
        coEvery { syncProviderStore.getSimklAccessToken() } returns "token_123"
        coEvery { simklApi.getActivities(any(), any()) } returns
            SimklActivitiesResponse(all = "2026-08-16T11:00:00Z")
        coEvery { simklApi.getAllItems(any(), any(), any(), any(), any(), any(), any(), any(), any()) } returns
            SimklAllItemsResponse()
        coEvery {
            simklApi.getAllItems(any(), any(), "movies", any(), any(), any(), any(), any(), any())
        } returns Gson().fromJson(
            """{"movies":[{"status":"plantowatch","movie":{"title":"Saved Movie","year":2024,"ids":{"tmdb":550}}}]}""",
            SimklAllItemsResponse::class.java
        )
        coEvery { simklApi.getPlayback(any(), any()) } returns emptyList()

        assertEquals(listOf(550), syncService.getLibraryItems("plantowatch", forceRefresh = true).map { it.id })

        coEvery { simklApi.getAllItems(any(), any(), any(), any(), any(), any(), any(), any(), any()) } throws
            IOException("temporary Simkl outage")
        coEvery { simklApi.getPlayback(any(), any()) } throws IOException("temporary playback outage")

        val afterFailure = syncService.getLibraryItems("plantowatch", forceRefresh = true)

        assertEquals(listOf(550), afterFailure.map { it.id })
    }

    @Test
    fun testSimklOnlyItemFallsBackToStrictTitleAndYearMatch() = runBlocking {
        coEvery { syncProviderStore.getSimklAccessToken() } returns "token_123"
        coEvery { simklApi.getActivities(any(), any()) } returns
            SimklActivitiesResponse(all = "2026-08-16T12:00:00Z")
        coEvery { simklApi.getAllItems(any(), any(), any(), any(), any(), any(), any(), any(), any()) } returns
            SimklAllItemsResponse()
        coEvery {
            simklApi.getAllItems(any(), any(), "anime", any(), any(), any(), any(), any(), any())
        } returns Gson().fromJson(
            """{"anime":[{"status":"plantowatch","show":{"title":"Simkl Anime","year":2025,"ids":{"simkl":98765}}}]}""",
            SimklAllItemsResponse::class.java
        )
        coEvery { simklApi.getPlayback(any(), any()) } returns emptyList()
        coEvery {
            tmdbApi.searchTv(any(), "Simkl Anime", any(), any(), 2025)
        } returns TmdbListResponse(
            results = listOf(
                TmdbMediaItem(
                    id = 660,
                    name = "Simkl Anime",
                    firstAirDate = "2025-01-10",
                    popularity = 10f
                )
            )
        )

        val library = syncService.getLibraryItems("plantowatch", forceRefresh = true)

        assertEquals(listOf(660), library.map { it.id })
        assertEquals(MediaType.TV, library.single().mediaType)
    }

    @Test
    fun testActivitiesAcceptsCurrentTvShowsField() {
        val activities = Gson().fromJson(
            """{"all":null,"tv_shows":{"all":"2026-08-12T12:00:00Z"}}""",
            SimklActivitiesResponse::class.java
        )

        assertEquals("2026-08-12T12:00:00Z", activities.shows?.all)
    }

    @Test
    fun testContinueWatchingIncludesPausedPlaybackAndUpNext() = runBlocking {
        coEvery { syncProviderStore.getSimklAccessToken() } returns "token_123"
        coEvery { simklApi.getActivities(any(), any()) } returns
            SimklActivitiesResponse(all = "2026-08-12T12:00:00Z")
        coEvery { simklApi.getAllItems(any(), any(), any(), any(), any(), any(), any(), any(), any()) } returns
            SimklAllItemsResponse()
        coEvery {
            simklApi.getAllItems(any(), any(), "shows", any(), any(), any(), any(), any(), any())
        } returns Gson().fromJson(
            """{"shows":[{"status":"watching","last_watched_at":"2026-08-11T20:00:00Z","show":{"title":"Up Next Show","year":2025,"runtime":45,"ids":{"tmdb":200}},"next_to_watch":"S02E04","next_to_watch_info":{"title":"The Return","season":2,"episode":4,"date":"2026-08-12T20:00:00Z"},"watched_episodes_count":12,"total_episodes_count":20}]}""",
            SimklAllItemsResponse::class.java
        )
        coEvery { simklApi.getPlayback(any(), any()) } returns Gson().fromJson(
            """[{"id":7,"progress":42.5,"paused_at":"2026-08-12T11:00:00Z","type":"movie","movie":{"title":"Paused Movie","year":2024,"runtime":120,"ids":{"tmdb":100}}}]""",
            Array<com.arflix.tv.data.api.SimklPlaybackItem>::class.java
        ).toList()

        val items = syncService.getContinueWatching(forceRefresh = true)

        assertEquals(2, items.size)
        val movie = items.first { it.id == 100 }
        assertEquals(42, movie.progress)
        assertEquals(3_024L, movie.resumePositionSeconds)
        assertFalse(syncService.getWatchedMovies().contains(100))
        val show = items.first { it.id == 200 }
        assertTrue(show.isUpNext)
        assertEquals(2, show.season)
        assertEquals(4, show.episode)
        assertEquals("The Return", show.episodeTitle)
        assertEquals(12, show.watchedEpisodes)
        assertEquals(20, show.totalEpisodes)
    }

    @Test
    fun testMyListSeparatesPlannedTitlesAndMarksPreviousEpisodesWatched() = runBlocking {
        coEvery { syncProviderStore.getSimklAccessToken() } returns "token_123"
        coEvery { simklApi.getActivities(any(), any()) } returns
            SimklActivitiesResponse(all = "2026-08-14T12:00:00Z")
        coEvery { simklApi.getAllItems(any(), any(), any(), any(), any(), any(), any(), any(), any()) } returns
            SimklAllItemsResponse()
        coEvery {
            simklApi.getAllItems(any(), any(), "shows", any(), any(), any(), any(), any(), any())
        } returns Gson().fromJson(
            """{"shows":[{"status":"watching","last_watched_at":"2026-08-14T11:00:00Z","show":{"title":"Current Show","ids":{"tmdb":200}},"seasons":[{"number":1,"episodes":[{"number":1},{"number":2}]}],"next_to_watch":"S01E03"},{"status":"plantowatch","show":{"title":"Planned Show","ids":{"tmdb":300}}}]}""",
            SimklAllItemsResponse::class.java
        )
        coEvery { simklApi.getPlayback(any(), any()) } returns emptyList()

        val watchlist = syncService.getWatchlistItems()
        val continueWatching = syncService.getContinueWatching()
        val watchedEpisodes = syncService.getWatchedEpisodes()

        assertEquals(listOf(300), watchlist.map { it.id })
        assertEquals(200, continueWatching.single().id)
        assertEquals(3, continueWatching.single().episode)
        assertTrue("show_tmdb:200:1:1" in watchedEpisodes)
        assertTrue("show_tmdb:200:1:2" in watchedEpisodes)
    }

    @Test
    fun testDismissContinueWatchingDeletesMatchingPlayback() = runBlocking {
        coEvery { syncProviderStore.getSimklAccessToken() } returns "token_123"
        coEvery { simklApi.getPlayback(any(), any()) } returns Gson().fromJson(
            """[{"id":77,"progress":35,"type":"episode","show":{"ids":{"tmdb":200}},"episode":{"season":2,"number":4}}]""",
            Array<com.arflix.tv.data.api.SimklPlaybackItem>::class.java
        ).toList()
        coEvery { simklApi.deletePlayback(any(), any(), 77L) } returns
            retrofit2.Response.success(mockk<okhttp3.ResponseBody>())

        assertTrue(syncService.dismissContinueWatching(com.arflix.tv.data.model.MediaType.TV, 200, 2, 4))
        coVerify(exactly = 1) { simklApi.deletePlayback("Bearer token_123", any(), 77L) }
    }

    @Test
    fun testDisconnectClearsCachedWatchedState() = runBlocking {
        coEvery { syncProviderStore.getSimklAccessToken() } returns "token_123"
        coEvery { simklApi.addToHistory(any(), any(), any(), any()) } returns
            retrofit2.Response.success(mockk<okhttp3.ResponseBody>())
        assertTrue(syncService.markWatched(com.arflix.tv.data.model.MediaType.MOVIE, 999))

        coEvery { syncProviderStore.getSimklAccessToken() } returns null

        assertTrue(syncService.getWatchedMovies().isEmpty())
    }
}
