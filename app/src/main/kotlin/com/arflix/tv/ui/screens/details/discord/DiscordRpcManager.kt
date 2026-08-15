package com.arflix.tv.ui.screens.details.discord

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Base64
import android.util.Log
import kotlinx.coroutines.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.security.SecureRandom

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

object DiscordRpcManager {
    private const val TAG = "DiscordRpcManager"
    private const val PREFS_NAME = "discord_rpc_prefs"
    private const val KEY_ACCESS_TOKEN = "access_token"
    private const val KEY_CODE_VERIFIER = "code_verifier"
    private const val KEY_USERNAME = "username"

    // Default Client ID for ARVIO Discord application
    private const val DISCORD_CLIENT_ID = "1501197333826637835"

    private val coroutineScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var tickJob: Job? = null
    private var lastUpdateJob: Job? = null
    private var disconnectTimeoutJob: Job? = null

    private var initialized = false
    private var connectionState = ConnectionState.DISCONNECTED
    private var currentAccessToken: String? = null
    private lateinit var appContext: Context

    private val _isLoggedIn = MutableStateFlow(false)
    val isLoggedInFlow: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    private val _username = MutableStateFlow<String?>(null)
    val usernameFlow: StateFlow<String?> = _username.asStateFlow()

    enum class ConnectionState {
        DISCONNECTED,
        CONNECTING,
        CONNECTED
    }

    private val jniCallback = object : DiscordBridge.Callback {
        override fun onStatusChanged(status: Int, error: Int, errorDetail: Int) {
            Log.i(TAG, "Native JNI Status callback received: status=$status, error=$error, detail=$errorDetail")
            // 0 = Disconnected, 1 = Connected, 2 = Connecting/Authorizing
            when (status) {
                1 -> {
                    connectionState = ConnectionState.CONNECTED
                    startTickLoop()
                    Log.i(TAG, "Discord RPC Connected successfully.")
                }
                0 -> {
                    connectionState = ConnectionState.DISCONNECTED
                    stopTickLoop()
                    Log.i(TAG, "Discord RPC Disconnected.")
                    
                    if (errorDetail == 4004) {
                        Log.e(TAG, "Discord token authentication failed (4004). Logging out.")
                        logout()
                    }
                }
            }
        }
    }

    fun init(context: Context) {
        if (initialized) return
        appContext = context.applicationContext
        initialized = true

        val prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        currentAccessToken = prefs.getString(KEY_ACCESS_TOKEN, null)
        _username.value = prefs.getString(KEY_USERNAME, null)
        _isLoggedIn.value = currentAccessToken != null

        // Initialize JNI bridge C++ client
        DiscordBridge.init(DISCORD_CLIENT_ID, jniCallback)

        if (currentAccessToken != null) {
            connectInternal(currentAccessToken!!)
            if (_username.value == null) {
                coroutineScope.launch {
                    val user = fetchUserProfile(currentAccessToken!!)
                    if (user != null) {
                        prefs.edit().putString(KEY_USERNAME, user).apply()
                        _username.value = user
                    }
                }
            }
        }
    }

