package com.arflix.tv.ui.screens.home

import com.arflix.tv.data.repository.ContinueWatchingItem
import kotlin.math.roundToInt

internal fun continueWatchingProgressPercent(position: Long, duration: Long, storedProgress: Float): Int {
    val derived = if (duration > 0) {
        (position.toDouble().coerceAtLeast(0.0) / duration).coerceIn(0.0, 1.0) * 100.0
    } else 0.0
    return maxOf(derived.roundToInt(), (storedProgress.coerceIn(0f, 1f) * 100f).roundToInt())
}

internal fun isActiveContinueWatchingResume(item: ContinueWatchingItem): Boolean =
    item.progress < 90 && (item.progress >= 1 || item.resumePositionSeconds >= 10L)
