package com.arflix.tv.ui.components

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class DetailsResponsiveLayoutTest {

    @Test
    fun tvHeroAnchorUsesTheCompactHomeGeometry() {
        val layout = resolveTvHeroLayout(720, topBarInsetDp = 64f)
        assertThat(layout.logoTopDp).isWithin(0.01f).of(249.2f)
        assertThat(layout.headerHeightDp).isEqualTo(112f)
        assertThat(layout.bodyTopDp).isWithin(0.01f).of(367.2f)
    }

    @Test
    fun tvHeroAnchorKeepsNavigationAndBodySpaceAtSmallerSizes() {
        listOf(360, 540, 720, 1080).forEach { height ->
            val layout = resolveTvHeroLayout(height, topBarInsetDp = 64f)
            assertThat(layout.logoTopDp).isAtLeast(72f)
            assertThat(height - layout.bodyTopDp).isAtLeast(114f)
        }
    }

    @Test
    fun tvHeroHeaderReservesMoreSpaceForLargerText() {
        val normal = resolveTvHeroLayout(720, topBarInsetDp = 64f)
        val large = resolveTvHeroLayout(720, topBarInsetDp = 64f, fontScale = 1.5f)
        assertThat(large.metadataHeightDp).isEqualTo(54f)
        assertThat(large.bodyTopDp).isWithin(0.01f).of(normal.bodyTopDp)
    }

    @Test
    fun phoneLandscapeUsesCompactHeightThatStillFitsOverlay() {
        assertThat(
            resolveDetailsBackdropHeightDp(
                screenWidthDp = 640,
                screenHeightDp = 360,
                isPhone = true,
            )
        ).isWithin(0.01f).of(198f)
    }

    @Test
    fun phoneLandscapeHeightIsClampedToSafeRange() {
        assertThat(
            resolveDetailsBackdropHeightDp(
                screenWidthDp = 480,
                screenHeightDp = 320,
                isPhone = true,
            )
        ).isEqualTo(190f)
        assertThat(
            resolveDetailsBackdropHeightDp(
                screenWidthDp = 1280,
                screenHeightDp = 720,
                isPhone = true,
            )
        ).isEqualTo(220f)
    }

    @Test
    fun phonePortraitKeepsExistingBackdropRule() {
        assertThat(
            resolveDetailsBackdropHeightDp(
                screenWidthDp = 411,
                screenHeightDp = 891,
                isPhone = true,
            )
        ).isWithin(0.01f).of(472.23f)
    }

    @Test
    fun landscapeTabletKeepsExistingBackdropRule() {
        assertThat(
            resolveDetailsBackdropHeightDp(
                screenWidthDp = 1280,
                screenHeightDp = 800,
                isPhone = false,
            )
        ).isWithin(0.01f).of(424f)
    }
}
