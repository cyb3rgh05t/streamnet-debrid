package com.arflix.tv.ui.screens.tv.live

import androidx.compose.ui.input.key.Key
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class FullscreenRemoteInputTest {
    @Test
    fun `remote up and down zap without depending on HUD visibility`() {
        assertEquals(-1, fullscreenChannelZapDirection(Key.DirectionUp, false, false))
        assertEquals(1, fullscreenChannelZapDirection(Key.DirectionDown, false, false))
    }

    @Test
    fun `guide channel list and settings keep directional navigation`() {
        assertNull(fullscreenChannelZapDirection(Key.DirectionUp, false, true))
        assertNull(fullscreenChannelZapDirection(Key.DirectionDown, false, true))
    }

    @Test
    fun `touch devices retain their existing key behavior`() {
        assertNull(fullscreenChannelZapDirection(Key.DirectionUp, true, false))
        assertNull(fullscreenChannelZapDirection(Key.DirectionDown, true, false))
    }

    @Test
    fun `OK and horizontal navigation stay available to the overlay`() {
        for (key in listOf(Key.Enter, Key.DirectionCenter, Key.DirectionLeft, Key.DirectionRight, Key.Back)) {
            assertNull(fullscreenChannelZapDirection(key, false, false))
        }
    }
}
