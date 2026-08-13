package com.arflix.tv.data.repository.simkl

import com.arflix.tv.data.api.SimklApi
import com.arflix.tv.data.api.SimklPinPollResponse
import com.arflix.tv.data.api.SimklPinResponse
import com.arflix.tv.data.api.SimklActivitiesResponse
import com.arflix.tv.data.api.SimklAllItemsResponse
import com.arflix.tv.data.api.SimklScrobbleBody
import com.arflix.tv.data.api.SimklScrobbleResponse
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

class SimklIntegrationTest {

    private lateinit var simklApi: SimklApi
    private lateinit var syncProviderStore: SyncProviderStore
    private lateinit var authManager: SimklAuthManager
    private lateinit var scrobbler: SimklScrobbler
    private lateinit var syncService: SimklSyncService

    @Before
    fun setUp() {
        simklApi = mockk(relaxed = true)
        syncProviderStore = mockk(relaxed = true)
        authManager = SimklAuthManager(simklApi, syncProviderStore)
        scrobbler = SimklScrobbler(simklApi, authManager)
        scrobbler.elapsedRealtimeMs = { 0L }
        syncService = SimklSyncService(simklApi, authManager)
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
    }

    @Test
    fun testDisconnectClearsToken() = runBlocking {
        authManager.disconnect()
        coEvery { syncProviderStore.getSimklAccessToken() } returns null
        assertFalse(authManager.isConnected())
        coVerify { syncProviderStore.setSimklAccessToken(null) }
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
        coEvery { simklApi.getAllItems(any(), any(), any(), any(), any(), any(), any(), any()) } returns
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
                includeAllEpisodes = "original"
            )
        }
    }

    @Test
    fun testEmptyAccountSnapshotIsNotReloadedOnEveryRead() = runBlocking {
        coEvery { syncProviderStore.getSimklAccessToken() } returns "token_123"
        coEvery { simklApi.getActivities(any(), any()) } returns SimklActivitiesResponse(all = null)
        coEvery { simklApi.getAllItems(any(), any(), any(), any(), any(), any(), any(), any()) } returns
            SimklAllItemsResponse()

        syncService.syncIfNeeded()
        syncService.syncIfNeeded()

        coVerify(exactly = 3) { simklApi.getAllItems(any(), any(), any(), any(), any(), any(), any(), any()) }
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
    fun testDisconnectClearsCachedWatchedState() = runBlocking {
        coEvery { syncProviderStore.getSimklAccessToken() } returns "token_123"
        coEvery { simklApi.addToHistory(any(), any(), any(), any()) } returns
            retrofit2.Response.success(mockk<okhttp3.ResponseBody>())
        assertTrue(syncService.markWatched(com.arflix.tv.data.model.MediaType.MOVIE, 999))

        coEvery { syncProviderStore.getSimklAccessToken() } returns null

        assertTrue(syncService.getWatchedMovies().isEmpty())
    }
}
