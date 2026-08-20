package com.arflix.tv.ui.screens.details.discord

import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

object DiscordRpcManager {
    private const val TAG = "DiscordRpcManager"
    private const val PREFS_NAME = "discord_rpc_prefs"
    private const val KEY_DISCORD_RPC_ENABLED = "discord_rpc_enabled"

    // Default Application ID for ARVIO Discord application
    private const val DISCORD_APPLICATION_ID = 1501197333826637835L

    private val coroutineScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var tickJob: Job? = null
    private var lastUpdateJob: Job? = null
    private var disconnectTimeoutJob: Job? = null

    private var initialized = false
    private var connectionState = ConnectionState.DISCONNECTED
    private lateinit var appContext: Context

    private val _isRpcEnabled = MutableStateFlow(true)
    val isRpcEnabledFlow: StateFlow<Boolean> = _isRpcEnabled.asStateFlow()

    private val _connectionStateFlow = MutableStateFlow(ConnectionState.DISCONNECTED)
    val connectionStateFlow: StateFlow<ConnectionState> = _connectionStateFlow.asStateFlow()

    enum class ConnectionState {
        DISCONNECTED,
        CONNECTING,
        CONNECTED
    }

    private val jniCallback = object : DiscordBridge.Callback {
        override fun onStatusChanged(status: Int, error: Int, errorDetail: Int) {
            Log.i(TAG, "Native JNI Status callback: status=$status, error=$error, detail=$errorDetail")
            when (status) {
                1 -> {
                    connectionState = ConnectionState.CONNECTED
                    _connectionStateFlow.value = ConnectionState.CONNECTED
                    startTickLoop()
                    Log.i(TAG, "Discord RPC Connected.")
                }
                2 -> {
                    connectionState = ConnectionState.CONNECTING
                    _connectionStateFlow.value = ConnectionState.CONNECTING
                }
                else -> {
                    connectionState = ConnectionState.DISCONNECTED
                    _connectionStateFlow.value = ConnectionState.DISCONNECTED
                    stopTickLoop()
                    Log.i(TAG, "Discord RPC Disconnected.")
                }
            }
        }
    }

    fun init(activity: Activity) {
        initInternal(activity, activity.applicationContext)
    }

    fun init(context: Context) {
        initInternal(null, context.applicationContext)
    }

    private fun initInternal(activity: Activity?, context: Context) {
        if (initialized) return
        appContext = context
        initialized = true

        try {
            if (activity != null) {
                com.discord.socialsdk.DiscordSocialSdkInit.setEngineActivity(activity)
            }
        } catch (e: Throwable) {
            Log.w(TAG, "DiscordSocialSdkInit reflection/call fallback: ${e.message}")
        }

        val prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val enabled = prefs.getBoolean(KEY_DISCORD_RPC_ENABLED, true)
        _isRpcEnabled.value = enabled

        // Initialize native bridge with application ID
        DiscordBridge.init(DISCORD_APPLICATION_ID, jniCallback)

        if (enabled && isDiscordInstalled(appContext)) {
            connectInternal()
        }
    }

    fun setRpcEnabled(enabled: Boolean) {
        _isRpcEnabled.value = enabled
        if (::appContext.isInitialized) {
            appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(KEY_DISCORD_RPC_ENABLED, enabled)
                .apply()
        }

        if (enabled) {
            connectInternal()
        } else {
            clearPlayback()
            disconnect()
        }
    }

    fun isDiscordInstalled(context: Context): Boolean {
        return try {
            val pm = context.packageManager
            val knownPackages = listOf("com.discord", "com.discord.canary", "com.discord.ptb")
            knownPackages.any { pkg ->
                try {
                    pm.getPackageInfo(pkg, PackageManager.GET_ACTIVITIES)
                    true
                } catch (e: PackageManager.NameNotFoundException) {
                    false
                }
            }
        } catch (e: Exception) {
            false
        }
    }

