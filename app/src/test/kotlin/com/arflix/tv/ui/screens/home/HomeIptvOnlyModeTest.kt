package com.arflix.tv.ui.screens.home

import com.arflix.tv.data.model.Category
import com.arflix.tv.data.model.CatalogConfig
import com.arflix.tv.data.model.CatalogSourceType
import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.repository.IptvRepository
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Test

class HomeIptvOnlyModeTest {
    private val favoriteChannel = MediaItem(
        id = 10,
        title = "Favorite channel",
        status = "iptv:channel-10",
    )
    private val recentChannel = MediaItem(
        id = 20,
        title = "Recent channel",
        status = "iptv:channel-20",
    )
    private val movie = MediaItem(id = 30, title = "Movie")

    @Test
    fun `disabled mode returns the original state`() {
        val state = HomeUiState(categories = listOf(Category("movies", "Movies", listOf(movie))))

        assertSame(state, projectHomeForIptvOnlyMode(state, enabled = false))
    }

    @Test
    fun `enabled mode preserves continue watching before provider availability loads`() {
        val continueWatching = MediaItem(
            id = 31,
            title = "Resume Movie",
            mediaType = MediaType.MOVIE,
            progress = 25,
        )
        val state = HomeUiState(
            categories = listOf(
                Category("continue_watching", "Continue Watching", listOf(continueWatching)),
                Category("movies", "Movies", listOf(movie)),
            ),
        )

        val projected = projectHomeForIptvOnlyMode(state, enabled = true, availability = null)

        assertEquals(listOf("continue_watching"), projected.categories.map { it.id })
        assertEquals(listOf(continueWatching), projected.categories.single().items)
    }

    @Test
    fun `enabled mode filters existing rails to provider available titles`() {
        val availableMovie = MediaItem(id = 40, title = "The Example", mediaType = MediaType.MOVIE)
        val unavailableMovie = MediaItem(id = 41, title = "Missing", mediaType = MediaType.MOVIE)
        val availableSeries = MediaItem(id = 50, title = "Example Show", mediaType = MediaType.TV)
        val availability = IptvRepository.XtreamVodAvailability(
            setOf(
                IptvRepository.XtreamVodAvailabilityKey(MediaType.MOVIE, "example"),
                IptvRepository.XtreamVodAvailabilityKey(MediaType.TV, "example show"),
            )
        )
        val state = HomeUiState(
            categories = listOf(
                Category(HomeViewModel.FAVORITE_TV_CATEGORY_ID, "Favorites", listOf(favoriteChannel)),
                Category(HomeViewModel.RECENT_TV_CATEGORY_ID, "Recent", listOf(recentChannel)),
                Category("movies", "Popular Movies", listOf(availableMovie, unavailableMovie)),
                Category("series", "Popular Series", listOf(availableSeries)),
                Category("empty", "Unavailable", listOf(unavailableMovie)),
                Category("collection_row_service", "Services", listOf(movie)),
                Category("collection_row_studio", "Studios", listOf(movie)),
                Category("collection_row_franchise", "Franchises", listOf(movie)),
            ),
            collectionRows = listOf(
                HomeCollectionRow("collection_row_service", "Services", emptyList<CatalogConfig>()),
                HomeCollectionRow("collection_row_studio", "Studios", emptyList<CatalogConfig>()),
                HomeCollectionRow("collection_row_franchise", "Franchises", emptyList<CatalogConfig>()),
            ),
            categoryHasMoreMap = mapOf(
                "movies" to true,
                "series" to false,
                "empty" to true,
                HomeViewModel.FAVORITE_TV_CATEGORY_ID to false,
            ),
        )

        val projected = projectHomeForIptvOnlyMode(state, enabled = true, availability = availability)

        assertEquals(
            listOf(
                HomeViewModel.FAVORITE_TV_CATEGORY_ID,
                HomeViewModel.RECENT_TV_CATEGORY_ID,
                "movies",
                "series",
                "collection_row_service",
                "collection_row_franchise",
            ),
            projected.categories.map { it.id },
        )
        assertEquals(listOf(availableMovie), projected.categories[2].items)
        assertEquals(listOf(availableSeries), projected.categories[3].items)
        assertEquals(
            listOf("collection_row_service", "collection_row_franchise"),
            projected.collectionRows.map { it.id },
        )
        assertEquals(
            mapOf(
                "movies" to true,
                "series" to false,
                HomeViewModel.FAVORITE_TV_CATEGORY_ID to false,
            ),
            projected.categoryHasMoreMap,
        )
    }

