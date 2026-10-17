package com.arflix.tv.ui.components

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class DetailsResponsiveLayoutTest {

    @Test
    fun tvDetailsAnchorUsesMeasuredHomeHeightWithoutChangingHome() {
        val layout = resolveTvHeroLayout(720, homeHeroHeightDp = 190f, detailsHeaderHeightDp = 112f)
        assertThat(layout.logoTopDp).isWithin(0.01f).of(249.2f)
        assertThat(layout.bodyTopDp).isWithin(0.01f).of(367.2f)
    }

    @Test
    fun tvDetailsDoesNotPushTheHomeAnchorDownToAnEstimatedNavigationLimit() {
        val layout = resolveTvHeroLayout(540, homeHeroHeightDp = 205f, detailsHeaderHeightDp = 127f)
        assertThat(layout.logoTopDp).isEqualTo(59f)
        assertThat(layout.bodyTopDp).isEqualTo(192f)
    }

    @Test
    fun tvDetailsUsesTheActualTextAndViewportSizes() {
        val normal = resolveTvHeroLayout(720, homeHeroHeightDp = 190f, detailsHeaderHeightDp = 112f)
        val large = resolveTvHeroLayout(720, homeHeroHeightDp = 208f, detailsHeaderHeightDp = 130f)
        assertThat(large.logoTopDp).isWithin(0.01f).of(normal.logoTopDp - 18f)
        assertThat(large.bodyTopDp).isWithin(0.01f).of(normal.bodyTopDp)
        val inset = resolveTvHeroLayout(720, 190f, 112f, viewportHeightDp = 700f)
        assertThat(inset.logoTopDp).isWithin(0.01f).of(normal.logoTopDp - 20f)
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
