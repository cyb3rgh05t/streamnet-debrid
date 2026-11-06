package com.arflix.tv.util

import android.view.KeyEvent
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NavigationSoundGateTest {
    private val all = NavigationSoundMode.ALL
    private val selectOnly = NavigationSoundMode.SELECT_ONLY

    @Test
    fun modeFollowsDeviceSettingsRouteAndOpenMenus() {
        assertEquals(all, navigationSoundMode(true, true, "home", false))
        assertEquals(all, navigationSoundMode(true, true, "details/movie/1", false))
        assertEquals(NavigationSoundMode.OFF, navigationSoundMode(false, true, "home", false))
        assertEquals(NavigationSoundMode.OFF, navigationSoundMode(true, false, "home", false))
        assertEquals(NavigationSoundMode.OFF, navigationSoundMode(true, true, null, false))
        assertEquals(selectOnly, navigationSoundMode(true, true, "player/movie/1", false))
        assertEquals(selectOnly, navigationSoundMode(true, true, "tv", true))
        assertEquals(all, navigationSoundMode(true, true, "player/movie/1", false, overlayOpen = true))
        assertEquals(all, navigationSoundMode(true, true, "tv", true, overlayOpen = true))
        assertEquals(NavigationSoundMode.OFF, navigationSoundMode(true, false, "player/movie/1", false, overlayOpen = true))
    }

    @Test
    fun directionalAndSelectKeyDownsPlay() {
        val gate = NavigationSoundGate()
        assertFalse(gate.shouldPlay(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_DPAD_RIGHT, 0))
        assertFalse(gate.shouldPlay(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_DPAD_CENTER, 0))
        assertFalse(gate.shouldPlay(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_BACK, 0))
        assertTrue(gate.shouldPlay(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_RIGHT, 0))
        for (key in listOf(KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_NUMPAD_ENTER)) {
            assertTrue(gate.shouldPlay(KeyEvent.ACTION_DOWN, key, 1))
        }
    }

    @Test
    fun heldSelectKeyClicksOnlyOnce() {
        val gate = NavigationSoundGate()
        assertTrue(gate.shouldPlay(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_CENTER, 0, repeatCount = 0))
        assertFalse(gate.shouldPlay(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_CENTER, 500, repeatCount = 1))
    }

    @Test
    fun selectOnlyModeSilencesDirectionalKeys() {
        val gate = NavigationSoundGate()
        assertFalse(gate.shouldPlay(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_LEFT, 0, selectOnly))
        assertTrue(gate.shouldPlay(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_CENTER, 10, selectOnly))
        assertFalse(gate.shouldPlay(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_CENTER, 20, NavigationSoundMode.OFF))
    }

    @Test
    fun selectKeyDoesNotConsumeTheNavigationRateLimit() {
        val gate = NavigationSoundGate()
        assertTrue(gate.shouldPlay(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_UP, 100))
        assertTrue(gate.shouldPlay(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_CENTER, 110))
        assertFalse(gate.shouldPlay(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_DOWN, 150))
        assertTrue(gate.shouldPlay(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_DOWN, 180))
    }

    @Test
    fun rapidRepeatIsLimitedWithoutDiscardingLaterMovement() {
        val gate = NavigationSoundGate()
        assertTrue(gate.shouldPlay(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_UP, 100))
        assertFalse(gate.shouldPlay(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_DOWN, 179))
        assertTrue(gate.shouldPlay(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_LEFT, 180))
        assertTrue(gate.shouldPlay(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_RIGHT, 260))
    }
}
