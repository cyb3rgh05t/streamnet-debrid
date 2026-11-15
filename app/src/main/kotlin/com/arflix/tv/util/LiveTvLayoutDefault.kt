package com.arflix.tv.util

import android.content.Context

/**
 * Live TV layout used while a profile has no stored choice: the classic layout on fresh installs,
 * the Netflix layout (the former default) on installs that existed before the default changed, so
 * updating never changes the layout of users who never opened the setting.
 */
object LiveTvLayoutDefault {
    private const val PREFS_NAME = "live_tv_layout_default"
    private const val KEY_DEFAULT = "default_layout"
    private const val FRESH_INSTALL_TOLERANCE_MS = 2_000L

    @Volatile
    private var cached: String? = null

    internal fun defaultFor(firstInstallTime: Long, lastUpdateTime: Long): String =
        if (lastUpdateTime - firstInstallTime <= FRESH_INSTALL_TOLERANCE_MS) "classic" else "streamnet"

    /** Decides and stores the default on the first launch of the version that introduced it. */
    fun get(context: Context): String {
        cached?.let { return it }
        val prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val stored = prefs.getString(KEY_DEFAULT, null)
        val value = stored ?: runCatching {
            val info = context.packageManager.getPackageInfo(context.packageName, 0)
            defaultFor(info.firstInstallTime, info.lastUpdateTime)
        }.getOrDefault("streamnet").also { prefs.edit().putString(KEY_DEFAULT, it).apply() }
        cached = value
        return value
    }
}
