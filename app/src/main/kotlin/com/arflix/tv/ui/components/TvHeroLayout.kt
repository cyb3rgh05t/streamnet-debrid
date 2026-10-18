package com.arflix.tv.ui.components

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.SubcomposeLayout
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

internal data class TvHeroLayout(
    val logoTopDp: Float,
    val bodyTopDp: Float,
)

internal fun resolveTvHomeHeroBottomPadding(
    screenHeightDp: Int,
    viewportHeightDp: Float,
    uiScale: Float = 1f,
): Float {
    val originalRowsHeight = (screenHeightDp * uiScale * 0.34f).coerceIn(240f, 320f)
    return originalRowsHeight + 36f + viewportHeightDp * (1f - uiScale)
}

internal fun resolveTvHomeRowsViewportHeight(
    contentHeightDp: Float,
    uiScale: Float = 1f,
    topPaddingDp: Float = 24f,
): Float {
    val viewportHeight = contentHeightDp + topPaddingDp
    val originalContentHeight = viewportHeight * uiScale - topPaddingDp
    val originalRowsHeight = (originalContentHeight * 0.31f).coerceIn(260f, 340f)
    return originalRowsHeight + viewportHeight * (1f - uiScale)
}

internal fun resolveTvHeroLayout(
    screenHeightDp: Int,
    homeHeroHeightDp: Float,
    detailsHeaderHeightDp: Float,
    viewportHeightDp: Float = screenHeightDp.toFloat(),
    uiScale: Float = 1f,
): TvHeroLayout {
    val bottomPadding = resolveTvHomeHeroBottomPadding(screenHeightDp, viewportHeightDp, uiScale)
    val top = (viewportHeightDp - bottomPadding - homeHeroHeightDp).coerceAtLeast(0f)
    return TvHeroLayout(top, top + detailsHeaderHeightDp + 6f)
}

private enum class TvHeroSlot { Reference, Header, Body }

@Composable
internal fun HomeMatchedDetailsHero(
    screenHeightDp: Int,
    topBarInset: Dp,
    showHeader: Boolean,
    reference: @Composable () -> Unit,
    header: @Composable () -> Unit,
    body: @Composable (Dp) -> Unit,
) {
    val uiScale = com.arflix.tv.util.LocalTvUiScaleFactor.current
    SubcomposeLayout(modifier = Modifier.fillMaxSize()) { constraints ->
        val looseConstraints = constraints.copy(minWidth = 0, minHeight = 0)
        val headerPlaceable = if (showHeader) {
            subcompose(TvHeroSlot.Header, header).single().measure(looseConstraints)
        } else null
        val heroLayout = if (headerPlaceable != null) {
            val homeHero = subcompose(TvHeroSlot.Reference, reference).single().measure(looseConstraints)
            resolveTvHeroLayout(
                screenHeightDp = screenHeightDp,
                homeHeroHeightDp = homeHero.height.toDp().value,
                detailsHeaderHeightDp = headerPlaceable.height.toDp().value,
                viewportHeightDp = constraints.maxHeight.toDp().value,
                uiScale = uiScale,
            )
        } else null
        val headerTop = heroLayout?.logoTopDp?.dp?.roundToPx() ?: 0
        val bodyTop = heroLayout?.bodyTopDp?.dp?.roundToPx() ?: (topBarInset + 8.dp).roundToPx()
        val bodyHeight = (constraints.maxHeight - bodyTop).coerceAtLeast(1)
        val bodyPlaceable = subcompose(TvHeroSlot.Body) { body(bodyHeight.toDp()) }
            .single().measure(constraints.copy(minHeight = bodyHeight, maxHeight = bodyHeight))
        layout(constraints.maxWidth, constraints.maxHeight) {
            headerPlaceable?.placeRelative(0, headerTop)
            bodyPlaceable.placeRelative(0, bodyTop)
        }
    }
}