package com.arflix.tv.ui.components

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class DetailsResponsiveLayoutTest {

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
