package com.arflix.tv.ui.motion

import androidx.activity.BackEventCompat
import androidx.activity.compose.PredictiveBackHandler
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.Easing
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import kotlin.coroutines.cancellation.CancellationException

/**
 * M3 STANDARD_DECELERATE — PathInterpolator(0f, 0f, 0f, 1f).
 * Deliberately NOT FastOutSlowInEasing, which is (0.4, 0, 0.2, 1) ease-in-out.
 */
val ArvioStandardDecelerate: Easing = CubicBezierEasing(0.05f, 0.7f, 0.1f, 1f)

private const val MinSurfaceScale = 0.90f   // M3: surface scales to 90%
private val EdgeMargin = 8.dp               // M3: 8dp from screen edges

/** Raw gesture state. `progress` is unmodified pointer progress; ease at consumption. */
@Stable
class ArvioBackMotion internal constructor() {
    var progress by mutableFloatStateOf(0f)
        internal set
    var swipeEdge by mutableIntStateOf(BackEventCompat.EDGE_LEFT)
        internal set
    var touchY by mutableFloatStateOf(Float.NaN)
        internal set
    val eased: Float get() = ArvioStandardDecelerate.transform(progress)
}

/**
 * PredictiveBackHandler with real settle animations.
 *
 * Commit: invokes [onCommit] immediately while the visual state settles to 1f in the
 * composition scope. Cancel: animates back to 0f.
 *
 * The settle is launched on [rememberCoroutineScope] because on cancel the handler's own
 * coroutine is already cancelled — suspending in the catch block would throw immediately.
 */
@Composable
fun rememberArvioPredictiveBack(
    enabled: Boolean,
    commitDurationMs: Int = 280,
    cancelDurationMs: Int = 240,
    onCommit: () -> Unit,
): ArvioBackMotion {
    val motion = remember { ArvioBackMotion() }
    val anim = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()
    val commit by rememberUpdatedState(onCommit)

    LaunchedEffect(anim) {
        snapshotFlow { anim.value }.collect { motion.progress = it }
    }

    PredictiveBackHandler(enabled = enabled) { events ->
        try {
            events.collect { e ->
                motion.swipeEdge = e.swipeEdge
                motion.touchY = e.touchY
                anim.snapTo(e.progress)
            }
            scope.launch {
                anim.animateTo(1f, tween(commitDurationMs, easing = ArvioStandardDecelerate))
                anim.snapTo(0f)
                motion.touchY = Float.NaN
            }
            commit()
        } catch (e: CancellationException) {
            scope.launch {
                anim.animateTo(0f, tween(cancelDurationMs, easing = ArvioStandardDecelerate))
                motion.touchY = Float.NaN
            }
            throw e
        }
    }
    return motion
}

/** The leaving surface. Full M3 spec: 90% scale, edge-aware X-shift, touchY-weighted Y-shift. */
fun Modifier.arvioBackSurface(motion: ArvioBackMotion): Modifier = graphicsLayer {
    val p = motion.eased
    if (p <= 0f) return@graphicsLayer

    val s = 1f - (1f - MinSurfaceScale) * p
    scaleX = s
    scaleY = s

    val margin = EdgeMargin.toPx()
    val maxX = (size.width / 20f - margin).coerceAtLeast(0f)
    val dir = if (motion.swipeEdge == BackEventCompat.EDGE_RIGHT) -1f else 1f
    translationX = dir * p * maxX

    val maxY = (size.height / 20f - margin).coerceAtLeast(0f)
    val pivot = if (motion.touchY.isNaN()) 0f
    else ((motion.touchY - size.height / 2f) / (size.height / 2f)).coerceIn(-1f, 1f)
    translationY = p * pivot * maxY
}

/** The revealed surface underneath. Matches SettingsScreen.kt peeking behavior. */
fun Modifier.arvioBackPeek(motion: ArvioBackMotion, active: Boolean): Modifier = graphicsLayer {
    if (!active) return@graphicsLayer
    val p = motion.eased
    if (p <= 0f) return@graphicsLayer
    val s = 0.96f + p * 0.04f
    scaleX = s
    scaleY = s
    alpha = 0.6f + p * 0.4f
}

/** Modal dismiss: shrink + fade in place. No positional shift — a modal closes, it doesn't traverse. */
fun Modifier.arvioBackModal(motion: ArvioBackMotion): Modifier = graphicsLayer {
    val p = motion.eased
    if (p <= 0f) return@graphicsLayer
    val s = 1f - (1f - MinSurfaceScale) * p
    scaleX = s
    scaleY = s
    alpha = 1f - p * 0.3f
}
