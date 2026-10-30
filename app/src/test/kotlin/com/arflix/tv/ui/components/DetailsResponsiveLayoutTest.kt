package com.arflix.tv.ui.components

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class DetailsResponsiveLayoutTest {

    @Test
    fun tvScalingPreservesTheMeasuredHeroAndFirstRowComposition() {
        listOf(540, 576, 720, 1080).forEach { originalHeight ->
            val viewportHeight = originalHeight - 20f
            val original = resolveTvHeroLayout(originalHeight, 190f, 112f, viewportHeight)
            val originalRowTop = viewportHeight - resolveTvHomeRowsViewportHeight(viewportHeight - 24f)
            listOf(1f, 0.9f, 0.85f, 0.8f).forEach { scale ->
                val scaledViewport = viewportHeight / scale
                val scaled = resolveTvHeroLayout(
                    screenHeightDp = (originalHeight / scale).toInt(),
                    homeHeroHeightDp = 190f,
                    detailsHeaderHeightDp = 112f,
                    viewportHeightDp = scaledViewport,
                    uiScale = scale,
                )
                val scaledRowTop = scaledViewport - resolveTvHomeRowsViewportHeight(scaledViewport - 24f, scale)
                assertThat(scaled.logoTopDp).isWithin(0.35f).of(original.logoTopDp)
                assertThat(scaled.bodyTopDp).isWithin(0.35f).of(original.bodyTopDp)
                assertThat(scaledRowTop).isWithin(0.01f).of(originalRowTop)
                assertThat(scaledRowTop - scaled.logoTopDp - 190f)
                    .isWithin(0.35f).of(originalRowTop - original.logoTopDp - 190f)
            }
        }
    }

    @Test
    fun defaultHomeGeometryRemainsUnchanged() {
        listOf(360, 540, 576, 720, 1080).forEach { height ->
            assertThat(resolveTvHomeHeroBottomPadding(height, height.toFloat()))
                .isWithin(0.01f).of((height * 0.34f).coerceIn(240f, 320f) + 36f)
            assertThat(resolveTvHomeRowsViewportHeight(height - 24f))
                .isWithin(0.01f).of(((height - 24f) * 0.31f).coerceIn(260f, 340f))
        }
    }

    @Test
    fun homeHeroStaysBelowNavigationWhenExpandedMetadataMakesItTooTall() {
        assertThat(
            resolveTvHomeHeroTop(
                viewportHeightDp = 480f,
                heroHeightDp = 310f,
                bottomPaddingDp = 276f,
                topBarInsetDp = 98f,
            )
        ).isEqualTo(98f)
    }

    @Test
    fun homeHeroKeepsItsExistingPositionWhenItAlreadyClearsNavigation() {
        assertThat(
            resolveTvHomeHeroTop(
                viewportHeightDp = 720f,
                heroHeightDp = 220f,
                bottomPaddingDp = 281f,
                topBarInsetDp = 98f,
            )
        ).isEqualTo(219f)
    }

    @Test
    fun homeHeroReducesSynopsisToFitBetweenNavigationAndContinueWatching() {
        assertThat(
            resolveTvHomeHeroOverviewHeight(
                viewportHeightDp = 720f,
                measuredHeroHeightDp = 340f,
                overviewHeightDp = 72f,
                rowsViewportHeightDp = 284f,
                topBarInsetDp = 98f,
            )
        ).isEqualTo(54f)
    }

    @Test
    fun homeHeroKeepsFullSynopsisWhenItFitsItsReservedSpace() {
        assertThat(
            resolveTvHomeHeroOverviewHeight(
                viewportHeightDp = 720f,
                measuredHeroHeightDp = 270f,
                overviewHeightDp = 72f,
                rowsViewportHeightDp = 284f,
                topBarInsetDp = 98f,
            )
        ).isEqualTo(72f)
    }

    @Test
    fun tvDetailsAnchorUsesMeasuredHomeHeightWithoutChangingHome() {
        val layout = resolveTvHeroLayout(720, homeHeroHeightDp = 190f, detailsHeaderHeightDp = 112f)
        assertThat(layout.logoTopDp).isWithin(0.01f).of(249.2f)
        assertThat(layout.bodyTopDp).isWithin(0.01f).of(367.2f)
    }

    @Test
    fun tvDetailsKeepsLogoAndMetadataBelowNavigation() {
        val layout = resolveTvHeroLayout(540, homeHeroHeightDp = 205f, detailsHeaderHeightDp = 127f)
        assertThat(layout.logoTopDp).isEqualTo(82f)
        assertThat(layout.bodyTopDp).isEqualTo(215f)
    }

    @Test
    fun tvDetailsUsesTheActualNavigationInsetWhenMetadataWraps() {
        val layout = resolveTvHeroLayout(
            screenHeightDp = 540,
            homeHeroHeightDp = 270f,
            detailsHeaderHeightDp = 180f,
            topBarInsetDp = 110f,
        )
        assertThat(layout.logoTopDp).isEqualTo(110f)
        assertThat(layout.bodyTopDp).isEqualTo(296f)
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
