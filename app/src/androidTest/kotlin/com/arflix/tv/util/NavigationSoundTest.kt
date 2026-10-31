package com.arflix.tv.util

import android.view.KeyEvent
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NavigationSoundTest {
    @Test
    fun systemSoundRequestsRespectKeyGateAndClosedLifecycle() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        lateinit var sound: SoundManager
        instrumentation.runOnMainSync { sound = SoundManager(instrumentation.targetContext) }
        try {
            instrumentation.runOnMainSync {
                assertFalse(sound.onKeyEvent(KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_DPAD_RIGHT)))
                assertTrue(sound.onKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_RIGHT)))
                assertFalse(sound.onKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_LEFT)))
                sound.close()
                assertFalse(sound.onKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_UP)))
            }
        } finally {
            instrumentation.runOnMainSync { sound.close() }
        }
    }
}
