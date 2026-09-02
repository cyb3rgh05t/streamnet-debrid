package com.arflix.tv.ui.screens.tv.live

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ProgramCellTest {
    @Test
    fun `live badge is hidden on touch devices`() {
        assertFalse(
            shouldShowEpgLiveBadge(
                isNow = true,
                narrowCell = false,
                isTouchDevice = true,
            )
        )
    }

    @Test
    fun `live badge remains visible on TV devices`() {
        assertTrue(
            shouldShowEpgLiveBadge(
                isNow = true,
                narrowCell = false,
                isTouchDevice = false,
            )
        )
    }
}