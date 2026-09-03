package com.arflix.tv.data.repository

import com.arflix.tv.ui.screens.settings.SettingsUiState
import com.arflix.tv.util.IPTV_VOD_SEARCH_ENABLED_KEY
import com.google.common.truth.Truth.assertThat
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
}
