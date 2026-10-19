package com.arflix.tv.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.stringPreferencesKey
import com.arflix.tv.data.api.TraktApi
import com.arflix.tv.data.model.CatalogConfig
import com.arflix.tv.data.model.CatalogSourceType
import com.arflix.tv.util.settingsDataStore
import com.google.gson.Gson
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.OkHttpClient
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CatalogVisibilityPersistenceTest {
    private val custom = CatalogConfig(
        id = "custom_horror",
        title = "Horror",
        sourceType = CatalogSourceType.MDBLIST,
        sourceUrl = "https://mdblist.com/lists/example/horror"
    )
    private val other = CatalogConfig(
        id = "custom_favorites",
        title = "Favorites",
        sourceType = CatalogSourceType.TRAKT,
        sourceUrl = "https://trakt.tv/users/example/lists/favorites"
    )

    @Test
    fun `web catalog snapshot imports names lowercase types and mixed Android rows`() = withRepository { repository, _, profile ->
        val json = """[
            {"id":"custom_web","name":"Horror","sourceType":"mdblist","sourceUrl":"https://trakt.tv/users/movistapp/lists/horror","enabled":true,"kind":"standard","collectionTileShape":"poster"},
            {"id":"custom_android","title":"Android list","sourceType":"MDBLIST","sourceUrl":"https://mdblist.com/lists/example/horror","enabled":false},
            {"id":"server","name":"Library","sourceType":"home-server","enabled":true}
        ]"""
        val catalogs = repository.parseCatalogsJson(json)
        assertEquals(3, catalogs.size)
        assertEquals("Horror", catalogs[0].title)
        assertEquals(CatalogSourceType.TRAKT, catalogs[0].sourceType)
        assertEquals(com.arflix.tv.data.model.CollectionTileShape.POSTER, catalogs[0].collectionTileShape)
        assertEquals(CatalogSourceType.HOME_SERVER, catalogs[2].sourceType)
        repository.replaceCatalogsForProfile(profile, catalogs, stampChange = false)
        repository.setHiddenCustomCatalogIdsForProfile(profile, listOf("custom_android"), stampChange = false)
        val settings = repository.getCatalogsForSettings(emptyList(), emptyList())
        assertEquals(listOf("custom_web", "custom_android", "server"), settings.map { it.id })
        assertFalse(settings[1].enabled)
        val exported = repository.getCatalogsForCloudSync(profile, emptyList())
        assertEquals(settings, exported)
        assertEquals("https://trakt.tv/users/movistapp/lists/horror", exported[0].sourceUrl)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `invalid web catalog cannot silently replace the saved catalog list`() = withRepository { repository, _, _ ->
        repository.parseCatalogsJson("""[{"id":"missing_title","sourceType":"mdblist"}]""")
    }

    @Test
    fun `home reads and default maintenance preserve hidden URLs for settings and sync`() = withRepository { repository, _, profile ->
        repository.replaceCatalogsForProfile(profile, listOf(custom, other))
        repository.setCatalogEnabled(custom, false)
        val updatedAt = repository.getCatalogsUpdatedAtForProfile(profile)

        repeat(3) {
            assertEquals(listOf(other.id), repository.getCatalogs().map { it.id })
        }
        repository.ensurePreinstalledDefaults(emptyList())

        val settings = repository.getCatalogsForSettings(emptyList(), emptyList())
        assertEquals(listOf(custom.id, other.id), settings.map { it.id })
        assertFalse(settings.first().enabled)
        assertEquals(custom.sourceUrl, settings.first().sourceUrl)
        assertEquals(settings, repository.getCatalogsForCloudSync(profile, emptyList()))
        assertEquals(updatedAt, repository.getCatalogsUpdatedAtForProfile(profile))
    }

    @Test
    fun `default refresh retains hidden builtins and adds new visible defaults`() = withRepository { repository, _, profile ->
        val builtIn = CatalogConfig("builtin_existing", "Existing", CatalogSourceType.PREINSTALLED, isPreinstalled = true)
        val newDefault = CatalogConfig("builtin_new", "New", CatalogSourceType.PREINSTALLED, isPreinstalled = true)
        repository.replaceCatalogsForProfile(profile, listOf(custom, builtIn))
        repository.setCatalogEnabled(custom, false)
        repository.setCatalogEnabled(builtIn, false)

        assertEquals(listOf(newDefault.id), repository.ensurePreinstalledDefaults(listOf(builtIn, newDefault)).map { it.id })
        val settings = repository.getCatalogsForSettings(listOf(builtIn, newDefault), emptyList())
        assertEquals(setOf(custom.id, builtIn.id, newDefault.id), settings.map { it.id }.toSet())
        assertFalse(settings.first { it.id == custom.id }.enabled)
        assertFalse(settings.first { it.id == builtIn.id }.enabled)
        assertTrue(settings.first { it.id == newDefault.id }.enabled)
    }

    @Test
    fun `hidden catalog can be re-enabled without affecting another profile`() = withRepository { repository, _, profile ->
        repository.replaceCatalogsForProfile(profile, listOf(custom, other))
        repository.replaceCatalogsForProfile("other-profile", listOf(custom))
        repository.setCatalogEnabled(custom, false)
        repository.getCatalogs()
        repository.setCatalogEnabled(custom, true)

        assertEquals(listOf(custom, other), repository.getCatalogsForSettings(emptyList(), emptyList()))
        assertTrue(repository.getHiddenCustomCatalogIdsForProfile(profile).isEmpty())
        assertEquals(listOf(custom), repository.getCatalogsForProfile("other-profile"))
    }

    @Test
    fun `cloud restored hidden URL survives reads and can be enabled again`() = withRepository { repository, _, profile ->
        repository.replaceCatalogsForProfile(profile, listOf(custom.copy(enabled = false)), stampChange = false)
        repository.setHiddenCustomCatalogIdsForProfile(profile, listOf(custom.id), stampChange = false)

        assertTrue(repository.getCatalogs().isEmpty())
        val settings = repository.getCatalogsForSettings(emptyList(), emptyList())
        assertEquals(listOf(custom.copy(enabled = false)), settings)
        repository.setCatalogEnabled(settings.single(), true)
        assertEquals(listOf(custom), repository.getCatalogsForCloudSync(profile, emptyList()))
    }

    @Test
    fun `legacy migration preserves hidden URLs instead of saving only visible entries`() = withRepository { repository, store, profile ->
        store.edit { prefs ->
            prefs[stringPreferencesKey("catalogs_v1")] = Gson().toJson(listOf(custom, other))
        }
        repository.setHiddenCustomCatalogIdsForProfile(profile, listOf(custom.id))

        assertEquals(listOf(other.id), repository.getCatalogs().map { it.id })
        val settings = repository.getCatalogsForSettings(emptyList(), emptyList())
        assertEquals(listOf(custom.id, other.id), settings.map { it.id })
        assertFalse(settings.first().enabled)
        assertEquals(settings, repository.getCatalogsForCloudSync(profile, emptyList()))
    }

    @Test
    fun `deleting visible or hidden URLs removes them from settings and sync without legacy resurrection`() = withRepository { repository, store, profile ->
        repository.replaceCatalogsForProfile(profile, listOf(custom, other))
        store.edit { prefs ->
            prefs[stringPreferencesKey("catalogs_v1")] = Gson().toJson(listOf(custom, other))
        }
        repository.setCatalogEnabled(custom, false)
        repository.getCatalogs()

        assertTrue(repository.removeCustomCatalog(custom.id).isSuccess)
        assertEquals(listOf(other.id), repository.getCatalogsForSettings(emptyList(), emptyList()).map { it.id })
        assertTrue(repository.removeCustomCatalog(other.id).isSuccess)
        assertTrue(repository.getCatalogs().isEmpty())
        assertTrue(repository.getCatalogsForSettings(emptyList(), emptyList()).isEmpty())
        assertTrue(repository.getCatalogsForCloudSync(profile, emptyList()).isEmpty())
        assertEquals(setOf(custom.id, other.id), repository.getHiddenCustomCatalogIdsForProfile(profile).toSet())
    }

    private fun withRepository(
        test: suspend (CatalogRepository, DataStore<Preferences>, String) -> Unit
    ) = runBlocking {
        val context = mockk<Context>(relaxed = true)
        val store = object : DataStore<Preferences> {
            override val data = MutableStateFlow<Preferences>(emptyPreferences())
            private val mutex = Mutex()
            override suspend fun updateData(transform: suspend (Preferences) -> Preferences): Preferences =
                mutex.withLock {
                    transform(data.value).also { data.value = it }
                }
        }
        val profile = "default"
        val profileManager = mockk<ProfileManager>(relaxed = true)
        every { profileManager.getProfileIdSync() } returns profile
        mockkStatic("com.arflix.tv.util.DataStoresKt")
        every { context.settingsDataStore } returns store
        try {
            val repository = CatalogRepository(
                context = context,
                profileManager = profileManager,
                traktApi = mockk<TraktApi>(relaxed = true),
                okHttpClient = OkHttpClient(),
                invalidationBus = mockk<CloudSyncInvalidationBus>(relaxed = true)
            )
            test(repository, store, profile)
        } finally {
            unmockkStatic("com.arflix.tv.util.DataStoresKt")
        }
    }
}
