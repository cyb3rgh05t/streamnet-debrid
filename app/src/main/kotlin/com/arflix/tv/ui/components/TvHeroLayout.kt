package com.arflix.tv.ui.components

internal data class TvHeroLayout(
    val logoTopDp: Float,
    val metadataHeightDp: Float,
) {
    val headerHeightDp: Float get() = 72f + 4f + metadataHeightDp
    val bodyTopDp: Float get() = logoTopDp + headerHeightDp + 6f
}

internal fun resolveTvHeroLayout(
    screenHeightDp: Int,
    topBarInsetDp: Float,
    fontScale: Float = 1f,
): TvHeroLayout {
    val metadataHeight = 36f * fontScale.coerceAtLeast(1f)
    val compactHeroHeight = 72f + 4f + metadataHeight + 6f + 72f
    val homeRowsHeight = (screenHeightDp * 0.34f).coerceIn(240f, 320f)
    val minTop = topBarInsetDp + 8f
    val maxTop = (screenHeightDp - (72f + 4f + metadataHeight) - 120f).coerceAtLeast(minTop)
    val top = (screenHeightDp - homeRowsHeight - 36f - compactHeroHeight).coerceIn(minTop, maxTop)
    return TvHeroLayout(top, metadataHeight)
}