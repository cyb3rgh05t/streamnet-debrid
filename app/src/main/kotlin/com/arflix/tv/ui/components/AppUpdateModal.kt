package com.arflix.tv.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.SystemUpdate
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.foundation.focusable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.tv.foundation.ExperimentalTvFoundationApi
import androidx.tv.material3.ExperimentalTvMaterial3Api
import com.arflix.tv.BuildConfig
import com.arflix.tv.R
import com.arflix.tv.util.LocalDeviceType
import com.arflix.tv.ui.skin.ArvioSkin
import com.arflix.tv.ui.skin.resolveAccentColor
import com.arflix.tv.ui.theme.ArflixTypography
import com.arflix.tv.updater.AppUpdate
import com.arflix.tv.updater.UpdateStatus

private data class ActionButtonConfig(
    val label: String,
    val action: () -> Unit,
    val highlighted: Boolean = false,
    val enabled: Boolean = true
)

@OptIn(ExperimentalTvMaterial3Api::class, ExperimentalTvFoundationApi::class)
@Composable
fun AppUpdateModal(
    status: UpdateStatus,
    onDownload: () -> Unit,
    onCancelDownload: () -> Unit,
    onInstall: () -> Unit,
    onDismiss: () -> Unit,
    onIgnore: () -> Unit
) {
    val labelClose = stringResource(R.string.close)
    val labelIgnore = stringResource(R.string.update_btn_ignore)
    val labelDownload = stringResource(R.string.update_btn_download)
    val labelInstall = stringResource(R.string.update_btn_install)
    val labelHide = stringResource(R.string.update_btn_hide)
    val labelRetryInstall = stringResource(R.string.update_btn_retry_install)
    val labelCancel = stringResource(R.string.cancel)
    val labelRetry = stringResource(R.string.retry)

    val buttons = remember(
        status,
        labelClose, labelIgnore, labelDownload, labelInstall,
        labelHide, labelRetryInstall, labelCancel, labelRetry
    ) {
        when (status) {
            is UpdateStatus.UpdateAvailable -> listOf(
                ActionButtonConfig(labelClose, onDismiss),
                ActionButtonConfig(labelIgnore, onIgnore),
                ActionButtonConfig(labelDownload, onDownload, highlighted = true)
            )
            is UpdateStatus.ReadyToInstall -> listOf(
                ActionButtonConfig(labelClose, onDismiss),
                ActionButtonConfig(labelInstall, onInstall, highlighted = true)
            )
            is UpdateStatus.Installing -> listOf(
                ActionButtonConfig(labelHide, onDismiss),
                ActionButtonConfig(labelRetryInstall, onInstall, highlighted = true)
            )
            is UpdateStatus.Downloading -> listOf(
                ActionButtonConfig(labelHide, onDismiss),
                ActionButtonConfig(labelCancel, onCancelDownload)
            )
            is UpdateStatus.Failure -> listOf(
                ActionButtonConfig(labelClose, onDismiss),
                ActionButtonConfig(labelRetry, onDownload, highlighted = true)
            )
            else -> listOf(
                ActionButtonConfig(labelClose, onDismiss)
            )
        }
    }

    var focusedIndex by remember(buttons) { mutableIntStateOf(buttons.lastIndex) }
    val focusRequester = remember { FocusRequester() }
    val accent = resolveAccentColor(fallback = ArvioSkin.colors.focusOutline)
    val update = status.updateOrNull()
    val cardShape = RoundedCornerShape(12.dp)

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            dismissOnBackPress = true,
            dismissOnClickOutside = true,
            usePlatformDefaultWidth = false
        )
    ) {
        ModalScrim(onDismiss = onDismiss) {
            Column(
                modifier = Modifier
                    .then(
                        if (LocalDeviceType.current.isTouchDevice()) Modifier.fillMaxWidth(0.92f).widthIn(max = 600.dp)
                        else Modifier.width(760.dp)
                    )
                    .clip(cardShape)
                    .background(ArvioSkin.colors.surface)
                    .border(1.dp, accent.copy(alpha = 0.38f), cardShape)
                    .padding(if (LocalDeviceType.current.isTouchDevice()) 20.dp else 28.dp)
                    .focusRequester(focusRequester)
                    .focusable()
                    .onPreviewKeyEvent { event ->
                        if (event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                        when (event.key) {
                            Key.Back, Key.Escape -> { onDismiss(); true }
                            Key.DirectionLeft -> {
                                focusedIndex = (focusedIndex - 1).coerceAtLeast(0)
                                true
                            }
                            Key.DirectionRight -> {
                                focusedIndex = (focusedIndex + 1).coerceAtMost(buttons.lastIndex)
                                true
                            }
                            Key.Enter, Key.DirectionCenter -> {
                                buttons.getOrNull(focusedIndex)?.action?.invoke()
                                true
                            }
                            else -> false
                        }
                    }
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    Box(
                        modifier = Modifier
                            .size(46.dp)
                            .background(accent.copy(alpha = 0.16f), RoundedCornerShape(10.dp)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = Icons.Default.SystemUpdate,
                            contentDescription = null,
                            tint = accent,
                            modifier = Modifier.size(25.dp),
                        )
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        androidx.compose.material3.Text(
                            text = stringResource(R.string.update_github_releases),
                            style = ArflixTypography.sectionTitle,
                            color = ArvioSkin.colors.textPrimary,
                        )
                        androidx.compose.material3.Text(
                            text = stringResource(R.string.app_update),
                            style = ArflixTypography.caption,
                            color = ArvioSkin.colors.textMuted,
                        )
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))

                val subtitle = when (status) {
                    is UpdateStatus.Checking -> stringResource(R.string.update_msg_checking)
                    is UpdateStatus.UpdateAvailable -> stringResource(R.string.update_msg_available, status.update.title, status.update.tag)
                    is UpdateStatus.Downloading -> stringResource(R.string.update_msg_downloading)
                    is UpdateStatus.ReadyToInstall -> stringResource(R.string.update_msg_ready_subtitle, status.update.title)
                    is UpdateStatus.Installing -> stringResource(R.string.update_msg_installing)
                    is UpdateStatus.Failure -> stringResource(R.string.update_msg_failed)
                    is UpdateStatus.Success -> stringResource(R.string.update_msg_uptodate)
                    is UpdateStatus.Idle -> stringResource(R.string.update_msg_no_info)
                }
                androidx.compose.material3.Text(subtitle, style = ArflixTypography.body, color = ArvioSkin.colors.textMuted)

                Spacer(modifier = Modifier.height(14.dp))

                if (update != null) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(ArvioSkin.colors.background.copy(alpha = 0.72f), RoundedCornerShape(10.dp))
                            .padding(horizontal = 16.dp, vertical = 13.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        VersionBlock(
                            label = stringResource(R.string.update_installed_version),
                            value = BuildConfig.VERSION_NAME,
                            modifier = Modifier.weight(1f),
                        )
                        Icon(
                            imageVector = Icons.Default.ArrowForward,
                            contentDescription = null,
                            tint = accent,
                            modifier = Modifier.padding(horizontal = 14.dp).size(20.dp),
                        )
                        VersionBlock(
                            label = stringResource(R.string.update_available_version),
                            value = update.tag,
                            valueColor = accent,
                            modifier = Modifier.weight(1f),
                        )
                        Column(horizontalAlignment = Alignment.End) {
                            androidx.compose.material3.Text(
                                text = update.assetName,
                                style = ArflixTypography.caption,
                                color = ArvioSkin.colors.textMuted,
                            )
                            update.assetSizeBytes?.let { size ->
                                androidx.compose.material3.Text(
                                    text = formatUpdateSize(size),
                                    style = ArflixTypography.badge,
                                    color = ArvioSkin.colors.textMuted,
                                )
                            }
                        }
                    }
                } else if (status is UpdateStatus.Success) {
                    androidx.compose.material3.Text(
                        text = stringResource(R.string.update_msg_current_uptodate, BuildConfig.VERSION_NAME),
                        style = ArflixTypography.caption,
                        color = accent,
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                if (status is UpdateStatus.Failure) {
                    androidx.compose.material3.Text(status.message, style = ArflixTypography.body, color = Color(0xFFFF6B6B))
                    Spacer(modifier = Modifier.height(12.dp))
                }

                when (status) {
                    is UpdateStatus.Downloading -> {
                        LinearProgressIndicator(
                            progress = status.progress ?: 0f,
                            modifier = Modifier.fillMaxWidth(),
                            color = accent,
                            trackColor = ArvioSkin.colors.surfaceRaised,
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        androidx.compose.material3.Text(
                            text = status.progress?.let { "${(it * 100).toInt()}%" } ?: stringResource(R.string.update_msg_preparing),
                            style = ArflixTypography.caption,
                            color = ArvioSkin.colors.textMuted,
                        )
                    }
                    is UpdateStatus.ReadyToInstall -> {
                        androidx.compose.material3.Text(stringResource(R.string.update_msg_ready), style = ArflixTypography.body, color = accent)
                    }
                    is UpdateStatus.Installing -> {
                        androidx.compose.material3.Text(stringResource(R.string.update_msg_installer_hint), style = ArflixTypography.body, color = ArvioSkin.colors.textPrimary)
                    }
                    is UpdateStatus.UpdateAvailable -> {
                        if (status.update.notes.isNotBlank()) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(ArvioSkin.colors.surfaceRaised.copy(alpha = 0.62f), RoundedCornerShape(10.dp))
                                    .padding(14.dp),
                            ) {
                                androidx.compose.material3.Text(
                                    text = stringResource(R.string.update_release_notes),
                                    style = ArflixTypography.label,
                                    color = accent,
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                androidx.compose.material3.Text(
                                    text = status.update.notes.take(1800),
                                    style = ArflixTypography.caption.copy(lineHeight = 18.sp),
                                    color = ArvioSkin.colors.textMuted,
                                    modifier = Modifier.heightIn(max = 210.dp).verticalScroll(rememberScrollState()),
                                )
                            }
                        }
                    }
                    else -> {}
                }

                Spacer(modifier = Modifier.height(24.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.End),
                ) {
                    buttons.forEachIndexed { index, btn ->
                        UpdateActionButton(
                            label = btn.label,
                            isFocused = focusedIndex == index,
                            onClick = btn.action,
                            highlighted = btn.highlighted,
                            enabled = btn.enabled
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ModalScrim(
    onDismiss: () -> Unit,
    content: @Composable BoxScope.() -> Unit
) {
    val scrimInteraction = remember { MutableInteractionSource() }
    val contentInteraction = remember { MutableInteractionSource() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.72f))
            .clickable(
                interactionSource = scrimInteraction,
                indication = null,
                onClick = onDismiss
            ),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier.clickable(
                interactionSource = contentInteraction,
                indication = null,
                onClick = {}
            ),
            content = content
        )
    }
}

@Composable
private fun UpdateActionButton(
    label: String,
    isFocused: Boolean,
    onClick: () -> Unit,
    highlighted: Boolean = false,
    enabled: Boolean = true
) {
    val accent = resolveAccentColor(fallback = ArvioSkin.colors.focusOutline)
    val background = when {
        !enabled -> ArvioSkin.colors.surfaceRaised.copy(alpha = 0.45f)
        isFocused -> accent
        highlighted -> accent.copy(alpha = 0.18f)
        else -> ArvioSkin.colors.surfaceRaised
    }
    val textColor = when {
        !enabled -> ArvioSkin.colors.textMuted.copy(alpha = 0.6f)
        isFocused -> ArvioSkin.colors.background
        highlighted -> accent
        else -> ArvioSkin.colors.textMuted
    }

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(10.dp))
            .background(background)
            .border(
                width = 1.dp,
                color = if (isFocused) accent else ArvioSkin.colors.focusOutline.copy(alpha = 0.16f),
                shape = RoundedCornerShape(10.dp),
            )
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        androidx.compose.material3.Text(
            text = label,
            color = textColor,
            style = ArflixTypography.button,
            fontSize = 13.sp
        )
    }
}

@Composable
private fun VersionBlock(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    valueColor: Color = ArvioSkin.colors.textPrimary,
) {
    Column(modifier = modifier) {
        androidx.compose.material3.Text(label, style = ArflixTypography.badge, color = ArvioSkin.colors.textMuted)
        Spacer(modifier = Modifier.height(3.dp))
        androidx.compose.material3.Text(value, style = ArflixTypography.cardTitle, color = valueColor)
    }
}

private fun UpdateStatus.updateOrNull(): AppUpdate? = when (this) {
    is UpdateStatus.UpdateAvailable -> update
    is UpdateStatus.Downloading -> update
    is UpdateStatus.ReadyToInstall -> update
    is UpdateStatus.Installing -> update
    is UpdateStatus.Failure -> update
    else -> null
}

private fun formatUpdateSize(bytes: Long): String =
    "%.1f MB".format(bytes.toDouble() / (1024.0 * 1024.0))
