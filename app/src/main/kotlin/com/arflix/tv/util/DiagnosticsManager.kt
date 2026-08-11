package com.arflix.tv.util

import android.content.Context

/**
 * Owns the device-local choice for optional diagnostics and usage reporting.
 * This preference is intentionally not profile-scoped or cloud-synced.
 */
data object DiagnosticsManager {
    private const val PREFERENCES_NAME = "arvio_privacy_preferences"
    private const val REPORTING_ENABLED_KEY = "diagnostics_and_usage_enabled"

    fun isReportingEnabled(context: Context): Boolean {
        return context.applicationContext
            .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getBoolean(REPORTING_ENABLED_KEY, true)
    }

    @Synchronized
    fun initialize(context: Context): Boolean {
        val appContext = context.applicationContext
        if (!isReportingEnabled(appContext)) {
            disableProviders()
            return false
        }

        return if (SentryCrashReporter.initialize(appContext)) {
            true
        } else {
            CrashlyticsProvider.initialize()
        }
    }

    @Synchronized
    fun setReportingEnabled(context: Context, enabled: Boolean) {
        val appContext = context.applicationContext
        appContext.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(REPORTING_ENABLED_KEY, enabled)
            .apply()

        if (enabled) {
            initialize(appContext)
        } else {
            disableProviders()
        }
    }

    private fun disableProviders() {
        SentryCrashReporter.disable()
        CrashlyticsProvider.disable()
        AppLogger.init(null)
    }
}
