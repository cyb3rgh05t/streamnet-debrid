package com.arflix.tv.data.repository

import com.arflix.tv.data.model.CatalogKind
import com.arflix.tv.data.model.CollectionGroupKind
import com.arflix.tv.data.model.CollectionSourceKind
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Exercises `buildPreinstalledDefaults()` in MediaRepository. That's the
 * entry point used by getDefaultCatalogConfigs() to seed a fresh profile's
 * catalogs.
 */
class PreinstalledServicesTest {
    private val introVideoCommit = "3b8094a6d97084a54dfbe7779f904886e801a3fb"
    private val franchiseImageCommit = "afacc40e5ab7202219749aaec497c5a4bdf3e27b"

    @Test
    fun `all franchise tiles use pinned branded artwork without logo overlays`() {
        val franchises = MediaRepository.buildPreinstalledDefaults()
            .filter { it.kind == CatalogKind.COLLECTION && it.collectionGroup == CollectionGroupKind.FRANCHISE }

        assertTrue(franchises.isNotEmpty())
        franchises.forEach { franchise ->
            val cover = franchise.collectionCoverImageUrl.orEmpty()
            assertTrue(cover.contains("/$franchiseImageCommit/artworks/franchises/"))
            assertEquals(franchise.collectionCoverImageUrl, franchise.collectionFocusGifUrl)
            assertNull(franchise.collectionClearLogoUrl)
        }
    }

    @Test
    fun `fresh profile starts with requested home row order`() {
        val ids = MediaRepository.buildPreinstalledDefaults()
            .filter { it.kind != CatalogKind.COLLECTION }
            .map { it.id }

        assertEquals(
            listOf(
                "recent_tv",
                "favorite_tv",
                "collection_rail_service",
                "collection_rail_franchise",
                "collection_rail_decade",
                "trending_movies",
                "top10_movies_today",
                "top_movies_week",
                "collection_rail_movie_genre",
                "trending_tv",
                "top10_shows_today",
                "collection_rail_tv_genre",
                "trending_anime",
                "new_kdramas",
                "coming_soon",
                "upcoming_series",
                "just_added",
                "recently_watched_movies",
                "recently_watched_series"
            ),
            ids
        )
    }

    @Test
    fun `decades have a visible home rail and valid decade artwork URLs`() {
        val catalogs = MediaRepository.buildPreinstalledDefaults()
        val decadeRail = catalogs.firstOrNull {
            it.kind == CatalogKind.COLLECTION_RAIL && it.collectionGroup == CollectionGroupKind.DECADE
        }
        val decades = catalogs.filter {
            it.kind == CatalogKind.COLLECTION && it.collectionGroup == CollectionGroupKind.DECADE
        }

        assertNotNull("Decades Home rail should be preinstalled", decadeRail)
        assertTrue("Decades rail should be a valid collection config", CollectionTemplateManifest.isValidCollectionConfig(decadeRail!!))
        assertEquals(7, decades.size)
        val expectedLists = mapOf(
            "20's Movies" to "snoak/top-2020s-movies",
            "10's Movies" to "snoak/top-2010s-movies",
            "00's Movies" to "snoak/top-2000s-movies",
            "90's Movies" to "snoak/top-1990s-movies",
            "80's Movies" to "snoak/top-1980s-movies",
            "70's Movies" to "snoak/popular-1970s-movies",
            "60's Movies" to "snoak/popular-1960s-movies"
        )
        decades.forEach { catalog ->
            assertTrue(
                "${catalog.title} cover should use the decades artwork directory",
                catalog.collectionCoverImageUrl.orEmpty().contains("/artworks/decades/")
            )
            assertEquals(
                "${catalog.title} should use its public MDBList source without requiring an addon",
                expectedLists[catalog.title],
                catalog.collectionSources.singleOrNull { it.kind == CollectionSourceKind.MDBLIST_PUBLIC }?.mdblistSlug
            )
            assertEquals("${catalog.title} should only expose movies", "movie", catalog.collectionSources.single().mediaType)
        }
    }

