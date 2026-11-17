package com.arflix.tv.data.repository

import com.arflix.tv.data.model.CatalogConfig
import com.arflix.tv.data.model.CatalogSourceType
import com.arflix.tv.data.model.CollectionGroupKind
import com.arflix.tv.data.model.CollectionSourceConfig
import com.arflix.tv.data.model.CollectionSourceKind
import com.arflix.tv.data.model.RemoteAddonOverride
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CatalogRemoteOverridesTest {
    private val bundledRow = CatalogConfig(
        id = "trending_movies", title = "Trending", sourceType = CatalogSourceType.MDBLIST, isPreinstalled = true,
        sourceUrl = "https://mdblist.com/lists/snoak/trending-movies",
        sourceRef = "mdblist:https://mdblist.com/lists/snoak/trending-movies",
    )

    @Test
    fun remoteListUrlReplacesBundledUrlAndRef() {
        val stored = bundledRow.copy(remoteManaged = true, remoteSourceUrl = "https://mdblist.com/lists/me/other")
        val result = applyRemoteCatalogOverrides(bundledRow, stored)
        assertEquals("https://mdblist.com/lists/me/other", result.sourceUrl)
        assertEquals("mdblist:https://mdblist.com/lists/me/other", result.sourceRef)
    }

    @Test
    fun overrideIsIgnoredWithoutRemoteManagementOrForForeignHosts() {
        val unmanaged = bundledRow.copy(remoteSourceUrl = "https://mdblist.com/lists/me/other")
        assertEquals(bundledRow.sourceUrl, applyRemoteCatalogOverrides(bundledRow, unmanaged).sourceUrl)
        val foreign = bundledRow.copy(remoteManaged = true, remoteSourceUrl = "https://evil.example/lists/a/b")
        assertEquals(bundledRow.sourceUrl, applyRemoteCatalogOverrides(bundledRow, foreign).sourceUrl)
        assertFalse(isValidRemoteMdblistUrl("http://mdblist.com/lists/a/b"))
        assertFalse(isValidRemoteMdblistUrl("https://mdblist.com.evil.example/lists/a/b"))
        assertTrue(isValidRemoteMdblistUrl("https://mdblist.com/lists/a/b"))
    }

    @Test
    fun remoteSlugReplacesMatchingMdblistSourcesWhateverTheirPosition() {
        val tmdb = CollectionSourceConfig(kind = CollectionSourceKind.TMDB_GENRE, tmdbGenreId = 28)
        val mdb = CollectionSourceConfig(kind = CollectionSourceKind.MDBLIST_PUBLIC, mdblistSlug = "snoak/top-2020s-movies")
        val other = mdb.copy(mdblistSlug = "snoak/other")
        val bundled = bundledRow.copy(id = "decade_2020s", collectionSources = listOf(other, tmdb, mdb))
        val stored = bundled.copy(remoteManaged = true, remoteSlugOverrides = mapOf("snoak/top-2020s-movies" to "me/new-list"))
        val result = applyRemoteCatalogOverrides(bundled, stored)
        assertEquals("snoak/other", result.collectionSources[0].mdblistSlug)
        assertEquals(28, result.collectionSources[1].tmdbGenreId)
        assertEquals("me/new-list", result.collectionSources[2].mdblistSlug)
        val bad = applyRemoteCatalogOverrides(bundled, stored.copy(remoteSlugOverrides = mapOf("snoak/top-2020s-movies" to "not a slug")))
        assertEquals("snoak/top-2020s-movies", bad.collectionSources[2].mdblistSlug)
        val unmanaged = applyRemoteCatalogOverrides(bundled, stored.copy(remoteManaged = false))
        assertEquals("snoak/top-2020s-movies", unmanaged.collectionSources[2].mdblistSlug)
    }

    @Test
    fun addonCatalogSourcesAreReplacedByTheirBundledKeyAndMalformedValuesFallBack() {
        val aioMovies = CollectionSourceConfig(
            kind = CollectionSourceKind.ADDON_CATALOG, addonId = "aio-metadata",
            addonCatalogType = "movie", addonCatalogId = "mdblist.88328",
        )
        val aioSeries = aioMovies.copy(addonCatalogType = "series", addonCatalogId = "mdblist.86751")
        val bundled = bundledRow.copy(id = "collection_service_netflix", collectionSources = listOf(aioMovies, aioSeries))
        val stored = bundled.copy(
            remoteManaged = true,
            remoteAddonOverrides = mapOf(
                "movie|mdblist.88328" to RemoteAddonOverride(addonCatalogId = "mdblist.99999"),
                "series|mdblist.86751" to RemoteAddonOverride(
                    addonId = "other-addon", addonCatalogId = "cat.new",
                    addonManifestUrl = "https://example.com/abc/manifest.json",
                ),
            ),
        )
        val result = applyRemoteCatalogOverrides(bundled, stored)
        assertEquals("mdblist.99999", result.collectionSources[0].addonCatalogId)
        assertEquals("aio-metadata", result.collectionSources[0].addonId)
        assertEquals("movie", result.collectionSources[0].addonCatalogType)
        assertEquals("cat.new", result.collectionSources[1].addonCatalogId)
        assertEquals("other-addon", result.collectionSources[1].addonId)
        assertEquals("https://example.com/abc/manifest.json", result.collectionSources[1].addonManifestUrl)

        val bad = stored.copy(
            remoteAddonOverrides = mapOf(
                "movie|mdblist.88328" to RemoteAddonOverride(addonCatalogId = "bad id; drop"),
                "series|mdblist.86751" to RemoteAddonOverride(
                    addonCatalogId = "cat.new", addonManifestUrl = "http://example.com/manifest.json",
                ),
            ),
        )
        val fallback = applyRemoteCatalogOverrides(bundled, bad)
        assertEquals(aioMovies, fallback.collectionSources[0])
        assertEquals("cat.new", fallback.collectionSources[1].addonCatalogId)
        assertEquals(null, fallback.collectionSources[1].addonManifestUrl)

        val unmanaged = applyRemoteCatalogOverrides(bundled, stored.copy(remoteManaged = false))
        assertEquals(listOf(aioMovies, aioSeries), unmanaged.collectionSources)
    }

    @Test
    fun franchiseGetsValidExtraTitlesAsOneCuratedSourceWithoutRemoteManagement() {
        val movies = CollectionSourceConfig(kind = CollectionSourceKind.TMDB_COLLECTION, tmdbCollectionId = 119)
        val franchise = bundledRow.copy(
            id = "collection_franchise_lotr", collectionGroup = CollectionGroupKind.FRANCHISE,
            collectionSources = listOf(movies),
        )
        val stored = franchise.copy(remoteExtraRefs = listOf("tv:84773", "TV:84773", "movie:120", "tv:abc", "x:1", "tv:1; drop"))
        val result = applyRemoteCatalogOverrides(franchise, stored)
        assertEquals(2, result.collectionSources.size)
        assertEquals(movies, result.collectionSources[0])
        assertEquals(CollectionSourceKind.CURATED_IDS, result.collectionSources[1].kind)
        assertEquals(listOf("tv:84773", "movie:120"), result.collectionSources[1].curatedRefs)
        assertEquals(stored.remoteExtraRefs, result.remoteExtraRefs)

        val nothingValid = applyRemoteCatalogOverrides(franchise, franchise.copy(remoteExtraRefs = listOf("nope")))
        assertEquals(listOf(movies), nothingValid.collectionSources)
        val decade = franchise.copy(collectionGroup = CollectionGroupKind.DECADE)
        assertEquals(listOf(movies), applyRemoteCatalogOverrides(decade, stored.copy(collectionGroup = CollectionGroupKind.DECADE)).collectionSources)
    }
}
