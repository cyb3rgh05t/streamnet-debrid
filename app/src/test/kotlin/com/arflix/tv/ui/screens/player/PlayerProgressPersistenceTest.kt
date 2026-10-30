package com.arflix.tv.ui.screens.player

import androidx.lifecycle.ViewModelStore
import androidx.media3.common.Player
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.repository.CloudSyncRepository
import com.arflix.tv.data.repository.LauncherContinueWatchingRepository
import com.arflix.tv.data.repository.MediaRepository
import com.arflix.tv.data.repository.PlaybackProgressSaveQueue
import com.arflix.tv.data.repository.PlaybackSaveOwner
import com.arflix.tv.data.repository.TraktRepository
import com.arflix.tv.data.repository.WatchHistoryRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestCoroutineScheduler
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class PlayerProgressPersistenceTest {
    private val store = ViewModelStore()
    private val trakt = mockk<TraktRepository>(relaxed = true)
    private val history = mockk<WatchHistoryRepository>(relaxed = true)
    private val cloud = mockk<CloudSyncRepository>(relaxed = true)
    private val launcher = mockk<LauncherContinueWatchingRepository>(relaxed = true)

    @Before
    fun setUp() {
        // Keep unrelated media loading off the persistence test scheduler.
        Dispatchers.setMain(StandardTestDispatcher(TestCoroutineScheduler()))
    }

    @After
    fun tearDown() {
        store.clear()
        Dispatchers.resetMain()
    }

    private fun TestScope.player(): PlayerViewModel {
        val owner = PlaybackSaveOwner("profile-a", "account-a")
        val owners = MutableStateFlow(owner)
        val queue = PlaybackProgressSaveQueue(backgroundScope, { owners.value }, owners) { throw it }
        val media = mockk<MediaRepository>(relaxed = true)
        every { media.getCachedItem(any(), any()) } returns null
        every { media.peekCachedLogoUrl(any(), any()) } returns null
        return PlayerViewModel(
            context = RuntimeEnvironment.getApplication(),
            profileManager = mockk(relaxed = true),
            mediaRepository = media,
            streamRepository = mockk(relaxed = true),
            traktRepository = trakt,
            remoteSyncManager = mockk(relaxed = true),
            watchHistoryRepository = history,
            cloudSyncRepository = cloud,
            launcherContinueWatchingRepository = launcher,
            playbackProgressSaveQueue = queue,
            animeMapper = mockk(relaxed = true),
            tmdbApi = mockk(relaxed = true),
            skipIntroRepository = mockk(relaxed = true),
            playbackTelemetryRepository = mockk(relaxed = true),
        ).also { store.put("player", it) }
    }

    private fun PlayerViewModel.load(type: MediaType, id: Int, season: Int? = null, episode: Int? = null) {
        loadMedia(
            mediaType = type, mediaId = id, seasonNumber = season, episodeNumber = episode,
            providedImdbId = null, providedStreamUrl = null, preferredAddonId = null,
            preferredSourceName = null, preferredBingeGroup = null, startPositionMs = null,
        )
    }

    private fun blockHistoryUntil(gate: CompletableDeferred<Unit>) {
        coEvery {
            history.saveProgress(
                any(), any(), any(), any(), any(), any(), any(), any(),
                any(), any(), any(), any(), any(), any(), any(),
            )
        } coAnswers { gate.await() }
    }

    @Test
    fun `back saves exact local movie position then returns before slow history sync`() =
        runTest(context = StandardTestDispatcher(TestCoroutineScheduler())) {
            val gate = CompletableDeferred<Unit>()
            blockHistoryUntil(gate)
            val player = player()
            player.load(MediaType.MOVIE, 101)
            val exit = async { player.saveProgressForExit(120_000L, 600_000L, 20, Player.STATE_READY) }
            runCurrent()
            assertTrue(exit.isCompleted)
            coVerify(exactly = 1) {
                trakt.saveLocalContinueWatching(
                    mediaType = MediaType.MOVIE, tmdbId = 101, title = any(),
                    posterPath = any(), backdropPath = any(), season = null, episode = null,
                    displaySeason = null, displayEpisode = null, episodeTitle = any(),
                    progress = 20, positionSeconds = 120L, durationSeconds = 600L,
                    streamKey = any(), streamAddonId = any(), streamTitle = any(),
                    year = any(), onlyIfNotUpdatedAfter = null,
                )
            }
            coVerify(exactly = 0) { cloud.pushToCloud(any()) }
            store.clear()
            gate.complete(Unit)
            runCurrent()
            coVerify(exactly = 1) { cloud.pushToCloud(any()) }
            coVerify(exactly = 1) { launcher.refreshForCurrentProfile() }
        }

    @Test
    fun `completion is marked locally before back and never saved as resumable progress`() =
        runTest(context = StandardTestDispatcher(TestCoroutineScheduler())) {
            val gate = CompletableDeferred<Unit>()
            coEvery { trakt.syncMovieWatchedToBackend(101) } coAnswers { gate.await() }
            val player = player()
            player.load(MediaType.MOVIE, 101)
            val exit = async { player.saveProgressForExit(600_000L, 600_000L, 100, Player.STATE_ENDED) }
            runCurrent()
            assertTrue(exit.isCompleted)
            coVerify(exactly = 1) { trakt.markMovieWatchedWithoutTraktSync(101, syncToBackend = false) }
            coVerify(exactly = 0) {
                history.saveProgress(
                    any(), any(), any(), any(), any(), any(), any(), any(),
                    any(), any(), any(), any(), any(), any(), any(),
                )
            }
            gate.complete(Unit)
            runCurrent()
            coVerify(exactly = 1) { cloud.pushToCloud(any()) }
        }

    @Test
    fun `back during pending episode completion neither repeats watched marking nor waits for network`() =
        runTest(context = StandardTestDispatcher(TestCoroutineScheduler())) {
            val gate = CompletableDeferred<Unit>()
            coEvery { trakt.syncEpisodeWatchedToBackend(202, 1, 3) } coAnswers { gate.await() }
            val player = player()
            player.load(MediaType.TV, 202, 1, 3)
            player.saveProgress(600_000L, 600_000L, 100, false, Player.STATE_ENDED)
            runCurrent()
            val exit = async { player.saveProgressForExit(600_000L, 600_000L, 100, Player.STATE_ENDED) }
            runCurrent()
            assertTrue(exit.isCompleted)
            coVerify(exactly = 1) {
                trakt.markEpisodeWatchedWithoutTraktSync(202, 1, 3, syncToBackend = false)
            }
            coVerify(exactly = 0) { cloud.pushToCloud(any()) }
            gate.complete(Unit)
            runCurrent()
            coVerify(exactly = 1) { trakt.syncEpisodeWatchedToBackend(202, 1, 3) }
            coVerify(exactly = 1) { cloud.pushToCloud(any()) }
        }

    @Test
    fun `episode transitions still wait for full persistence`() =
        runTest(context = StandardTestDispatcher(TestCoroutineScheduler())) {
            val gate = CompletableDeferred<Unit>()
            blockHistoryUntil(gate)
            val player = player()
            player.load(MediaType.TV, 202, 1, 3)
            val transition = async {
                player.saveProgressAndWait(120_000L, 600_000L, 20, false, Player.STATE_READY)
            }
            runCurrent()
            assertFalse(transition.isCompleted)
            gate.complete(Unit)
            runCurrent()
            assertTrue(transition.isCompleted)
        }

    @Test
    fun `queued save retains original episode even if the same player loads another episode`() =
        runTest(context = StandardTestDispatcher(TestCoroutineScheduler())) {
            val player = player()
            player.load(MediaType.TV, 202, 1, 3)
            player.saveProgress(120_000L, 600_000L, 20, false, Player.STATE_READY)
            player.load(MediaType.TV, 202, 1, 4)
            runCurrent()
            coVerify(exactly = 1) {
                history.saveProgress(
                    mediaType = MediaType.TV, tmdbId = 202, title = any(), poster = any(),
                    backdrop = any(), season = 1, episode = 3, episodeTitle = any(),
                    progress = 0.2f, duration = 600L, position = 120L,
                    streamKey = any(), streamAddonId = any(), streamTitle = any(), sessionStartTime = any(),
                )
            }
        }
}
