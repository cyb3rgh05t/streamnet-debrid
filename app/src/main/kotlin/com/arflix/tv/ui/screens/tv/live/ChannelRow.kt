package com.arflix.tv.ui.screens.tv.live

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.arflix.tv.R
import com.arflix.tv.data.model.IptvNowNext

/**
 * Channel column row — spec §3.4, mockup layout:
 *
 *   ┌─ [number mono] ─ [logo 44] ─ [name / program / progress / time] ─ [HD/HI] ─┐
 *
 * Active channel: 3dp cyan left indicator, accent bg tint, CH number cyan.
 * Focused: full row sits on PanelRaised so the selection is obvious.
 */
@OptIn(ExperimentalTvMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun ChannelRow(
    channel: EnrichedChannel,
    clockTickMillis: Long,
    nowNext: IptvNowNext?,
    isActive: Boolean,
    isFavorite: Boolean,
    stripe: Boolean = false,
    onClick: () -> Unit,
    onFavoriteToggle: () -> Unit,
    onMoveLeft: () -> Unit = {},
    onMoveRight: () -> Boolean = { false },
    onMoveUp: () -> Boolean = { false },
    onMoveDown: () -> Boolean = { false },
    onFocused: () -> Unit = {},
    variantCount: Int = 1,
    onOpenVariants: () -> Unit = {},
    rowHeight: androidx.compose.ui.unit.Dp = LiveDims.EpgRowHeight,
    compact: Boolean = false,
    forceFocused: Boolean = false,
    modifier: Modifier = Modifier,
) {
    var focused by remember { mutableStateOf(false) }
    val visuallyFocused = focused || forceFocused
    val shape = RoundedCornerShape(14.dp)
    val accent = LiveColors.Accent
    val rowBrush: Brush = when {
        visuallyFocused -> Brush.horizontalGradient(listOf(accent.copy(alpha = 0.28f), LiveColors.PanelRaised))
        isActive -> Brush.horizontalGradient(listOf(accent.copy(alpha = 0.20f), accent.copy(alpha = 0.04f)))
        else -> SolidColor(LiveColors.Panel.copy(alpha = 0.42f))
    }
    val now = nowNext?.now
    val animatedBorderWidth by animateDpAsState(
        targetValue = if (visuallyFocused) 1.5.dp else 0.dp,
        animationSpec = tween(durationMillis = 70),
        label = "channel-row-border",
    )
    val animatedScale by animateFloatAsState(
        targetValue = if (visuallyFocused) 1.004f else 1f,
        animationSpec = tween(durationMillis = 80),
        label = "channel-row-scale",
    )
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(rowHeight)
            // Inset so every row reads as its own rounded card instead of a flat stripe.
            .padding(horizontal = 6.dp, vertical = 3.dp)
            .graphicsLayer {
                scaleX = animatedScale
                scaleY = animatedScale
            }
            .onFocusChanged {
                focused = it.hasFocus
                if (it.hasFocus) onFocused()
            }
            .border(
                width = animatedBorderWidth,
                color = if (visuallyFocused) accent else Color.Transparent,
                shape = shape,
            )
            .clip(shape)
            .background(rowBrush)
            .focusable()
            .onPreviewKeyEvent { ev ->
                if (ev.type == KeyEventType.KeyDown) {
                    when (ev.key) {
                        Key.DirectionLeft -> { onMoveLeft(); return@onPreviewKeyEvent true }
                        Key.DirectionRight -> if (onMoveRight()) return@onPreviewKeyEvent true
                        Key.DirectionUp -> if (onMoveUp()) return@onPreviewKeyEvent true
                        Key.DirectionDown -> if (onMoveDown()) return@onPreviewKeyEvent true
                    }
                }
                false
            }
            .combinedClickable(
                onClick = onClick,
                onLongClick = {
                    if (variantCount > 1) onOpenVariants() else onFavoriteToggle()
                },
            )
            // Compose's combinedClickable doesn't catch DPAD long-press on
            // every TV — the key repeats before the long-click threshold
            // fires. Catch it here explicitly: the first repeat (native
            // repeatCount == 1) on CENTER / ENTER / MENU triggers favorite
            // toggle, giving the user the "hold OK" gesture everywhere.
            .onKeyEvent { ev ->
                val isLongHoldCenter = ev.type == KeyEventType.KeyDown &&
                    (ev.key == Key.DirectionCenter || ev.key == Key.Enter) &&
                    ev.nativeKeyEvent.repeatCount == 1
                val isMenu = ev.type == KeyEventType.KeyDown && ev.key == Key.Menu
                if (isMenu && variantCount > 1) {
                    onOpenVariants(); true
                } else if (isLongHoldCenter || isMenu) {
                    onFavoriteToggle(); true
                } else false
            },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Spacer(Modifier.width(10.dp))

        ChannelLogo(channel = channel, size = 34.dp, cornerRadius = 10.dp, showBackground = false)

        Spacer(Modifier.width(10.dp))

        // ─ name / program / progress / time ──────────────────
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = channel.name,
                    style = LiveType.CellTitle.copy(
                        color = if (isActive || visuallyFocused) accent else LiveColors.Fg,
                        fontWeight = if (isActive || visuallyFocused) FontWeight.SemiBold else FontWeight.W500,
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false),
                )
                if (isFavorite) {
                    Spacer(Modifier.width(4.dp))
                    Icon(
                        imageVector = Icons.Filled.Star,
                        contentDescription = null,
                        tint = Color(0xFFFFC04A), // Golden star
                        modifier = Modifier.size(11.dp),
                    )
                }
                if (channel.catchupDays > 0) {
                    Spacer(Modifier.width(4.dp))
                    Icon(
                        imageVector = Icons.Filled.History,
                        contentDescription = stringResource(R.string.live_cd_catchup_available),
                        tint = LiveColors.Accent.copy(alpha = 0.8f),
                        modifier = Modifier.size(11.dp),
                    )
                }
            }
            // Only the thin progress underline stays here — programme info
            // itself is shown exclusively in the time-aligned grid cells to
            // the right, not smeared across the channel name column.
            val progress = remember(now, clockTickMillis) { progressOf(now) }
            if (progress != null) {
                Box(
                    modifier = Modifier
                        .width(84.dp)
                        .height(3.dp)
                        .clip(CircleShape)
                        .background(LiveColors.FgMute.copy(alpha = 0.35f)),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(progress.coerceIn(0f, 1f))
                            .background(accent),
                    )
                }
            }
        }

    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun SmallPillBadge(text: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(3.dp))
            .background(LiveColors.Panel)
            .padding(horizontal = 6.dp, vertical = 2.dp),
    ) {
        Text(text.uppercase(), style = LiveType.Badge.copy(color = LiveColors.FgDim))
    }
}
