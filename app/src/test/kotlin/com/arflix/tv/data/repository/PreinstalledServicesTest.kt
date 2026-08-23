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
    private val introVideoCommit = "5ff8719c1aa82c403b7f4abe9425a9c4347fe97c"

    @Test
    fun `fresh profile starts with trending before collections and IPTV rows`() {
        val ids = MediaRepository.buildPreinstalledDefaults().map { it.id }

        assertEquals(listOf("trending_movies", "trending_tv"), ids.take(2))
        assertTrue(ids.indexOf("favorite_tv") > ids.indexOf("collection_rail_franchise"))
        assertTrue(ids.indexOf("recent_tv") > ids.indexOf("favorite_tv"))
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

    private val serviceVideoIds = setOf(
        "collection_service_netflix",
        "collection_service_disneyplus",
        "collection_service_apple_tvplus",
        "collection_service_prime_video",
        "collection_service_hbo_max",
        "collection_service_hulu",
        "collection_service_paramountplus",
        "collection_service_crunchyroll"
    )

    private val servicesWithoutHeroVideo = serviceOrder.toSet() - serviceVideoIds

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
    fun `primary services have heroVideo URLs`() {
        val services = loadServices().filter { it.id in serviceVideoIds }
        val expectedVideos = mapOf(
            "collection_service_netflix" to "networks%20videos/netflix.mp4",
            "collection_service_disneyplus" to "networks%20videos/disneyplus.mp4",
            "collection_service_apple_tvplus" to "networks%20videos/appletv.mp4",
            "collection_service_prime_video" to "networks%20videos/amazonprime.mp4",
            "collection_service_hbo_max" to "networks%20videos/hbomax.mp4",
            "collection_service_hulu" to "networks%20videos/hulu.mp4",
            "collection_service_paramountplus" to "networks%20videos/paramount.mp4",
            "collection_service_crunchyroll" to "networks%20videos/crunchyroll.mp4"
        )
        services.forEach { cfg ->
            val video = cfg.collectionHeroVideoUrl
            assertNotNull("${cfg.id} heroVideo", video)
            assertTrue(
                "${cfg.id} heroVideo must use the StreamNet fork, was $video",
                video!!.contains("raw.githubusercontent.com/cyb3rgh05t/networks-video-collection") &&
                    video.contains(introVideoCommit) &&
                    video.endsWith(expectedVideos[cfg.id]!!)
            )
        }
    }

    @Test
    fun `secondary services have no heroVideo`() {
        val services = loadServices().filter { it.id in servicesWithoutHeroVideo }
        assertEquals(servicesWithoutHeroVideo.size, services.size)
        services.forEach { cfg ->
            assertNull("${cfg.id} should not have heroVideo", cfg.collectionHeroVideoUrl)
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
    fun `movie studios and TV networks have separate rails and source IDs`() {
        val catalogs = MediaRepository.buildPreinstalledDefaults()
        val studios = catalogs.filter {
            it.kind == CatalogKind.COLLECTION && it.collectionGroup == CollectionGroupKind.STUDIO
        }
        val networks = catalogs.filter {
            it.kind == CatalogKind.COLLECTION && it.collectionGroup == CollectionGroupKind.NETWORK
        }

        assertEquals(11, studios.size)
        assertEquals(22, networks.size)
        assertTrue(catalogs.any {
            it.kind == CatalogKind.COLLECTION_RAIL && it.collectionGroup == CollectionGroupKind.STUDIO
        })
        assertTrue(catalogs.any {
            it.kind == CatalogKind.COLLECTION_RAIL && it.collectionGroup == CollectionGroupKind.NETWORK
        })
        assertTrue(studios.all { catalog ->
            catalog.collectionSources.single().let { source ->
                source.kind == CollectionSourceKind.VODWISHARR_STUDIO &&
                    source.mediaType == "movie" && source.tmdbStudioId != null &&
                    source.tmdbNetworkId == null
            }
        })
        assertTrue(networks.all { catalog ->
            catalog.collectionSources.single().let { source ->
                source.kind == CollectionSourceKind.VODWISHARR_NETWORK &&
                    source.mediaType == "series" && source.tmdbNetworkId != null &&
                    source.tmdbStudioId == null
            }
        })

        assertEquals(174, studios.first { it.title == "Warner Bros. Pictures" }
            .collectionSources.single().tmdbStudioId)
        assertEquals(174, networks.first { it.title == "AMC" }
            .collectionSources.single().tmdbNetworkId)
    }

}
