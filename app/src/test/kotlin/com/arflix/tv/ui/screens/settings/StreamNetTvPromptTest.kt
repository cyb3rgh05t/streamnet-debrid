package com.arflix.tv.ui.screens.settings

import com.arflix.tv.data.repository.IptvPlaylistEntry
import com.arflix.tv.ui.components.isBottomBarItemSelected
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class StreamNetTvPromptTest {
    private val preset = IptvPlaylistEntry(id = "streamnet_tv", name = "StreamNet TV", m3uUrl = "", enabled = false)
    private val own = IptvPlaylistEntry(id = "list_1", name = "Own", m3uUrl = "https://x/list.m3u", enabled = true)

    @Test
    fun promptsWhileStreamNetHasNoCredentialsAndNoOtherSource() {
        assertThat(shouldPromptStreamNetTv(listOf(preset), "", "")).isTrue()
    }

    @Test
    fun doesNotPromptWithCredentialsOrAnotherSource() {
        assertThat(shouldPromptStreamNetTv(listOf(preset.copy(m3uUrl = "https://x/get.php?u=1")), "", "")).isFalse()
        assertThat(shouldPromptStreamNetTv(listOf(preset, own), "", "")).isFalse()
        assertThat(shouldPromptStreamNetTv(listOf(preset), "https://x/list.m3u", "")).isFalse()
        assertThat(shouldPromptStreamNetTv(listOf(preset), "", "http://portal")).isFalse()
    }

    @Test
    fun disabledOrEmptyOtherPlaylistsAndMissingPresetDoNotChangeTheDecision() {
        assertThat(shouldPromptStreamNetTv(listOf(preset, own.copy(enabled = false)), "", "")).isTrue()
        assertThat(shouldPromptStreamNetTv(listOf(preset, own.copy(m3uUrl = "")), "", "")).isTrue()
        assertThat(shouldPromptStreamNetTv(listOf(own), "", "")).isFalse()
        assertThat(shouldPromptStreamNetTv(emptyList(), "", "")).isFalse()
    }

    @Test
    fun bottomBarSelectsOnlyTheRouteBaseNotItsArguments() {
        val settingsRoute = "settings?autoCloudAuth={autoCloudAuth}&initialSection={initialSection}&openStreamNetTv={openStreamNetTv}"
        assertThat(isBottomBarItemSelected(settingsRoute, "settings")).isTrue()
        assertThat(isBottomBarItemSelected(settingsRoute, "tv")).isFalse()
        assertThat(isBottomBarItemSelected("tv?channelId=1", "tv")).isTrue()
        assertThat(isBottomBarItemSelected("home", "home")).isTrue()
        assertThat(isBottomBarItemSelected(null, "home")).isFalse()
    }
}
