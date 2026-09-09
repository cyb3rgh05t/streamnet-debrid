package com.arflix.tv.ui.screens.player

import androidx.media3.ui.AspectRatioFrameLayout
import org.junit.Assert.assertEquals
import org.junit.Test

class PlayerAspectModeTest {
    @Test
    fun `aspect modes cycle in display order`() {
        assertEquals(PlayerAspectMode.FIT, PlayerAspectMode.AUTO.next())
        assertEquals(PlayerAspectMode.STRETCH, PlayerAspectMode.FIT.next())
        assertEquals(PlayerAspectMode.CROP, PlayerAspectMode.STRETCH.next())
        assertEquals(PlayerAspectMode.AUTO, PlayerAspectMode.CROP.next())
    }

    @Test
    fun `auto uses the default fit behavior while explicit modes map to Media3`() {
        assertEquals(AspectRatioFrameLayout.RESIZE_MODE_FIT, PlayerAspectMode.AUTO.resizeMode)
        assertEquals(AspectRatioFrameLayout.RESIZE_MODE_FIT, PlayerAspectMode.FIT.resizeMode)
        assertEquals(AspectRatioFrameLayout.RESIZE_MODE_FILL, PlayerAspectMode.STRETCH.resizeMode)
        assertEquals(AspectRatioFrameLayout.RESIZE_MODE_ZOOM, PlayerAspectMode.CROP.resizeMode)
    }

    @Test
    fun `brightness swipe clamps and reaches system auto threshold`() {
        assertEquals(1f, resolvePlayerBrightness(0.5f, -600f, 1000f))
        assertEquals(0f, resolvePlayerBrightness(0.5f, 600f, 1000f))
        assertEquals(0.25f, resolvePlayerBrightness(0.5f, 250f, 1000f))
    }
}