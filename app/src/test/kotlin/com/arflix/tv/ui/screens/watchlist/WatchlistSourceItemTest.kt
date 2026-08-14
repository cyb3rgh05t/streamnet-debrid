package com.arflix.tv.ui.screens.watchlist

import com.arflix.tv.data.model.CatalogConfig
import com.arflix.tv.data.model.CatalogSourceType
import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.repository.HomeServerCatalogCandidate
import com.arflix.tv.data.repository.HomeServerKind
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class WatchlistSourceItemTest {

    @Test
    fun myWatchlistHasStandardLabel() {
        val myWatchlist = WatchlistSourceItem.MyWatchlist
        assertThat(myWatchlist.id).isEqualTo("my_watchlist")
        assertThat(myWatchlist.title).isEqualTo("My watchlist")
        assertThat(myWatchlist.displayLabel).isEqualTo("My watchlist")
    }

    @Test
    fun catalogSourceFormatsDisplayLabelWithProvider() {
        val traktConfig = CatalogConfig(
            id = "trakt_trending",
            title = "Trending Movies",
            sourceType = CatalogSourceType.TRAKT,
            sourceUrl = "https://trakt.tv/users/me/lists/trending"
        )
        val source = WatchlistSourceItem.Catalog(traktConfig)
        assertThat(source.id).isEqualTo("catalog_trakt_trending")
        assertThat(source.subtitle).isEqualTo("Trakt")
        assertThat(source.displayLabel).isEqualTo("Trakt / Trending Movies")
    }

    @Test
    fun homeServerSourceFormatsDisplayLabel() {
        val candidate = HomeServerCatalogCandidate(
            serverKind = HomeServerKind.JELLYFIN,
            serverName = "Jellyfin",
            collectionName = "Kids",
            collectionType = "movies",
            title = "Kids Movies",
            sourceRef = "jellyfin:kids_ref"
        )
        val source = WatchlistSourceItem.HomeServer(candidate)
        assertThat(source.id).isEqualTo("server_jellyfin:kids_ref")
        assertThat(source.subtitle).isEqualTo("Jellyfin")
        assertThat(source.displayLabel).isEqualTo("Jellyfin / Kids")
    }

    @Test
    fun homeServerCatalogsAreRepresentedOnlyByNativeLibrarySources() {
        val mirroredCatalog = CatalogConfig(
            id = "home_jellyfin_kids",
            title = "Kids",
            sourceType = CatalogSourceType.HOME_SERVER,
            sourceUrl = "jellyfin:kids_ref"
        )
        val candidate = HomeServerCatalogCandidate(
            serverKind = HomeServerKind.JELLYFIN,
            serverName = "Jellyfin",
            collectionName = "Kids",
            collectionType = "movies",
            title = "Kids Movies",
            sourceRef = "jellyfin:kids_ref"
        )

        val sources = buildWatchlistSources(listOf(mirroredCatalog), listOf(candidate))

        assertThat(sources.filterIsInstance<WatchlistSourceItem.Catalog>()).isEmpty()
        assertThat(sources.filterIsInstance<WatchlistSourceItem.HomeServer>()).containsExactly(
            WatchlistSourceItem.HomeServer(candidate)
        )
    }

    @Test
    fun watchlistUiStateCorrectlyIdentifiesEmptyAndSingleType() {
        val emptyState = WatchlistUiState(
            movies = emptyList(),
            series = emptyList()
        )
        assertThat(emptyState.isEmpty).isTrue()

        val movieItem = MediaItem(id = 1, title = "Movie 1", mediaType = MediaType.MOVIE)
        val moviesOnlyState = WatchlistUiState(
            movies = listOf(movieItem),
            series = emptyList()
        )
        assertThat(moviesOnlyState.isEmpty).isFalse()

        val seriesItem = MediaItem(id = 2, title = "Series 1", mediaType = MediaType.TV)
        val mixedState = WatchlistUiState(
            movies = listOf(movieItem),
            series = listOf(seriesItem)
        )
        assertThat(mixedState.isEmpty).isFalse()
        assertThat(mixedState.allItems).hasSize(2)
    }
}
