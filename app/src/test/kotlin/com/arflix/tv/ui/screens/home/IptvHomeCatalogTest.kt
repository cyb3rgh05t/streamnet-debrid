package com.arflix.tv.ui.screens.home

import com.arflix.tv.data.model.Category
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class IptvHomeCatalogTest {

    @Test
    fun `recent channels are newest first without duplicates`() {
        assertThat(newestFirstChannelIds(listOf("one", "two", " one ", "", "three")))
            .containsExactly("three", "one", "two")
            .inOrder()
    }

    @Test
    fun `recent TV home rail contains only ten newest channels`() {
        val channelIds = (1..12).map { "channel-$it" }

        assertThat(recentTvHomeChannelIds(channelIds))
            .containsExactlyElementsIn((12 downTo 3).map { "channel-$it" })
            .inOrder()
    }

    @Test
    fun `IPTV rows merge at configured positions`() {
        val current = listOf(category("continue_watching"), category("trending_movies"))
        val fresh = mapOf(
            "favorite_tv" to category("favorite_tv"),
            "recent_tv" to category("recent_tv"),
        )

        val merged = mergeIptvHomeCategories(
            current = current,
            freshById = fresh,
            catalogOrder = listOf("favorite_tv", "recent_tv", "trending_movies"),
        )

        assertThat(merged.map { it.id })
            .containsExactly("continue_watching", "favorite_tv", "recent_tv", "trending_movies")
            .inOrder()
    }

    private fun category(id: String) = Category(id = id, title = id, items = emptyList())
}
