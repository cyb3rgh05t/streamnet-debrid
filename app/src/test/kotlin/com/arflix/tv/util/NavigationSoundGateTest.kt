package com.arflix.tv.util

import android.view.KeyEvent
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NavigationSoundGateTest {
    @Test
    fun navigationSoundIsExcludedFromTouchDisabledSettingsAndPlayers() {
        assertTrue(isNavigationSoundAllowed(true, true, "home", false))
        assertTrue(isNavigationSoundAllowed(true, true, "details/movie/1", false))
        assertFalse(isNavigationSoundAllowed(false, true, "home", false))
        assertFalse(isNavigationSoundAllowed(true, false, "home", false))
        assertFalse(isNavigationSoundAllowed(true, true, "player/movie/1", false))
        assertFalse(isNavigationSoundAllowed(true, true, "tv", true))
        assertFalse(isNavigationSoundAllowed(true, true, null, false))
    }

    @Test
    fun onlyDirectionalKeyDownsPlay() {
        val gate = NavigationSoundGate()
        assertFalse(gate.shouldPlay(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_DPAD_RIGHT, 0))
        assertFalse(gate.shouldPlay(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_CENTER, 0))
        assertFalse(gate.shouldPlay(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_BACK, 0))
        assertTrue(gate.shouldPlay(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_RIGHT, 0))
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