    @Test
    fun `external hero is replaced by first IPTV channel`() {
        val state = HomeUiState(
            categories = listOf(
                Category("movies", "Movies", listOf(movie)),
                Category(HomeViewModel.FAVORITE_TV_CATEGORY_ID, "Favorites", listOf(favoriteChannel)),
            ),
            heroItem = movie,
            heroLogoUrl = "movie-logo",
            heroTrailerKey = "movie-trailer",
            previousHeroItem = movie,
        )

        val projected = projectHomeForIptvOnlyMode(
            state,
            enabled = true,
            availability = IptvRepository.XtreamVodAvailability(emptySet()),
        )

        assertEquals(favoriteChannel, projected.heroItem)
        assertNull(projected.heroLogoUrl)
        assertNull(projected.heroTrailerKey)
        assertNull(projected.previousHeroItem)
    }

    @Test
    fun `filtered service rows retain only tiles with IPTV content`() {
        val availableService = CatalogConfig(
            id = "service_available",
            title = "Available Service",
            sourceType = CatalogSourceType.PREINSTALLED,
        )
        val missingService = CatalogConfig(
            id = "service_missing",
            title = "Missing Service",
            sourceType = CatalogSourceType.PREINSTALLED,
        )
        val franchise = CatalogConfig(
            id = "franchise_missing",
            title = "Missing Franchise",
            sourceType = CatalogSourceType.PREINSTALLED,
        )
        val state = HomeUiState(
            categories = listOf(
                Category(
                    "collection_row_service",
                    "Services",
                    listOf(
                        MediaItem(101, "Available Service", status = "collection:service_available"),
                        MediaItem(102, "Missing Service", status = "collection:service_missing"),
                    ),
                ),
                Category(
                    "collection_row_franchise",
                    "Franchises",
                    listOf(MediaItem(103, "Missing Franchise", status = "collection:franchise_missing")),
                ),
            ),
            collectionRows = listOf(
                HomeCollectionRow("collection_row_service", "Services", listOf(availableService, missingService)),
                HomeCollectionRow("collection_row_franchise", "Franchises", listOf(franchise)),
            ),
        )

        val projected = projectHomeForIptvOnlyMode(
            state = state,
            enabled = true,
            availability = IptvRepository.XtreamVodAvailability(emptySet()),
            filteredCollectionRows = listOf(
                HomeCollectionRow("collection_row_service", "Services", listOf(availableService))
            ),
        )

        assertEquals(listOf("collection_row_service"), projected.categories.map { it.id })
        assertEquals(listOf(101), projected.categories.single().items.map { it.id })
        assertEquals(listOf("service_available"), projected.collectionRows.single().items.map { it.id })
    }

    @Test
    fun `empty IPTV home clears external hero`() {
        val projected = projectHomeForIptvOnlyMode(
            HomeUiState(
                categories = listOf(Category("movies", "Movies", listOf(movie))),
                heroItem = movie,
            ),
            enabled = true,
            availability = IptvRepository.XtreamVodAvailability(emptySet()),
        )

        assertEquals(emptyList<Category>(), projected.categories)
        assertNull(projected.heroItem)
    }

    @Test
    fun `provider availability uses normalized title and media type`() {
        val availability = IptvRepository.XtreamVodAvailability(
            setOf(IptvRepository.XtreamVodAvailabilityKey(MediaType.MOVIE, "example"))
        )

        assertEquals(true, isAvailableInXtreamVod(MediaItem(1, "The Example (2025)"), availability))
        assertEquals(
            false,
            isAvailableInXtreamVod(MediaItem(2, "Example", mediaType = MediaType.TV), availability),
        )
    }
}