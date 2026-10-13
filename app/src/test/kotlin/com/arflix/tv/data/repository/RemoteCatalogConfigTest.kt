package com.arflix.tv.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.arflix.tv.data.api.TraktApi
import com.arflix.tv.data.model.Addon
import com.arflix.tv.data.model.AddonCatalog
import com.arflix.tv.data.model.AddonManifest
import com.arflix.tv.data.model.AddonType
import com.arflix.tv.data.model.CatalogConfig
import com.arflix.tv.data.model.CatalogSourceType
import com.arflix.tv.data.model.CatalogKind
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

class RemoteCatalogConfigTest {
    @Test
    fun `remote names and hidden sports catalogs survive automatic refresh`() = runBlocking {
        val context = mockk<Context>(relaxed = true)
        val store = object : DataStore<Preferences> {
            override val data = MutableStateFlow<Preferences>(emptyPreferences())
            private val mutex = Mutex()
            override suspend fun updateData(transform: suspend (Preferences) -> Preferences): Preferences =
                mutex.withLock { transform(data.value).also { data.value = it } }
        }
        mockkStatic("com.arflix.tv.util.DataStoresKt")
        every { context.settingsDataStore } returns store
        try {
            val profileId = "remote-test"
            val profileManager = mockk<ProfileManager>(relaxed = true)
            every { profileManager.getProfileIdSync() } returns profileId
            val repository = CatalogRepository(
                context, profileManager, mockk<TraktApi>(relaxed = true),
                OkHttpClient(), mockk<CloudSyncInvalidationBus>(relaxed = true)
            )
            val sports = CatalogConfig(
                "sports", "Sports", CatalogSourceType.PREINSTALLED,
                isPreinstalled = true, remoteManaged = true
            )
            val movies = MediaRepository.buildPreinstalledDefaults()
                .first { it.id != "sports" && it.kind == CatalogKind.STANDARD }
                .copy(title = "Cinema", remoteManaged = true, remoteTitle = "Cinema")
            repository.replaceCatalogsForProfile(profileId, listOf(sports, movies))
            repository.setHiddenPreinstalledCatalogIdsForProfile(profileId, listOf(sports.id))
            val defaults = listOf(sports.copy(remoteManaged = false), movies.copy(title = "Movies", remoteManaged = false, remoteTitle = null))
            repository.ensurePreinstalledDefaults(defaults)
            assertFalse(repository.getCatalogs().any { it.id == sports.id })
            assertEquals(listOf(sports.id), repository.getHiddenPreinstalledCatalogIdsForProfile(profileId))
            assertEquals("Cinema", repository.getCatalogs().single().title)
            assertTrue(repository.getCatalogs().single().remoteManaged)
            repository.ensurePreinstalledDefaults(defaults)
            assertEquals("Cinema", repository.getCatalogs().single().remoteTitle)

            val addon = Addon(
                id = "sports-addon", name = "Sports Addon", version = "1",
                description = "", isInstalled = true, type = AddonType.COMMUNITY,
                url = "https://sports.example/manifest.json",
                manifest = AddonManifest(
                    "sports", "Sports Addon", "1",
                    catalogs = listOf(AddonCatalog("movie", "sports", "Sports"))
                )
            )
            repository.syncAddonCatalogs(listOf(addon))
            val generated = repository.getCatalogsForCloudSync(profileId, listOf(addon))
                .single { it.sourceType == CatalogSourceType.ADDON }
            val renamed = generated.copy(title = "Remote Sport", remoteTitle = "Remote Sport", remoteManaged = true)
            repository.replaceCatalogsForProfile(profileId, listOf(movies, renamed))
            repository.setHiddenAddonCatalogIdsForProfile(profileId, listOf(renamed.id))
            repository.syncAddonCatalogs(listOf(addon.copy(url = "https://sports.example/v2/manifest.json")))
            assertEquals(listOf(renamed.id), repository.getHiddenAddonCatalogIdsForProfile(profileId))
            val synced = repository.getCatalogsForCloudSync(profileId, listOf(addon))
                .single { it.id == renamed.id }
            assertEquals("Remote Sport", synced.title)
            assertEquals("Remote Sport", synced.remoteTitle)
            assertFalse(synced.enabled)
            assertTrue(synced.remoteManaged)

            store.edit { prefs ->
                prefs[stringPreferencesKey("catalogs_v1")] = Gson().toJson(
                    listOf(CatalogConfig("legacy-list", "Legacy", CatalogSourceType.TRAKT))
                )
            }
            repository.replaceCatalogsForProfile(profileId, emptyList())
            assertTrue(repository.getCatalogsForCloudSync(profileId, emptyList()).isEmpty())
        } finally {
            unmockkStatic("com.arflix.tv.util.DataStoresKt")
        }
    }
}
