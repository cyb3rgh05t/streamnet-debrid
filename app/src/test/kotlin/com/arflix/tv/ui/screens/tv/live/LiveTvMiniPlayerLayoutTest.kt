package com.arflix.tv.ui.screens.tv.live

import com.arflix.tv.data.model.IptvNowNext
import com.arflix.tv.data.model.IptvProgram
import org.junit.Assert.assertEquals
import org.junit.Test

class LiveTvMiniPlayerLayoutTest {
    @Test
    fun `preview waits until fullscreen exit animation has completely finished`() {
        listOf(1f, 0.8f, 0.5f, 0.001f).forEach { progress ->
            assertEquals(false, liveTvPreviewOutputEnabled(isFullScreen = false, fullscreenProgress = progress))
        }
        assertEquals(true, liveTvPreviewOutputEnabled(isFullScreen = false, fullscreenProgress = 0f))
    }

    @Test
    fun `entering fullscreen immediately blocks preview even before animation starts`() {
        listOf(0f, 0.001f, 0.5f, 1f).forEach { progress ->
            assertEquals(false, liveTvPreviewOutputEnabled(isFullScreen = true, fullscreenProgress = progress))
        }
    }

    @Test
    fun `touch tablet landscape uses larger hero layout`() {
        assertEquals(
            LiveTvMiniPlayerLayout.TABLET_LANDSCAPE,
            liveTvMiniPlayerLayout(
                isTouchDevice = true,
                smallestScreenWidthDp = 576,
                screenWidthDp = 1280,
                screenHeightDp = 576,
            ),
        )
    }

    @Test
    fun `touch tablet portrait keeps standard layout`() {
        assertEquals(
            LiveTvMiniPlayerLayout.STANDARD,
            liveTvMiniPlayerLayout(
                isTouchDevice = true,
                smallestScreenWidthDp = 600,
                screenWidthDp = 800,
                screenHeightDp = 1280,
            ),
        )
    }

    @Test
    fun `landscape phone remains compact`() {
        assertEquals(
            LiveTvMiniPlayerLayout.LANDSCAPE_COMPACT,
            liveTvMiniPlayerLayout(
                isTouchDevice = true,
                smallestScreenWidthDp = 411,
                screenWidthDp = 891,
                screenHeightDp = 411,
            ),
        )
    }

    @Test
    fun `tv device keeps standard layout`() {
        assertEquals(
            LiveTvMiniPlayerLayout.STANDARD,
            liveTvMiniPlayerLayout(
                isTouchDevice = false,
                smallestScreenWidthDp = 720,
                screenWidthDp = 1280,
                screenHeightDp = 720,
            ),
        )
    }

    @Test
    fun `tablet panel shows two unique upcoming programmes in time order`() {
        val later = IptvProgram("Later", startUtcMillis = 3_000L, endUtcMillis = 4_000L)
        val next = IptvProgram("Next", startUtcMillis = 2_000L, endUtcMillis = 3_000L)
        val duplicate = next.copy()

        assertEquals(
            listOf("Next", "Later"),
            tabletUpcomingPrograms(
                IptvNowNext(next = next, later = later, upcoming = listOf(duplicate))
            ).map(IptvProgram::title),
        )
    }
}