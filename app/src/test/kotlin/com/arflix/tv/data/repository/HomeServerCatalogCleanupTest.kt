package com.arflix.tv.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.emptyPreferences
import com.arflix.tv.util.settingsDataStore
import com.arflix.tv.data.api.TraktApi
import com.arflix.tv.data.model.CatalogConfig
import com.arflix.tv.data.model.CatalogSourceType
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
import java.util.UUID

class HomeServerCatalogCleanupTest {
    @Test
    fun `disconnect cleans catalogs`() = runBlocking {
        val context = mockk<Context>(relaxed = true)
        val store = object : DataStore<Preferences> {
            override val data = MutableStateFlow<Preferences>(emptyPreferences())
            private val mutex = Mutex()
            override suspend fun updateData(transform: suspend (Preferences) -> Preferences): Preferences =
                mutex.withLock {
                    transform(data.value).also { data.value = it }
                }
        }
        mockkStatic("com.arflix.tv.util.DataStoresKt")
        every { context.settingsDataStore } returns store
        try {
            val profileId = "cleanup-${UUID.randomUUID()}"
            val profileManager = mockk<ProfileManager>(relaxed = true)
            every { profileManager.getProfileIdSync() } returns profileId
            val repository = CatalogRepository(
                context = context,
                profileManager = profileManager,
                traktApi = mockk<TraktApi>(relaxed = true),
                okHttpClient = OkHttpClient(),
                invalidationBus = mockk<CloudSyncInvalidationBus>(relaxed = true)
            )
            val remaining = listOf(
                CatalogConfig("addon-library", "Addon", CatalogSourceType.ADDON, addonId = "addon"),
                CatalogConfig("custom-library", "Custom", CatalogSourceType.TRAKT)
            )
            val home = CatalogConfig("home-library", "Plex", CatalogSourceType.HOME_SERVER)
            repository.replaceCatalogsForProfile(profileId, remaining + home)
            repository.replaceCatalogsForProfile("$profileId-other", listOf(home))

            assertFalse(repository.syncHomeServerCatalogs(emptyList()))
            assertTrue(repository.getCatalogs().any { it.sourceType == CatalogSourceType.HOME_SERVER })
            assertTrue(repository.syncHomeServerCatalogs(emptyList(), removeMissing = true))
            assertEquals(remaining.map { it.id }, repository.getCatalogs().map { it.id })
            assertEquals(remaining.map { it.id }, repository.getCatalogsForProfile(profileId).map { it.id })
            assertEquals(listOf(home.id), repository.getCatalogsForProfile("$profileId-other").map { it.id })
            assertFalse(repository.syncHomeServerCatalogs(emptyList(), removeMissing = true))
        } finally {
            unmockkStatic("com.arflix.tv.util.DataStoresKt")
        }
    }
}
