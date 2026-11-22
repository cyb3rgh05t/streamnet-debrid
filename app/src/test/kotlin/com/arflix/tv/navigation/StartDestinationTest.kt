package com.arflix.tv.navigation

import com.google.common.truth.Truth.assertThat
import com.arflix.tv.data.repository.IptvConfig
import com.arflix.tv.data.repository.IptvPlaylistEntry
import org.junit.Test

class StartDestinationTest {
    @Test
    fun withoutCloudTheCloudPageComesFirst() {
        assertThat(resolve(cloud = false, dismissed = false, skip = false, profile = false))
            .isEqualTo(Screen.CloudConnect.route)
        assertThat(resolve(cloud = false, dismissed = false, skip = true, profile = true))
            .isEqualTo(Screen.CloudConnect.route)
    }

    @Test
    fun dismissedCloudPageIsNotShownAgain() {
        assertThat(resolve(cloud = false, dismissed = true, skip = false, profile = true))
            .isEqualTo(Screen.ProfileSelection.route)
        assertThat(resolve(cloud = false, dismissed = true, skip = true, profile = true))
            .isEqualTo(Screen.Home.route)
    }

    @Test
    fun withCloudTheProfileSelectionOrHomeIsUsed() {
        assertThat(resolve(cloud = true, dismissed = false, skip = false, profile = true))
            .isEqualTo(Screen.ProfileSelection.route)
        assertThat(resolve(cloud = true, dismissed = false, skip = true, profile = false))
            .isEqualTo(Screen.ProfileSelection.route)
        assertThat(resolve(cloud = true, dismissed = false, skip = true, profile = true))
            .isEqualTo(Screen.Home.route)
    }

    private fun resolve(cloud: Boolean, dismissed: Boolean, skip: Boolean, profile: Boolean) =
        resolveStartDestination(
            isCloudConnected = cloud,
            cloudConnectDismissed = dismissed,
            skipProfileSelection = skip,
            hasActiveProfile = profile,
        )

    @Test
    fun tvSetupIsOfferedOnlyOnceWithoutIptvSource() {
        assertThat(shouldPromptTvSetup(hasIptvSource = false, alreadyPrompted = false)).isTrue()
        assertThat(shouldPromptTvSetup(hasIptvSource = false, alreadyPrompted = true)).isFalse()
        assertThat(shouldPromptTvSetup(hasIptvSource = true, alreadyPrompted = false)).isFalse()
    }

    @Test
    fun tvSetupWaitsForTheCloudStateAndSkipsRestoredPlaylists() {
        // New cloud account: the pull finished and no playlist came back.
        assertThat(shouldPromptTvSetup(hasIptvSource = false, alreadyPrompted = false, cloudSettled = true)).isTrue()
        // Backup or other device restored the playlist.
        assertThat(shouldPromptTvSetup(hasIptvSource = true, alreadyPrompted = false, cloudSettled = true)).isFalse()
        // Cloud could not be read (offline, timeout): no guess.
        assertThat(shouldPromptTvSetup(hasIptvSource = false, alreadyPrompted = false, cloudSettled = false)).isFalse()
    }

    @Test
    fun streamNetPresetWithoutUrlDoesNotCountAsConfiguredSource() {
        val preset = IptvPlaylistEntry(id = "streamnet_tv", name = "StreamNet TV", m3uUrl = "", enabled = false)
        assertThat(IptvConfig(playlists = listOf(preset)).hasConfiguredSource()).isFalse()
        assertThat(IptvConfig(playlists = listOf(preset.copy(m3uUrl = "https://x/get.php?u=1", enabled = false))).hasConfiguredSource()).isFalse()
        assertThat(IptvConfig(playlists = listOf(preset.copy(m3uUrl = "https://x/get.php?u=1", enabled = true))).hasConfiguredSource()).isTrue()
        assertThat(IptvConfig(m3uUrl = "https://x/list.m3u").hasConfiguredSource()).isTrue()
        assertThat(IptvConfig(stalkerPortalUrl = "http://portal").hasConfiguredSource()).isTrue()
    }
}
