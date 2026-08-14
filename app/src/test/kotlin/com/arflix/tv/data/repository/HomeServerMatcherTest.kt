package com.arflix.tv.data.repository

import com.arflix.tv.data.model.MediaType
import org.junit.Assert.assertFalse
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class HomeServerMatcherTest {
    @Test
    fun `home server library types select the provider media filter`() {
        assertEquals(MediaType.MOVIE, homeServerCatalogMediaType("movie"))
        assertEquals(MediaType.MOVIE, homeServerCatalogMediaType("movies"))
        assertEquals(MediaType.TV, homeServerCatalogMediaType("show"))
        assertEquals(MediaType.TV, homeServerCatalogMediaType("tvshows"))
    }

    @Test
    fun `mixed home server libraries remain unfiltered`() {
        assertNull(homeServerCatalogMediaType("mixed"))
        assertNull(homeServerCatalogMediaType("boxsets"))
    }

    @Test
    fun `explicit home server media type remains supported`() {
        assertEquals(MediaType.TV, homeServerCatalogMediaType("movies", MediaType.TV))
    }

    @Test
    fun `library source keeps its type for every home server provider`() {
        HomeServerKind.entries
            .filter { it != HomeServerKind.UNKNOWN }
            .forEach { serverKind ->
                val connection = HomeServerConnection(
                    connectionId = "connection-${serverKind.name}",
                    serverKind = serverKind,
                    serverId = "server-${serverKind.name}"
                )
                val collection = HomeServerCollection(id = "library-1", type = "tvshows")

                val parsed = HomeServerRepository.parseCatalogSourceRef(
                    HomeServerRepository.buildCatalogSourceRef(connection, collection)
                )

                assertEquals(
                    Triple("server-${serverKind.name}", "library-1", "tvshows"),
                    parsed
                )
            }
    }

    @Test
    fun `external ids beat older title-only remakes`() {
        val correct = HomeServerCandidateInfo(
            title = "Suits",
            productionYear = 2011,
            providerIds = mapOf("imdb" to "tt1632701", "tmdb" to "37680")
        )
        val wrong = HomeServerCandidateInfo(
            title = "Suits",
            productionYear = 1990,
            providerIds = emptyMap()
        )

        val correctScore = HomeServerMatcher.score(
            requestedTitle = "Suits",
            requestedYear = 2011,
            imdbId = "tt1632701",
            tmdbId = 37680,
            tvdbId = null,
            candidate = correct
        )
        val wrongScore = HomeServerMatcher.score(
            requestedTitle = "Suits",
            requestedYear = 2011,
            imdbId = "tt1632701",
            tmdbId = 37680,
            tvdbId = null,
            candidate = wrong
        )

        assertTrue(correctScore > wrongScore)
        assertTrue(HomeServerMatcher.isAcceptable(correctScore))
        assertFalse(HomeServerMatcher.isAcceptable(wrongScore))
    }

    @Test
    fun `title and year fallback allows local items without ids`() {
        val candidate = HomeServerCandidateInfo(
            title = "The Pitt",
            productionYear = 2025,
            providerIds = emptyMap()
        )

        val score = HomeServerMatcher.score(
            requestedTitle = "The Pitt",
            requestedYear = 2025,
            imdbId = null,
            tmdbId = null,
            tvdbId = null,
            candidate = candidate
        )

        assertTrue(HomeServerMatcher.isAcceptable(score))
    }

    @Test
    fun `strong ids reuse the same source cache entry across details and player`() {
        val detailsIdentity = HomeServerSourceCacheKey.contentIdentity(
            title = "Dune: Part Two",
            year = 2024,
            imdbId = "TT15239678",
            tmdbId = 693134,
            tvdbId = null
        )
        val playerIdentity = HomeServerSourceCacheKey.contentIdentity(
            title = "",
            year = null,
            imdbId = "tt15239678",
            tmdbId = 693134,
            tvdbId = 12345
        )

        assertEquals(detailsIdentity, playerIdentity)
        assertEquals("imdb:tt15239678", detailsIdentity)
    }

    @Test
    fun `tmdb id reuses cache when optional metadata arrives later`() {
        val prefetched = HomeServerSourceCacheKey.contentIdentity("The Pitt", 2025, null, 250307, null)
        val playback = HomeServerSourceCacheKey.contentIdentity("", null, null, 250307, 45177)

        assertEquals(prefetched, playback)
    }

    @Test
    fun `title fallback keeps remakes separate`() {
        val original = HomeServerSourceCacheKey.contentIdentity("Road House", 1989, null, null, null)
        val remake = HomeServerSourceCacheKey.contentIdentity("Road House", 2024, null, null, null)

        assertNotEquals(original, remake)
    }

    @Test
    fun `matching title versions are retained while unrelated titles are rejected`() {
        assertTrue(
            HomeServerMatcher.isLikelySameVersion(
                requestedTitle = "Blade Runner 2049",
                requestedYear = 2017,
                candidate = HomeServerCandidateInfo("Blade Runner 2049", 2017, emptyMap())
            )
        )
        assertFalse(
            HomeServerMatcher.isLikelySameVersion(
                requestedTitle = "Blade Runner 2049",
                requestedYear = 2017,
                candidate = HomeServerCandidateInfo("Blade Runner", 1982, emptyMap())
            )
        )
    }

    @Test
    fun `native library ids remain stable across reloads`() {
        val first = HomeServerLibraryIdentity.stableNativeId("server-a:movies", "item-42")
        val second = HomeServerLibraryIdentity.stableNativeId("server-a:movies", "item-42")

        assertEquals(first, second)
        assertTrue(first < 0)
    }

    @Test
    fun `same native item key on different servers does not collide`() {
        val first = HomeServerLibraryIdentity.stableNativeId("server-a:movies", "item-42")
        val second = HomeServerLibraryIdentity.stableNativeId("server-b:movies", "item-42")

        assertNotEquals(first, second)
    }
}
