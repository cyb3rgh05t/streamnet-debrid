package com.arflix.tv.ui.screens.tv.live

import com.arflix.tv.data.model.IptvNowNext

internal fun IptvNowNext.atTime(nowMs: Long): IptvNowNext {
    val programs = (recent + listOfNotNull(now, next, later) + upcoming)
        .distinctBy { Triple(it.startUtcMillis, it.endUtcMillis, it.title) }
        .sortedBy { it.startUtcMillis }
    val future = programs.filter { it.startUtcMillis > nowMs }
    return copy(
        now = programs.lastOrNull { it.isLive(nowMs) },
        next = future.getOrNull(0),
        later = future.getOrNull(1),
        upcoming = future,
        recent = programs.filter { it.endUtcMillis <= nowMs },
    )
}

internal class LiveWindowRecovery(private val clock: () -> Long) {
    private var lastRecoveryAt: Long? = null

    fun claim(isCatchup: Boolean): Boolean {
        if (isCatchup) return false
        val now = clock()
        if (lastRecoveryAt?.let { now - it < 60_000L } == true) return false
        lastRecoveryAt = now
        return true
    }
}