package com.arflix.tv.ui.screens.details.discord

import android.util.Log
import com.arflix.tv.BuildConfig

object DiscordBridge {
    private const val TAG = "DiscordBridge"
    private var nativeLoaded = false

    init {
        if (BuildConfig.DISCORD_RICH_PRESENCE_AVAILABLE) {
            nativeLoaded = try {
                System.loadLibrary("arvio_native")
                Log.i(TAG, "Successfully loaded arvio_native library.")
                true
            } catch (error: UnsatisfiedLinkError) {
                Log.e(TAG, "Failed to load arvio_native library: ${error.message}")
                false
            }
        }
    }

    val isAvailable: Boolean
        get() = BuildConfig.DISCORD_RICH_PRESENCE_AVAILABLE && nativeLoaded

    interface Callback {
        fun onStatusChanged(status: Int, error: Int, errorDetail: Int)
    }

    fun init(clientId: String, callback: Callback): Boolean {
        if (!isAvailable) return false
        try {
            nativeInit(clientId, callback)
            return true
        } catch (e: UnsatisfiedLinkError) {
            Log.e(TAG, "nativeInit not linked: ${e.message}")
            return false
        }
    }

    fun connect(accessToken: String): Boolean {
        if (!isAvailable) return false
        try {
            nativeConnect(accessToken)
            return true
        } catch (e: UnsatisfiedLinkError) {
            Log.e(TAG, "nativeConnect not linked: ${e.message}")
            return false
        }
    }

    fun updateActivity(
        details: String?,
        state: String?,
        startTime: Long,
        endTime: Long,
        largeImage: String?,
        largeText: String?
    ) {
        if (!isAvailable) return
        try {
            nativeUpdateActivity(details, state, startTime, endTime, largeImage, largeText)
        } catch (e: UnsatisfiedLinkError) {
            Log.e(TAG, "nativeUpdateActivity not linked: ${e.message}")
        }
    }

    fun clearActivity() {
        if (!isAvailable) return
        try {
            nativeClearActivity()
        } catch (e: UnsatisfiedLinkError) {
            Log.e(TAG, "nativeClearActivity not linked: ${e.message}")
        }
    }

    fun disconnect() {
        if (!isAvailable) return
        try {
            nativeDisconnect()
        } catch (e: UnsatisfiedLinkError) {
            Log.e(TAG, "nativeDisconnect not linked: ${e.message}")
        }
    }

    fun tick() {
        if (!isAvailable) return
        try {
            nativeTick()
        } catch (e: UnsatisfiedLinkError) {
            // Silence logs to prevent spamming on local builds
        }
    }

    @JvmStatic
    private external fun nativeInit(clientId: String, callback: Callback)

    @JvmStatic
    private external fun nativeConnect(accessToken: String)

    @JvmStatic
    private external fun nativeUpdateActivity(
        details: String?,
        state: String?,
        startTime: Long,
        endTime: Long,
        largeImage: String?,
        largeText: String?
    )

    @JvmStatic
    private external fun nativeClearActivity()

    @JvmStatic
    private external fun nativeDisconnect()

    @JvmStatic
    private external fun nativeTick()
}
