package com.arflix.tv.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.arflix.tv.ui.skin.ArvioSkin
import com.arflix.tv.ui.skin.resolveAccentColor
import com.arflix.tv.ui.theme.ArflixTypography
import kotlinx.coroutines.delay
import androidx.compose.ui.res.stringResource
import com.arflix.tv.R

/**
 * Next episode overlay shown at the end of an episode
 * Matches the webapp's "Up Next" modal design
 */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun NextEpisodeOverlay(
    isVisible: Boolean,
    showTitle: String,
    episodeTitle: String,
    seasonNumber: Int,
    episodeNumber: Int,
    episodeImage: String?,
    countdownSeconds: Int = 10,
    focusedButtonOverride: Int? = null,
    onFocusedButtonChange: ((Int) -> Unit)? = null,
    onPlayNext: () -> Unit,
    onCancel: () -> Unit
) {
    var internalFocusedButton by remember(isVisible) { mutableIntStateOf(0) } // 0 = play, 1 = cancel
    var countdown by remember(isVisible) { mutableIntStateOf(countdownSeconds) }
    var progress by remember(isVisible) { mutableFloatStateOf(1f) }
    var actionTaken by remember(seasonNumber, episodeNumber) { mutableStateOf(false) }
    val accentColor = resolveAccentColor(fallback = ArvioSkin.colors.focusOutline)
    val cardShape = RoundedCornerShape(20.dp)
    val overlayFocusRequester = remember { FocusRequester() }
    val focusedButton = focusedButtonOverride ?: internalFocusedButton
    fun updateFocusedButton(value: Int) {
        val clamped = value.coerceIn(0, 1)
        if (focusedButtonOverride == null) {
            internalFocusedButton = clamped
        }
        onFocusedButtonChange?.invoke(clamped)
    }
    fun playNextOnce() {
        if (actionTaken) return
        actionTaken = true
        onPlayNext()
    }
    fun cancelOnce() {
        if (actionTaken) return
        actionTaken = true
        onCancel()
    }

    LaunchedEffect(isVisible) {
        if (isVisible) {
            runCatching { overlayFocusRequester.requestFocus() }
        }
    }

    // Countdown timer
    LaunchedEffect(isVisible, seasonNumber, episodeNumber) {
        if (isVisible) {
            countdown = countdownSeconds
            while (countdown > 0 && !actionTaken) {
                delay(1000)
                countdown--
                progress = countdown.toFloat() / countdownSeconds.toFloat()
            }
            if (countdown == 0 && !actionTaken) {
                playNextOnce()
            }
        }
    }

    AnimatedVisibility(
        visible = isVisible,
        enter = fadeIn() + slideInHorizontally(initialOffsetX = { it }),
        exit = fadeOut() + slideOutHorizontally(targetOffsetX = { it })
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .focusRequester(overlayFocusRequester)
                .focusable()
                .onPreviewKeyEvent { event ->
                    if (event.type == KeyEventType.KeyDown) {
                        when (event.key) {
                            Key.Back, Key.Escape -> {
                                cancelOnce()
                                true
                            }
                            Key.DirectionLeft -> {
                                updateFocusedButton(focusedButton - 1)
                                true
                            }
                            Key.DirectionRight -> {
                                updateFocusedButton(focusedButton + 1)
                                true
                            }
                            Key.Enter, Key.DirectionCenter -> {
                                when (focusedButton) {
                                    0 -> playNextOnce()
                                    1 -> cancelOnce()
                                }
                                true
                            }
                            else -> false
                        }
                    } else false
                },
            contentAlignment = Alignment.BottomEnd
        ) {
            // Card positioned at bottom right
            Box(
                modifier = Modifier
                    .padding(48.dp)
                    .width(500.dp)
                    .clip(cardShape)
                    .background(ArvioSkin.colors.surface)
                    .border(1.dp, accentColor.copy(alpha = 0.45f), cardShape)
            ) {
                if (!episodeImage.isNullOrBlank()) {
                    AsyncImage(
                        model = episodeImage,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.matchParentSize(),
                    )
                }
                Box(
                    modifier = Modifier
                        .matchParentSize()
                        .background(
                            Brush.horizontalGradient(
                                colors = listOf(
                                    ArvioSkin.colors.background.copy(alpha = 0.98f),
                                    ArvioSkin.colors.surface.copy(alpha = 0.88f),
                                )
                            )
                        )
                )
                Column(modifier = Modifier.padding(24.dp)) {
                    // Header
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.SkipNext,
                            contentDescription = null,
                            tint = accentColor,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = stringResource(R.string.next).uppercase(),
                            style = ArflixTypography.label,
                            color = accentColor
                        )
                        Spacer(modifier = Modifier.weight(1f))
                        Text(
                            text = "in ${countdown}s",
                            style = ArflixTypography.body,
                            color = ArvioSkin.colors.textMuted
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Episode preview
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Thumbnail
                        Box(
                            modifier = Modifier
                                .width(160.dp)
                                .aspectRatio(16f / 9f)
                                .clip(RoundedCornerShape(12.dp))
                        ) {
                            if (episodeImage != null) {
                                AsyncImage(
                                    model = episodeImage,
                                    contentDescription = episodeTitle,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize()
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .background(ArvioSkin.colors.surfaceRaised),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.PlayArrow,
                                        contentDescription = null,
                                        tint = ArvioSkin.colors.textMuted,
                                        modifier = Modifier.size(32.dp)
                                    )
                                }
                            }

                            // Progress bar at bottom
                            Box(
                                modifier = Modifier
                                    .align(Alignment.BottomCenter)
                                    .height(4.dp)
                                    .fillMaxSize()
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxHeight()
                                        .fillMaxSize()
                                        .background(ArvioSkin.colors.textMuted.copy(alpha = 0.3f))
                                )
                                Box(
                                    modifier = Modifier
                                        .fillMaxHeight()
                                        .width((160 * progress).dp)
                                        .background(accentColor)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.width(16.dp))

                        // Episode info
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = showTitle,
                                style = ArflixTypography.caption,
                                color = ArvioSkin.colors.textMuted
                            )
                            Text(
                                text = episodeTitle,
                                style = ArflixTypography.cardTitle,
                                color = ArvioSkin.colors.textPrimary,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "S$seasonNumber E$episodeNumber",
                                style = ArflixTypography.badge,
                                color = ArvioSkin.colors.textMuted
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Buttons
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Play button
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp)
                                .background(
                                    if (focusedButton == 0) accentColor else ArvioSkin.colors.surfaceRaised.copy(alpha = 0.82f),
                                    RoundedCornerShape(12.dp)
                                )
                                .border(
                                    width = 1.dp,
                                    color = if (focusedButton == 0) accentColor else ArvioSkin.colors.focusOutline.copy(alpha = 0.2f),
                                    shape = RoundedCornerShape(12.dp)
                                )
                                .clickable { playNextOnce() },
                            contentAlignment = Alignment.Center
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.PlayArrow,
                                    contentDescription = null,
                                    tint = if (focusedButton == 0) ArvioSkin.colors.background else ArvioSkin.colors.textMuted,
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = stringResource(R.string.play).uppercase(),
                                    style = ArflixTypography.button,
                                    color = if (focusedButton == 0) ArvioSkin.colors.background else ArvioSkin.colors.textMuted
                                )
                            }
                        }

                        // Cancel button
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .background(
                                    if (focusedButton == 1) accentColor else ArvioSkin.colors.surfaceRaised.copy(alpha = 0.82f),
                                    RoundedCornerShape(12.dp)
                                )
                                .border(
                                    width = 1.dp,
                                    color = if (focusedButton == 1) accentColor else ArvioSkin.colors.focusOutline.copy(alpha = 0.2f),
                                    shape = RoundedCornerShape(12.dp)
                                )
                                .clickable { cancelOnce() },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = stringResource(R.string.cancel),
                                tint = if (focusedButton == 1) ArvioSkin.colors.background else ArvioSkin.colors.textMuted,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
