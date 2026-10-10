package com.arflix.tv.ui.components

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class AppTopBarNavigationTest {

    @Test
    fun hiddenDownloadsAreExcludedAndRemainingFocusIndexesStayAligned() {
        assertThat(topBarMaxIndex(hasProfile = false, showOfflineDownloads = false)).isEqualTo(4)
        assertThat(topBarFocusedItem(3, hasProfile = false, showOfflineDownloads = false))
            .isEqualTo(SidebarItem.TV)
        assertThat(topBarFocusedItem(4, hasProfile = false, showOfflineDownloads = false))
            .isEqualTo(SidebarItem.SETTINGS)
        assertThat(topBarSelectedIndex(SidebarItem.TV, hasProfile = false, showOfflineDownloads = false))
            .isEqualTo(3)
    }

    @Test
    fun downloadsRemainInNavigationByDefault() {
        assertThat(topBarFocusedItem(3, hasProfile = false)).isEqualTo(SidebarItem.OFFLINE)
        assertThat(topBarSelectedIndex(SidebarItem.TV, hasProfile = false)).isEqualTo(4)
    }

    @Test
    fun visibleItemsRoundTripWithAndWithoutProfileAndDownloads() {
        for (hasProfile in listOf(false, true)) {
            for (hasDownloads in listOf(false, true)) {
                for (item in SidebarItem.entries) {
                    val index = topBarSelectedIndex(item, hasProfile, hasDownloads)
                    if (item == SidebarItem.OFFLINE && !hasDownloads) {
                        assertThat(index).isEqualTo(-1)
                    } else {
                        assertThat(topBarFocusedItem(index, hasProfile, hasDownloads)).isEqualTo(item)
                    }
                }
                assertThat(topBarSelectedIndex(SidebarItem.SETTINGS, hasProfile, hasDownloads))
                    .isEqualTo(topBarMaxIndex(hasProfile, hasDownloads))
            }
        }
    }

    @Test
    fun changingDownloadVisibilityPreservesTvAndSettingsFocus() {
        for (hasProfile in listOf(false, true)) {
            for (hadDownloads in listOf(false, true)) {
                for (item in listOf(SidebarItem.TV, SidebarItem.SETTINGS)) {
                    val previousIndex = topBarSelectedIndex(item, hasProfile, hadDownloads)
                    val remapped = remapTopBarFocusIndex(
                        previousIndex, hasProfile, hadDownloads, hasProfile, !hadDownloads
                    )
                    assertThat(topBarFocusedItem(remapped, hasProfile, !hadDownloads)).isEqualTo(item)
                }
            }
        }
    }

    @Test
    fun removingFocusedDownloadsMovesFocusToTv() {
        val previousIndex = topBarSelectedIndex(SidebarItem.OFFLINE, true, true)
        val remapped = remapTopBarFocusIndex(previousIndex, true, true, true, false)
        assertThat(topBarFocusedItem(remapped, true, false)).isEqualTo(SidebarItem.TV)
    }
}
