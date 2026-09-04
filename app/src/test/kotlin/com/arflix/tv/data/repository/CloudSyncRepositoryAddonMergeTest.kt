package com.arflix.tv.data.repository

import com.arflix.tv.data.model.Addon
import com.arflix.tv.data.model.AddonType
import com.arflix.tv.data.model.MediaType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.json.JSONObject

class CloudSyncRepositoryAddonMergeTest {
    @Test
    fun `stale device push preserves profile created on another device`() {
        val local = """{"profiles":[{"id":"main","name":"Main","lastUsedAt":100}],"profileSettingsById":{"main":{"accentColor":"Orange"}},"iptvByProfile":{"main":{"playlists":[]}}}"""
        val remote = """{"profiles":[{"id":"main","name":"Main","lastUsedAt":100},{"id":"tv","name":"TV","lastUsedAt":200}],"profileSettingsById":{"main":{"accentColor":"Orange"},"tv":{"accentColor":"Gold"}},"iptvByProfile":{"main":{"playlists":[]},"tv":{"playlists":[{"id":"list_1","name":"TV","m3uUrl":"https://tv.example/list.m3u"}],"tvSession":{"lastChannelId":"channel-7"}}},"traktTokens":{"tv":{"accessToken":"remote-token"}},"mdbListSyncByProfile":{"tv":{"provider":"MDBLIST"}},"catalogsByProfile":{"tv":[{"id":"remote-catalog"}]},"catalogsUpdatedAtByProfile":{"tv":200},"watchlistByProfile":{"tv":[{"mediaType":"movie","tmdbId":7,"addedAt":200}]},"watchlistUpdatedAtByProfile":{"tv":200},"localContinueWatchingByProfile":{"tv":[{"id":7,"mediaType":"MOVIE","progress":50,"updatedAtMs":200}]}}"""

        val merged = JSONObject(mergeProfilesForPush(local, remote))
        val profiles = merged.getJSONArray("profiles")

        assertEquals(2, profiles.length())
        assertEquals(setOf("main", "tv"), (0 until profiles.length()).map {
            profiles.getJSONObject(it).getString("id")
        }.toSet())
        assertEquals("Gold", merged.getJSONObject("profileSettingsById").getJSONObject("tv").getString("accentColor"))
        assertEquals(
            "https://tv.example/list.m3u",
            merged.getJSONObject("iptvByProfile").getJSONObject("tv")
                .getJSONArray("playlists").getJSONObject(0).getString("m3uUrl")
        )
        assertEquals(
            "channel-7",
            merged.getJSONObject("iptvByProfile").getJSONObject("tv")
                .getJSONObject("tvSession").getString("lastChannelId")
        )
        assertEquals("remote-token", merged.getJSONObject("traktTokens").getJSONObject("tv").getString("accessToken"))
        assertEquals("MDBLIST", merged.getJSONObject("mdbListSyncByProfile").getJSONObject("tv").getString("provider"))
        assertEquals("remote-catalog", merged.getJSONObject("catalogsByProfile").getJSONArray("tv").getJSONObject(0).getString("id"))
        assertEquals(7, merged.getJSONObject("watchlistByProfile").getJSONArray("tv").getJSONObject(0).getInt("tmdbId"))
        assertEquals(50, merged.getJSONObject("localContinueWatchingByProfile").getJSONArray("tv").getJSONObject(0).getInt("progress"))
    }

    @Test
    fun `profile deletion tombstone prevents a stale device from restoring it`() {
        val local = """{"profiles":[{"id":"main","name":"Main","createdAt":100,"lastUsedAt":100},{"id":"old","name":"Old","createdAt":100,"lastUsedAt":100}]}"""
        val remote = """{"profiles":[{"id":"main","name":"Main","createdAt":100,"lastUsedAt":100}],"profileDeletedAtById":{"old":200}}"""

        val merged = JSONObject(mergeProfilesForPush(local, remote))
        val profiles = merged.getJSONArray("profiles")

        assertEquals(listOf("main"), (0 until profiles.length()).map {
            profiles.getJSONObject(it).getString("id")
        })
        assertEquals(200L, merged.getJSONObject("profileDeletedAtById").getLong("old"))
    }

