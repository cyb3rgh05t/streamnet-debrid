@file:Suppress("UnsafeOptInUsageError")

package com.arflix.tv.ui.screens.tv.live

import android.view.KeyEvent as AndroidKeyEvent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.FastForward
import androidx.compose.material.icons.filled.FastRewind
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Replay
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.coerceAtLeast
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.arflix.tv.R
import com.arflix.tv.data.model.IptvNowNext
import kotlinx.coroutines.delay
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Fullscreen playback HUD matching the full-width reference player layout.
 * Auto-hides 5s after the last `pokeSignal` bump; parent bumps the counter on any DPAD key so the HUD re-surfaces.
 * Initial focus immediately lands on the central Play/Pause button when surfaced from hidden state.
 */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun FullscreenHud(
    channel: EnrichedChannel?,
    nowNext: IptvNowNext?,
    pokeSignal: Int,
    categoryName: String? = null,
    clockFormat: String = "24h",
    isCatchupMode: Boolean = false,
    isPlaying: Boolean = true,
    isBuffering: Boolean = false,
    playbackPositionMs: Long = 0L,
    playbackDurationMs: Long = 0L,
    onBackClick: (() -> Unit)? = null,
    onGuideClick: (() -> Unit)? = null,
    onPlayPauseClick: (() -> Unit)? = null,
    onRewindClick: (() -> Unit)? = null,
    onFastForwardClick: (() -> Unit)? = null,
    onPreviousCatchupClick: (() -> Unit)? = null,
    onNextCatchupClick: (() -> Unit)? = null,
    onReplayClick: (() -> Unit)? = null,
    onGoLiveClick: (() -> Unit)? = null,
    onSeekToPosition: ((Long) -> Unit)? = null,
    onOpenQuickZap: (() -> Unit)? = null,
    onVisibilityChanged: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    var visible by remember { mutableStateOf(true) }
    var lastPoke by remember { mutableLongStateOf(System.currentTimeMillis()) }

    androidx.compose.runtime.DisposableEffect(onVisibilityChanged) {
        onDispose {
            onVisibilityChanged?.invoke(false)
        }
    }

    LaunchedEffect(pokeSignal) {
        visible = true
        onVisibilityChanged?.invoke(true)
        lastPoke = System.currentTimeMillis()
        delay(5_000)
        if (System.currentTimeMillis() - lastPoke >= 5_000) {
            visible = false
            onVisibilityChanged?.invoke(false)
        }
    }

    var clockMillis by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) {
            clockMillis = System.currentTimeMillis()
            delay(1_000)
        }
    }

    // Instant local play/pause icon state toggle for immediate UI feedback (0ms delay)
    var localIsPlaying by remember(isPlaying) { mutableStateOf(isPlaying) }

    val playPauseFocusRequester = remember { FocusRequester() }
    var initialFocusApplied by remember { mutableStateOf(false) }

    // Request initial focus ONLY when HUD first becomes visible from hidden state
    LaunchedEffect(visible) {
        if (visible && !initialFocusApplied) {
            initialFocusApplied = true
            delay(100)
            runCatching {
                playPauseFocusRequester.requestFocus()
            }
        } else if (!visible) {
            initialFocusApplied = false
        }
    }

    // --- Loading Ring Overlay in Center of Screen ---
    if (isBuffering) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = Modifier
                    .size(76.dp)
                    .clip(CircleShape)
                    .background(Color.Black.copy(alpha = 0.65f)),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.size(44.dp),
                    color = LiveColors.Accent,
                    strokeWidth = 4.dp,
                )
            }
        }
    }

    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(tween(200)),
        exit = fadeOut(tween(200)),
        modifier = modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.safeDrawing),
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // Full screen gradient overlay (dark at top and bottom)
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            0f to Color.Black.copy(alpha = 0.7f),
                            0.25f to Color.Transparent,
                            0.45f to Color.Transparent,
                            1f to Color.Black.copy(alpha = 0.95f),
                        )
                    ),
            )

            // --- Top Header Row (Channel, category & formatted date/time) ---
            Row(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .fillMaxWidth()
                    .padding(horizontal = 48.dp, vertical = 24.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (onBackClick != null) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(Color.Black.copy(alpha = 0.6f))
                                .clickable { onBackClick() },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = stringResource(R.string.back),
                                tint = Color.White,
                                modifier = Modifier.size(22.dp),
                            )
                        }
                    }

                    if (channel != null || !categoryName.isNullOrBlank()) {
                        Column(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(2.dp),
                        ) {
                            channel?.let {
                                Text(
                                    text = it.name,
                                    style = LiveType.ChannelName.copy(
                                        color = Color.White,
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                    ),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                            if (!categoryName.isNullOrBlank()) {
                                Text(
                                    text = liveCategoryLabel(categoryName),
                                    style = LiveType.SectionTag.copy(
                                        color = LiveColors.Accent,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.SemiBold,
                                    ),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                        }
                    }
                }

                Text(
                    text = formatHeaderDateTime(clockMillis, clockFormat),
                    style = LiveType.TimeMono.copy(
                        color = Color.White.copy(alpha = 0.9f),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium,
                    ),
                )
            }

            // --- Bottom Sheet Layout (Full-Width) ---
            val guidePrograms = remember(nowNext) {
                buildList {
                    nowNext?.now?.let(::add)
                    nowNext?.next?.let(::add)
                    nowNext?.later?.let(::add)
                    addAll(nowNext?.upcoming.orEmpty())
                }.distinctBy { Triple(it.startUtcMillis, it.endUtcMillis, it.title) }
            }
            val now = nowNext?.now
                ?.takeIf { isCatchupMode || it.isLive(clockMillis) }
                ?: guidePrograms.firstOrNull { it.isLive(clockMillis) }
            val nextBoundary = now?.endUtcMillis ?: clockMillis
            val next = guidePrograms
                .asSequence()
                .filter { it.startUtcMillis >= nextBoundary }
                .minByOrNull { it.startUtcMillis }

            // Elapsed time passed on current show
            var frozenElapsedMs by remember(channel?.id, now?.startUtcMillis) { mutableStateOf<Long?>(null) }

            val currentElapsedShowMs = if (isCatchupMode) {
                playbackPositionMs
            } else if (now != null && now.startUtcMillis > 0L) {
                (clockMillis - now.startUtcMillis).coerceAtLeast(0L)
            } else {
                playbackPositionMs
            }

            // Freeze the timer while buffering so it doesn't continue advancing
            LaunchedEffect(isBuffering) {
                if (isBuffering) {
                    if (frozenElapsedMs == null) {
                        frozenElapsedMs = currentElapsedShowMs
                    }
                } else {
                    frozenElapsedMs = null
                }
            }

            val elapsedShowMs = if (isBuffering) {
                frozenElapsedMs ?: currentElapsedShowMs
            } else {
                currentElapsedShowMs
            }

            val totalShowMs = if (isCatchupMode && playbackDurationMs > 0L) {
                playbackDurationMs
            } else if (now != null && now.endUtcMillis > now.startUtcMillis) {
                now.endUtcMillis - now.startUtcMillis
            } else {
                playbackDurationMs
            }

            val progress = if (totalShowMs > 0L) {
                (elapsedShowMs.toFloat() / totalShowMs.toFloat()).coerceIn(0f, 1f)
            } else {
                progressOf(now) ?: 0f
            }

            val positionText = formatPlaybackDuration(elapsedShowMs)

            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(horizontal = 48.dp, vertical = 24.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                // --- Row 1: Channel Logo & Program Metadata ---
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(20.dp),
                ) {
                    if (channel != null) {
                        ChannelLogo(channel = channel, size = 68.dp)
                    }

                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        // Program Title
                        Text(
                            text = now?.title
                                ?: channel?.name
                                ?: stringResource(R.string.live_empty_no_programme),
                            style = LiveType.ProgramTitle.copy(
                                color = Color.White,
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                            ),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )

                        // Current programme time window and remaining duration
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            val timeWin = formatTimeWindow(now, clockFormat)
                            if (timeWin.isNotBlank()) {
                                Text(
                                    text = timeWin,
                                    style = LiveType.TimeMono.copy(
                                        color = Color.White.copy(alpha = 0.9f),
                                        fontSize = 14.sp,
                                    ),
                                )
                            }

                            now?.title?.takeIf { it.isNotBlank() }?.let { programmeTitle ->
                                Text(
                                    text = programmeTitle,
                                    style = LiveType.CellTitle.copy(
                                        color = Color.White.copy(alpha = 0.78f),
                                        fontSize = 14.sp,
                                    ),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }

                            val remaining = remainingLabel(now)
                            if (remaining.isNotBlank()) {
                                Text(
                                    text = remaining,
                                    style = LiveType.TimeMono.copy(
                                        color = LiveColors.Accent,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.SemiBold,
                                    ),
                                )
                            }

                        }

                        // Next Program Preview
                        if (next != null) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                Text(
                                    text = stringResource(R.string.live_badge_next),
                                    style = LiveType.SectionTag.copy(
                                        color = LiveColors.Accent,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                    ),
                                )
                                Text(
                                    text = "${formatClock(next.startUtcMillis, clockFormat)} — ${formatClock(next.endUtcMillis, clockFormat)}",
                                    style = LiveType.TimeMono.copy(
                                        color = Color.White.copy(alpha = 0.5f),
                                        fontSize = 13.sp,
                                    ),
                                )
                                Text(
                                    text = next.title,
                                    style = LiveType.CellTitle.copy(
                                        color = Color.White.copy(alpha = 0.6f),
                                        fontSize = 13.sp,
                                    ),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                        }
                    }
                }

                // --- Row 2: Full-Width Seek Bar with Scrubber Ball ---
                HudSeekBar(
                    progress = progress,
                    positionMs = elapsedShowMs,
                    durationMs = totalShowMs,
                    onSeekToPosition = onSeekToPosition,
                    onOpenQuickZap = onOpenQuickZap,
                )

                // --- Row 3: Bottom Control Bar (Exact Centering & Time on Left) ---
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                ) {
                    // Left Side: Time Text below Seek Bar
                    Box(
                        modifier = Modifier.align(Alignment.CenterStart),
                    ) {
                        Text(
                            text = positionText,
                            style = LiveType.TimeMono.copy(
                                color = Color.White.copy(alpha = 0.85f),
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium,
                            ),
                        )
                    }

                    // EXACT CENTER: Playback Controls Bar
                    Row(
                        modifier = Modifier.align(Alignment.Center),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        // Previous channel (|<)
                        HudIconButton(
                            icon = Icons.Filled.SkipPrevious,
                            contentDescription = stringResource(R.string.previous_channel),
                            onClick = { onPreviousCatchupClick?.invoke() },
                        )

                        // Rewind (<<)
                        HudIconButton(
                            icon = Icons.Filled.FastRewind,
                            contentDescription = stringResource(R.string.rewind),
                            onClick = { onRewindClick?.invoke() },
                        )

                        // Central Play/Pause button (Instant local state toggle!)
                        HudIconButton(
                            icon = if (localIsPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                            contentDescription = if (localIsPlaying) stringResource(R.string.pause) else stringResource(R.string.play),
                            emphasis = true,
                            focusRequester = playPauseFocusRequester,
                            onClick = {
                                localIsPlaying = !localIsPlaying
                                onPlayPauseClick?.invoke()
                            },
                        )

                        // Fast Forward (>>)
                        HudIconButton(
                            icon = Icons.Filled.FastForward,
                            contentDescription = stringResource(R.string.fast_forward),
                            onClick = { onFastForwardClick?.invoke() },
                        )

                        // Next channel (>|)
                        HudIconButton(
                            icon = Icons.Filled.SkipNext,
                            contentDescription = stringResource(R.string.next_channel),
                            onClick = { onNextCatchupClick?.invoke() },
                        )
                    }

                    // Right Side: Replay, LIVE, GUIDE
                    Row(
                        modifier = Modifier.align(Alignment.CenterEnd),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        // Replay / Restart
                        HudIconButton(
                            icon = Icons.Filled.Replay,
                            contentDescription = stringResource(R.string.live_label_catchup),
                            onClick = { onReplayClick?.invoke() },
                        )

                        // LIVE button
                        if (isCatchupMode) {
                            HudActionButton(
                                label = stringResource(R.string.live_badge_live),
                                onClick = { onGoLiveClick?.invoke() },
                            )
                        }

                        // Guide button at far right
                        if (onGuideClick != null) {
                            HudActionButton(
                                label = stringResource(R.string.live_btn_guide),
                                onClick = onGuideClick,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HudSeekBar(
    progress: Float,
    positionMs: Long,
    durationMs: Long,
    onSeekToPosition: ((Long) -> Unit)?,
    onOpenQuickZap: (() -> Unit)?,
    modifier: Modifier = Modifier,
) {
    var isFocused by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .onFocusChanged { isFocused = it.isFocused }
            .focusable()
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyDown) {
                    val stepMs = 10_000L
                    when (event.nativeKeyEvent.keyCode) {
                        AndroidKeyEvent.KEYCODE_DPAD_LEFT -> {
                            if (onSeekToPosition != null) {
                                val newPos = (positionMs - stepMs).coerceAtLeast(0L)
                                onSeekToPosition(newPos)
                                true
                            } else false
                        }
                        AndroidKeyEvent.KEYCODE_DPAD_RIGHT -> {
                            if (onSeekToPosition != null) {
                                val maxDuration = if (durationMs > 0L) durationMs else positionMs + 300_000L
                                val newPos = (positionMs + stepMs).coerceAtMost(maxDuration)
                                onSeekToPosition(newPos)
                                true
                            } else false
                        }
                        AndroidKeyEvent.KEYCODE_DPAD_LEFT -> {
                            if (onOpenQuickZap != null && onSeekToPosition == null) {
                                onOpenQuickZap()
                                true
                            } else false
                        }
                        else -> false
                    }
                } else false
            }
            .padding(vertical = 4.dp),
    ) {
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxWidth()
                .height(if (isFocused) 16.dp else 6.dp),
            contentAlignment = Alignment.CenterStart,
        ) {
            val trackWidth = maxWidth
            val clampedProgress = progress.coerceIn(0f, 1f)

            // Progress track background
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(if (isFocused) 6.dp else 4.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(if (isFocused) Color.White.copy(alpha = 0.35f) else LiveColors.Panel),
            )

            // Active progress fill
            Box(
                modifier = Modifier
                    .fillMaxWidth(clampedProgress)
                    .height(if (isFocused) 6.dp else 4.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(LiveColors.Accent),
            )

            // Accent-colored scrubber thumb when focused
            if (isFocused) {
                val maxThumbStart = (trackWidth - 16.dp).coerceAtLeast(0.dp)
                val thumbOffset = (trackWidth * clampedProgress - 8.dp).coerceIn(0.dp, maxThumbStart)
                Box(
                    modifier = Modifier
                        .padding(start = thumbOffset)
                        .size(16.dp)
                        .clip(CircleShape)
                        .background(LiveColors.Accent),
                )
            }
        }
    }
}

@Composable
private fun HudIconButton(
    icon: ImageVector,
    contentDescription: String,
    modifier: Modifier = Modifier,
    emphasis: Boolean = false,
    focusRequester: FocusRequester? = null,
    onClick: () -> Unit,
) {
    var isFocused by remember { mutableStateOf(false) }

    val size = if (emphasis) 54.dp else 42.dp
    val iconSize = if (emphasis) 28.dp else 22.dp

    val bgColor = when {
        isFocused -> LiveColors.Accent
        emphasis -> LiveColors.AccentDim
        else -> Color.Black.copy(alpha = 0.55f)
    }

    val iconColor = when {
        isFocused -> LiveColors.Bg
        emphasis -> LiveColors.Bg
        else -> Color.White
    }

    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .onFocusChanged { isFocused = it.isFocused }
            .then(if (focusRequester != null) Modifier.focusRequester(focusRequester) else Modifier)
            .background(bgColor)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = iconColor,
            modifier = Modifier.size(iconSize),
        )
    }
}

