package com.arflix.tv.ui.components

internal fun resolveDetailsBackdropHeightDp(
    screenWidthDp: Int,
    screenHeightDp: Int,
    isPhone: Boolean,
): Float {
    val isPhoneLandscape = isPhone && screenWidthDp > screenHeightDp
    return if (isPhoneLandscape) {
        (screenHeightDp * 0.55f).coerceIn(190f, 220f)
    } else {
        (screenHeightDp * 0.53f).coerceAtLeast(400f)
    }
}
