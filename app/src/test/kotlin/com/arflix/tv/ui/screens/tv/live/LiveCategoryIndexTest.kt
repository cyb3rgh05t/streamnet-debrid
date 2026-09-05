package com.arflix.tv.ui.screens.tv.live

import com.arflix.tv.data.model.IptvChannel
import com.arflix.tv.data.repository.IptvConfig
import com.arflix.tv.data.repository.IptvPlaylistEntry
import com.arflix.tv.data.repository.orderXtreamChannelsByProviderCategories
import com.arflix.tv.ui.screens.tv.syncSignature
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class LiveCategoryIndexTest {

    @Test
    fun streamnetRelaxAlwaysUsesTheChannelLogoFallback() {
        assertThat(liveChannelFallbackArtwork("STREAMNET RELAX", "DE")).isNull()
        assertThat(
            liveChannelFallbackArtwork(
                groupName = "DE | STREAMNET_RELAX",
                countryCode = "DE",
                selectedCountryCode = "DE",
            )
        ).isNull()
        assertThat(
            liveChannelFallbackArtwork(
                groupName = "General",
                countryCode = "DE",
                selectedCategoryName = "STREAMNET RELAX",
            )
        ).isNull()
    }

    @Test
    fun fallbackArtworkPrefersSpecificCategoryMappings() {
        assertThat(liveChannelFallbackArtwork("Streamnet 24/7", null)?.assetPath)
            .endsWith("streamnet_24_7.webp")
        assertThat(
            liveChannelFallbackArtwork(
                groupName = "International Sports",
                countryCode = null,
                selectedCategoryName = "ERWACHSENE - ADULT - XXX",
            )?.assetPath
        ).endsWith("adult.webp")
        assertThat(liveChannelFallbackArtwork("DE | Sky F1", "DE")?.assetPath)
            .endsWith("sky_f1.webp")
        assertThat(liveChannelFallbackArtwork("Amazon Events", null)?.assetPath)
            .endsWith("amazon_prime.webp")
        assertThat(liveChannelFallbackArtwork("RTL+", null)?.assetPath)
            .endsWith("rtl_plus.webp")
        assertThat(liveChannelFallbackArtwork("DE | Musik", "DE")?.assetPath)
            .endsWith("musik.webp")
        assertThat(liveChannelFallbackArtwork("SKY_PREMIUM", null)?.assetPath)
            .endsWith("sky_premium.webp")
    }

    @Test
    fun fallbackArtworkUsesWildcardRulesAfterSpecificMappings() {
        assertThat(liveChannelFallbackArtwork("DAZN PPV 12", null)?.assetPath)
            .endsWith("dazn.webp")
        assertThat(liveChannelFallbackArtwork("Sky Sports Bundesliga", null)?.assetPath)
            .endsWith("sports.webp")
        assertThat(liveChannelFallbackArtwork("International Sports", null)?.assetPath)
            .endsWith("sports.webp")
        assertThat(liveChannelFallbackArtwork("Regional Fussball", null)?.assetPath)
            .endsWith("fussball.webp")
        assertThat(liveChannelFallbackArtwork("DE | Fußball", "DE")?.assetPath)
            .endsWith("fussball.webp")
        assertThat(liveChannelFallbackArtwork("Ex-Yu", null)?.assetPath)
            .endsWith("ex_yu.webp")
    }

    @Test
    fun fallbackArtworkUsesFlagOnlyForCountryOnlyGroups() {
        assertThat(liveChannelFallbackArtwork("DE | Germany", "DE")?.assetPath)
            .endsWith("iptv_flags/de.svg")
        assertThat(liveChannelFallbackArtwork("Germany News", "DE")?.assetPath)
            .endsWith("iptv_flags/de.svg")
        assertThat(liveChannelFallbackArtwork("Documentaries", "DE")?.assetPath)
            .endsWith("iptv_flags/de.svg")
    }

    @Test
    fun selectedCountryCategoryUsesItsFlagForEveryChannelGroup() {
        assertThat(liveChannelFallbackArtwork("DE | News", "DE", selectedCountryCode = "DE")?.assetPath)
            .endsWith("iptv_flags/de.svg")
        assertThat(liveChannelFallbackArtwork("UK | Entertainment", "UK", selectedCountryCode = "UK")?.assetPath)
            .endsWith("iptv_flags/gb.svg")
        assertThat(liveChannelFallbackArtwork("LU | News", "LU")?.assetPath)
            .endsWith("iptv_flags/lu.svg")
        assertThat(liveChannelFallbackArtwork("AL | General", "AL")?.assetPath)
            .endsWith("iptv_flags/al.svg")
        assertThat(liveChannelFallbackArtwork("AL | General", "AL")?.isCountryFlag).isTrue()
        assertThat(liveChannelFallbackArtwork("Sky Premium", null)?.isCountryFlag).isFalse()
    }

    @Test
    fun nestedCountryCategoryAndItsChildrenResolveTheirCountryCode() {
        val country = LiveCategory(
            id = "DE",
            label = "Germany",
            count = 2,
            iconToken = CategoryIcon.Country,
            children = listOf(
                LiveCategory("DE-news", "DE | News", 1, CategoryIcon.SubEntry),
            ),
        )
        val tree = LiveCategoryTree(
            top = listOf(
                LiveCategory("all", "All Channels", 2, CategoryIcon.All, children = listOf(country)),
            ),
            global = LiveSection("playlist", "PLAYLIST", emptyList()),
            countries = LiveSection("matched", "MATCHED", emptyList()),
            adult = LiveSection("adult", "ADULT", emptyList()),
        )

        assertThat(tree.countryCodeForCategory("DE")).isEqualTo("DE")
        assertThat(tree.countryCodeForCategory("DE-news")).isEqualTo("DE")
        assertThat(tree.countryCodeForCategory("fav")).isNull()
    }

    @Test
    fun playlistCategoryNamesResolveExactCountryOverrides() {
        assertThat(countryCodeFromCategoryName("Portugal")).isEqualTo("PT")
        assertThat(countryCodeFromCategoryName("Netherlands - NL")).isEqualTo("NL")
        assertThat(countryCodeFromCategoryName("UK | United Kingdom")).isEqualTo("UK")
        assertThat(countryCodeFromCategoryName("Schweiz")).isEqualTo("CH")
        assertThat(countryCodeFromCategoryName("Brazil Sports")).isNull()

        val portugal = LiveCategory("grp:list:portugal", "Portugal", 2, CategoryIcon.Grid)
        val tree = LiveCategoryTree(
            top = emptyList(),
            global = LiveSection("playlist", "PLAYLIST", listOf(portugal)),
            countries = LiveSection("matched", "MATCHED", emptyList()),
            adult = LiveSection("adult", "ADULT", emptyList()),
        )

        assertThat(tree.countryCodeForCategory(portugal.id)).isEqualTo("PT")
    }

    @Test
    fun selectedCategoryNameOverridesIncorrectChannelMetadata() {
        assertThat(
            liveChannelFallbackArtwork(
                groupName = "General",
                countryCode = "GB",
                selectedCategoryName = "Regional Fussball",
            )?.assetPath
        ).endsWith("fussball.webp")
        assertThat(
            liveChannelFallbackArtwork(
                groupName = "General",
                countryCode = "BR",
                selectedCategoryName = "Ex-Yu",
            )?.assetPath
        ).endsWith("ex_yu.webp")
    }

    @Test
    fun channelsForKeepsFavoriteOrderAndUsesStaticBuckets() {
        val channels = listOf(
            channel("1", "NL News HD", "NL | News"),
            channel("2", "US Sports 4K", "US | Sports"),
            channel("3", "Kids SD", "Kids"),
        ).mapIndexed { index, channel -> channel.enrich(index + 100) }

        val index = buildCategoryIndex(channels)

        assertThat(index.channelsFor("fav", favorites = listOf("2", "1"), recents = emptyList()).map { it.id })
            .containsExactly("2", "1")
            .inOrder()
        assertThat(index.channelsFor("g-sports", favorites = emptyList(), recents = emptyList()).map { it.id })
            .containsExactly("2")
        assertThat(index.channelsFor("NL-news", favorites = emptyList(), recents = emptyList()).map { it.id })
            .containsExactly("1")
    }

    @Test
    fun channelsForReturnsNewestRecentFirst() {
        val channels = listOf(
            channel("1", "One", "General"),
            channel("2", "Two", "General"),
            channel("3", "Three", "General"),
        ).mapIndexed { index, channel -> channel.enrich(index + 100) }
        val recents = linkedSetOf("1", "3", "2")

        val index = buildCategoryIndex(channels)

        assertThat(index.channelsFor("recent", favorites = emptyList(), recents = recents).map { it.id })
            .containsExactly("2", "3", "1")
            .inOrder()
    }

    @Test
    fun normalPagedCategoriesNeverMoveFavoritesAheadOfProviderOrder() {
        val providerWindow = listOf(
            channel("list:1", "Provider First", "News"),
            channel("list:2", "Provider Second", "News"),
            channel("list:3", "Provider Third", "News"),
        )
        val favorites = listOf(providerWindow[2])

        val allChannels = selectPagedChannelsInProviderOrder(
            categoryId = "all",
            providerWindow = providerWindow,
            favoriteChannels = favorites,
            recentChannels = emptyList(),
            limit = 100,
        )
        val providerGroup = selectPagedChannelsInProviderOrder(
            categoryId = "grp:list:news",
            providerWindow = providerWindow,
            favoriteChannels = favorites,
            recentChannels = emptyList(),
            limit = 100,
        )

        assertThat(allChannels.map { it.id }).containsExactly("list:1", "list:2", "list:3").inOrder()
        assertThat(providerGroup.map { it.id }).containsExactly("list:1", "list:2", "list:3").inOrder()
    }

    @Test
    fun favoritesCategoryStillUsesSavedFavoriteOrder() {
        val providerWindow = listOf(
            channel("list:1", "Provider First", "News"),
            channel("list:2", "Provider Second", "News"),
            channel("list:3", "Provider Third", "News"),
        )

        val result = selectPagedChannelsInProviderOrder(
            categoryId = "fav",
            providerWindow = providerWindow,
            favoriteChannels = listOf(providerWindow[2], providerWindow[0]),
            recentChannels = emptyList(),
            limit = 100,
        )

        assertThat(result.map { it.id }).containsExactly("list:3", "list:1").inOrder()
    }

    @Test
    fun pagedChannelSelectionIsDetachedFromMutableBackingList() {
        val providerWindow = MutableList(100) { index ->
            channel("list:$index", "Channel $index", "General")
        }

        val result = selectPagedChannelsInProviderOrder(
            categoryId = "all",
            providerWindow = providerWindow,
            favoriteChannels = emptyList(),
            recentChannels = emptyList(),
            limit = 48,
        )
        providerWindow.clear()

        assertThat(result).hasSize(48)
        assertThat(result.first().id).isEqualTo("list:0")
        assertThat(result.last().id).isEqualTo("list:47")
    }

    @Test
    fun categoryTreeKeepsProviderFirstOccurrenceOrder() {
        val channels = listOf(
            channel("list:9", "Nine", "Z Last alphabetically"),
            channel("list:2", "Two", "A First alphabetically"),
            channel("list:7", "Seven", "Middle"),
            channel("list:8", "Eight", "Z Last alphabetically"),
        )

        val state = buildFastStartupChannelState(
            channels = channels,
            favorites = emptySet(),
            recents = emptySet(),
        )

        assertThat(state.tree.global.categories.map { it.label })
            .containsExactly("Z Last alphabetically", "A First alphabetically", "Middle")
            .inOrder()
    }

    @Test
    fun customCategoryOrderIsAppliedWithSpecialCategoriesEnabled() {
        assertCustomCategoryOrder(showSpecialCategories = true)
    }

    @Test
    fun customCategoryOrderIsAppliedWithSpecialCategoriesDisabled() {
        assertCustomCategoryOrder(showSpecialCategories = false)
    }

    @Test
    fun pagedCategoriesApplyPlaylistOrderAndVisibility() {
        val state = buildPagedStartupChannelState(
            channels = listOf(channel("list:1", "News One", "News")),
            totalChannelCount = 3,
            playlistGroupCounts = listOf(
                Triple("list", "News", 1),
                Triple("list", "Sports", 1),
                Triple("list", "Movies", 1),
            ),
            favorites = emptySet(),
            recents = emptySet(),
            hiddenGroups = setOf("list|Sports"),
            groupOrder = listOf("list|Movies", "list|Sports", "list|News"),
        )

        assertThat(state.tree.global.categories.map { it.label })
            .containsExactly("Movies", "News")
            .inOrder()
        assertThat(state.tree.hidden.categories.map { it.label })
            .containsExactly("Sports")
    }

    private fun assertCustomCategoryOrder(showSpecialCategories: Boolean) {
        val channels = listOf(
            channel("list:1", "News One", "News"),
            channel("list:2", "Sports One", "Sports"),
            channel("list:3", "Movies One", "Movies"),
        )

        val state = buildFastStartupChannelState(
            channels = channels,
            favorites = setOf("list:1"),
            recents = setOf("list:2"),
            groupOrder = listOf("list|Movies", "list|News", "list|Sports"),
            showSpecialCategories = showSpecialCategories,
        )

        assertThat(state.tree.global.categories.map { it.label })
            .containsExactly("Movies", "News", "Sports")
            .inOrder()
    }

    @Test
    fun channelNumberSortUsesProviderNumbersAndKeepsTiesStable() {
        val channels = listOf(
            channel("list:20", "Twenty", "General").copy(providerChannelNumber = "20"),
            channel("list:none", "No number", "General"),
            channel("list:3a", "Three A", "General").copy(providerChannelNumber = "3"),
            channel("list:invalid", "Invalid number", "General").copy(providerChannelNumber = "HD"),
            channel("list:3b", "Three B", "General").copy(providerChannelNumber = "3.0"),
        ).mapIndexed { index, channel -> channel.enrich(index + 100) }

        val result = sortChannelsByConfiguredOrder(channels, "number")

        assertThat(result.map { it.id })
            .containsExactly("list:3a", "list:3b", "list:20", "list:none", "list:invalid")
            .inOrder()
    }

    @Test
    fun providerSortKeepsTheOriginalChannelList() {
        val channels = listOf(
            channel("list:z", "Zulu", "General"),
            channel("list:a", "Alpha", "General"),
        ).mapIndexed { index, channel -> channel.enrich(index + 1) }

        assertThat(sortChannelsByConfiguredOrder(channels, "provider")).isSameInstanceAs(channels)
    }

    @Test
    fun configSignatureChangesWhenPlaylistOrderChanges() {
        val first = IptvPlaylistEntry("first", "First", "https://example.test/first.m3u")
        val second = IptvPlaylistEntry("second", "Second", "https://example.test/second.m3u")

        val original = IptvConfig(playlists = listOf(first, second)).syncSignature()
        val reordered = IptvConfig(playlists = listOf(second, first)).syncSignature()

        assertThat(reordered).isNotEqualTo(original)
    }

    @Test
    fun xtreamCategoryOrderSurvivesTvIndexing() {
        val globalStreamResponse = listOf(
            "news" to channel("xtream:20", "News Twenty", "News").copy(xtreamStreamId = 20),
            "sports" to channel("xtream:30", "Sports Thirty", "Sports").copy(xtreamStreamId = 30),
            "sports" to channel("xtream:10", "Sports Ten", "Sports").copy(xtreamStreamId = 10),
        )
        val merged = orderXtreamChannelsByProviderCategories(
            categoryIdsInProviderOrder = listOf("sports", "news"),
            categorizedChannels = globalStreamResponse,
        )
            .map { it.copy(id = "list_1:${it.id}") }

        val state = buildFastStartupChannelState(
            channels = merged,
            favorites = emptySet(),
            recents = emptySet(),
        )
        val sportsCategory = state.tree.global.categories.single { it.label == "Sports" }

        assertThat(state.all.map { it.id })
            .containsExactly("list_1:xtream:30", "list_1:xtream:10", "list_1:xtream:20")
            .inOrder()
        assertThat(state.tree.global.categories.map { it.label })
            .containsExactly("Sports", "News")
            .inOrder()
        assertThat(state.index.channelsFor(sportsCategory.id, emptyList(), emptyList()).map { it.id })
            .containsExactly("list_1:xtream:30", "list_1:xtream:10")
            .inOrder()
    }

    private fun channel(id: String, name: String, group: String): IptvChannel =
        IptvChannel(
            id = id,
            name = name,
            streamUrl = "https://example.test/$id.m3u8",
            group = group,
        )
}