    @Test
    fun `newer settings lock survives a profile with newer general metadata`() {
        val local = """{"profiles":[{"id":"main","name":"Local","lastUsedAt":100,"settingsPin":"local-pin","settingsLocked":true,"settingsLockUpdatedAt":300}]}"""
        val remote = """{"profiles":[{"id":"main","name":"Remote","lastUsedAt":200,"settingsPin":"remote-pin","settingsLocked":false,"settingsLockUpdatedAt":150}]}"""

        val profile = JSONObject(mergeProfilesForPush(local, remote))
            .getJSONArray("profiles")
            .getJSONObject(0)

        assertEquals("Remote", profile.getString("name"))
        assertEquals("local-pin", profile.getString("settingsPin"))
        assertTrue(profile.getBoolean("settingsLocked"))
        assertEquals(300L, profile.getLong("settingsLockUpdatedAt"))
    }

    @Test
    fun `newer remote settings lock survives newer local general metadata`() {
        val local = """{"profiles":[{"id":"main","name":"Local","lastUsedAt":300,"settingsPin":"local-pin","settingsLocked":false,"settingsLockUpdatedAt":100}]}"""
        val remote = """{"profiles":[{"id":"main","name":"Remote","lastUsedAt":200,"settingsPin":"remote-pin","settingsLocked":true,"settingsLockUpdatedAt":250}]}"""

        val profile = JSONObject(mergeProfilesForPush(local, remote))
            .getJSONArray("profiles")
            .getJSONObject(0)

        assertEquals("Local", profile.getString("name"))
        assertEquals("remote-pin", profile.getString("settingsPin"))
        assertTrue(profile.getBoolean("settingsLocked"))
        assertEquals(250L, profile.getLong("settingsLockUpdatedAt"))
    }

    @Test
    fun `remote IPTV group preferences win unless changed locally`() {
        val local = """{"iptvByProfile":{"main":{"hiddenGroups":["list|Local Hidden"],"groupOrder":["list|Local First"],"groupOrderSchema":3}}}"""
        val remote = """{"iptvByProfile":{"main":{"hiddenGroups":["list|Remote Hidden"],"groupOrder":["list|Remote First"],"groupOrderSchema":3}}}"""

        val merged = JSONObject(mergeRemoteIptvGroupPreferences(local, remote, emptySet()))
            .getJSONObject("iptvByProfile")
            .getJSONObject("main")
        val locallyDirty = JSONObject(mergeRemoteIptvGroupPreferences(local, remote, setOf("main")))
            .getJSONObject("iptvByProfile")
            .getJSONObject("main")

        assertEquals("list|Remote Hidden", merged.getJSONArray("hiddenGroups").getString(0))
        assertEquals("list|Remote First", merged.getJSONArray("groupOrder").getString(0))
        assertEquals("list|Local Hidden", locallyDirty.getJSONArray("hiddenGroups").getString(0))
        assertEquals("list|Local First", locallyDirty.getJSONArray("groupOrder").getString(0))
    }

    @Test
    fun `newer remote addon order wins during stale device push`() {
        val local = """{"addonsByProfile":{"main":[{"id":"first"},{"id":"second"}]},"addonsUpdatedAt":100}"""
        val remote = """{"addonsByProfile":{"main":[{"id":"second"},{"id":"first"}]},"addonsUpdatedAt":200}"""

        val merged = JSONObject(mergeAddonsByTimestamp(local, remote))
        val addons = merged.getJSONObject("addonsByProfile").getJSONArray("main")

        assertEquals(listOf("second", "first"), (0 until addons.length()).map {
            addons.getJSONObject(it).getString("id")
        })
        assertEquals(200L, merged.getLong("addonsUpdatedAt"))
    }

    @Test
    fun `newer local addon order survives older remote snapshot`() {
        val local = """{"addonsByProfile":{"main":[{"id":"second"},{"id":"first"}]},"addonsUpdatedAt":300}"""
        val remote = """{"addonsByProfile":{"main":[{"id":"first"},{"id":"second"}]},"addonsUpdatedAt":200}"""

        val addons = JSONObject(mergeAddonsByTimestamp(local, remote))
            .getJSONObject("addonsByProfile").getJSONArray("main")

        assertEquals(listOf("second", "first"), (0 until addons.length()).map {
            addons.getJSONObject(it).getString("id")
        })
    }

