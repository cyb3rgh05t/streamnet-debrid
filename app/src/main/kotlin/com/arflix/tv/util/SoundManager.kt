package com.arflix.tv.util

import android.content.Context
import android.media.AudioManager
import android.os.SystemClock
import android.view.KeyEvent
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.datastore.preferences.core.booleanPreferencesKey
import java.io.Closeable

val TV_NAVIGATION_SOUND_KEY = booleanPreferencesKey("tv_navigation_sound")

// Der Player setzt dies, solange ein Menü (Quellen, Untertitel, Schnelleinstellungen) offen ist.
val LocalNavigationSoundOverlay = staticCompositionLocalOf<MutableState<Boolean>?> { null }

internal enum class NavigationSoundMode { OFF, SELECT_ONLY, ALL }

// Im Vollbild-Player klickt nur OK (Seek mit Links/Rechts wäre sonst laut); offene Menüs klingen wie überall.
internal fun navigationSoundMode(
    isTv: Boolean,
    enabled: Boolean,
    route: String?,
    isFullscreen: Boolean,
    overlayOpen: Boolean = false,
): NavigationSoundMode = when {
    !isTv || !enabled || route == null -> NavigationSoundMode.OFF
    route.contains("player") || isFullscreen ->
        if (overlayOpen) NavigationSoundMode.ALL else NavigationSoundMode.SELECT_ONLY
    else -> NavigationSoundMode.ALL
}

internal class NavigationSoundGate {
    private var lastPlayedAt: Long? = null

    fun shouldPlay(
        action: Int,
        keyCode: Int,
        nowMs: Long,
        mode: NavigationSoundMode = NavigationSoundMode.ALL,
        repeatCount: Int = 0,
    ): Boolean {
        if (action != KeyEvent.ACTION_DOWN || mode == NavigationSoundMode.OFF) return false
        if (keyCode in selectKeys) return repeatCount == 0
        if (keyCode !in directionalKeys || mode != NavigationSoundMode.ALL) return false
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
        val selectKeys = setOf(
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_NUMPAD_ENTER,
        )
    }
}

internal class SoundManager(context: Context) : Closeable {
    private val gate = NavigationSoundGate()
    private var closed = false
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    fun onKeyEvent(event: KeyEvent, mode: NavigationSoundMode = NavigationSoundMode.ALL): Boolean {
        if (closed || !gate.shouldPlay(event.action, event.keyCode, SystemClock.uptimeMillis(), mode, event.repeatCount)) {
            return false
        }
        val effect = when (event.keyCode) {
            KeyEvent.KEYCODE_DPAD_UP -> AudioManager.FX_FOCUS_NAVIGATION_UP
            KeyEvent.KEYCODE_DPAD_DOWN -> AudioManager.FX_FOCUS_NAVIGATION_DOWN
            KeyEvent.KEYCODE_DPAD_LEFT -> AudioManager.FX_FOCUS_NAVIGATION_LEFT
            KeyEvent.KEYCODE_DPAD_RIGHT -> AudioManager.FX_FOCUS_NAVIGATION_RIGHT
            else -> AudioManager.FX_KEY_CLICK
        }
        audioManager.playSoundEffect(effect)
        return true
    }

    override fun close() {
        if (closed) return
        closed = true
    }
}
