package com.arflix.tv.util

import android.content.Context
import android.media.AudioManager
import android.os.SystemClock
import android.view.KeyEvent
import androidx.datastore.preferences.core.booleanPreferencesKey
import java.io.Closeable

val TV_NAVIGATION_SOUND_KEY = booleanPreferencesKey("tv_navigation_sound")

internal fun isNavigationSoundAllowed(
    isTv: Boolean,
    enabled: Boolean,
    route: String?,
    isFullscreen: Boolean,
): Boolean = isTv && enabled && route != null && !route.contains("player") && !isFullscreen

internal class NavigationSoundGate {
    private var lastPlayedAt: Long? = null

    fun shouldPlay(action: Int, keyCode: Int, nowMs: Long): Boolean {
        if (action != KeyEvent.ACTION_DOWN || keyCode !in directionalKeys) return false
        val previous = lastPlayedAt
        if (previous != null && nowMs - previous < 80L) return false
        lastPlayedAt = nowMs
        return true
    }

    private companion object {
        val directionalKeys = setOf(
            KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_DPAD_DOWN,
            KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT,
        )
    }
}

internal class SoundManager(context: Context) : Closeable {
    private val gate = NavigationSoundGate()
    private var closed = false
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    fun onKeyEvent(event: KeyEvent): Boolean {
        if (closed || !gate.shouldPlay(event.action, event.keyCode, SystemClock.uptimeMillis())) return false
        val effect = when (event.keyCode) {
            KeyEvent.KEYCODE_DPAD_UP -> AudioManager.FX_FOCUS_NAVIGATION_UP
            KeyEvent.KEYCODE_DPAD_DOWN -> AudioManager.FX_FOCUS_NAVIGATION_DOWN
            KeyEvent.KEYCODE_DPAD_LEFT -> AudioManager.FX_FOCUS_NAVIGATION_LEFT
            else -> AudioManager.FX_FOCUS_NAVIGATION_RIGHT
        }
        audioManager.playSoundEffect(effect)
        return true
    }

    override fun close() {
        if (closed) return
        closed = true
    }
}
