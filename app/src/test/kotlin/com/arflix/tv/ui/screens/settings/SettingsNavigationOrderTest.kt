package com.arflix.tv.ui.screens.settings

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class SettingsNavigationOrderTest {
    @Test
    fun `appearance starts the profile category and occurs only once`() {
        val sections = settingsSectionOrder(false)
        assertThat(sections.take(4)).containsExactly(
            "appearance", "profiles", "cloud_sync", "accounts"
        ).inOrder()
        assertThat(sections.count { it == "appearance" }).isEqualTo(1)
        assertThat(sections).doesNotContain("plugins")
    }

    @Test
    fun `plugins gate preserves remaining category order`() {
        val sections = settingsSectionOrder(true)
        assertThat(sections.takeLast(3)).containsExactly("plugins", "network", "info_updates").inOrder()
        assertThat(sections.filterNot { it == "plugins" }).isEqualTo(settingsSectionOrder(false))
    }

    @Test
    fun `refresh and add precede installed addon focus rows`() {
        assertThat(settingsAddonIndex(0, 2)).isNull()
        assertThat(settingsAddonIndex(1, 2)).isNull()
        assertThat(settingsAddonIndex(2, 2)).isEqualTo(0)
        assertThat(settingsAddonIndex(3, 2)).isEqualTo(1)
        assertThat(settingsAddonIndex(4, 2)).isNull()
    }

    @Test
    fun `empty or shrinking addon lists never route actions to a removed addon`() {
        assertThat(settingsAddonIndex(2, 0)).isNull()
        assertThat(settingsAddonIndex(3, 1)).isNull()
        assertThat(settingsAddonIndex(-1, 1)).isNull()
    }
}
