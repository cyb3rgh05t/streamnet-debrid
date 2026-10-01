package com.arflix.tv.data.api

import com.google.gson.Gson
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class StreamAddonMetadataTest {
    @Test
    fun `nzb stream reads indexer from meta when behavior hints omit it`() {
        val stream = Gson().fromJson(
            """{
                "name": "StreamNet NZB",
                "behaviorHints": {"filename": "Movie.1080p.mkv"},
                "meta": {"indexer": "SceneNZBs / Treasure-Maps"}
            }""".trimIndent(),
            StremioStream::class.java
        )

        assertEquals("SceneNZBs / Treasure-Maps", stream.getIndexerName())
    }

    @Test
    fun `structured indexer takes precedence over addon meta`() {
        val stream = Gson().fromJson(
            """{"behaviorHints":{"indexer":"Primary"},"meta":{"indexer":"Fallback"}}""",
            StremioStream::class.java
        )

        assertEquals("Primary", stream.getIndexerName())
    }

    @Test
    fun `custom behavior hints preserve strings arrays and numbers`() {
        val hints = Gson().fromJson(
            """{
                "provider": "Usenet Vault",
                "source": ["UV", "Backup"],
                "indexer": 42,
                "language": null
            }""".trimIndent(),
            StreamBehaviorHints::class.java
        )

        assertEquals("Usenet Vault", hints.provider.asAddonMetadataText())
        assertEquals("UV, Backup", hints.source.asAddonMetadataText())
        assertEquals("42", hints.indexer.asAddonMetadataText())
        assertNull(hints.language.asAddonMetadataText())
    }
}
