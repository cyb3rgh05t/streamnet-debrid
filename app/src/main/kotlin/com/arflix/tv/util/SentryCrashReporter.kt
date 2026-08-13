package com.arflix.tv.util

import android.content.Context
import com.arflix.tv.BuildConfig
import io.sentry.Breadcrumb
import io.sentry.Sentry
import io.sentry.SentryLevel
import io.sentry.android.core.SentryAndroid
import io.sentry.protocol.User
import java.util.UUID
import java.util.concurrent.atomic.AtomicInteger

/**
 * Sentry implementation of [AppLogger.CrashContextProvider].
 *
 * The SDK only starts when crash reporting is enabled for the variant and
 * SENTRY_DSN is set to a real Sentry DSN in secrets.properties.
 */
data object SentryCrashReporter : AppLogger.CrashContextProvider {
    private const val DISABLED_DSN = "disabled"
    private const val SAMPLING_PREFS = "arvio_sentry_sampling"
    private const val INSTALLATION_SEED_KEY = "installation_seed"
    private const val HANDLED_SAMPLE_PERMILLE = 50 // 5% of installations per signature.
    private const val ANR_SAMPLE_PERMILLE = 100 // Keep a larger representative ANR sample.
    private const val HANDLED_COOLDOWN_MS = 7L * 24L * 60L * 60L * 1_000L
    private const val ANR_COOLDOWN_MS = 24L * 60L * 60L * 1_000L
    private const val MAX_HANDLED_PER_PROCESS = 1
    private const val MAX_ANR_PER_PROCESS = 1

    private val samplingLock = Any()
    private val handledSentThisProcess = AtomicInteger(0)
    private val anrSentThisProcess = AtomicInteger(0)
    private val acceptedFingerprints = mutableSetOf<String>()
    private var isInitialized = false

    fun initialize(context: Context): Boolean {
        val dsn = BuildConfig.SENTRY_DSN.trim()
        if (!BuildConfig.ENABLE_CRASH_REPORTING || dsn.isBlank() || dsn == DISABLED_DSN) {
            isInitialized = false
            AppLogger.init(null)
            return false
        }

        return runCatching {
            SentryAndroid.init(context) { options ->
                options.setDsn(dsn)
                options.setRelease("${BuildConfig.APPLICATION_ID}@${BuildConfig.VERSION_NAME}+${BuildConfig.VERSION_CODE}")
                options.setDist(BuildConfig.VERSION_CODE.toString())
                options.setEnvironment(BuildConfig.BUILD_TYPE)
                options.setDebug(BuildConfig.DEBUG)
                options.setSendDefaultPii(false)
                options.setAttachScreenshot(false)
                options.setAttachViewHierarchy(false)
                options.setEnableActivityLifecycleBreadcrumbs(true)
                options.setEnableAppLifecycleBreadcrumbs(true)
                options.setEnableSystemEventBreadcrumbs(false)
                options.setEnableNetworkEventBreadcrumbs(false)
                options.setEnableUserInteractionBreadcrumbs(false)
                options.setMaxBreadcrumbs(50)
                options.setSampleRate(1.0)
                options.setTracesSampleRate(0.0)
                options.setProfilesSampleRate(0.0)
                options.setProfileSessionSampleRate(0.0)
                options.setEnableAutoActivityLifecycleTracing(false)
                options.setEnableUserInteractionTracing(false)
                options.setEnableTimeToFullDisplayTracing(false)
                options.setEnableDatabaseTransactionTracing(false)
                options.setEnableCacheTracing(false)
                options.setEnableFramesTracking(false)
                options.setEnableAppStartProfiling(false)
                options.setAnrProfilingSampleRate(0.0)
                options.setReportHistoricalAnrs(false)
                options.setAttachAnrThreadDump(false)
                options.getSessionReplay().setSessionSampleRate(0.0)
                options.getSessionReplay().setOnErrorSampleRate(0.0)
                options.getLogs().setEnabled(false)
                options.getMetrics().setEnabled(false)
                options.setBeforeSend { event, _ ->
                    val isCrashed = event.isCrashed || event.level == SentryLevel.FATAL
                    if (!CrashReportFilter.shouldSendSentryEvent(event.throwable, event.level, isCrashed)) {
                        return@setBeforeSend null
                    }
                    if (!isCrashed) {
                        val throwable = event.throwable ?: return@setBeforeSend null
                        if (!shouldSendHandledEvent(context, throwable)) return@setBeforeSend null
                        val fingerprint = CrashReportFilter.handledEventFingerprint(throwable)
                        event.setFingerprints(listOf("arvio-handled", fingerprint))
                        event.setTag("arvio_event_kind", if (CrashReportFilter.isAnr(throwable)) "anr" else "handled_sample")
                    } else {
                        event.setTag("arvio_event_kind", "crash")
                    }
                    runCatching {
                        val prefs = context.getSharedPreferences("arvio_crash_store", Context.MODE_PRIVATE)
                        val eventId = event.eventId.toString()
                        val throwable = event.throwable
                        val msg = if (throwable != null) {
                            "${throwable::class.java.simpleName}: ${throwable.message?.take(200) ?: ""}"
                        } else {
                            event.message?.formatted ?: "Crash event"
                        }
                        val editor = prefs.edit()
                            .putString("last_crash_id", eventId)
                            .putString("last_crash_msg", msg)
                            .putLong("last_crash_time", System.currentTimeMillis())
                            .putString("last_crash_version", "${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})")
                        if (event.isCrashed == true || event.level == SentryLevel.FATAL) {
                            editor.putBoolean("has_pending_crash_report", true)
                        }
                        editor.commit()
                    }
                    event.setUser(null)
                    event.setServerName(null)
                    event.setRequest(null)
                    event
                }
            }
            isInitialized = true
            AppLogger.init(this)
            true
        }.getOrElse {
            isInitialized = false
            AppLogger.init(null)
            false
        }
    }