internal fun formatHeaderDateTime(millis: Long, clockFormat: String): String {
    return try {
        val instant = Instant.ofEpochMilli(millis)
        val zdt = LocalDateTime.ofInstant(instant, ZoneId.systemDefault())
        val pattern = if (clockFormat == "12h") "EEE, MMM d, h:mm a" else "EEE, MMM d, HH:mm"
        val formatter = DateTimeFormatter.ofPattern(pattern, Locale.getDefault())
        zdt.format(formatter)
    } catch (_: Exception) {
        ""
    }
}

private fun formatPlaybackDuration(ms: Long): String {
    val totalSeconds = (ms / 1000L).coerceAtLeast(0L)
    val hours = totalSeconds / 3600L
    val minutes = (totalSeconds % 3600L) / 60L
    val seconds = totalSeconds % 60L
    return if (hours > 0L) {
        "%d:%02d:%02d".format(hours, minutes, seconds)
    } else {
        "%02d:%02d".format(minutes, seconds)
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun HudActionButton(
    label: String,
    onClick: () -> Unit,
) {
    var isFocused by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .onFocusChanged { isFocused = it.isFocused }
            .background(if (isFocused) LiveColors.Accent else Color.Black.copy(alpha = 0.55f))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 7.dp),
    ) {
        Text(
            text = label,
            style = LiveType.Badge.copy(
                color = if (isFocused) LiveColors.Bg else Color.White,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
            ),
        )
    }
}
