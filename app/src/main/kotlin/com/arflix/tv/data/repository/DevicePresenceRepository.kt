package com.arflix.tv.data.repository

import android.app.Activity
import android.app.Application
import android.os.Bundle
import com.arflix.tv.BuildConfig
import com.arflix.tv.util.AppLogger
import com.arflix.tv.util.Constants
import com.arflix.tv.util.detectPhysicalDeviceType
import com.arflix.tv.util.getOrCreateInstallationId
import dagger.hilt.android.qualifiers.ApplicationContext
import android.content.Context
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.ensureActive
import kotlin.coroutines.coroutineContext
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Response
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DevicePresenceRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    okHttpClient: OkHttpClient,
    private val authRepository: AuthRepository,
    private val profileManager: ProfileManager
) : Application.ActivityLifecycleCallbacks {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val client = okHttpClient.newBuilder().callTimeout(10, TimeUnit.SECONDS).build()
    private var startedActivities = 0
    private var heartbeatJob: Job? = null

    override fun onActivityStarted(activity: Activity) {
        startedActivities += 1
        if (startedActivities != 1 || !Constants.CLOUD_SYNC_ENABLED) return
        heartbeatJob = scope.launch {
            runPresenceHeartbeats(authRepository.authState) {
                try {
                    sendHeartbeat()
                } catch (error: CancellationException) {
                    throw error
                } catch (error: Exception) {
                    AppLogger.w("DevicePresence", "Live device heartbeat failed", error)
                }
            }
        }
    }

    private suspend fun sendHeartbeat() {
        val accountId = authRepository.getCurrentUserId() ?: return
        val token = authRepository.getAccessToken() ?: return
        if (authRepository.getCurrentUserId() != accountId) return
        val installId = context.getOrCreateInstallationId()
        val profileId = profileManager.getProfileIdSync().takeIf { it.isNotBlank() }
        val body = JSONObject()
            .put("install_id", installId)
            .put("profile_id", profileId ?: JSONObject.NULL)
            .put("platform", "android")
            .put("device_type", detectPhysicalDeviceType(context).name.lowercase())
            .put("app_version", BuildConfig.VERSION_NAME)
            .put("app_version_code", BuildConfig.VERSION_CODE)
            .put("distribution", if (BuildConfig.SELF_UPDATE_ENABLED) "sideload" else "play")
        val request = Request.Builder()
            .url("${Constants.CLOUD_BACKEND_URL}/device-presence")
            .header("Authorization", "Bearer $token")
            .header("Cache-Control", "no-store")
            .post(body.toString().toRequestBody("application/json".toMediaType()))
            .build()
        coroutineContext.ensureActive()
        if (authRepository.getCurrentUserId() != accountId) return
        suspendCancellableCoroutine<Unit> { continuation ->
            val call = client.newCall(request)
            continuation.invokeOnCancellation { call.cancel() }
            call.enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    continuation.resumeWithException(e)
                }

                override fun onResponse(call: Call, response: Response) {
                    response.use {
                        if (it.isSuccessful) continuation.resume(Unit)
                        else continuation.resumeWithException(IOException("Presence heartbeat HTTP ${it.code}"))
                    }
                }
            })
        }
    }

    override fun onActivityStopped(activity: Activity) {
        startedActivities -= 1
        if (startedActivities == 0) {
            heartbeatJob?.cancel()
            heartbeatJob = null
        }
    }

    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) = Unit
    override fun onActivityResumed(activity: Activity) = Unit
    override fun onActivityPaused(activity: Activity) = Unit
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) = Unit
    override fun onActivityDestroyed(activity: Activity) = Unit
}

internal suspend fun runPresenceHeartbeats(
    authState: StateFlow<AuthState>,
    heartbeat: suspend () -> Unit
) {
    authState.collectLatest { auth ->
        if (auth is AuthState.Authenticated) {
            while (coroutineContext.isActive) {
                heartbeat()
                delay(30_000L)
            }
        }
    }
}
