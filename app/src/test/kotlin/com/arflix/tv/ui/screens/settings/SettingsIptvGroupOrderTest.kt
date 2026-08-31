package com.arflix.tv.ui.screens.settings

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class SettingsIptvGroupOrderTest {

    @Test
    fun categoryFocusFollowsTheMovedGroup() {
        assertThat(movedIptvCategoryFocusIndex(5, groupCount = 10, moveUp = true)).isEqualTo(4)
        assertThat(movedIptvCategoryFocusIndex(5, groupCount = 10, moveUp = false)).isEqualTo(6)
        assertThat(movedIptvCategoryFocusIndex(1, groupCount = 10, moveUp = true)).isEqualTo(1)
        assertThat(movedIptvCategoryFocusIndex(10, groupCount = 10, moveUp = false)).isEqualTo(10)
    }

    @Test
    fun staleSavedGroupLabelsCannotReappearAfterProviderRefresh() {
        val ordered = orderedIptvGroups(
            playlistId = "list_1",
            availableGroups = listOf("Entertainment", "Kids", "Movies"),
            groupOrder = listOf("list_1|[B] Kids", "list_1|Movies"),
        )

        assertThat(ordered).containsExactly("Movies", "Entertainment", "Kids").inOrder()
        assertThat(ordered).doesNotContain("[B] Kids")
    }
}
