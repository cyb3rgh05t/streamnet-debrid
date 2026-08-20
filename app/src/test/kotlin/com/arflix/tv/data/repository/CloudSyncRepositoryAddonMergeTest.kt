package com.arflix.tv.data.repository

import com.arflix.tv.data.model.Addon
import com.arflix.tv.data.model.AddonType
import com.arflix.tv.data.model.MediaType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import org.json.JSONObject

class CloudSyncRepositoryAddonMergeTest {
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
    fun `stale local catalog push keeps newer remote catalog profile state`() {
        val local = JSONObject()
            .put("catalogsByProfile", JSONObject().put("main", org.json.JSONArray().put(JSONObject().put("id", "old"))))
            .put("hiddenAddonByProfile", JSONObject().put("main", org.json.JSONArray().put("old_hidden")))
            .put("catalogsUpdatedAtByProfile", JSONObject().put("main", 100L))
            .toString()
        val remote = JSONObject()
            .put("catalogsByProfile", JSONObject().put("main", org.json.JSONArray().put(JSONObject().put("id", "new"))))
            .put("hiddenAddonByProfile", JSONObject().put("main", org.json.JSONArray().put("new_hidden")))
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
        assertEquals(200L, merged.getJSONObject("catalogsUpdatedAtByProfile").getLong("main"))
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

    private fun continueWatchingItem(progress: Int, updatedAtMs: Long) = ContinueWatchingItem(
        id = 42,
        title = "Show",
        mediaType = MediaType.TV,
        progress = progress,
        season = 1,
        episode = 1,
        updatedAtMs = updatedAtMs
    )
}