    fun login(context: Context) {
        coroutineScope.launch {
            try {
                val verifier = PkceUtil.generateCodeVerifier()
                appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                    .edit()
                    .putString(KEY_CODE_VERIFIER, verifier)
                    .apply()

                val challenge = PkceUtil.generateCodeChallenge(verifier)
                val authorizeUrl = Uri.parse("https://discord.com/api/oauth2/authorize")
                    .buildUpon()
                    .appendQueryParameter("client_id", DISCORD_CLIENT_ID)
                    .appendQueryParameter("response_type", "code")
                    .appendQueryParameter("redirect_uri", "arvio://discord/auth")
                    .appendQueryParameter("scope", "identify sdk.social_layer_presence")
                    .appendQueryParameter("code_challenge", challenge)
                    .appendQueryParameter("code_challenge_method", "S256")
                    .build()

                val pm = context.packageManager

                // Option 1: Try launching directly into Discord App package
                val discordAppIntent = Intent(Intent.ACTION_VIEW, authorizeUrl).apply {
                    setPackage("com.discord")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }

                if (discordAppIntent.resolveActivity(pm) != null) {
                    Log.i(TAG, "Launching Discord auth flow in Discord App: $authorizeUrl")
                    context.startActivity(discordAppIntent)
                    return@launch
                }

                // Option 2: Try discord:// custom scheme
                val discordSchemeUrl = Uri.parse("discord://action/oauth2/authorize")
                    .buildUpon()
                    .appendQueryParameter("client_id", DISCORD_CLIENT_ID)
                    .appendQueryParameter("response_type", "code")
                    .appendQueryParameter("redirect_uri", "arvio://discord/auth")
                    .appendQueryParameter("scope", "identify sdk.social_layer_presence")
                    .appendQueryParameter("code_challenge", challenge)
                    .appendQueryParameter("code_challenge_method", "S256")
                    .build()

                val schemeIntent = Intent(Intent.ACTION_VIEW, discordSchemeUrl).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }

                if (schemeIntent.resolveActivity(pm) != null) {
                    Log.i(TAG, "Launching Discord auth flow via discord:// scheme: $discordSchemeUrl")
                    context.startActivity(schemeIntent)
                    return@launch
                }

                // Option 3: Fallback to System Browser
                Log.i(TAG, "Discord App not resolved. Fallback to browser auth: $authorizeUrl")
                val browserIntent = Intent(Intent.ACTION_VIEW, authorizeUrl).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(browserIntent)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start Discord authentication flow", e)
            }
        }
    }

    fun onLoginDeepLink(uri: Uri) {
        Log.i(TAG, "onLoginDeepLink received redirect URI: $uri")
        val error = uri.getQueryParameter("error")
        val errorDesc = uri.getQueryParameter("error_description")
        if (error != null) {
            Log.e(TAG, "Discord authorization returned error: $error ($errorDesc)")
            return
        }

        val code = uri.getQueryParameter("code")
        if (code == null) {
            Log.e(TAG, "Login deep-link received but code parameter is missing.")
            return
        }

        coroutineScope.launch {
            val prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val verifier = prefs.getString(KEY_CODE_VERIFIER, null)
            if (verifier == null) {
                Log.e(TAG, "No cached code_verifier found for token exchange.")
                return@launch
            }

            Log.i(TAG, "Exchanging code for access token...")
            val token = exchangeCodeForToken(code, verifier)
            if (token != null) {
                Log.i(TAG, "Successfully acquired access token.")
                prefs.edit()
                    .putString(KEY_ACCESS_TOKEN, token)
                    .remove(KEY_CODE_VERIFIER)
                    .apply()
                currentAccessToken = token
                _isLoggedIn.value = true
                
                val username = fetchUserProfile(token)
                if (username != null) {
                    prefs.edit().putString(KEY_USERNAME, username).apply()
                    _username.value = username
                }

                connectInternal(token)
            } else {
                Log.e(TAG, "Token exchange failed.")
            }
        }
    }

    private fun connectInternal(token: String) {
        Log.i(TAG, "connectInternal: initiating connection using access token.")
        connectionState = ConnectionState.CONNECTING
        startTickLoop()
        coroutineScope.launch(Dispatchers.IO) {
            try {
                Log.d(TAG, "Calling native Discord JNI Connect...")
                DiscordBridge.connect(token)
                Log.d(TAG, "Finished calling native JNI Connect.")
            } catch (e: Exception) {
                Log.e(TAG, "Exception during native connection connectInternal", e)
            }
        }
    }

    fun disconnect() {
        stopTickLoop()
        disconnectTimeoutJob?.cancel()
        lastUpdateJob?.cancel()
        connectionState = ConnectionState.DISCONNECTED
        DiscordBridge.disconnect()
    }

    fun isLoggedIn(): Boolean {
        return currentAccessToken != null
    }

    fun logout() {
        disconnect()
        currentAccessToken = null
        _isLoggedIn.value = false
        _username.value = null
        if (::appContext.isInitialized) {
            appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .remove(KEY_ACCESS_TOKEN)
                .remove(KEY_USERNAME)
                .apply()
        }
    }

    private suspend fun fetchUserProfile(token: String): String? = withContext(Dispatchers.IO) {
        try {
            val url = URL("https://discord.com/api/v10/users/@me")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.setRequestProperty("Authorization", "Bearer $token")
            if (conn.responseCode == 200) {
                val response = conn.inputStream.bufferedReader().readText()
                val json = JSONObject(response)
                val globalName = json.optString("global_name", "").takeIf { it.isNotBlank() }
                val username = json.optString("username", "")
                return@withContext globalName ?: username
            } else {
                Log.e(TAG, "fetchUserProfile failed status: ${conn.responseCode}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to fetch Discord user profile", e)
        }
        return@withContext null
    }

    fun updatePlayback(
        title: String,
        subtitle: String,
        isPlaying: Boolean,
        progressMs: Long,
        durationMs: Long,
        largeImage: String = ""
    ) {
        if (!initialized) return

        // Handle pause timeout (disconnect after 1 minute of inactivity)
        handlePauseTimeout(isPlaying)

        // If playing and disconnected, automatically reconnect
        if (isPlaying && connectionState == ConnectionState.DISCONNECTED && currentAccessToken != null) {
            connectInternal(currentAccessToken!!)
        }

        lastUpdateJob?.cancel()
        lastUpdateJob = coroutineScope.launch {
            delay(350) // Debounce duration to prevent bridge flooding

            if (connectionState != ConnectionState.CONNECTED) return@launch

            if (!isPlaying) {
                Log.i(TAG, "Playback is paused. Clearing Discord Rich Presence activity.")
                DiscordBridge.clearActivity()
                return@launch
            }

            val formattedState = when {
                subtitle.isNotBlank() -> subtitle
                else -> ""
            }

            val startTime = if (progressMs >= 0) System.currentTimeMillis() - progressMs else 0L

            Log.i(TAG, "Sending update to Discord JNI: Details='$title', State='$formattedState', startTime=${startTime / 1000}, largeImage='$largeImage'")
            DiscordBridge.updateActivity(
                details = title,
                state = formattedState,
                startTime = startTime / 1000,
                endTime = 0L,
                largeImage = largeImage,
                largeText = "ARVIO"
            )
        }
    }

    private fun formatProgressTime(ms: Long): String {
        if (ms <= 0) return "0:00"
        val totalSeconds = ms / 1000
        val hours = totalSeconds / 3600
        val minutes = (totalSeconds % 3600) / 60
        val seconds = totalSeconds % 60
        return if (hours > 0) {
            String.format("%d:%02d:%02d", hours, minutes, seconds)
        } else {
            String.format("%d:%02d", minutes, seconds)
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
                DiscordBridge.tick()
                delay(500) // Call JNI execution loop tick every 500ms
            }
        }
    }

    private fun stopTickLoop() {
        tickJob?.cancel()
        tickJob = null
    }

    private suspend fun exchangeCodeForToken(code: String, verifier: String): String? =
        withContext(Dispatchers.IO) {
            try {
                val url = URL("https://discord.com/api/oauth2/token")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded")

                val params = "client_id=$DISCORD_CLIENT_ID" +
                        "&grant_type=authorization_code" +
                        "&code=$code" +
                        "&redirect_uri=arvio%3A%2F%2Fdiscord%2Fauth" +
                        "&code_verifier=$verifier"

                conn.outputStream.use { os ->
                    os.write(params.toByteArray(Charsets.UTF_8))
                }

                if (conn.responseCode == 200) {
                    val response = conn.inputStream.bufferedReader().readText()
                    val json = JSONObject(response)
                    return@withContext json.getString("access_token")
                } else {
                    val errorResp = conn.errorStream?.bufferedReader()?.readText() ?: ""
                    Log.e(TAG, "Token exchange failed status: ${conn.responseCode}, body: $errorResp")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Exception during token exchange", e)
            }
            return@withContext null
        }

    /* PKCE Cryptographic utilities */
    private object PkceUtil {
        fun generateCodeVerifier(): String {
            val sr = SecureRandom()
            val code = ByteArray(64)
            sr.nextBytes(code)
            return Base64.encodeToString(code, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
        }

        fun generateCodeChallenge(verifier: String): String {
            val bytes = verifier.toByteArray(Charsets.US_ASCII)
            val md = MessageDigest.getInstance("SHA-256")
            val digest = md.digest(bytes)
            return Base64.encodeToString(digest, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
        }
    }
}
