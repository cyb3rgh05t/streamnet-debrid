package com.arflix.tv.data.repository

import com.arflix.tv.data.model.CollectionSourceKind
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class HarryPotterCollectionTest {
    @Test
    fun `Harry Potter retains film catalog and explicitly includes new TV series`() {
        val entry = CollectionTemplateManifest.entries.single { it.title == "Harry Potter" }

        assertEquals(
            setOf(1241, 435259),
            entry.sources.filter { it.kind == CollectionSourceKind.TMDB_COLLECTION }
                .mapNotNull { it.tmdbCollectionId }.toSet()
        )
        assertTrue(entry.sources.any {
            it.kind == CollectionSourceKind.MDBLIST_PUBLIC && it.mdblistSlug == "thebirdod/harry-potter-collection"
        })
        assertEquals(
            listOf("tv:224377"),
            entry.sources.filter { it.kind == CollectionSourceKind.CURATED_IDS }
                .flatMap { it.curatedRefs.orEmpty() }
        )
    }
}
