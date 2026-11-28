package com.arflix.tv.data.repository

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class IptvChannelPreferencesTest {

    private fun apply(
        channels: List<String>,
        hidden: Set<String> = emptySet(),
        order: List<String> = emptyList(),
        applyOrder: Boolean = true,
    ) = applyIptvChannelPreferences(channels, hidden, order, applyOrder) { it }

    @Test
    fun hiddenChannelsAreDroppedInEveryCategory() {
        assertThat(apply(listOf("a", "b", "c"), hidden = setOf("b"), applyOrder = false))
            .containsExactly("a", "c").inOrder()
    }

    @Test
    fun rankedChannelsComeFirstAndUnrankedKeepProviderOrder() {
        assertThat(apply(listOf("a", "b", "c", "d"), order = listOf("c", "a")))
            .containsExactly("c", "a", "b", "d").inOrder()
    }

    @Test
    fun orderIsIgnoredWhereNotApplicable() {
        assertThat(apply(listOf("a", "b", "c"), order = listOf("c"), applyOrder = false))
            .containsExactly("a", "b", "c").inOrder()
    }

    @Test
    fun moveRanksOnlyTheChannelsUpToTheMovedPositionAtTheFront() {
        val visible = listOf("a", "b", "c", "d")
        val saved = listOf("x", "y")

        assertThat(reorderIptvChannels(saved, visible, "c", IptvGroupOrderMove.TOP))
            .containsExactly("c", "x", "y").inOrder()
        assertThat(reorderIptvChannels(saved, visible, "c", IptvGroupOrderMove.UP))
            .containsExactly("a", "c", "b", "x", "y").inOrder()
        assertThat(reorderIptvChannels(saved, visible, "b", IptvGroupOrderMove.DOWN))
            .containsExactly("a", "c", "b", "x", "y").inOrder()
    }

    @Test
    fun movedOrderIsWhatTheNextListShows() {
        val provider = listOf("a", "b", "c", "d")
        var saved = emptyList<String>()
        saved = reorderIptvChannels(saved, provider, "c", IptvGroupOrderMove.UP)
        val afterUp = applyIptvChannelPreferences(provider, emptySet(), saved, true) { it }
        assertThat(afterUp).containsExactly("a", "c", "b", "d").inOrder()

        saved = reorderIptvChannels(saved, afterUp, "d", IptvGroupOrderMove.TOP)
        assertThat(applyIptvChannelPreferences(provider, emptySet(), saved, true) { it })
            .containsExactly("d", "a", "c", "b").inOrder()
    }

    @Test
    fun moveAtTheEdgeOrOfUnknownChannelLeavesOrderStable() {
        val visible = listOf("a", "b")

        assertThat(reorderIptvChannels(listOf("x"), visible, "a", IptvGroupOrderMove.UP))
            .containsExactly("x")
        assertThat(reorderIptvChannels(listOf("x"), visible, "b", IptvGroupOrderMove.DOWN))
            .containsExactly("x")
        assertThat(reorderIptvChannels(listOf("x"), visible, "missing", IptvGroupOrderMove.TOP))
            .containsExactly("x")
    }
}
