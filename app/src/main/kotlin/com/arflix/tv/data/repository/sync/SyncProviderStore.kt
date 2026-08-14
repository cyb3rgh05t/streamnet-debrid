package com.arflix.tv.data.repository.sync

import android.content.Context
import androidx.datastore.preferences.core.edit
import com.arflix.tv.data.repository.ProfileManager
import com.arflix.tv.util.SecureStorage
import com.arflix.tv.util.settingsDataStore
import com.arflix.tv.util.traktDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Owns per-profile tracking connections and routing preferences.
 *
 * - `sync_provider` lives in [settingsDataStore] (profile-scoped).
 * - `mdblist_api_key` lives in [traktDataStore] alongside the Trakt tokens (the
 *   store name is historical; it is the profile-scoped credential store).
 *
 * Trakt tokens continue to be owned by TraktRepository; this store never touches
 * them. Which provider is *active* is derived here: if a profile is set to TRAKT
 * but has no token, or MDBLIST but no key, callers should treat it as NONE — the
 * providers themselves report `isConnected()` for the authoritative check.
 */
@Singleton
class SyncProviderStore @Inject constructor(
    @ApplicationContext private val context: Context,
    private val profileManager: ProfileManager
) {
    private companion object {
        const val SIMKL_TOKEN_ALIAS = "arvio_simkl_access_token"
    }
    private fun providerKey() = profileManager.profileStringKey("sync_provider")
    private fun providerKeyFor(profileId: String) =
        profileManager.profileStringKeyFor(profileId, "sync_provider")
    private fun mdbListKey() = profileManager.profileStringKey("mdblist_api_key")
    private fun mdbListKeyFor(profileId: String) =
        profileManager.profileStringKeyFor(profileId, "mdblist_api_key")
    private fun traktAccessTokenKey() = profileManager.profileStringKey("trakt_access_token")
    private fun watchlistReadModeKey() = profileManager.profileStringKey("tracking_watchlist_read_mode_v2")
    private fun continueWatchingReadModeKey() = profileManager.profileStringKey("tracking_continue_read_mode_v2")
    private fun watchedReadModeKey() = profileManager.profileStringKey("tracking_watched_read_mode_v2")
    private fun writeToTraktKey() = profileManager.profileBooleanKey("tracking_write_trakt_v2")
    private fun writeToSimklKey() = profileManager.profileBooleanKey("tracking_write_simkl_v2")
    private fun watchlistReadModeKeyFor(profileId: String) =
        profileManager.profileStringKeyFor(profileId, "tracking_watchlist_read_mode_v2")
    private fun continueWatchingReadModeKeyFor(profileId: String) =
        profileManager.profileStringKeyFor(profileId, "tracking_continue_read_mode_v2")
    private fun watchedReadModeKeyFor(profileId: String) =
        profileManager.profileStringKeyFor(profileId, "tracking_watched_read_mode_v2")
    private fun writeToTraktKeyFor(profileId: String) =
        profileManager.profileBooleanKeyFor(profileId, "tracking_write_trakt_v2")
    private fun writeToSimklKeyFor(profileId: String) =
        profileManager.profileBooleanKeyFor(profileId, "tracking_write_simkl_v2")

    suspend fun getProvider(): SyncProvider {
        val prefs = context.settingsDataStore.data.first()
        return SyncProvider.fromStorage(prefs[providerKey()])
    }

    val providerFlow: Flow<SyncProvider> = context.settingsDataStore.data.map { prefs ->
        SyncProvider.fromStorage(prefs[providerKey()])
    }

    suspend fun setProvider(provider: SyncProvider) {
        context.settingsDataStore.edit { prefs ->
            if (provider == SyncProvider.NONE) {
                prefs.remove(providerKey())
            } else {
                prefs[providerKey()] = provider.toStorage()
            }
        }
    }

    private fun defaultReadMode(
        provider: SyncProvider,
        hasTrakt: Boolean,
        hasSimkl: Boolean,
        hasMdbList: Boolean
    ): TrackingReadMode = when {
        provider == SyncProvider.MDBLIST && hasMdbList -> TrackingReadMode.MDBLIST
        provider == SyncProvider.SIMKL && hasSimkl -> TrackingReadMode.SIMKL
        provider == SyncProvider.TRAKT && hasTrakt -> TrackingReadMode.TRAKT
        hasTrakt && hasSimkl -> TrackingReadMode.BOTH
        hasTrakt -> TrackingReadMode.TRAKT
        hasSimkl -> TrackingReadMode.SIMKL
        hasMdbList -> TrackingReadMode.MDBLIST
        else -> TrackingReadMode.AUTO
    }

    suspend fun getTrackingPreferences(): TrackingPreferences {
        val settings = context.settingsDataStore.data.first()
        val credentials = context.traktDataStore.data.first()
        val provider = SyncProvider.fromStorage(settings[providerKey()])
        val hasTrakt = !credentials[traktAccessTokenKey()].isNullOrBlank()
        val hasSimkl = !SecureStorage.decrypt(credentials[simklAccessTokenKey()], SIMKL_TOKEN_ALIAS).isNullOrBlank()
        val hasMdbList = !credentials[mdbListKey()].isNullOrBlank()
        val fallback = defaultReadMode(provider, hasTrakt, hasSimkl, hasMdbList)
        return TrackingPreferences(
            watchlistReadMode = TrackingReadMode.fromStorage(settings[watchlistReadModeKey()]).let {
                if (it == TrackingReadMode.AUTO) fallback else it
            },
            continueWatchingReadMode = TrackingReadMode.fromStorage(settings[continueWatchingReadModeKey()]).let {
                if (it == TrackingReadMode.AUTO) fallback else it
            },
            watchedReadMode = TrackingReadMode.fromStorage(settings[watchedReadModeKey()]).let {
                if (it == TrackingReadMode.AUTO) fallback else it
            },
            writeToTrakt = settings[writeToTraktKey()] ?: hasTrakt,
            writeToSimkl = settings[writeToSimklKey()] ?: hasSimkl
        )
    }

    suspend fun setReadMode(feature: TrackingFeature, mode: TrackingReadMode) {
        context.settingsDataStore.edit { prefs ->
            val key = when (feature) {
                TrackingFeature.WATCHLIST -> watchlistReadModeKey()
                TrackingFeature.CONTINUE_WATCHING -> continueWatchingReadModeKey()
                TrackingFeature.WATCHED -> watchedReadModeKey()
            }
            if (mode == TrackingReadMode.AUTO) prefs.remove(key) else prefs[key] = mode.toStorage()
        }
    }

    suspend fun setWriteTarget(provider: SyncProvider, enabled: Boolean) {
        context.settingsDataStore.edit { prefs ->
            when (provider) {
                SyncProvider.TRAKT -> prefs[writeToTraktKey()] = enabled
                SyncProvider.SIMKL -> prefs[writeToSimklKey()] = enabled
                else -> Unit
            }
        }
    }

    suspend fun readProviders(feature: TrackingFeature): Set<SyncProvider> {
        val preferences = getTrackingPreferences()
        val mode = when (feature) {
            TrackingFeature.WATCHLIST -> preferences.watchlistReadMode
            TrackingFeature.CONTINUE_WATCHING -> preferences.continueWatchingReadMode
            TrackingFeature.WATCHED -> preferences.watchedReadMode
        }
        return when (mode) {
            TrackingReadMode.TRAKT -> setOf(SyncProvider.TRAKT)
            TrackingReadMode.SIMKL -> setOf(SyncProvider.SIMKL)
            TrackingReadMode.BOTH -> setOf(SyncProvider.TRAKT, SyncProvider.SIMKL)
            TrackingReadMode.MDBLIST -> setOf(SyncProvider.MDBLIST)
            TrackingReadMode.AUTO -> emptySet()
        }
    }

    suspend fun writeProviders(): Set<SyncProvider> {
        val preferences = getTrackingPreferences()
        val legacyProvider = getProvider()
        return buildSet {
            if (preferences.writeToTrakt == true) add(SyncProvider.TRAKT)
            if (preferences.writeToSimkl == true) add(SyncProvider.SIMKL)
            if (legacyProvider == SyncProvider.MDBLIST) add(SyncProvider.MDBLIST)
        }
    }

    suspend fun onProviderConnected(provider: SyncProvider) {
        setProvider(provider)
        val credentials = context.traktDataStore.data.first()
        val hasTrakt = !credentials[traktAccessTokenKey()].isNullOrBlank()
        val hasSimkl = !SecureStorage.decrypt(credentials[simklAccessTokenKey()], SIMKL_TOKEN_ALIAS).isNullOrBlank()
        val mode = when {
            hasTrakt && hasSimkl -> TrackingReadMode.BOTH
            provider == SyncProvider.SIMKL -> TrackingReadMode.SIMKL
            provider == SyncProvider.TRAKT -> TrackingReadMode.TRAKT
            provider == SyncProvider.MDBLIST -> TrackingReadMode.MDBLIST
            else -> TrackingReadMode.AUTO
        }
        TrackingFeature.entries.forEach { setReadMode(it, mode) }
        if (provider == SyncProvider.MDBLIST) {
            setWriteTarget(SyncProvider.TRAKT, false)
            setWriteTarget(SyncProvider.SIMKL, false)
            return
        }
        if (provider == SyncProvider.TRAKT || hasTrakt) setWriteTarget(SyncProvider.TRAKT, hasTrakt)
        if (provider == SyncProvider.SIMKL || hasSimkl) setWriteTarget(SyncProvider.SIMKL, hasSimkl)
    }

    suspend fun onProviderDisconnected(provider: SyncProvider) {
        setWriteTarget(provider, false)
        val credentials = context.traktDataStore.data.first()
        val hasTrakt = !credentials[traktAccessTokenKey()].isNullOrBlank()
        val hasSimkl = !SecureStorage.decrypt(credentials[simklAccessTokenKey()], SIMKL_TOKEN_ALIAS).isNullOrBlank()
        val hasMdbList = !credentials[mdbListKey()].isNullOrBlank()
        val replacement = defaultReadMode(SyncProvider.NONE, hasTrakt, hasSimkl, hasMdbList)
        val current = getTrackingPreferences()
        val affected = when (provider) {
            SyncProvider.TRAKT -> setOf(TrackingReadMode.TRAKT, TrackingReadMode.BOTH)
            SyncProvider.SIMKL -> setOf(TrackingReadMode.SIMKL, TrackingReadMode.BOTH)
            SyncProvider.MDBLIST -> setOf(TrackingReadMode.MDBLIST)
            SyncProvider.NONE -> emptySet()
        }
        if (current.watchlistReadMode in affected) setReadMode(TrackingFeature.WATCHLIST, replacement)
        if (current.continueWatchingReadMode in affected) setReadMode(TrackingFeature.CONTINUE_WATCHING, replacement)
        if (current.watchedReadMode in affected) setReadMode(TrackingFeature.WATCHED, replacement)
        setProvider(
            when {
                hasTrakt -> SyncProvider.TRAKT
                hasSimkl -> SyncProvider.SIMKL
                hasMdbList -> SyncProvider.MDBLIST
                else -> SyncProvider.NONE
            }
        )
    }

    private fun simklAccessTokenKey() = profileManager.profileStringKey("simkl_access_token")
    private fun simklAccessTokenKeyFor(profileId: String) =
        profileManager.profileStringKeyFor(profileId, "simkl_access_token")

    suspend fun getSimklAccessToken(): String? {
        val prefs = context.traktDataStore.data.first()
        val stored = prefs[simklAccessTokenKey()]
        val token = SecureStorage.decrypt(stored, SIMKL_TOKEN_ALIAS)
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
        if (token != null && !SecureStorage.isEncrypted(stored)) {
            context.traktDataStore.edit { current ->
                current[simklAccessTokenKey()] = SecureStorage.encrypt(token, SIMKL_TOKEN_ALIAS)
            }
        }
        return token
    }

    suspend fun setSimklAccessToken(token: String?) {
        context.traktDataStore.edit { prefs ->
            val trimmed = token?.trim().orEmpty()
            if (trimmed.isEmpty()) {
                prefs.remove(simklAccessTokenKey())
            } else {
                prefs[simklAccessTokenKey()] = SecureStorage.encrypt(trimmed, SIMKL_TOKEN_ALIAS)
            }
        }
    }

    suspend fun getMdbListApiKey(): String? {
        val prefs = context.traktDataStore.data.first()
        return prefs[mdbListKey()]?.trim()?.takeIf { it.isNotEmpty() }
    }

    suspend fun setMdbListApiKey(apiKey: String?) {
        context.traktDataStore.edit { prefs ->
            val trimmed = apiKey?.trim().orEmpty()
            if (trimmed.isEmpty()) {
                prefs.remove(mdbListKey())
            } else {
                prefs[mdbListKey()] = trimmed
            }
        }
    }

    // ===== Cloud backup / restore (per profile) =====

    suspend fun exportForProfiles(profileIds: List<String>): Map<String, ProfileSyncSelection> {
        val settingsPrefs = context.settingsDataStore.data.first()
        val traktPrefs = context.traktDataStore.data.first()
        val out = LinkedHashMap<String, ProfileSyncSelection>()
        profileIds.forEach { profileId ->
            val provider = SyncProvider.fromStorage(settingsPrefs[providerKeyFor(profileId)])
            val key = traktPrefs[mdbListKeyFor(profileId)]?.trim()?.takeIf { it.isNotEmpty() }
            val simklToken = SecureStorage.decrypt(
                traktPrefs[simklAccessTokenKeyFor(profileId)],
                SIMKL_TOKEN_ALIAS
            )?.trim()?.takeIf { it.isNotEmpty() }
            val watchlistMode = TrackingReadMode.fromStorage(settingsPrefs[watchlistReadModeKeyFor(profileId)])
            val continueMode = TrackingReadMode.fromStorage(settingsPrefs[continueWatchingReadModeKeyFor(profileId)])
            val watchedMode = TrackingReadMode.fromStorage(settingsPrefs[watchedReadModeKeyFor(profileId)])
            val writeTrakt = settingsPrefs[writeToTraktKeyFor(profileId)]
            val writeSimkl = settingsPrefs[writeToSimklKeyFor(profileId)]
            if (provider != SyncProvider.NONE || key != null || simklToken != null ||
                watchlistMode != TrackingReadMode.AUTO || continueMode != TrackingReadMode.AUTO ||
                watchedMode != TrackingReadMode.AUTO || writeTrakt != null || writeSimkl != null
            ) {
                out[profileId] = ProfileSyncSelection(
                    provider = provider,
                    mdbListApiKey = key,
                    simklAccessToken = simklToken,
                    watchlistReadMode = watchlistMode,
                    continueWatchingReadMode = continueMode,
                    watchedReadMode = watchedMode,
                    writeToTrakt = writeTrakt,
                    writeToSimkl = writeSimkl
                )
            }
        }
        return out
    }

    suspend fun importForProfiles(values: Map<String, ProfileSyncSelection>) {
        if (values.isEmpty()) return
        context.settingsDataStore.edit { prefs ->
            values.forEach { (profileId, selection) ->
                if (selection.provider == SyncProvider.NONE) {
                    prefs.remove(providerKeyFor(profileId))
                } else {
                    prefs[providerKeyFor(profileId)] = selection.provider.toStorage()
                }
                fun storeMode(key: androidx.datastore.preferences.core.Preferences.Key<String>, mode: TrackingReadMode) {
                    if (mode == TrackingReadMode.AUTO) prefs.remove(key) else prefs[key] = mode.toStorage()
                }
                storeMode(watchlistReadModeKeyFor(profileId), selection.watchlistReadMode ?: TrackingReadMode.AUTO)
                storeMode(continueWatchingReadModeKeyFor(profileId), selection.continueWatchingReadMode ?: TrackingReadMode.AUTO)
                storeMode(watchedReadModeKeyFor(profileId), selection.watchedReadMode ?: TrackingReadMode.AUTO)
                selection.writeToTrakt?.let { prefs[writeToTraktKeyFor(profileId)] = it }
                selection.writeToSimkl?.let { prefs[writeToSimklKeyFor(profileId)] = it }
            }
        }
        context.traktDataStore.edit { prefs ->
            values.forEach { (profileId, selection) ->
                val key = selection.mdbListApiKey?.trim().orEmpty()
                if (key.isEmpty()) {
                    prefs.remove(mdbListKeyFor(profileId))
                } else {
                    prefs[mdbListKeyFor(profileId)] = key
                }
                val simklToken = selection.simklAccessToken?.trim().orEmpty()
                if (simklToken.isEmpty()) {
                    prefs.remove(simklAccessTokenKeyFor(profileId))
                } else {
                    prefs[simklAccessTokenKeyFor(profileId)] =
                        SecureStorage.encrypt(simklToken, SIMKL_TOKEN_ALIAS)
                }
            }
        }
    }

    data class ProfileSyncSelection(
        val provider: SyncProvider,
        val mdbListApiKey: String? = null,
        val simklAccessToken: String? = null,
        val watchlistReadMode: TrackingReadMode? = null,
        val continueWatchingReadMode: TrackingReadMode? = null,
        val watchedReadMode: TrackingReadMode? = null,
        val writeToTrakt: Boolean? = null,
        val writeToSimkl: Boolean? = null
    )
}
