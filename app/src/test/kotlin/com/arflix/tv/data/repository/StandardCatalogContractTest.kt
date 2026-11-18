package com.arflix.tv.data.repository

import com.arflix.tv.data.model.CatalogConfig
import com.arflix.tv.data.model.CollectionSourceConfig
import com.arflix.tv.data.model.CollectionSourceKind
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File

/**
 * The standard catalogs must match the web app (web/tests/catalog-contract.test.cjs checks the same
 * file). Both sides render every catalog to one line; when a change is intended, regenerate the file
 * with `UPDATE_CATALOG_CONTRACT=1` and make the same change on the other side.
 */
class StandardCatalogContractTest {
    @Test
    fun `Android standard catalogs match the shared contract`() {
        val actual = MediaRepository.buildPreinstalledDefaults().joinToString("\n", postfix = "\n") { contractLine(it) }
        val file = File("../catalog-contract/standard-catalogs.txt")
        if (System.getenv("UPDATE_CATALOG_CONTRACT") == "1") {
            file.parentFile.mkdirs()
            file.writeText(actual)
        }
        val expected = file.readText().replace("\r\n", "\n")
        assertEquals(
            "Standard catalogs differ from catalog-contract/standard-catalogs.txt. If intended, run the Android and web " +
                "tests with UPDATE_CATALOG_CONTRACT=1 and apply the same change to web/lib/catalogs.ts.",
            expected,
            actual
        )
    }

    private fun contractLine(catalog: CatalogConfig): String {
        val sources = contractSources(catalog.collectionSources.orEmpty()).sorted().joinToString(" ; ")
        return listOf(
            catalog.id,
            catalog.title,
            catalog.kind.name,
            catalog.collectionGroup?.name.orEmpty(),
            catalog.sourceUrl.orEmpty(),
            sources
        ).joinToString(" | ")
    }

    // Curated lists are merged per fallback flag: Android keeps one mixed list, web one per tab.
    private fun contractSources(sources: List<CollectionSourceConfig>): List<String> {
        val curated = sources.filter { it.kind == CollectionSourceKind.CURATED_IDS }
            .groupBy { it.addonFallback }
            .map { (fallback, group) ->
                val refs = group.flatMap { it.curatedRefs.orEmpty() }.distinct().sorted().joinToString(",")
                "curated${if (fallback) "+fallback" else ""}:$refs"
            }
        val others = sources.filter { it.kind != CollectionSourceKind.CURATED_IDS }.map { source ->
            when (source.kind) {
                CollectionSourceKind.ADDON_CATALOG ->
                    "addon:${source.addonCatalogType}/${source.addonCatalogId}@${source.collectionTab.orEmpty()}@${source.addonManifestUrl.orEmpty()}"
                CollectionSourceKind.TMDB_COLLECTION -> "tmdbCollection:${source.tmdbCollectionId}"
                CollectionSourceKind.TMDB_GENRE -> "genre:${source.tmdbGenreId}:${source.mediaType.orEmpty()}"
                CollectionSourceKind.TMDB_KEYWORD -> "keyword:${source.tmdbKeywordId}:${source.mediaType.orEmpty()}"
                CollectionSourceKind.TMDB_WATCH_PROVIDER -> "provider:${source.tmdbWatchProviderId}:${source.mediaType.orEmpty()}"
                CollectionSourceKind.MDBLIST_PUBLIC -> "mdblist:${source.mdblistSlug}"
                else -> "${source.kind.name}"
            }
        }
        return curated + others
    }
}