    @Test
    fun `franchise public-list fallbacks are assigned to the correct tabs`() {
        val collections = MediaRepository.buildPreinstalledDefaults()
            .filter { it.kind == CatalogKind.COLLECTION }
            .associateBy { it.title }

        fun source(title: String, slug: String) = requireNotNull(collections[title])
            .collectionSources.first { it.mdblistSlug == slug }

        assertEquals(
            "movie",
            source("Marvel", "lt3dave/marvel-cinematic-universe-mcu-collection").mediaType
        )
        assertEquals("series", source("Marvel", "at0microuton/mcu-tv-shows").mediaType)
        assertEquals("series", source("DC Universe", "kraftynic/dc-tv-shows1").mediaType)
        assertTrue(
            "Marvel should use the same TMDB collection fallback as Web",
            collections.getValue("Marvel").collectionSources.any {
                it.kind == CollectionSourceKind.TMDB_COLLECTION && it.tmdbCollectionId == 86311
            }
        )
        assertFalse(
            "DC movie sources should match Web and not add a separate MDBList",
            collections.getValue("DC Universe").collectionSources.any {
                it.mdblistSlug == "kingkearney/dc-universe"
            }
        )
        assertEquals(
            "timeline",
            source("Star Wars", "jxduffy/star-wars-chronological-order").collectionTab
        )
    }

    private val serviceOrder = listOf(
        "collection_service_netflix",
        "collection_service_disneyplus",
        "collection_service_apple_tvplus",
        "collection_service_prime_video",
        "collection_service_hbo_max",
        "collection_service_hulu",
        "collection_service_paramountplus",
        "collection_service_peacock",
        "collection_service_starz",
        "collection_service_shudder",
        "collection_service_mgmplus",
        "collection_service_discoveryplus",
        "collection_service_crunchyroll"
    )

    private val serviceVideoFiles = mapOf(
        "collection_service_netflix" to "videos/networks%20videos/netflix.mp4",
        "collection_service_disneyplus" to "videos/networks%20videos/disneyplus.mp4",
        "collection_service_apple_tvplus" to "videos/networks%20videos/appletv.mp4",
        "collection_service_prime_video" to "videos/networks%20videos/amazonprime.mp4",
        "collection_service_hbo_max" to "videos/networks%20videos/hbomax.mp4",
        "collection_service_hulu" to "videos/networks%20videos/hulu.mp4",
        "collection_service_paramountplus" to "videos/networks%20videos/paramount.mp4",
        "collection_service_peacock" to "videos/networks%20videos/peacock.mp4",
        "collection_service_starz" to "videos/networks%20videos/starz.mp4",
        "collection_service_shudder" to "videos/networks%20videos/shudder.mp4",
        "collection_service_mgmplus" to "videos/networks%20videos/mgm.mp4",
        "collection_service_discoveryplus" to "videos/networks%20videos/discovery.mp4",
        "collection_service_crunchyroll" to "videos/networks%20videos/crunchyroll.mp4"
    )

    private fun loadServices() =
        MediaRepository.buildPreinstalledDefaults()
            .filter { it.id.startsWith("collection_service_") }

    @Test
    fun `services appear in template order`() {
        val services = loadServices()
        assertEquals(serviceOrder, services.map { it.id })
    }

    @Test
    fun `all services have focusGif equal to cover (no distinct GIF)`() {
        // The helper defaults `collectionFocusGifUrl` to `focusGif ?: cover`,
        // so passing focusGif = null resolves to the cover PNG itself. The
        // home-row tile treats `backdrop == image` as "no focus swap".
        val services = loadServices()
        assertEquals(serviceOrder.size, services.size)
        services.forEach { cfg ->
            assertEquals(
                "Service ${cfg.id} focusGif must equal cover (no distinct GIF)",
                cfg.collectionCoverImageUrl,
                cfg.collectionFocusGifUrl
            )
        }
    }

    @Test
    fun `all services have null collectionClearLogoUrl`() {
        val services = loadServices()
        services.forEach { cfg ->
            assertNull(
                "Service ${cfg.id} should not have a clearLogo",
                cfg.collectionClearLogoUrl
            )
        }
    }

    @Test
    fun `services have heroVideo URLs pinned to the fork asset commit`() {
        val services = loadServices()
        assertEquals(serviceVideoFiles.keys, services.map { it.id }.toSet())
        services.forEach { cfg ->
            val video = cfg.collectionHeroVideoUrl
            assertNotNull("${cfg.id} heroVideo", video)
            assertTrue(
                "${cfg.id} heroVideo must use the StreamNet fork, was $video",
                video!!.contains("raw.githubusercontent.com/cyb3rgh05t/networks-video-collection") &&
                    video.contains(introVideoCommit) &&
                    video.endsWith(serviceVideoFiles[cfg.id]!!)
            )
        }
    }

