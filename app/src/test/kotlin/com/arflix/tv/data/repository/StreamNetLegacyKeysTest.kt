package com.arflix.tv.data.repository

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class StreamNetLegacyKeysTest {

    private val host = "https://xui.example.test"

    private val streamNet = IptvPlaylistEntry(
        id = "streamnet_tv",
        name = "StreamNet TV",
        m3uUrl = "$host user pass",
    )

    @Test
    fun orphanDefaultListKeysMoveToStreamNetTv() {
        val migrated = migrateStreamNetGroupKeys(
            keys = listOf("list_1|Deutschland", "streamnet_tv|Deutschland", "list_1|RTL+"),
            playlists = listOf(streamNet),
            streamNetHost = host,
        )

        assertThat(migrated).containsExactly("streamnet_tv|Deutschland", "streamnet_tv|RTL+").inOrder()
    }

    @Test
    fun orphanFavoriteChannelsMoveToStreamNetTvWithoutDuplicates() {
        val migrated = migrateStreamNetChannelIds(
            channelIds = listOf("list_1:xtream:1", "streamnet_tv:xtream:1", "list_1:xtream:2"),
            playlists = listOf(streamNet),
            streamNetHost = host,
        )

        assertThat(migrated).containsExactly("streamnet_tv:xtream:1", "streamnet_tv:xtream:2").inOrder()
    }

    @Test
    fun separateListWithTheDefaultIdIsLeftAlone() {
        val other = IptvPlaylistEntry(id = "list_1", name = "Other", m3uUrl = "https://other.test/list.m3u")

        val groups = migrateStreamNetGroupKeys(listOf("list_1|News"), listOf(streamNet, other), host)
        val channels = migrateStreamNetChannelIds(listOf("list_1:xtream:7"), listOf(streamNet, other), host)

        assertThat(groups).containsExactly("list_1|News")
        assertThat(channels).containsExactly("list_1:xtream:7")
    }

    @Test
    fun nothingMovesWhileStreamNetTvIsNotConfigured() {
        val empty = IptvPlaylistEntry(id = "streamnet_tv", name = "StreamNet TV", m3uUrl = "")

        val channels = migrateStreamNetChannelIds(listOf("list_1:xtream:7"), listOf(empty), host)

        assertThat(channels).containsExactly("list_1:xtream:7")
    }

    @Test
    fun finalPlaylistsDecideWhetherTheDefaultListIsGone() {
        val manual = IptvPlaylistEntry(id = "list_1", name = "List 1", m3uUrl = "$host user pass")
        val merged = ensureStreamNetTvPreset(listOf(manual), host)

        val channels = migrateStreamNetChannelIds(
            channelIds = listOf("list_1:xtream:7"),
            playlists = listOf(manual),
            streamNetHost = host,
            currentPlaylists = merged,
        )

        assertThat(channels).containsExactly("streamnet_tv:xtream:7")
    }

    @Test
    fun unrelatedChannelsAndGroupsAreUntouched() {
        val channels = migrateStreamNetChannelIds(listOf("other:xtream:1", "list_10:xtream:2"), listOf(streamNet), host)
        val groups = migrateStreamNetGroupKeys(listOf("other|Sport"), listOf(streamNet), host)

        assertThat(channels).containsExactly("other:xtream:1", "list_10:xtream:2").inOrder()
        assertThat(groups).containsExactly("other|Sport")
    }
}