    @Test
    fun `stale local continue watching push keeps newer remote progress`() {
        val localItem = continueWatchingItem(progress = 20, updatedAtMs = 100L)
        val remoteItem = continueWatchingItem(progress = 80, updatedAtMs = 200L)
        val local = JSONObject()
            .put("localContinueWatchingByProfile", JSONObject().put("main", org.json.JSONArray(listOf(JSONObject(com.google.gson.Gson().toJson(localItem))))))
            .toString()
        val remote = JSONObject()
            .put("localContinueWatchingByProfile", JSONObject().put("main", org.json.JSONArray(listOf(JSONObject(com.google.gson.Gson().toJson(remoteItem))))))
            .toString()

        val merged = JSONObject(mergeLocalHistoryByTimestamp(local, remote))
            .getJSONObject("localContinueWatchingByProfile")
            .getJSONArray("main")
            .getJSONObject(0)

        assertEquals(80, merged.getInt("progress"))
        assertEquals(200L, merged.getLong("updatedAtMs"))
    }

    @Test
    fun `newer watched tombstone removes stale remote episode but keeps next episode`() {
        val watchedEpisode = continueWatchingItem(progress = 80, updatedAtMs = 100L)
        val nextEpisode = watchedEpisode.copy(
            episode = 2,
            displayEpisode = 2,
            progress = 10,
            updatedAtMs = 300L
        )
        val remote = JSONObject()
            .put(
                "localContinueWatchingByProfile",
                JSONObject().put(
                    "main",
                    org.json.JSONArray(
                        listOf(
                            JSONObject(com.google.gson.Gson().toJson(watchedEpisode)),
                            JSONObject(com.google.gson.Gson().toJson(nextEpisode))
                        )
                    )
                )
            )
            .toString()
        val local = JSONObject()
            .put(
                "dismissedContinueWatchingByProfile",
                JSONObject().put("main", "tv:${watchedEpisode.id}:${watchedEpisode.season}:${watchedEpisode.episode},200")
            )
            .toString()

        val mergedItems = JSONObject(mergeLocalHistoryByTimestamp(local, remote))
            .getJSONObject("localContinueWatchingByProfile")
            .getJSONArray("main")

        assertEquals(1, mergedItems.length())
        assertEquals(2, mergedItems.getJSONObject(0).getInt("episode"))
    }

    @Test
    fun `newer watched tombstone leaves an explicit empty profile after stale progress removal`() {
        val staleMovie = continueWatchingItem(
            mediaType = MediaType.MOVIE,
            progress = 70,
            updatedAtMs = 100L
        )
        val local = JSONObject()
            .put(
                "localContinueWatchingByProfile",
                JSONObject().put(
                    "main",
                    org.json.JSONArray(listOf(JSONObject(com.google.gson.Gson().toJson(staleMovie))))
                )
            )
            .put(
                "dismissedContinueWatchingByProfile",
                JSONObject().put("main", "movie:${staleMovie.id},200")
            )
            .toString()

        val mergedItems = JSONObject(mergeLocalHistoryByTimestamp(local, "{}"))
            .getJSONObject("localContinueWatchingByProfile")
            .getJSONArray("main")

        assertEquals(0, mergedItems.length())
    }

    @Test
    fun `stale local watched push does not remove newer remote watched ids`() {
        val local = JSONObject()
            .put("localWatchedMoviesByProfile", JSONObject().put("main", org.json.JSONArray(listOf(1))))
            .put("localWatchedEpisodesByProfile", JSONObject().put("main", org.json.JSONArray(listOf("10:1:1"))))
            .toString()
        val remote = JSONObject()
            .put("localWatchedMoviesByProfile", JSONObject().put("main", org.json.JSONArray(listOf(2))))
            .put("localWatchedEpisodesByProfile", JSONObject().put("main", org.json.JSONArray(listOf("10:1:2"))))
            .toString()

        val merged = JSONObject(mergeLocalHistoryByTimestamp(local, remote))

        assertEquals(
            listOf(2, 1),
            (0 until merged.getJSONObject("localWatchedMoviesByProfile").getJSONArray("main").length())
                .map { merged.getJSONObject("localWatchedMoviesByProfile").getJSONArray("main").getInt(it) }
        )
        assertEquals(
            listOf("10:1:2", "10:1:1"),
            (0 until merged.getJSONObject("localWatchedEpisodesByProfile").getJSONArray("main").length())
                .map { merged.getJSONObject("localWatchedEpisodesByProfile").getJSONArray("main").getString(it) }
        )
    }