    private fun connectInternal() {
        if (!_isRpcEnabled.value) return
        if (connectionState == ConnectionState.CONNECTED || connectionState == ConnectionState.CONNECTING) return

        Log.i(TAG, "Initiating unauthenticated connection to Discord...")
        connectionState = ConnectionState.CONNECTING
        _connectionStateFlow.value = ConnectionState.CONNECTING
        startTickLoop()
        coroutineScope.launch(Dispatchers.IO) {
            try {
                DiscordBridge.connect()
            } catch (e: Exception) {
                Log.e(TAG, "Exception during DiscordBridge.connect", e)
            }
        }
    }

    fun disconnect() {
        stopTickLoop()
        disconnectTimeoutJob?.cancel()
        lastUpdateJob?.cancel()
        connectionState = ConnectionState.DISCONNECTED
        _connectionStateFlow.value = ConnectionState.DISCONNECTED
        try {
            DiscordBridge.disconnect()
        } catch (e: Exception) {
            Log.e(TAG, "Exception during DiscordBridge.disconnect", e)
        }
    }

    fun clearPlayback() {
        lastUpdateJob?.cancel()
        try {
            DiscordBridge.clearActivity()
        } catch (e: Exception) {
            Log.e(TAG, "Exception during DiscordBridge.clearActivity", e)
        }
    }

    fun updatePlayback(
        title: String,
        subtitle: String,
        isPlaying: Boolean,
        progressMs: Long,
        durationMs: Long,
        largeImage: String = ""
    ) {
        if (!initialized || !_isRpcEnabled.value) return

        // Handle pause timeout (disconnect after 1 minute of inactivity)
        handlePauseTimeout(isPlaying)

        // If playing and disconnected, automatically reconnect
        if (isPlaying && connectionState == ConnectionState.DISCONNECTED) {
            connectInternal()
        }

        lastUpdateJob?.cancel()
        lastUpdateJob = coroutineScope.launch {
            delay(350) // Debounce duration to prevent bridge flooding

            if (!_isRpcEnabled.value) return@launch

            if (!isPlaying) {
                Log.i(TAG, "Playback is paused/stopped. Clearing Discord Rich Presence activity.")
                DiscordBridge.clearActivity()
                return@launch
            }

            val startTime = if (progressMs >= 0) System.currentTimeMillis() - progressMs else 0L

            val safeTitle = title.trim().ifBlank { "ARVIO" }
            val safeSubtitle = subtitle.trim()

            Log.i(TAG, "Sending update to Discord JNI: Details='$safeTitle', State='$safeSubtitle', startTime=${startTime / 1000}, largeImage='$largeImage'")
            try {
                DiscordBridge.updateActivity(
                    details = safeTitle,
                    state = safeSubtitle,
                    startTime = startTime / 1000,
                    endTime = 0L,
                    largeImage = largeImage,
                    largeText = "ARVIO"
                )
            } catch (e: Exception) {
                Log.e(TAG, "Failed to update Discord presence", e)
            }
        }
    }

    private fun handlePauseTimeout(isPlaying: Boolean) {
        disconnectTimeoutJob?.cancel()
        if (!isPlaying && connectionState == ConnectionState.CONNECTED) {
            disconnectTimeoutJob = coroutineScope.launch {
                delay(60000) // 1 minute pause timeout
                Log.i(TAG, "Pause timeout reached. Disconnecting Discord RPC.")
                disconnect()
            }
        }
    }

    private fun startTickLoop() {
        tickJob?.cancel()
        tickJob = coroutineScope.launch(Dispatchers.Default) {
            while (isActive) {
                try {
                    DiscordBridge.tick()
                } catch (e: Exception) {
                    // Ignore tick exceptions
                }
                delay(500) // Call JNI execution loop tick every 500ms
            }
        }
    }

    private fun stopTickLoop() {
        tickJob?.cancel()
        tickJob = null
    }
}