    fun disable() {
        isInitialized = false
        runCatching { Sentry.close() }
    }

    override fun setCustomKey(key: String, value: String) {
        if (!isInitialized) return
        Sentry.setTag(key, value)
    }

    override fun setCustomKey(key: String, value: Int) {
        if (!isInitialized) return
        Sentry.setExtra(key, value.toString())
    }

    override fun setCustomKey(key: String, value: Boolean) {
        if (!isInitialized) return
        Sentry.setExtra(key, value.toString())
    }

    override fun log(message: String) {
        if (!isInitialized) return
        val breadcrumb = Breadcrumb().apply {
            setCategory("arvio")
            setType("diagnostic")
            setMessage(message.take(500))
            setLevel(SentryLevel.INFO)
        }
        Sentry.addBreadcrumb(breadcrumb)
    }

    override fun recordException(throwable: Throwable) {
        if (!isInitialized) return
        if (!CrashReportFilter.shouldReportHandledException(throwable)) return
        Sentry.captureException(throwable)
    }

    override fun setUserId(userId: String?) {
        if (!isInitialized) return
        val user = userId?.takeIf { it.isNotBlank() }?.let { id ->
            User().apply {
                setId(id)
                setIpAddress(null)
            }
        }
        Sentry.setUser(user)
    }

    private fun shouldSendHandledEvent(context: Context, throwable: Throwable): Boolean {
        val fingerprint = CrashReportFilter.handledEventFingerprint(throwable)
        val isAnr = CrashReportFilter.isAnr(throwable)
        val prefs = context.getSharedPreferences(SAMPLING_PREFS, Context.MODE_PRIVATE)
        val seed = installationSeed(prefs)
        val samplePermille = if (isAnr) ANR_SAMPLE_PERMILLE else HANDLED_SAMPLE_PERMILLE
        if (!CrashReportFilter.isSelectedForHandledSample(seed, fingerprint, samplePermille)) {
            return false
        }

        synchronized(samplingLock) {
            if (!acceptedFingerprints.add(fingerprint)) return false
            val processCounter = if (isAnr) anrSentThisProcess else handledSentThisProcess
            val processLimit = if (isAnr) MAX_ANR_PER_PROCESS else MAX_HANDLED_PER_PROCESS
            if (processCounter.get() >= processLimit) return false

            val now = System.currentTimeMillis()
            val lastSent = prefs.getLong("last_$fingerprint", 0L)
            val cooldown = if (isAnr) ANR_COOLDOWN_MS else HANDLED_COOLDOWN_MS
            if ((now - lastSent) in 0 until cooldown) return false

            prefs.edit().putLong("last_$fingerprint", now).apply()
            processCounter.incrementAndGet()
            return true
        }
    }

    private fun installationSeed(prefs: android.content.SharedPreferences): String {
        prefs.getString(INSTALLATION_SEED_KEY, null)?.takeIf { it.isNotBlank() }?.let { return it }
        synchronized(samplingLock) {
            prefs.getString(INSTALLATION_SEED_KEY, null)?.takeIf { it.isNotBlank() }?.let { return it }
            return UUID.randomUUID().toString().also { seed ->
                prefs.edit().putString(INSTALLATION_SEED_KEY, seed).commit()
            }
        }
    }
}