    @Test
    fun `removed watchlist item is not resurrected by a device that still holds it`() {
        val local = JSONObject()
            .put("watchlistByProfile", JSONObject().put("main", org.json.JSONArray()
                .put(JSONObject().put("mediaType", "movie").put("tmdbId", 2).put("addedAt", 150L))))
            .put("watchlistUpdatedAtByProfile", JSONObject().put("main", 300L))
            .put("watchlistRemovedByProfile", JSONObject().put("main", "movie:1,200"))
            .toString()
        val remote = JSONObject()
            .put("watchlistByProfile", JSONObject().put("main", org.json.JSONArray()
                .put(JSONObject().put("mediaType", "movie").put("tmdbId", 1).put("addedAt", 100L))
                .put(JSONObject().put("mediaType", "movie").put("tmdbId", 2).put("addedAt", 150L))))
            .put("watchlistUpdatedAtByProfile", JSONObject().put("main", 100L))
            .toString()

        val merged = JSONObject(mergeWatchlistPayloads(local, remote))
        val items = merged.getJSONObject("watchlistByProfile").getJSONArray("main")

        assertEquals(listOf(2), (0 until items.length()).map { items.getJSONObject(it).getInt("tmdbId") })
        assertEquals("movie:1,200", merged.getJSONObject("watchlistRemovedByProfile").getString("main"))
    }

    @Test
    fun `re-added watchlist item survives its older removal tombstone`() {
        val local = JSONObject()
            .put("watchlistByProfile", JSONObject().put("main", org.json.JSONArray()
                .put(JSONObject().put("mediaType", "tv").put("tmdbId", 7).put("addedAt", 500L))))
            .put("watchlistUpdatedAtByProfile", JSONObject().put("main", 500L))
            .toString()
        val remote = JSONObject()
            .put("watchlistByProfile", JSONObject().put("main", org.json.JSONArray()
                .put(JSONObject().put("mediaType", "tv").put("tmdbId", 7).put("addedAt", 100L))))
            .put("watchlistUpdatedAtByProfile", JSONObject().put("main", 200L))
            .put("watchlistRemovedByProfile", JSONObject().put("main", "tv:7,200"))
            .toString()

        val items = JSONObject(mergeWatchlistPayloads(local, remote))
            .getJSONObject("watchlistByProfile")
            .getJSONArray("main")

        assertEquals(1, items.length())
        assertEquals(500L, items.getJSONObject(0).getLong("addedAt"))
    }

    @Test
    fun `stale local catalog push keeps newer remote catalog profile state`() {
        val local = JSONObject()
            .put("catalogsByProfile", JSONObject().put("main", org.json.JSONArray().put(JSONObject().put("id", "old"))))
            .put("hiddenAddonByProfile", JSONObject().put("main", org.json.JSONArray().put("old_hidden")))
            .put("hiddenCustomByProfile", JSONObject().put("main", org.json.JSONArray().put("old_custom_hidden")))
            .put("catalogsUpdatedAtByProfile", JSONObject().put("main", 100L))
            .toString()
        val remote = JSONObject()
            .put("catalogsByProfile", JSONObject().put("main", org.json.JSONArray().put(JSONObject().put("id", "new"))))
            .put("hiddenAddonByProfile", JSONObject().put("main", org.json.JSONArray().put("new_hidden")))
            .put("hiddenCustomByProfile", JSONObject().put("main", org.json.JSONArray().put("new_custom_hidden")))
            .put("catalogsUpdatedAtByProfile", JSONObject().put("main", 200L))
            .toString()

        val merged = JSONObject(mergeCatalogsByTimestamp(local, remote))

        assertEquals(
            "new",
            merged.getJSONObject("catalogsByProfile").getJSONArray("main").getJSONObject(0).getString("id")
        )
        assertEquals(
            "new_hidden",
            merged.getJSONObject("hiddenAddonByProfile").getJSONArray("main").getString(0)
        )
        assertEquals(
            "new_custom_hidden",
            merged.getJSONObject("hiddenCustomByProfile").getJSONArray("main").getString(0)
        )
        assertEquals(200L, merged.getJSONObject("catalogsUpdatedAtByProfile").getLong("main"))
    }

