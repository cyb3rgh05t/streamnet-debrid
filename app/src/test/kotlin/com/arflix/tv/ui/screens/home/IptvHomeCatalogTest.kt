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

    @Test
    fun `IPTV rows merge around rendered collection rail ids`() {
        val current = listOf(
            category("collection_row_service"),
            category("collection_row_franchise")
        )
        val fresh = mapOf("recent_tv" to category("recent_tv"))

        val merged = mergeIptvHomeCategories(
            current = current,
            freshById = fresh,
            catalogOrder = listOf(
                "collection_rail_service",
                "collection_rail_franchise",
                "recent_tv"
            ),
        )

        assertThat(merged.map { it.id })
            .containsExactly("collection_row_service", "collection_row_franchise", "recent_tv")
            .inOrder()
    }

    @Test
    fun `cached home categories follow configured collection rail order`() {
        val cached = listOf(
            category("continue_watching"),
            category("recent_tv"),
            category("collection_row_service"),
            category("collection_row_franchise")
        )

        val ordered = orderHomeCategories(
            categories = cached,
            catalogOrder = listOf(
                "collection_rail_service",
                "collection_rail_franchise",
                "recent_tv"
            ),
        )

        assertThat(ordered.map { it.id })
            .containsExactly(
                "continue_watching",
                "collection_row_service",
                "collection_row_franchise",
                "recent_tv"
            )
            .inOrder()
    }

    private fun category(id: String) = Category(id = id, title = id, items = emptyList())
}
