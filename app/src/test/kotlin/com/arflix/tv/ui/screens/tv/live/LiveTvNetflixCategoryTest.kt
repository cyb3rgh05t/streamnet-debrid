package com.arflix.tv.ui.screens.tv.live

import com.arflix.tv.data.model.IptvChannel
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class LiveTvNetflixCategoryTest {
    private val playlistGroupId = playlistGroupCategoryId("list", "Portugal")

    private fun tree(withSpecialCategories: Boolean = true): LiveCategoryTree {
        val country = LiveCategory(
            id = "DE",
            label = "Germany",
            count = 2,
            iconToken = CategoryIcon.Country,
            children = listOf(LiveCategory("DE-news", "DE | News", 1, CategoryIcon.SubEntry)),
        )
        val top = buildList {
            add(LiveCategory("fav", "Favorites", 0, CategoryIcon.Favorite))
            if (withSpecialCategories) {
                add(LiveCategory("recent", "Recently Watched", 0, CategoryIcon.Recent))
                add(LiveCategory("all", "All Channels", 3, CategoryIcon.All, children = listOf(country)))
            }
        }
        return LiveCategoryTree(
            top = top,
            global = LiveSection(
                "playlist",
                "PLAYLIST",
                listOf(LiveCategory(playlistGroupId, "Portugal", 2, CategoryIcon.Grid)),
            ),
            countries = LiveSection("matched", "MATCHED", emptyList()),
            adult = LiveSection("adult", "ADULT", emptyList()),
        )
    }

    private val portugueseChannel = IptvChannel("list:rtp1", "RTP 1", "https://example.com/live", "Portugal").enrich(1)

    @Test
    fun selectableIdsCoverTopAndPlaylistGroupsButNotClassicSubEntries() {
        val ids = netflixSelectableCategoryIds(tree())

        assertThat(ids).containsAtLeast("fav", "recent", "all", playlistGroupId)
        assertThat(ids).doesNotContain("DE")
        assertThat(ids).doesNotContain("DE-news")
    }

    @Test
    fun validSelectionIsKept() {
        assertThat(netflixCategoryFor(playlistGroupId, tree(), null)).isEqualTo(playlistGroupId)
        assertThat(netflixCategoryFor("all", tree(), portugueseChannel)).isEqualTo("all")
    }

    @Test
    fun classicOnlyCategoryMapsToThePlayingChannelsPlaylistGroup() {
        assertThat(netflixCategoryFor("DE-news", tree(), portugueseChannel)).isEqualTo(playlistGroupId)
    }

    @Test
    fun classicOnlyCategoryWithoutChannelFallsBackToAll() {
        assertThat(netflixCategoryFor("g-sports", tree(), null)).isEqualTo("all")
    }

    @Test
    fun withoutSpecialCategoriesTheFirstPlaylistGroupIsUsed() {
        assertThat(netflixCategoryFor("DE-news", tree(withSpecialCategories = false), null))
            .isEqualTo(playlistGroupId)
    }

    private val idx = mapOf("a" to 0, "b" to 1, "c" to 2)

    @Test
    fun anchorPrefersThePlayingChannelOverTheScrollPosition() {
        assertThat(resolveNetflixAnchorChannelId("c", "a", "b", idx, "a")).isEqualTo("c")
    }

    @Test
    fun withoutPlayingChannelInTheCategoryTheRememberedOneWins() {
        assertThat(resolveNetflixAnchorChannelId("x", "b", "c", idx, "a")).isEqualTo("b")
        assertThat(resolveNetflixAnchorChannelId(null, "x", "c", idx, "a")).isEqualTo("c")
    }

    @Test
    fun anchorFallsBackToTheFirstChannelWhenNothingMatches() {
        assertThat(resolveNetflixAnchorChannelId("y", null, "x", idx, "a")).isEqualTo("a")
        assertThat(resolveNetflixAnchorChannelId(null, null, null, emptyMap(), null)).isNull()
    }

    @Test
    fun selectedCountryCategoryDecidesTheFlagNotTheChannelsOwnCountry() {
        val german = IptvChannel("list:rtl", "RTL Luxembourg", "https://example.com/live", "DE | News")

        val artwork = liveChannelFallbackArtwork(
            german,
            selectedCountryCode = "LU",
            selectedCategoryName = "Luxembourg",
        )

        assertThat(artwork?.isCountryFlag).isTrue()
        assertThat(artwork?.assetPath).endsWith("lu.svg")
    }

    @Test
    fun selectedPlaylistGroupNameResolvesItsCountry() {
        val tree = tree()

        assertThat(tree.countryCodeForCategory(playlistGroupId)).isEqualTo("PT")
        assertThat(tree.countryCodeForCategory("all")).isNull()
        assertThat(tree.countryCodeForCategory("fav")).isNull()
    }
}
