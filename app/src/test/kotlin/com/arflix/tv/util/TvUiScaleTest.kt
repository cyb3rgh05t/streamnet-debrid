package com.arflix.tv.util

import android.content.res.Configuration
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class TvUiScaleTest {
    @Test
    fun `unsupported percentages fall back to original size`() {
        listOf(0, -1, 75, 95, 110).forEach { percent ->
            assertEquals(100, normalizeTvUiScalePercent(percent))
        }
        listOf(100, 90, 85, 80).forEach { percent ->
            assertEquals(percent, normalizeTvUiScalePercent(percent))
        }
    }

    @Test
    fun `size selection cycles through every option and back to the default`() {
        assertEquals(90, nextTvUiScalePercent(100))
        assertEquals(85, nextTvUiScalePercent(90))
        assertEquals(80, nextTvUiScalePercent(85))
        assertEquals(100, nextTvUiScalePercent(80))
        assertEquals(90, nextTvUiScalePercent(-1))
    }

    @Test
    fun `only tv receives the smaller density`() {
        listOf(100, 90, 85, 80).forEach { percent ->
            assertEquals(percent / 100f, tvUiScaleFactor(percent, isTv = true), 0f)
            assertEquals(1f, tvUiScaleFactor(percent, isTv = false), 0f)
        }
    }

    @Test
    fun `default size preserves the original configuration`() {
        val base = Configuration()
        assertSame(base, scaledTvConfiguration(base, 1f))
    }

    @Test
    fun `every size preserves full hd and 4k physical viewport dimensions`() {
        listOf(240, 480).forEach { dpi ->
            val base = Configuration().apply {
                densityDpi = dpi
                screenWidthDp = 1280
                screenHeightDp = 720
                smallestScreenWidthDp = 720
            }
            listOf(100, 90, 85, 80).forEach { percent ->
                val scale = tvUiScaleFactor(percent, isTv = true)
                val scaled = scaledTvConfiguration(base, scale)
                assertEquals(base.screenWidthDp * dpi / 160f, scaled.screenWidthDp * dpi * scale / 160f, 1f)
                assertEquals(base.screenHeightDp * dpi / 160f, scaled.screenHeightDp * dpi * scale / 160f, 1f)
                assertEquals((dpi * scale).toInt(), scaled.densityDpi)
            }
        }
    }

    @Test
    fun `compact tv gains logical space without changing physical size or font preference`() {
        val base = Configuration().apply {
            densityDpi = 240
            screenWidthDp = 1280
            screenHeightDp = 720
            smallestScreenWidthDp = 720
            fontScale = 1.3f
        }
        val compact = scaledTvConfiguration(base, 0.9f)
        assertEquals(216, compact.densityDpi)
        assertEquals(1422, compact.screenWidthDp)
        assertEquals(800, compact.screenHeightDp)
        assertEquals(800, compact.smallestScreenWidthDp)
        assertEquals(base.fontScale, compact.fontScale, 0f)
        assertEquals(1920f, compact.screenWidthDp * compact.densityDpi / 160f, 0.5f)
        assertEquals(1080f, compact.screenHeightDp * compact.densityDpi / 160f, 0.5f)
        assertEquals(1280, base.screenWidthDp)
        assertEquals(240, base.densityDpi)
    }
}