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

internal fun resolveTvHeroLayout(
    screenHeightDp: Int,
    homeHeroHeightDp: Float,
    detailsHeaderHeightDp: Float,
    viewportHeightDp: Float = screenHeightDp.toFloat(),
): TvHeroLayout {
    val homeRowsHeight = (screenHeightDp * 0.34f).coerceIn(240f, 320f)
    val top = (viewportHeightDp - homeRowsHeight - 36f - homeHeroHeightDp).coerceAtLeast(0f)
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