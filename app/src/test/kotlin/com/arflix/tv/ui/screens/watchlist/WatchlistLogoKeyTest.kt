package com.arflix.tv.ui.screens.watchlist

import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class WatchlistLogoKeyTest {

    @Test
    fun tmdbBackedItemsShareTheTmdbLogoCache() {
        val watchlist = MediaItem(id = 42, title = "Title", mediaType = MediaType.MOVIE)
        val homeServer = watchlist.copy(
            isHomeServer = true,
            homeServerSourceRef = "plex:server",
            homeServerItemId = "native-id"
        )

        assertThat(watchlistLogoKey(homeServer)).isEqualTo(watchlistLogoKey(watchlist))
    }

    @Test
    fun unmatchedHomeServerItemsUseTheirNativeIdentity() {
        val first = MediaItem(
            id = -1,
            title = "Title",
            mediaType = MediaType.TV,
            isHomeServer = true,
            homeServerSourceRef = "jellyfin:one",
            homeServerItemId = "abc"
        )
        val second = first.copy(homeServerSourceRef = "emby:two")

        assertThat(watchlistLogoKey(first)).isNotEqualTo(watchlistLogoKey(second))
    }

    @Test
    fun cardKeysKeepDifferentServerEditionsUnique() {
        val first = MediaItem(
            id = 42,
            title = "Title",
            mediaType = MediaType.MOVIE,
            isHomeServer = true,
            homeServerSourceRef = "plex:server",
            homeServerItemId = "edition-4k"
        )
        val second = first.copy(homeServerItemId = "edition-1080p")

        assertThat(watchlistItemKey(first, 0)).isNotEqualTo(watchlistItemKey(second, 1))
    }
}
