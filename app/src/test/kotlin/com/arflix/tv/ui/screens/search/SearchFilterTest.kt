package com.arflix.tv.ui.screens.search

import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.repository.IptvRepository
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class SearchFilterTest {
    @Test
    fun `anime without genre relies only on anime keyword`() {
        assertThat(buildAnimeGenreFilter(null)).isNull()
    }

    @Test
    fun `anime with genre includes animation and selected genre`() {
        assertThat(buildAnimeGenreFilter("10759")).isEqualTo("16,10759")
    }

    @Test
    fun `animation genre is not duplicated`() {
        assertThat(buildAnimeGenreFilter("16")).isEqualTo("16")
    }

    @Test
    fun `IPTV-only search keeps only titles available from Xtream VOD`() {
        val availableMovie = MediaItem(id = 1, title = "The Example", mediaType = MediaType.MOVIE)
        val unavailableMovie = MediaItem(id = 2, title = "Missing", mediaType = MediaType.MOVIE)
        val availableSeries = MediaItem(id = 3, title = "Example Show", mediaType = MediaType.TV)
        val filter = IptvOnlySearchFilter(
            enabled = true,
            availability = IptvRepository.XtreamVodAvailability(
                setOf(
                    IptvRepository.XtreamVodAvailabilityKey(MediaType.MOVIE, "example"),
                    IptvRepository.XtreamVodAvailabilityKey(MediaType.TV, "example show"),
                ),
            ),
        )

        assertThat(filterSearchResultsForIptvOnlyMode(
            listOf(availableMovie, unavailableMovie, availableSeries),
            filter,
        )).containsExactly(availableMovie, availableSeries).inOrder()
    }

    @Test
    fun `IPTV-only search hides results until VOD availability is known`() {
        val item = MediaItem(id = 1, title = "Example", mediaType = MediaType.MOVIE)

        assertThat(filterSearchResultsForIptvOnlyMode(
            listOf(item),
            IptvOnlySearchFilter(enabled = true),
        )).isEmpty()
    }

    @Test
    fun `disabled IPTV-only search leaves results unchanged`() {
        val item = MediaItem(id = 1, title = "Example", mediaType = MediaType.MOVIE)
        val items = listOf(item)

        assertThat(filterSearchResultsForIptvOnlyMode(
            items,
            IptvOnlySearchFilter(enabled = false),
        )).isSameInstanceAs(items)
    }
}