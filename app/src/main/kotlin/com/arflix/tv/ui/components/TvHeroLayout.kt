package com.arflix.tv.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
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

internal fun resolveTvHomeHeroTop(
    viewportHeightDp: Float,
    heroHeightDp: Float,
    bottomPaddingDp: Float,
    topBarInsetDp: Float,
    topBarGapDp: Float = 0f,
): Float = maxOf(
    viewportHeightDp - bottomPaddingDp - heroHeightDp,
    topBarInsetDp + topBarGapDp,
)

internal fun resolveTvHomeHeroOverviewHeight(
    viewportHeightDp: Float,
    measuredHeroHeightDp: Float,
    overviewHeightDp: Float,
    rowsViewportHeightDp: Float,
    topBarInsetDp: Float,
    topBarGapDp: Float = 0f,
    rowsGapDp: Float = 16f,
): Float {
    val availableHeroHeight = (
        viewportHeightDp - rowsViewportHeightDp - rowsGapDp -
            topBarInsetDp - topBarGapDp
        ).coerceAtLeast(0f)
    val overflow = (measuredHeroHeightDp - availableHeroHeight).coerceAtLeast(0f)
    return (overviewHeightDp - overflow).coerceAtLeast(0f)
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
    topBarInsetDp: Float = AppTopBarHeight.value,
): TvHeroLayout {
    val bottomPadding = resolveTvHomeHeroBottomPadding(screenHeightDp, viewportHeightDp, uiScale)
    val top = resolveTvHomeHeroTop(
        viewportHeightDp = viewportHeightDp,
        heroHeightDp = homeHeroHeightDp,
        bottomPaddingDp = bottomPadding,
        topBarInsetDp = topBarInsetDp,
    )
    return TvHeroLayout(top, top + detailsHeaderHeightDp + 6f)
}

private enum class TvHeroSlot { Reference, Header, Body }

private const val TV_HERO_TRANSITION_MS = 200

/** Positions that survive between layout passes so a header toggle can glide instead of jump. */
private class TvHeroTransitionState {
    var initialized = false
    var progress: Animatable<Float, *>? = null
    var settledBodyTop = 0
    var displayedBodyTop = 0
}

/**
 * Header (logo, meta, buttons) above a body that takes the remaining height. The body's final size
 * changes at once when the header toggles; the body is drawn shifted back to its previous top and
 * glides into place, while the header fades, so the switch between the action buttons and the rows
 * below no longer cuts.
 */
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
    val state = remember { TvHeroTransitionState() }
    // No fade on the first composition; every later toggle starts a new 0 -> 1 transition.
    val progress = remember(showHeader) { Animatable(if (state.initialized) 0f else 1f) }
    state.initialized = true
    LaunchedEffect(progress) {
        if (progress.value < 1f) {
            progress.animateTo(1f, tween(durationMillis = TV_HERO_TRANSITION_MS, easing = FastOutSlowInEasing))
        }
    }
    SubcomposeLayout(modifier = Modifier.fillMaxSize()) { constraints ->
        val p = progress.value
        val looseConstraints = constraints.copy(minWidth = 0, minHeight = 0)
        val headerFading = !showHeader && p < 1f
        val headerPlaceable = if (showHeader || headerFading) {
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
                topBarInsetDp = topBarInset.value,
            )
        } else null
        val headerTop = heroLayout?.logoTopDp?.dp?.roundToPx() ?: 0
        // The row area is sized for the target state only; the fading header must not hold it open.
        val bodyTop = if (showHeader) {
            heroLayout?.bodyTopDp?.dp?.roundToPx() ?: (topBarInset + 8.dp).roundToPx()
        } else {
            (topBarInset + 8.dp).roundToPx()
        }
        val bodyHeight = (constraints.maxHeight - bodyTop).coerceAtLeast(1)

        if (state.progress !== progress) {
            // A new transition starts from wherever the body is drawn right now.
            state.progress = progress
            state.settledBodyTop = if (state.displayedBodyTop > 0) state.displayedBodyTop else bodyTop
        }
        if (p >= 1f) state.settledBodyTop = bodyTop
        val bodyShift = ((state.settledBodyTop - bodyTop) * (1f - p))
        state.displayedBodyTop = bodyTop + bodyShift.toInt()

        val bodyPlaceable = subcompose(TvHeroSlot.Body) { body(bodyHeight.toDp()) }
            .single().measure(constraints.copy(minHeight = bodyHeight, maxHeight = bodyHeight))
        val headerAlpha = if (showHeader) p else 1f - p
        layout(constraints.maxWidth, constraints.maxHeight) {
            headerPlaceable?.placeRelativeWithLayer(0, headerTop) { alpha = headerAlpha }
            bodyPlaceable.placeRelativeWithLayer(0, bodyTop) { translationY = bodyShift }
        }
    }
}