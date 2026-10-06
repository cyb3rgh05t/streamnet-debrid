package com.arflix.tv.ui.components

import com.arflix.tv.data.model.StreamSource
import com.arflix.tv.data.model.StreamBehaviorHints
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class NzbSourceDetailsTest {
    private fun source(text: String) = StreamSource(
        source = "Release", addonName = "StreamNet NZB", addonId = "com.usenet.streamer",
        quality = "1080p", size = "2 GB", addonTitle = text
    )

    @Test
    fun retainsAllFormattedMediaFieldsWithoutRepeatingFilename() {
        val lines = listOf(
            "\uD83C\uDFAC Movie", "\uD83D\uDCC4 movie.mkv", "\u2728 WEB-DL",
            "\uD83C\uDF9E\uFE0F HEVC", "\uD83D\uDCFA HDR10 | DV",
            "\uD83C\uDFA7 Atmos DD+ 5.1", "\uD83D\uDC65 FLUX",
            "\uD83D\uDCE6 15.4 GB", "\uD83D\uDCF6 13.3 Mbps",
            "\uD83C\uDF0E German", "\uD83D\uDD0E NZBGeek",
            "\uD83D\uDCC1 24 files", "\uD83D\uDCC5 2024-03-01", "\uD83E\uDDEA \u2705"
        )
        assertEquals(lines.filterNot { it.contains("movie.mkv") },
            nzbSourceDetailLines(source(lines.joinToString("\n")).copy(
                behaviorHints = StreamBehaviorHints(filename = "movie.mkv")
            )))
    }

    @Test
    fun smartPlayDescriptionIsRetainedAndDuplicateLinesAreRemoved() {
        val stream = source("Smart Play").copy(
            description = "Auto-selects best healthy NZB\nHealth check complete\nSmart Play"
        )
        assertEquals(listOf("Smart Play", "Auto-selects best healthy NZB", "Health check complete"),
            nzbSourceDetailLines(stream))
    }

    @Test
    fun otherAddonsAreUnchangedAndUrlsAreNotDisplayed() {
        assertTrue(nzbSourceDetailLines(source("Info").copy(addonId = "other", addonName = "Other")).isEmpty())
        assertEquals(listOf("WEB-DL"), nzbSourceDetailLines(source("WEB-DL\nhttps://example.test/private")))
        assertEquals(listOf("\uD83D\uDCC4 movie.mkv"), nzbSourceDetailLines(source("\uD83D\uDCC4 movie.mkv")))
    }
}
