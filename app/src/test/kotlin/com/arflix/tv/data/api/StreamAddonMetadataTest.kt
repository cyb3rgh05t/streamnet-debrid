package com.arflix.tv.data.api

import com.google.gson.Gson
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class StreamAddonMetadataTest {
    @Test
    fun `nzb size skips bitrate before actual package size`() {
        for ((bitrate, size) in listOf("9.4" to "7.79", "7.9" to "6.53", "3.7" to "3.1")) {
            val stream = Gson().fromJson(
                """{"description":"📶 $bitrate Mbps German 13 files 📦 $size GB"}""",
                StremioStream::class.java
            )
            assertEquals("$size GB", stream.getSize())
        }
    }

    @Test
    fun `bitrate alone is never reported as a file size`() {
        for (rate in listOf("9.4 Mbps", "9.4 mbps", "9.4 MB/s", "9.4 MBps", "9.4 MBit/s", "💾 9.4 Mbps")) {
            val stream = Gson().fromJson("""{"title":"$rate"}""", StremioStream::class.java)
            assertEquals(rate, "", stream.getSize())
        }
    }

    @Test
    fun `file size supports decimal commas compact units and structured priority`() {
        for ((text, expected) in listOf(
            "📦 7,79 GB" to "7,79 GB",
            "💾 15.2 GB" to "15.2 GB",
            "700MB" to "700 MB",
            "1.5TB" to "1.5 TB",
            "9.4 Mbps | 7.79 GB" to "7.79 GB"
        )) {
            val stream = Gson().fromJson("""{"title":"$text"}""", StremioStream::class.java)
            assertEquals(expected, stream.getSize())
        }
        val stream = Gson().fromJson(
            """{"title":"9.4 Mbps | 7.79 GB","behaviorHints":{"videoSize":2000000000}}""",
            StremioStream::class.java
        )
        assertEquals(2.0, stream.getSize().substringBefore(' ').replace(',', '.').toDouble(), 0.001)
        assertEquals("GB", stream.getSize().substringAfter(' '))
    }

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
