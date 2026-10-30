package com.arflix.tv.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.stringPreferencesKey
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.util.traktDataStore
import com.arflix.tv.util.settingsDataStore
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import io.mockk.verify
import java.util.UUID
import javax.inject.Provider
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.After
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class LocalPlaybackPersistenceTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()
    private val dataStoreJob = SupervisorJob()
    private lateinit var context: Context
    private lateinit var profiles: ProfileManager
    private lateinit var syncServiceProvider: Provider<TraktSyncService>
    private lateinit var repository: TraktRepository
    private lateinit var profileId: String

    @Before
    fun setUp() {
        context = RuntimeEnvironment.getApplication()
        mockkStatic("com.arflix.tv.util.DataStoresKt")
        every { context.traktDataStore } returns MemoryPreferencesStore()
        every { context.settingsDataStore } returns MemoryPreferencesStore()
        profileId = UUID.randomUUID().toString()
        profiles = mockk(relaxed = true)
        every { profiles.getProfileIdSync() } answers { profileId }
        every { profiles.activeProfileId } answers { MutableStateFlow(profileId) }
        every { profiles.profileStringKey(any()) } answers {
            stringPreferencesKey("profile_${profileId}_${firstArg<String>()}")
        }
        every { profiles.profileStringKeyFor(any(), any()) } answers {
            stringPreferencesKey("profile_${firstArg<String>()}_${secondArg<String>()}")
        }
        syncServiceProvider = mockk()
        repository = createRepository()
    }

    private fun createRepository() = TraktRepository(
        context, mockk(), mockk(), mockk(), syncServiceProvider, profiles,
        mockk(), mockk(), mockk(), ContinueWatchingUpdates(), CloudSyncInvalidationBus(),
    )

    @After
    fun tearDown() = runBlocking {
        dataStoreJob.cancelAndJoin()
        unmockkStatic("com.arflix.tv.util.DataStoresKt")
    }

    private suspend fun saveEpisode(
        episode: Int,
        position: Long,
        onlyIfNotUpdatedAfter: Long? = null,
    ) {
        repository.saveLocalContinueWatching(
            mediaType = MediaType.TV, tmdbId = 202, title = "Series",
            posterPath = null, backdropPath = null, season = 1, episode = episode,
            episodeTitle = null, progress = 20, positionSeconds = position, durationSeconds = 600L,
            onlyIfNotUpdatedAfter = onlyIfNotUpdatedAfter,
        )
    }

    @Test
    fun `exact local position survives repository recreation without a backend call`() = runBlocking {
        val diskStore = PreferenceDataStoreFactory.create(
            scope = CoroutineScope(dataStoreJob + Dispatchers.IO),
        ) { temporaryFolder.root.resolve("trakt.preferences_pb") }
        every { context.traktDataStore } returns diskStore
        saveEpisode(3, 120L)
        val persisted = context.traktDataStore.data.first()[
            stringPreferencesKey("profile_${profileId}_local_continue_watching_v1")
        ]
        assertTrue(persisted.orEmpty().contains("120"))
        val reloaded = createRepository().getLocalContinueWatchingEntry(MediaType.TV, 202, 1, 3)
        assertNotNull(reloaded)
        assertEquals(120L, reloaded?.resumePositionSeconds)
        verify(exactly = 0) { syncServiceProvider.get() }
    }

    @Test
    fun `delayed next episode cannot overwrite a newer active episode`() = runBlocking {
        saveEpisode(4, 240L)
        val newer = repository.getLocalContinueWatchingEntry(MediaType.TV, 202, 1, 4)
        saveEpisode(3, 0L, onlyIfNotUpdatedAfter = newer!!.updatedAtMs)
        assertEquals(240L, repository.getLocalContinueWatchingEntry(MediaType.TV, 202, 1, 4)?.resumePositionSeconds)
        assertNull(repository.getLocalContinueWatchingEntry(MediaType.TV, 202, 1, 3))
    }

    @Test
    fun `local movie and episode completion persist without any backend request`() = runBlocking {
        repository.markMovieWatchedWithoutTraktSync(101, syncToBackend = false)
        repository.markEpisodeWatchedWithoutTraktSync(202, 1, 3, syncToBackend = false)
        val prefs = context.traktDataStore.data.first()
        assertTrue(prefs[stringPreferencesKey("profile_${profileId}_local_watched_movies_v1")].orEmpty().contains("101"))
        assertTrue(prefs[stringPreferencesKey("profile_${profileId}_local_watched_episodes_v1")].orEmpty().contains("show_tmdb:202:1:3"))
        verify(exactly = 0) { syncServiceProvider.get() }
    }

    @Test
    fun `local progress stays isolated between profiles`() = runBlocking {
        saveEpisode(3, 120L)
        val originalProfile = profileId
        profileId = UUID.randomUUID().toString()
        assertNull(repository.getLocalContinueWatchingEntry(MediaType.TV, 202, 1, 3))
        saveEpisode(4, 240L)
        profileId = originalProfile
        assertEquals(120L, repository.getLocalContinueWatchingEntry(MediaType.TV, 202, 1, 3)?.resumePositionSeconds)
        assertNull(repository.getLocalContinueWatchingEntry(MediaType.TV, 202, 1, 4))
    }

    private class MemoryPreferencesStore : DataStore<Preferences> {
        override val data = MutableStateFlow<Preferences>(emptyPreferences())
        private val mutex = Mutex()

        override suspend fun updateData(transform: suspend (Preferences) -> Preferences): Preferences =
            mutex.withLock { transform(data.value).also { data.value = it } }
    }
}
