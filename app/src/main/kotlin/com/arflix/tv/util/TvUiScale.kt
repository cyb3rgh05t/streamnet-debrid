package com.arflix.tv.util

import android.content.Context
import android.content.res.Configuration
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlin.math.roundToInt

val Context.deviceDisplayDataStore by preferencesDataStore(name = "device_display")
val TV_UI_SCALE_PERCENT_KEY = intPreferencesKey("tv_ui_scale_percent")
internal val LocalTvUiScaleFactor = staticCompositionLocalOf { 1f }

private val tvUiScalePercentages = listOf(100, 90, 85, 80)

internal fun normalizeTvUiScalePercent(percent: Int): Int =
    percent.takeIf { it in tvUiScalePercentages } ?: 100

internal fun nextTvUiScalePercent(percent: Int): Int {
    val index = tvUiScalePercentages.indexOf(normalizeTvUiScalePercent(percent))
    return tvUiScalePercentages[(index + 1) % tvUiScalePercentages.size]
}

internal fun tvUiScaleFactor(percent: Int, isTv: Boolean): Float =
    if (isTv) normalizeTvUiScalePercent(percent) / 100f else 1f

internal fun scaledTvConfiguration(base: Configuration, scale: Float): Configuration {
    if (scale == 1f) return base
    return Configuration(base).apply {
        densityDpi = (base.densityDpi * scale).roundToInt().coerceAtLeast(1)
        screenWidthDp = (base.screenWidthDp / scale).roundToInt()
        screenHeightDp = (base.screenHeightDp / scale).roundToInt()
        smallestScreenWidthDp = (base.smallestScreenWidthDp / scale).roundToInt()
    }
}