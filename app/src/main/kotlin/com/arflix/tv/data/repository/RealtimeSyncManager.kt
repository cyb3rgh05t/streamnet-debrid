package com.arflix.tv.data.repository

import android.content.Context
import android.util.Log
import com.arflix.tv.BuildConfig
import com.arflix.tv.util.Constants
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import org.json.JSONObject
import java.net.URLEncoder
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import javax.inject.Inject
import javax.inject.Singleton

/** Cloud sync connection status for the UI indicator. */
enum class CloudSyncStatus { CONNECTED, RECONNECTING, NOT_SIGNED_IN }

/**
 * Manages an SSE (Server-Sent Events) connection to the self-hosted backend
 * (`/account-sync-events`) to receive instant notifications when account data
 * (Continue Watching, watchlist, settings, catalogs, addons) changes on any device.
 *
 * When an `account_sync_revision` event arrives from the server, this manager:
 * 1. Derives whether the event is newer than local state.
 * 2. Triggers a debounced pull from the cloud.
 * 3. Emits [accountSyncEvents] and [watchHistoryEvents] to update visible UI rails in real-time.
 */
@Singleton
class RealtimeSyncManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val cloudSyncRepository: CloudSyncRepository,
    private val authRepository: AuthRepository
) {
    companion object {
        private const val TAG = "RealtimeSync"
        private const val INITIAL_RECONNECT_DELAY_MS = 3_000L
        private const val MAX_RECONNECT_DELAY_MS = 30_000L
        private const val PERIODIC_SYNC_INTERVAL_MS = 60_000L
        private const val DEBOUNCE_MS = 500L
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val isRunning = AtomicBoolean(false)

    private val sseClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .readTimeout(0, TimeUnit.MILLISECONDS) // Indefinite read timeout for SSE stream
            .connectTimeout(15, TimeUnit.SECONDS)
            .build()
    }

    private var sseJob: Job? = null
    private var periodicSyncJob: Job? = null
    private var reconnectJob: Job? = null
    private var pendingPullJob: Job? = null

    @Volatile
    private var activeSseResponse: Response? = null

    private var currentReconnectDelay = INITIAL_RECONNECT_DELAY_MS

    @Volatile
    private var lastPushTimestamp = 0L
    @Volatile
    private var lastLocalWatchHistoryWriteTimestamp = 0L

    // Event stream for watch_history realtime notifications
    private val _watchHistoryEvents = MutableSharedFlow<Unit>(extraBufferCapacity = 4)
    val watchHistoryEvents: SharedFlow<Unit> = _watchHistoryEvents.asSharedFlow()

    // Event stream for account_sync realtime notifications (catalogs, addons, settings changed on another device)
    private val _accountSyncEvents = MutableSharedFlow<Unit>(extraBufferCapacity = 4)
    val accountSyncEvents: SharedFlow<Unit> = _accountSyncEvents.asSharedFlow()

    // Sync status for UI indicator
    private val _syncStatusFlow = MutableStateFlow(CloudSyncStatus.NOT_SIGNED_IN)
    val syncStatusFlow: StateFlow<CloudSyncStatus> = _syncStatusFlow.asStateFlow()

    fun markPush() {
        lastPushTimestamp = System.currentTimeMillis()
    }

    fun markLocalWatchHistoryWrite() {
        lastLocalWatchHistoryWriteTimestamp = System.currentTimeMillis()
    }

    fun start() {
        if (isRunning.getAndSet(true)) return
        Log.i(TAG, "Starting realtime SSE sync")
        connectSseStream()
        if (BuildConfig.ENABLE_PERIODIC_CLOUD_PULL) {
            startPeriodicSync()
        }
    }

    fun stop() {
        if (!isRunning.getAndSet(false)) return
        Log.i(TAG, "Stopping realtime sync")
        sseJob?.cancel()
        sseJob = null
        try {
            activeSseResponse?.close()
        } catch (_: Exception) {}
        activeSseResponse = null
        periodicSyncJob?.cancel()
        reconnectJob?.cancel()
        pendingPullJob?.cancel()
        _syncStatusFlow.value = CloudSyncStatus.NOT_SIGNED_IN
    }

    // ── SSE Stream Connection ──────────────────────────────────────

    private fun connectSseStream() {
        if (!isRunning.get()) return

        _syncStatusFlow.value = CloudSyncStatus.RECONNECTING
        sseJob?.cancel()
        sseJob = scope.launch {
            val userId = authRepository.getCurrentUserIdForSync()
            if (userId.isNullOrBlank()) {
                Log.w(TAG, "Not logged in, skipping SSE connection")
                _syncStatusFlow.value = CloudSyncStatus.NOT_SIGNED_IN
                return@launch
            }
            val accessToken = authRepository.getAccessToken()
            if (accessToken.isNullOrBlank()) {
                Log.w(TAG, "No access token, skipping SSE connection")
                _syncStatusFlow.value = CloudSyncStatus.NOT_SIGNED_IN
                scheduleReconnect()
                return@launch
            }

            val sseUrl = "${Constants.ACCOUNT_SYNC_EVENTS_URL}?token=${java.net.URLEncoder.encode(accessToken, "UTF-8")}"
            val request = Request.Builder()
                .url(sseUrl)
                .header("Accept", "text/event-stream")
                .header("Authorization", "Bearer $accessToken")
                .build()

            try {
                val response = sseClient.newCall(request).execute()
                activeSseResponse = response
                if (!response.isSuccessful) {
                    Log.w(TAG, "SSE connection rejected status=${response.code}")
                    response.close()
                    activeSseResponse = null
                    _syncStatusFlow.value = CloudSyncStatus.RECONNECTING
                    scheduleReconnect()
                    return@launch
                }

                Log.i(TAG, "SSE connected to self-hosted backend for user=$userId")
                _syncStatusFlow.value = CloudSyncStatus.CONNECTED
                currentReconnectDelay = INITIAL_RECONNECT_DELAY_MS

                val reader = response.body?.byteStream()?.bufferedReader()
                while (isActive && isRunning.get() && reader != null) {
                    val line = reader.readLine() ?: break
                    if (line.startsWith("data:")) {
                        val dataJson = line.removePrefix("data:").trim()
                        handleSseMessage(dataJson)
                    }
                }
            } catch (e: Exception) {
                if (e is CancellationException) throw e
                Log.w(TAG, "SSE stream error: ${e.message}")
            } finally {
                try {
                    activeSseResponse?.close()
                } catch (_: Exception) {}
                activeSseResponse = null
                if (isRunning.get()) {
                    _syncStatusFlow.value = CloudSyncStatus.RECONNECTING
                    scheduleReconnect()
                }
            }
        }
    }

    private fun handleSseMessage(jsonText: String) {
        if (jsonText.isBlank()) return
        try {
            val obj = JSONObject(jsonText)
            val type = obj.optString("type", "")
            if (type == "account_sync_revision") {
                val revision = obj.optInt("revision", 0)
                val sourceDeviceId = obj.optString("sourceDeviceId", "")
                Log.i(TAG, "Received account_sync_revision=$revision sourceDeviceId=$sourceDeviceId")
                debouncedPull()
            }
        } catch (e: Exception) {
            if (e is CancellationException) throw e
            Log.w(TAG, "Failed to parse SSE message: ${e.message}")
        }
    }

    private fun debouncedPull() {
        if (System.currentTimeMillis() - lastPushTimestamp < 2_000L) {
            Log.d(TAG, "Skipping pull - recent push detected")
            return
        }

        pendingPullJob?.cancel()
        pendingPullJob = scope.launch {
            delay(DEBOUNCE_MS)
            Log.i(TAG, "Pulling cloud state after realtime notification")
            try {
                val result = cloudSyncRepository.pullFromCloud()
                if (result == CloudSyncRepository.RestoreResult.RESTORED) {
                    _accountSyncEvents.tryEmit(Unit)
                    _watchHistoryEvents.tryEmit(Unit)
                }
            } catch (e: retrofit2.HttpException) {
                Log.w(TAG, "Realtime pull failed (HTTP): ${e.message}")
            } catch (e: java.io.IOException) {
                Log.w(TAG, "Realtime pull failed (Network): ${e.message}")
            } catch (e: Exception) {
                if (e is CancellationException) throw e
                Log.w(TAG, "Realtime pull failed: ${e.message}")
            }
        }
    }

    // ── Reconnect with exponential backoff ──────────────────────────

    private fun scheduleReconnect() {
        reconnectJob?.cancel()
        reconnectJob = scope.launch {
            delay(currentReconnectDelay)
            currentReconnectDelay = (currentReconnectDelay * 2).coerceAtMost(MAX_RECONNECT_DELAY_MS)
            if (isRunning.get()) {
                Log.i(TAG, "Reconnecting SSE (backoff: ${currentReconnectDelay / 1000}s)...")
                connectSseStream()
            }
        }
    }

    // ── Periodic Fallback Sync ──────────────────────────────────────

    private fun startPeriodicSync() {
        periodicSyncJob?.cancel()
        periodicSyncJob = scope.launch {
            while (isActive && isRunning.get()) {
                delay(PERIODIC_SYNC_INTERVAL_MS)
                if (!isRunning.get()) break
                if (cloudSyncRepository.isPushDirty) {
                    Log.i(TAG, "Periodic sync: retrying dirty push")
                    try {
                        cloudSyncRepository.pushToCloud()
                    } catch (e: retrofit2.HttpException) {
                        Log.w(TAG, "Dirty push retry failed (HTTP): ${e.message}")
                        com.arflix.tv.worker.CloudSyncWorker.enqueueRecovery(context)
                    } catch (e: java.io.IOException) {
                        Log.w(TAG, "Dirty push retry failed (Network): ${e.message}")
                        com.arflix.tv.worker.CloudSyncWorker.enqueueRecovery(context)
                    } catch (e: Exception) {
                        if (e is CancellationException) throw e
                        Log.w(TAG, "Dirty push retry failed: ${e.message}")
                        com.arflix.tv.worker.CloudSyncWorker.enqueueRecovery(context)
                    }
                }
                Log.d(TAG, "Periodic sync tick")
                try {
                    val result = cloudSyncRepository.pullFromCloud()
                    if (result == CloudSyncRepository.RestoreResult.RESTORED) {
                        _accountSyncEvents.tryEmit(Unit)
                        _watchHistoryEvents.tryEmit(Unit)
                    }
                } catch (e: retrofit2.HttpException) {
                    Log.w(TAG, "Periodic sync failed (HTTP): ${e.message}")
                } catch (e: java.io.IOException) {
                    Log.w(TAG, "Periodic sync failed (Network): ${e.message}")
                } catch (e: Exception) {
                    if (e is CancellationException) throw e
                    Log.w(TAG, "Periodic sync failed: ${e.message}")
                }
            }
        }
    }
}
