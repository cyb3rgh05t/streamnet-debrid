package com.arflix.tv.ui.screens.tv.live

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class GuideRenderWindowTest {
    @Test
    fun windowIsQuantizedWithThirtyMinuteOverscan() {
        val window = guideRenderWindow(
            scrollPx = 900,
            viewportPx = 600f,
            pixelsPerMinute = 5f,
        )

        assertEquals(150, window.startMinute)
        assertEquals(330, window.endMinute)
    }

    @Test
    fun invalidScaleKeepsEntireTimelineVisible() {
        assertEquals(GuideRenderWindow(0, Int.MAX_VALUE), guideRenderWindow(100, 500f, 0f))
    }

    @Test
    fun intersectionUsesExclusiveEdges() {
        val window = GuideRenderWindow(30, 90)

        assertTrue(window.intersects(0, 31))
        assertTrue(window.intersects(89, 120))
        assertFalse(window.intersects(0, 30))
        assertFalse(window.intersects(90, 120))
    }
}