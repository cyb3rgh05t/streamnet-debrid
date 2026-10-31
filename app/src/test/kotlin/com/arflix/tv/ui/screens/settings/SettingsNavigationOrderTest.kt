package com.arflix.tv.ui.screens.settings

import com.google.common.truth.Truth.assertThat
import com.arflix.tv.data.model.CatalogConfig
import com.arflix.tv.data.model.CatalogSourceType
import org.junit.Test

class SettingsNavigationOrderTest {
    @Test
    fun `only standalone URL catalogs offer permanent deletion even when hidden`() {
        val custom = CatalogConfig(
            "custom", "Custom", CatalogSourceType.MDBLIST,
            sourceUrl = "https://mdblist.com/lists/example/horror"
        )
        assertThat(canDeleteUrlCatalog(custom)).isTrue()
        assertThat(canDeleteUrlCatalog(custom.copy(enabled = false))).isTrue()
        assertThat(canDeleteUrlCatalog(custom.copy(sourceType = CatalogSourceType.TRAKT))).isTrue()
        assertThat(canDeleteUrlCatalog(custom.copy(isPreinstalled = true))).isFalse()
        assertThat(canDeleteUrlCatalog(custom.copy(packId = "pack"))).isFalse()
        assertThat(canDeleteUrlCatalog(custom.copy(sourceType = CatalogSourceType.ADDON))).isFalse()
        assertThat(canDeleteUrlCatalog(custom.copy(sourceType = CatalogSourceType.HOME_SERVER))).isFalse()
        assertThat(canDeleteUrlCatalog(custom.copy(sourceUrl = null))).isFalse()
    }

    @Test
    fun `tv scale follows device mode in appearance without duplicate focus slots`() {
        val rows = tvGeneralRowsForSection("appearance")
        assertThat(rows.take(3)).containsExactly(18, 53, 54).inOrder()
        assertThat(rows.distinct()).isEqualTo(rows)
        listOf("language", "subtitles", "ai_subtitles", "playback", "profiles", "network").forEach {
            assertThat(tvGeneralRowsForSection(it)).doesNotContain(53)
            assertThat(tvGeneralRowsForSection(it)).doesNotContain(54)
        }
    }

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