    @Test
    fun `explicit restore applies cloud catalogs despite newer local startup timestamp`() {
        assertFalse(
            shouldApplyCloudCatalogState(
                cloudUpdatedAt = 100L,
                localUpdatedAt = 200L,
                forceApplyRemote = false,
            )
        )
        assertTrue(
            shouldApplyCloudCatalogState(
                cloudUpdatedAt = 100L,
                localUpdatedAt = 200L,
                forceApplyRemote = true,
            )
        )
    }

    @Test
    fun `cloud addons win when ids match`() {
        val local = addon(id = "flix", name = "Local Flix")
        val cloud = addon(id = "flix", name = "Cloud Flix", isEnabled = false)

        val (merged, preserved) = reconcileAddonsWithCloud(
            cloudAddons = listOf(cloud),
            localAddons = listOf(local)
        )

        assertFalse(preserved)
        assertEquals(listOf("Cloud Flix"), merged.map { it.name })
        assertEquals(false, merged.single().isEnabled)
    }

    @Test
    fun `local addon absent from cloud is removed (removal propagates)`() {
        // The other device removed "flix" — the cloud no longer lists it. Reconcile must drop it
        // locally instead of re-adding it (the old union bug).
        val cloud = addon(id = "torrentio", name = "Torrentio")
        val localFlix = addon(id = "flix", name = "FlixStreams")

        val (merged, preserved) = reconcileAddonsWithCloud(
            cloudAddons = listOf(cloud),
            localAddons = listOf(cloud, localFlix)
        )

        assertFalse(preserved)
        assertEquals(listOf("torrentio"), merged.map { it.id })
    }

    @Test
    fun `empty cloud preserves local addons (empty-guard)`() {
        val localFlix = addon(id = "flix", name = "FlixStreams")

        val (merged, preserved) = reconcileAddonsWithCloud(
            cloudAddons = emptyList(),
            localAddons = listOf(localFlix)
        )

        assertFalse(preserved)
        assertEquals(listOf("flix"), merged.map { it.id })
    }

    @Test
    fun `intentional empty cloud (newer set-timestamp) removes all local addons`() {
        val localFlix = addon(id = "flix", name = "FlixStreams")

        val (merged, preserved) = reconcileAddonsWithCloud(
            cloudAddons = emptyList(),
            localAddons = listOf(localFlix),
            cloudAddonsUpdatedAt = 100L,
            localAddonsUpdatedAt = 50L
        )

        assertFalse(preserved)
        assertEquals(emptyList<Addon>(), merged)
    }

    @Test
    fun `newer local set is kept over a stale cloud (unpushed local change)`() {
        val cloud = addon(id = "torrentio", name = "Torrentio")
        val localFlix = addon(id = "flix", name = "FlixStreams")

        val (merged, preserved) = reconcileAddonsWithCloud(
            cloudAddons = listOf(cloud),
            localAddons = listOf(localFlix),
            cloudAddonsUpdatedAt = 50L,
            localAddonsUpdatedAt = 100L
        )

        assertFalse(preserved)
        assertEquals(listOf("flix"), merged.map { it.id })
    }

    private fun addon(
        id: String,
        name: String,
        type: AddonType = AddonType.CUSTOM,
        isEnabled: Boolean = true
    ) = Addon(
        id = id,
        name = name,
        version = "1.0.0",
        description = "",
        isInstalled = true,
        isEnabled = isEnabled,
        type = type,
        url = "https://example.com/$id/manifest.json"
    )

    private fun continueWatchingItem(
        progress: Int,
        updatedAtMs: Long,
        mediaType: MediaType = MediaType.TV
    ) = ContinueWatchingItem(
        id = 42,
        title = "Show",
        mediaType = mediaType,
        progress = progress,
        season = if (mediaType == MediaType.TV) 1 else null,
        episode = if (mediaType == MediaType.TV) 1 else null,
        updatedAtMs = updatedAtMs
    )
}
