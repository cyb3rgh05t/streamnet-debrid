package com.arflix.tv.data.repository

import com.arflix.tv.ui.screens.settings.SettingsUiState
import com.arflix.tv.util.IPTV_VOD_SEARCH_ENABLED_KEY
import com.google.common.truth.Truth.assertThat
import com.google.gson.Gson
import org.junit.Test

class IptvVodSearchPreferenceTest {

    @Test
    fun vodSearchPreferenceKeyMatchesExpectedName() {
        assertThat(IPTV_VOD_SEARCH_ENABLED_KEY.name).isEqualTo("iptv_vod_search_enabled")
    }

    @Test
    fun settingsUiStateDefaultsVodSearchToEnabled() {
        assertThat(SettingsUiState().iptvVodSearchEnabled).isTrue()
    }

    @Test
    fun legacyCloudStateLeavesVodSearchUnsetForEnabledFallback() {
        val state = Gson().fromJson("{}", IptvCloudProfileState::class.java)

        assertThat(state.vodSearchEnabled).isNull()
    }

    @Test
    fun cloudStatePreservesDisabledVodSearch() {
        val state = Gson().fromJson("{\"vodSearchEnabled\":false}", IptvCloudProfileState::class.java)

        assertThat(state.vodSearchEnabled).isFalse()
    }
}
