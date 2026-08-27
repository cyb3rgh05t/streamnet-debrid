package com.arflix.tv.ui.screens.player

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SubtitleFontOptionTest {
    @Test
    fun `unknown preference falls back to system`() {
        assertEquals(SubtitleFontOption.SYSTEM, SubtitleFontOption.fromPreference("missing"))
    }

    @Test
    fun `font cycle wraps in both directions`() {
        assertEquals("Noto Sans", SubtitleFontOption.nextPreference("System"))
        assertEquals("System", SubtitleFontOption.nextPreference("Varela Round"))
        assertEquals("Varela Round", SubtitleFontOption.previousPreference("System"))
    }

    @Test
    fun `embedded styles require system font and stylized mode`() {
        assertTrue(shouldPreserveEmbeddedSubtitleStyles("System", true))
        assertFalse(shouldPreserveEmbeddedSubtitleStyles("Rubik", true))
        assertFalse(shouldPreserveEmbeddedSubtitleStyles("System", false))
    }
}