package com.arflix.tv.ui.screens.settings

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SettingsIptvLoadingStateTest {

    @Test
    fun `connecting state is visible before playlist work starts`() {
        val state = SettingsUiState(
            isIptvLoading = false,
            iptvError = "Previous error",
            iptvStatusMessage = "Previous status",
            iptvStatusType = ToastType.ERROR,
            iptvProgressText = "Previous progress",
            iptvProgressPercent = 73,
        )

        val connecting = state.withIptvConnecting("Connecting...")

        assertTrue(connecting.isIptvLoading)
        assertNull(connecting.iptvError)
        assertEquals("Connecting...", connecting.iptvStatusMessage)
        assertEquals(ToastType.INFO, connecting.iptvStatusType)
        assertEquals("Connecting...", connecting.iptvProgressText)
        assertEquals(0, connecting.iptvProgressPercent)
        assertFalse(state.isIptvLoading)
    }
}