    @Test
    fun `template service collections include TMDB provider fallbacks`() {
        val services = MediaRepository.buildPreinstalledDefaults()
            .filter { it.kind == CatalogKind.COLLECTION && it.collectionGroup == CollectionGroupKind.SERVICE }
        assertTrue("Expected service collections", services.isNotEmpty())
        services.forEach { cfg ->
            if (cfg.title == "Disney+") {
                assertTrue(
                    "Disney+ must use the curated MDBList source",
                    cfg.collectionSources.any {
                        it.kind == CollectionSourceKind.MDBLIST_PUBLIC &&
                            it.mdblistSlug == "garycrawfordgc/disney-shows"
                    }
                )
                return@forEach
            }
            assertTrue(
                "${cfg.title} must have a TMDB watch-provider fallback",
                cfg.collectionSources.any { it.kind == CollectionSourceKind.TMDB_WATCH_PROVIDER }
            )
        }
    }

    @Test
    fun `Paramount uses current US Paramount Plus providers`() {
        val paramount = MediaRepository.buildPreinstalledDefaults()
            .first { it.title == "Paramount+" }
        val providerIds = paramount.collectionSources
            .filter { it.kind == CollectionSourceKind.TMDB_WATCH_PROVIDER }
            .mapNotNull { it.tmdbWatchProviderId }
            .toSet()
        val aioCatalogIds = paramount.collectionSources
            .filter { it.kind == CollectionSourceKind.ADDON_CATALOG }
            .mapNotNull { it.addonCatalogId }
            .toSet()

        assertTrue("Paramount should use the AIO streaming.pmp catalog", "streaming.pmp" in aioCatalogIds)
        assertTrue("Paramount Premium provider missing", 2303 in providerIds)
        assertTrue("Paramount Essential provider missing", 2616 in providerIds)
        assertFalse("Legacy provider 531 returns wrong US content", 531 in providerIds)
    }

    @Test
    fun `movie and TV genres have separate rails and TMDB sources`() {
        val catalogs = MediaRepository.buildPreinstalledDefaults()
        val movieGenres = catalogs.filter {
            it.kind == CatalogKind.COLLECTION && it.collectionGroup == CollectionGroupKind.MOVIE_GENRE
        }
        val tvGenres = catalogs.filter {
            it.kind == CatalogKind.COLLECTION && it.collectionGroup == CollectionGroupKind.TV_GENRE
        }

        assertEquals(19, movieGenres.size)
        assertEquals(16, tvGenres.size)
        assertTrue(catalogs.any {
            it.kind == CatalogKind.COLLECTION_RAIL && it.collectionGroup == CollectionGroupKind.MOVIE_GENRE
        })
        assertTrue(catalogs.any {
            it.kind == CatalogKind.COLLECTION_RAIL && it.collectionGroup == CollectionGroupKind.TV_GENRE
        })
        assertFalse(catalogs.any {
            it.kind == CatalogKind.COLLECTION_RAIL && it.collectionGroup == CollectionGroupKind.GENRE
        })

        movieGenres.forEach { catalog ->
            assertTrue(catalog.collectionSources.all {
                it.kind == CollectionSourceKind.TMDB_GENRE && it.mediaType == "movie"
            })
        }
        tvGenres.forEach { catalog ->
            assertTrue(catalog.collectionSources.all {
                it.kind == CollectionSourceKind.TMDB_GENRE && it.mediaType == "series"
            })
        }

        assertTrue(movieGenres.first { it.title == "Action" }.collectionSources.any {
            it.tmdbGenreId == 28
        })
        assertTrue(tvGenres.first { it.title == "Action & Adventure" }.collectionSources.any {
            it.tmdbGenreId == 10759
        })
    }

    @Test
    fun `movie studios and TV networks are not preinstalled`() {
        val catalogs = MediaRepository.buildPreinstalledDefaults()
        assertFalse(catalogs.any { it.collectionGroup == CollectionGroupKind.STUDIO })
        assertFalse(catalogs.any { it.collectionGroup == CollectionGroupKind.NETWORK })
    }

}
