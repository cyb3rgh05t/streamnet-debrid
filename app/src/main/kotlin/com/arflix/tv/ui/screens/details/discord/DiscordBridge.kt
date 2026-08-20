package com.arflix.tv.ui.screens.details.discord

import android.util.Log

object DiscordBridge {
    private const val TAG = "DiscordBridge"

    init {
        try {
            System.loadLibrary("arvio_native")
            Log.i(TAG, "Successfully loaded arvio_native library.")
        } catch (e: UnsatisfiedLinkError) {
            Log.e(TAG, "Failed to load arvio_native library: ${e.message}")
        }
    }

    interface Callback {
        fun onStatusChanged(status: Int, error: Int, errorDetail: Int)
    }

    fun init(applicationId: Long, callback: Callback) {
        try {
            nativeInit(applicationId, callback)
        } catch (e: UnsatisfiedLinkError) {
            Log.e(TAG, "nativeInit not linked: ${e.message}")
        }
    }

    fun connect() {
        try {
            nativeConnect()
        } catch (e: UnsatisfiedLinkError) {
            Log.e(TAG, "nativeConnect not linked: ${e.message}")
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
        try {
            nativeUpdateActivity(details, state, startTime, endTime, largeImage, largeText)
        } catch (e: UnsatisfiedLinkError) {
            Log.e(TAG, "nativeUpdateActivity not linked: ${e.message}")
        }
    }

    fun clearActivity() {
        try {
            nativeClearActivity()
        } catch (e: UnsatisfiedLinkError) {
            Log.e(TAG, "nativeClearActivity not linked: ${e.message}")
        }
    }

    fun disconnect() {
        try {
            nativeDisconnect()
        } catch (e: UnsatisfiedLinkError) {
            Log.e(TAG, "nativeDisconnect not linked: ${e.message}")
        }
    }

    fun tick() {
        try {
            nativeTick()
        } catch (e: UnsatisfiedLinkError) {
            // Silence logs to prevent spamming
        }
    }

    @JvmStatic
    private external fun nativeInit(applicationId: Long, callback: Callback)

    @JvmStatic
    private external fun nativeConnect()

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
