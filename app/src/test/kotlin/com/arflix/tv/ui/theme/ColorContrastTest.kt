package com.arflix.tv.ui.theme

import androidx.compose.ui.graphics.Color
import org.junit.Assert.assertEquals
import org.junit.Test

class ColorContrastTest {
    @Test
    fun `white accent uses black button content`() {
        assertEquals(Color.Black, contrastingContentColor(Color.White))
        assertEquals(Color.Black, contrastingContentColor(Pink))
    }

    @Test
    fun `dark accent uses white button content`() {
        assertEquals(Color.White, contrastingContentColor(Color(0xFF202124)))
    }
}
