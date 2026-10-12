package com.arflix.tv.ui.components

import androidx.compose.ui.graphics.Color
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class MediaCardMetadataTest {
    @Test
    fun `collection years support addon years and both stored release date formats`() {
        assertEquals("2025", formatCardReleaseYear(null, "2025"))
        assertEquals("2012", formatCardReleaseYear("2012-07-14", ""))
        assertEquals("2012", formatCardReleaseYear("14 Jul 2012", ""))
        assertEquals("2012", formatCardReleaseYear("14.07.2012", ""))
        assertEquals("2017", formatCardReleaseYear(null, "2017–2019"))
        assertEquals("2025", formatCardReleaseYear("2024-01-01", "2025"))
        assertNull(formatCardReleaseYear(null, ""))
        assertNull(formatCardReleaseYear(null, "N/A"))
    }

    @Test
    fun `metadata separator spans use accent without recoloring metadata values`() {
        val annotated = metadataTextWithAccentSeparators("Action | Drama | 2022", Color.Cyan)
        assertEquals("Action | Drama | 2022", annotated.text)
        assertEquals(listOf(7, 15), annotated.spanStyles.map { it.start })
        assertEquals(listOf(8, 16), annotated.spanStyles.map { it.end })
        assertEquals(listOf(Color.Cyan, Color.Cyan), annotated.spanStyles.map { it.item.color })
    }
}
