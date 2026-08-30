package com.arflix.tv.data.repository

import com.arflix.tv.data.model.IptvChannel
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class IptvProviderOrderTest {

    @Test
    fun streamNetTvPresetIsPreinstalledOnceAndFirst() {
        val playlists = ensureStreamNetTvPreset(
            listOf(
                playlist("custom", "https://example.test/list.m3u"),
                IptvPlaylistEntry("streamnet_tv", "Renamed", "https://old.test/list.m3u"),
                IptvPlaylistEntry("streamnet_tv", "Duplicate", "https://duplicate.test/list.m3u"),
            )
        )

        assertThat(playlists.map { it.id }).containsExactly("streamnet_tv", "custom").inOrder()
        assertThat(playlists.first().name).isEqualTo("StreamNet TV")
        assertThat(playlists.first().m3uUrl).isEqualTo("https://old.test/list.m3u")
    }

    @Test
    fun freshStreamNetTvPresetIsDisabledUntilLogin() {
        val preset = ensureStreamNetTvPreset(emptyList()).single()

        assertThat(preset.id).isEqualTo("streamnet_tv")
        assertThat(preset.m3uUrl).isEmpty()
        assertThat(preset.enabled).isFalse()
    }

    @Test
    fun manualStreamNetTvPlaylistIsMigratedByConfiguredHost() {
        val playlists = ensureStreamNetTvPreset(
            playlists = listOf(
                IptvPlaylistEntry(
                    id = "list_1",
                    name = "My TV",
                    m3uUrl = "https://provider.test/get.php?username=user&password=pass",
                ),
            ),
            streamNetHost = "https://provider.test",
        )

        assertThat(playlists).hasSize(1)
        assertThat(playlists.single().id).isEqualTo("streamnet_tv")
        assertThat(playlists.single().name).isEqualTo("StreamNet TV")
        assertThat(playlists.single().m3uUrl).contains("username=user")
    }

    @Test
    fun configuredPresetMovesToChangedHostWithoutLosingCredentials() {
        val playlists = ensureStreamNetTvPreset(
            playlists = listOf(
                IptvPlaylistEntry(
                    id = "streamnet_tv",
                    name = "StreamNet TV",
                    m3uUrl = "https://old.test/get.php?username=personal-user&password=personal-pass",
                ),
            ),
            streamNetHost = "https://new.test",
        )

        assertThat(playlists.single().m3uUrl)
            .isEqualTo("https://new.test personal-user personal-pass")
        assertThat(playlists.single().enabled).isTrue()
    }

    @Test
    fun streamNetPresetMigrationPreservesGroupPreferenceKeys() {
        val playlists = listOf(
            IptvPlaylistEntry(
                id = "list_1",
                name = "Manual StreamNet",
                m3uUrl = "https://provider.test/get.php?username=user&password=pass",
            ),
            playlist("other", "https://other.test/list.m3u"),
        )

        val migrated = migrateStreamNetGroupKeys(
            keys = listOf("list_1|News", "other|Movies", "list_1|Sports"),
            playlists = playlists,
            streamNetHost = "https://provider.test",
        )

        assertThat(migrated)
            .containsExactly("streamnet_tv|News", "other|Movies", "streamnet_tv|Sports")
            .inOrder()
    }

    @Test
    fun emptyPresetDoesNotRemoveThreeExistingPlaylistsOrConsumeCapacity() {
        val playlists = ensureStreamNetTvPreset(
            listOf(
                playlist("one", "https://one.test/list.m3u"),
                playlist("two", "https://two.test/list.m3u"),
                playlist("three", "https://three.test/list.m3u"),
            )
        )

        assertThat(playlists.map { it.id })
            .containsExactly("streamnet_tv", "one", "two", "three")
            .inOrder()
        assertThat(configuredIptvPlaylistCount(playlists)).isEqualTo(3)
    }

    @Test
    fun streamNetTvLoginUsesPersonalCredentialsForPlaylistAndEpg() {
        val playlist = configuredStreamNetTvPlaylist(
            host = " https://provider.test/ ",
            username = " personal-user ",
            password = " personal-password ",
        )

        assertThat(playlist).isNotNull()
        assertThat(playlist!!.m3uUrl)
            .isEqualTo("https://provider.test personal-user personal-password")
        assertThat(playlist.epgUrl).isEqualTo(playlist.m3uUrl)
        assertThat(playlist.enabled).isTrue()
    }

    @Test
    fun streamNetTvLoginRequiresHostAndBothCredentials() {
        assertThat(configuredStreamNetTvPlaylist("", "user", "password")).isNull()
        assertThat(configuredStreamNetTvPlaylist("https://provider.test", "", "password")).isNull()
        assertThat(configuredStreamNetTvPlaylist("https://provider.test", "user", "")).isNull()
    }

    @Test
    fun iptvSortOrderRejectsUnknownCloudValues() {
        assertThat(normalizeIptvSortOrder(" NUMBER ")).isEqualTo("number")
        assertThat(normalizeIptvSortOrder("name")).isEqualTo("name")
        assertThat(normalizeIptvSortOrder("unexpected")).isEqualTo("provider")
        assertThat(normalizeIptvSortOrder(null)).isEqualTo("provider")
    }

    @Test
    fun iptvSortOrderCyclesThroughExpectedSequence() {
        fun nextSortOrder(current: String): String = when (normalizeIptvSortOrder(current)) {
            "provider" -> "number"
            "number" -> "name"
            else -> "provider"
        }

        assertThat(nextSortOrder("provider")).isEqualTo("number")
        assertThat(nextSortOrder("number")).isEqualTo("name")
        assertThat(nextSortOrder("name")).isEqualTo("provider")
    }

    @Test
    fun xtreamCategoryEndpointDefinesGroupOrder() {
        val categorizedChannels = listOf(
            "sports" to apiChannel(301, "Sports One", "Sports"),
            "kids" to apiChannel(201, "Kids One", "Kids"),
            "entertainment" to apiChannel(101, "Entertainment One", "Entertainment"),
            "sports" to apiChannel(302, "Sports Two", "Sports", catchupDays = 7),
            "entertainment" to apiChannel(102, "Entertainment Two", "Entertainment"),
        )

        val ordered = orderXtreamChannelsByProviderCategories(
            categoryIdsInProviderOrder = listOf("entertainment", "kids", "sports"),
            categorizedChannels = categorizedChannels,
        )

        assertThat(ordered.map { it.id })
            .containsExactly("xtream:101", "xtream:102", "xtream:201", "xtream:301", "xtream:302")
            .inOrder()
        assertThat(ordered.map { it.group })
            .containsExactly("Entertainment", "Entertainment", "Kids", "Sports", "Sports")
            .inOrder()
        assertThat(ordered.last().catchupDays).isEqualTo(7)
    }

    @Test
    fun channelsWithinCategoryKeepProviderStreamSequence() {
        val categorizedChannels = listOf(
            "sports" to apiChannel(30, "Provider Thirty", "Sports"),
            "news" to apiChannel(20, "Provider Twenty", "News"),
            "sports" to apiChannel(10, "Provider Ten", "Sports"),
        )

        val ordered = orderXtreamChannelsByProviderCategories(
            categoryIdsInProviderOrder = listOf("sports", "news"),
            categorizedChannels = categorizedChannels,
        )

        assertThat(ordered.map { it.id }).containsExactly("xtream:30", "xtream:10", "xtream:20").inOrder()
    }

    @Test
    fun unknownCategoriesAppendAfterKnownCategoriesInFirstSeenOrder() {
        val categorizedChannels = listOf(
            "unknown-b" to apiChannel(401, "Unknown B One", "Unknown B"),
            "known" to apiChannel(101, "Known", "Known"),
            "unknown-a" to apiChannel(301, "Unknown A", "Unknown A"),
            "unknown-b" to apiChannel(402, "Unknown B Two", "Unknown B"),
        )

        val ordered = orderXtreamChannelsByProviderCategories(
            categoryIdsInProviderOrder = listOf("known"),
            categorizedChannels = categorizedChannels,
        )

        assertThat(ordered.map { it.id })
            .containsExactly("xtream:101", "xtream:401", "xtream:402", "xtream:301")
            .inOrder()
    }

    @Test
    fun replacingOrRemovingPlaylistDropsOnlyItsSavedGroupOrder() {
        val previous = listOf(
            playlist("one", "https://old.example/one.m3u"),
            playlist("two", "https://same.example/two.m3u"),
        )
        val current = listOf(
            playlist("one", "https://new.example/one.m3u"),
            playlist("two", "https://same.example/two.m3u"),
        )

        val changed = changedPlaylistSourceIds(previous, current)
        val retained = retainGroupOrderForUnchangedSources(
            savedOrder = listOf("one|Sports", "two|News", "one|Movies"),
            changedPlaylistIds = changed,
        )

        assertThat(changed).containsExactly("one")
        assertThat(retained).containsExactly("two|News")
    }

    @Test
    fun readdingPlaylistIdAfterEmptyStateDropsStaleSavedOrder() {
        val current = listOf(playlist("one", "https://new.example/one.m3u"))

        val changed = changedPlaylistSourceIds(emptyList(), current)
        val retained = retainGroupOrderForUnchangedSources(
            savedOrder = listOf("one|Movies", "one|Sports"),
            changedPlaylistIds = changed,
        )

        assertThat(changed).containsExactly("one")
        assertThat(retained).isEmpty()
    }

    @Test
    fun categoryMovesOnlyReorderTheSelectedPlaylistSlots() {
        val saved = listOf(
            "one|News",
            "two|Sports",
            "one|Kids",
            "two|Movies",
            "one|Docs",
        )
        val currentGroups = listOf("News", "Kids", "Docs")

        val movedUp = reorderIptvPlaylistGroup(
            saved, "one", currentGroups, "Docs", IptvGroupOrderMove.UP
        )
        val movedDown = reorderIptvPlaylistGroup(
            saved, "one", currentGroups, "News", IptvGroupOrderMove.DOWN
        )
        val movedToTop = reorderIptvPlaylistGroup(
            saved, "one", currentGroups, "Docs", IptvGroupOrderMove.TOP
        )

        assertThat(movedUp)
            .containsExactly("one|News", "two|Sports", "one|Docs", "two|Movies", "one|Kids")
            .inOrder()
        assertThat(movedDown)
            .containsExactly("one|Kids", "two|Sports", "one|News", "two|Movies", "one|Docs")
            .inOrder()
        assertThat(movedToTop)
            .containsExactly("one|Docs", "two|Sports", "one|News", "two|Movies", "one|Kids")
            .inOrder()
    }

    @Test
    fun resettingCategoryOrderRemovesOnlyTheNormalizedPlaylistEntries() {
        val reset = resetIptvPlaylistGroupOrder(
            savedOrder = listOf(" one|News ", "two|Sports", "one|Kids", "two|Movies"),
            playlistId = " one ",
        )

        assertThat(reset).containsExactly("two|Sports", "two|Movies").inOrder()
    }

    private fun apiChannel(
        streamId: Int,
        name: String,
        group: String,
        catchupDays: Int = 0,
    ): IptvChannel = IptvChannel(
        id = "xtream:$streamId",
        name = name,
        streamUrl = "https://provider.test/live/user/pass/$streamId.ts",
        group = group,
        xtreamStreamId = streamId,
        catchupDays = catchupDays,
        catchupType = if (catchupDays > 0) "xtream" else null,
    )

    private fun playlist(id: String, url: String): IptvPlaylistEntry = IptvPlaylistEntry(
        id = id,
        name = id,
        m3uUrl = url,
    )
}
