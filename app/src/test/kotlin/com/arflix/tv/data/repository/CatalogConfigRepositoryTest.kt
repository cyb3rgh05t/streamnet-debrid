package com.arflix.tv.data.repository

import com.arflix.tv.data.model.CatalogKind
import com.arflix.tv.data.model.CollectionSourceConfig
import com.arflix.tv.data.model.CollectionSourceKind
import com.arflix.tv.ui.screens.collections.CollectionTab
import com.arflix.tv.ui.screens.collections.collectionCatalogForTab
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class CatalogConfigRepositoryTest {
    private val defaults = MediaRepository.buildPreinstalledDefaults()
    private val marvelId = "collection_franchise_marvel"

    @After
    fun resetRegistry() {
        RemoteFranchiseIds.ids = emptySet()
    }

    private fun tabs(movie: List<String> = emptyList(), series: List<String> = emptyList(), timeline: List<FranchiseListEntry> = emptyList()) =
        FranchiseListTabs(movie.map { FranchiseListEntry(it) }, series.map { FranchiseListEntry(it) }, timeline)

    @Test
    fun `the response is parsed into built-in and created franchises and malformed ones are dropped`() {
        val parsed = CatalogConfigRepository.parseCatalogConfig(
            """{"version":2,"franchises":[
                {"id":"marvel","title":"Marvel","catalogId":"$marvelId","builtin":true,"tabs":{
                    "movie":[{"ref":"movie:1"},{"ref":"MOVIE:2"},{"ref":"movie:1"},{"ref":"bogus"}],
                    "series":[{"ref":"tv:3"}],
                    "timeline":[{"ref":"tv:3","title":"Staffel 1"},{"ref":"tv:3","title":"Staffel 2"}]}},
                {"id":"ghibli","title":"Ghibli","catalogId":"x","builtin":false,"coverUrl":"https://example.com/g.jpg",
                    "tabs":{"movie":[{"ref":"movie:129"}]},"tmdbCollections":[8,0,"x"],"mdblist":["me/list","bad slug"]},
                {"id":"john-wick","title":"Reserved","builtin":false,"tabs":{}},
                {"id":"oops","title":"Cover","builtin":false,"coverUrl":"http://example.com/a.jpg","tabs":{}},
                {"id":"x","title":"Short id","builtin":false,"tabs":{}},
                {"id":"other","title":"Other","catalogId":"collection_franchise_other","builtin":true,"tabs":{}}],
              "overrides":{"rows":{"trending_movies":"https://mdblist.com/lists/me/x"},
                "covers":{"collection_service_netflix":"https://example.com/n.jpg","x":"http://bad"},
                "sources":{"c":{"tmdbCollections":[8,0],"mdblist":["me/a","bad slug"]},"d":{"tmdbCollections":[]}},
                "extras":{"c":["tv:1"]}}}"""
        )
        assertNotNull(parsed)
        assertEquals(listOf(marvelId, "collection_franchise_ghibli", "collection_franchise_oops"), parsed!!.franchises.map { it.catalogId })
        val marvel = parsed.franchises[0]
        assertEquals(listOf("movie:1", "movie:2"), marvel.tabs.movie.map { it.ref })
        assertEquals(listOf("Staffel 1", "Staffel 2"), marvel.tabs.timeline.map { it.title })
        assertEquals(listOf("tv:3", "tv:3"), marvel.tabs.timeline.map { it.ref })
        val ghibli = parsed.franchises[1]
        assertEquals("https://example.com/g.jpg", ghibli.coverUrl)
        assertEquals(listOf(8), ghibli.tmdbCollections)
        assertEquals(listOf("me/list"), ghibli.mdblist)
        assertNull(parsed.franchises[2].coverUrl)
        assertEquals("https://mdblist.com/lists/me/x", parsed.overrides.rows["trending_movies"])
        assertEquals(listOf("tv:1"), parsed.overrides.extras["c"])
        assertEquals(CentralSources(listOf(8), listOf("me/a")), parsed.overrides.sources["c"])
        assertNull(parsed.overrides.sources["d"])
        assertNull(CatalogConfigRepository.parseCatalogConfig("not json"))
    }

    @Test
    fun `central lists replace only the tab sources, an emptied tab disappears and added titles stay`() {
        val extra = CollectionSourceConfig(kind = CollectionSourceKind.CURATED_IDS, curatedRefs = listOf("tv:84773"))
        val sources = defaults.single { it.id == marvelId }.collectionSources + extra
        val replaced = CatalogConfigRepository.withLists(
            sources,
            tabs(movie = listOf("movie:1"), timeline = listOf(FranchiseListEntry("tv:2", "A"), FranchiseListEntry("tv:2", "B")))
        )
        assertEquals(listOf("movie:1"), replaced.single { it.collectionTab == "movie" }.curatedRefs)
        assertEquals(listOf("A", "B"), replaced.single { it.collectionTab == "timeline" }.curatedTitles)
        assertTrue(replaced.none { it.collectionTab == "series" })
        assertEquals(listOf("tv:84773"), replaced.single { it.collectionTab == null }.curatedRefs)
    }

    @Test
    fun `the central config reaches every default catalog, including created franchises and overrides`() {
        val hp = "collection_franchise_harry_potter"
        val config = CentralCatalogConfig(
            franchises = listOf(
                RemoteFranchise("marvel", "Marvel", marvelId, true, null, tabs(movie = listOf("movie:1")), emptyList(), emptyList()),
                RemoteFranchise("ghibli", "Ghibli", "collection_franchise_ghibli", false, "https://example.com/g.jpg",
                    tabs(movie = listOf("movie:129")), listOf(8), listOf("me/list"))
            ),
            overrides = CentralOverrides(
                rows = mapOf("trending_movies" to "https://mdblist.com/lists/me/trending", "recent_tv" to "https://mdblist.com/lists/me/ignored"),
                covers = mapOf("collection_service_netflix" to "https://example.com/netflix.jpg", "collection_service_hulu" to "http://insecure"),
                sources = mapOf(hp to CentralSources(tmdbCollections = listOf(7, 9), mdblist = listOf("me/hp"))),
                extras = mapOf("collection_franchise_james_bond" to listOf("TV:84773", "bogus"))
            )
        )
        val result = CatalogConfigRepository.applyCentralConfig(defaults, config)

        assertEquals(listOf("movie:1"), result.single { it.id == marvelId }.collectionSources.single { it.collectionTab == "movie" }.curatedRefs)
        val trending = result.single { it.id == "trending_movies" }
        assertEquals("https://mdblist.com/lists/me/trending", trending.sourceUrl)
        assertEquals("mdblist:https://mdblist.com/lists/me/trending", trending.sourceRef)
        assertEquals(defaults.single { it.id == "recent_tv" }.sourceUrl, result.single { it.id == "recent_tv" }.sourceUrl)
        val hpSources = result.single { it.id == hp }.collectionSources
        assertEquals(listOf(7, 9), hpSources.mapNotNull { it.tmdbCollectionId })
        assertEquals(listOf("me/hp"), hpSources.mapNotNull { it.mdblistSlug })
        assertTrue("added titles of the app stay", hpSources.any { it.curatedRefs == listOf("tv:224377") })
        val netflix = result.single { it.id == "collection_service_netflix" }
        assertEquals("https://example.com/netflix.jpg", netflix.collectionCoverImageUrl)
        assertEquals("https://example.com/netflix.jpg", netflix.collectionHeroImageUrl)
        assertEquals(defaults.single { it.id == "collection_service_hulu" }.collectionCoverImageUrl,
            result.single { it.id == "collection_service_hulu" }.collectionCoverImageUrl)
        assertTrue(result.single { it.id == "collection_franchise_james_bond" }.collectionSources
            .any { it.curatedRefs == listOf("tv:84773") })

        val ghibli = result.single { it.id == "collection_franchise_ghibli" }
        assertEquals(CatalogKind.COLLECTION, ghibli.kind)
        assertEquals(setOf("movie", null), ghibli.collectionSources.map { it.collectionTab }.toSet())
        assertTrue(ghibli.collectionSources.any { it.tmdbCollectionId == 8 })
        val franchises = result.filter { it.kind == CatalogKind.COLLECTION && it.collectionGroup == com.arflix.tv.data.model.CollectionGroupKind.FRANCHISE }
        assertEquals("collection_franchise_ghibli", franchises.last().id)
        assertEquals(defaults.size + 1, result.size)
    }

    @Test
    fun `a single bundled catalog gets the central lists, so refreshing a stored catalog keeps them`() {
        val hp = defaults.single { it.id == "collection_franchise_harry_potter" }
        val config = CentralCatalogConfig(overrides = CentralOverrides(sources = mapOf(hp.id to CentralSources(tmdbCollections = listOf(645)))))
        val result = CatalogConfigRepository.applyToBundled(hp, config)
        assertEquals(listOf(645), result.collectionSources.mapNotNull { it.tmdbCollectionId })
        assertEquals(hp, CatalogConfigRepository.applyToBundled(hp, CentralCatalogConfig()))
    }

    @Test
    fun `home rows can be hidden for everyone and added with a position`() {
        val parsed = CatalogConfigRepository.parseCatalogConfig(
            """{"franchises":[],"overrides":{"hidden":["new_kdramas","collection_rail_tv_genre"],
                "newRows":[
                  {"id":"top-horror","title":"Top Horror","url":"https://mdblist.com/lists/snoak/top-horror","after":"trending_movies"},
                  {"id":"kids","title":"Kids","url":"https://mdblist.com/lists/me/kids","after":"top-horror"},
                  {"id":"bad","title":"Bad","url":"https://evil.example/lists/a/b"},
                  {"id":"x","title":"Short id","url":"https://mdblist.com/lists/a/b"}]}}"""
        )!!
        assertEquals(setOf("new_kdramas", "collection_rail_tv_genre"), parsed.overrides.hidden)
        assertEquals(listOf("top-horror", "kids"), parsed.overrides.newRows.map { it.id })

        val result = CatalogConfigRepository.applyCentralConfig(defaults, parsed)
        val ids = result.map { it.id }
        assertTrue("new_kdramas" !in ids && "collection_rail_tv_genre" !in ids)
        assertEquals(
            listOf("trending_movies", "central_row_top_horror", "central_row_kids"),
            ids.subList(ids.indexOf("trending_movies"), ids.indexOf("trending_movies") + 3)
        )
        val row = result.single { it.id == "central_row_top_horror" }
        assertEquals("https://mdblist.com/lists/snoak/top-horror", row.sourceUrl)
        assertEquals("mdblist:https://mdblist.com/lists/snoak/top-horror", row.sourceRef)
        assertTrue(row.isPreinstalled)
        assertEquals(defaults.size - 2 + 2, result.size)
    }

    @Test
    fun `a created franchise is a valid collection only while the central config lists it`() {
        val ghibli = defaults.single { it.id == marvelId }.copy(id = "collection_franchise_ghibli")
        assertFalse(CollectionTemplateManifest.isValidCollectionConfig(ghibli))
        RemoteFranchiseIds.ids = setOf("collection_franchise_ghibli")
        assertTrue(CollectionTemplateManifest.isValidCollectionConfig(ghibli))
    }

    @Test
    fun `Marvel, DC and Star Wars no longer depend on any addon and keep the repeated Marvel season entries`() {
        for (id in BundledFranchiseLists.byCatalogId.keys) {
            val sources = defaults.single { it.id == id }.collectionSources
            assertTrue("$id still has an addon source", sources.none { it.kind == CollectionSourceKind.ADDON_CATALOG })
            assertEquals("$id tabs", setOf("movie", "series", "timeline"),
                sources.filter { it.kind == CollectionSourceKind.CURATED_IDS }.mapNotNull { it.collectionTab }.toSet())
        }
        val timeline = BundledFranchiseLists.marvel.timeline.map { it.ref }
        assertTrue(timeline.size > timeline.toSet().size)
        assertTrue(BundledFranchiseLists.marvel.timeline.all { !it.title.isNullOrBlank() })
        assertEquals(BundledFranchiseLists.marvel.series.size, BundledFranchiseLists.marvel.series.map { it.ref }.toSet().size)
    }

    @Test
    fun `the bundled lists are exactly the shared franchise-lists json`() {
        val master = com.google.gson.Gson().fromJson(
            File("../catalog-contract/franchise-lists.json").readText(), com.google.gson.JsonObject::class.java
        ).getAsJsonObject("lists")
        for ((_, element) in master.entrySet()) {
            val list = element.asJsonObject
            val bundled = BundledFranchiseLists.byCatalogId.getValue(list.get("catalogId").asString)
            fun entries(tab: String) = list.getAsJsonObject("tabs").getAsJsonArray(tab).map {
                FranchiseListEntry(it.asJsonObject.get("ref").asString, it.asJsonObject.get("title")?.asString)
            }
            val name = list.get("id").asString
            assertEquals("$name movie", entries("movie").map { it.ref }, bundled.movie.map { it.ref })
            assertEquals("$name series", entries("series").map { it.ref }, bundled.series.map { it.ref })
            assertEquals("$name timeline", entries("timeline"), bundled.timeline)
        }
    }

    @Test
    fun `each tab of Marvel, DC and Star Wars shows exactly its own list`() {
        for ((id, lists) in BundledFranchiseLists.byCatalogId) {
            val catalog = defaults.single { it.id == id }
            fun refsFor(tab: CollectionTab) = collectionCatalogForTab(catalog, tab).collectionSources
                .filter { it.kind == CollectionSourceKind.CURATED_IDS }.flatMap { it.curatedRefs.orEmpty() }
            assertEquals("$id movies", lists.movie.map { it.ref }, refsFor(CollectionTab.MOVIES))
            assertEquals("$id series", lists.series.map { it.ref }, refsFor(CollectionTab.SERIES))
            assertEquals("$id timeline", lists.timeline.map { it.ref }, refsFor(CollectionTab.TIMELINE))
        }
    }

    @Test
    fun `the titles a franchise ships outside its lists can be replaced or removed centrally`() {
        val hp = defaults.single { it.id == "collection_franchise_harry_potter" }
        fun curated(sources: CentralSources) = CatalogConfigRepository.applyToBundled(
            hp, CentralCatalogConfig(overrides = CentralOverrides(sources = mapOf(hp.id to sources)))
        ).collectionSources.filter { it.kind == CollectionSourceKind.CURATED_IDS && it.collectionTab == null }.flatMap { it.curatedRefs.orEmpty() }
        assertEquals(listOf("tv:224377"), hp.collectionSources.filter { it.kind == CollectionSourceKind.CURATED_IDS }.flatMap { it.curatedRefs.orEmpty() })
        assertEquals(listOf("tv:1", "movie:2"), curated(CentralSources(curated = listOf("tv:1", "movie:2"))))
        assertEquals(emptyList<String>(), curated(CentralSources(curated = emptyList())))
        assertEquals(listOf("tv:224377"), curated(CentralSources(tmdbCollections = listOf(7))))
        val parsed = CatalogConfigRepository.parseCatalogConfig("""{"franchises":[],"overrides":{"sources":{"a":{"curated":["TV:5","bogus"]},"b":{"curated":[]}}}}""")!!
        assertEquals(listOf("tv:5"), parsed.overrides.sources["a"]?.curated)
        assertEquals(emptyList<String>(), parsed.overrides.sources["b"]?.curated)
    }

    @Test
    fun `a mixed MDBList list only brings the titles of the tab it is shown in`() {
        val catalog = defaults.single { it.id == "collection_franchise_harry_potter" }
        fun lists(tab: CollectionTab) = collectionCatalogForTab(catalog, tab).collectionSources
            .filter { it.kind == CollectionSourceKind.MDBLIST_PUBLIC }.map { it.mediaType }
        assertEquals(listOf<String?>("movie"), lists(CollectionTab.MOVIES))
        assertEquals(listOf<String?>("series"), lists(CollectionTab.SERIES))
    }

    @Test
    fun `admin-added titles still split by type across the movie and series tabs`() {
        val catalog = defaults.single { it.id == "collection_franchise_lord_of_the_rings" }
            .let { it.copy(collectionSources = it.collectionSources + CollectionSourceConfig(kind = CollectionSourceKind.CURATED_IDS, curatedRefs = listOf("movie:1", "tv:2"))) }
        fun extras(tab: CollectionTab) =
            collectionCatalogForTab(catalog, tab).collectionSources.filter { it.kind == CollectionSourceKind.CURATED_IDS }
                .flatMap { it.curatedRefs.orEmpty() }
        assertTrue(extras(CollectionTab.MOVIES).contains("movie:1"))
        assertTrue(extras(CollectionTab.SERIES).contains("tv:2"))
        assertTrue(!extras(CollectionTab.SERIES).contains("movie:1"))
    }
}
