package com.arflix.tv.ui.screens.settings

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentPaste
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Icon
import androidx.tv.material3.Text
import com.arflix.tv.R
import com.arflix.tv.data.repository.IptvPlaylistEntry
import com.arflix.tv.data.repository.isStreamNetTvPlaylist
import com.arflix.tv.ui.skin.ArvioSkin
import com.arflix.tv.ui.skin.resolveAccentColor
import com.arflix.tv.ui.theme.AccentYellow
import com.arflix.tv.ui.theme.ArflixTypography
import com.arflix.tv.ui.theme.TextPrimary
import com.arflix.tv.ui.theme.TextSecondary
import com.arflix.tv.util.LocalDeviceType

private const val FieldUser = 0

/**
 * The StreamNet TV sign-in is offered while its entry has no credentials, unless the user already
 * runs another source (own playlist, M3U or Stalker portal).
 */
internal fun shouldPromptStreamNetTv(
    playlists: List<IptvPlaylistEntry>,
    legacyM3uUrl: String,
    stalkerPortalUrl: String,
): Boolean {
    val streamNet = playlists.firstOrNull(::isStreamNetTvPlaylist) ?: return false
    if (streamNet.m3uUrl.isNotBlank()) return false
    val otherPlaylist = playlists.any {
        !isStreamNetTvPlaylist(it) && it.enabled && it.m3uUrl.isNotBlank()
    }
    return !otherPlaylist && legacyM3uUrl.isBlank() && stalkerPortalUrl.isBlank()
}
private const val FieldPassword = 1
private const val ActionPaste = 2
private const val ActionCancel = 3
private const val ActionConfirm = 4

/** Dedicated sign-in dialog for the StreamNet TV system playlist (username and password only). */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
internal fun StreamNetTvLoginModal(
    username: String,
    password: String,
    onUsernameChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    val accentColor = resolveAccentColor(fallback = AccentYellow)
    val modalColors = ArvioSkin.colors
    val isTouchDevice = LocalDeviceType.current.isTouchDevice()
    val clipboard = LocalClipboardManager.current
    var focusedIndex by remember { mutableIntStateOf(FieldUser) }
    var lastFieldIndex by remember { mutableIntStateOf(FieldUser) }
    val userRequester = remember { FocusRequester() }
    val passwordRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) { userRequester.requestFocus() }
    LaunchedEffect(focusedIndex) {
        when (focusedIndex) {
            FieldUser -> userRequester.requestFocus()
            FieldPassword -> passwordRequester.requestFocus()
        }
        if (focusedIndex == FieldUser || focusedIndex == FieldPassword) lastFieldIndex = focusedIndex
    }

    fun pasteIntoLastField() {
        val text = clipboard.getText()?.text?.trim().orEmpty()
        if (text.isBlank()) return
        if (lastFieldIndex == FieldPassword) onPasswordChange(text) else onUsernameChange(text)
    }

    androidx.compose.ui.window.Dialog(
        onDismissRequest = onDismiss,
        properties = androidx.compose.ui.window.DialogProperties(
            dismissOnBackPress = true,
            dismissOnClickOutside = false,
            usePlatformDefaultWidth = false
        )
    ) {
        ModalScrim(onDismiss = onDismiss, showFrame = false) {
            val shape = RoundedCornerShape(24.dp)
            Column(
                modifier = Modifier
                    .fillMaxWidth(if (isTouchDevice) 0.92f else 0.6f)
                    .widthIn(max = 620.dp)
                    .clip(shape)
                    .background(modalColors.surfaceRaised)
                    .background(
                        Brush.linearGradient(
                            listOf(
                                accentColor.copy(alpha = 0.07f),
                                modalColors.surfaceRaised,
                                modalColors.surfaceRaised
                            )
                        )
                    )
                    .border(
                        1.5.dp,
                        Brush.verticalGradient(
                            listOf(accentColor.copy(alpha = 0.75f), accentColor.copy(alpha = 0.18f))
                        ),
                        shape
                    )
                    .padding(if (isTouchDevice) 22.dp else 34.dp)
                    .onPreviewKeyEvent { event ->
                        if (event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                        when (event.key) {
                            Key.Back, Key.Escape -> { onDismiss(); true }
                            Key.DirectionUp -> {
                                focusedIndex = when (focusedIndex) {
                                    FieldPassword -> FieldUser
                                    ActionPaste -> FieldPassword
                                    ActionCancel, ActionConfirm -> ActionPaste
                                    else -> focusedIndex
                                }
                                true
                            }
                            Key.DirectionDown -> {
                                focusedIndex = when (focusedIndex) {
                                    FieldUser -> FieldPassword
                                    FieldPassword -> ActionPaste
                                    ActionPaste -> ActionConfirm
                                    else -> focusedIndex
                                }
                                true
                            }
                            Key.DirectionLeft -> {
                                if (focusedIndex == ActionConfirm) { focusedIndex = ActionCancel; true } else false
                            }
                            Key.DirectionRight -> {
                                if (focusedIndex == ActionCancel) { focusedIndex = ActionConfirm; true } else false
                            }
                            Key.Enter, Key.DirectionCenter -> when (focusedIndex) {
                                ActionPaste -> { pasteIntoLastField(); true }
                                ActionCancel -> { onDismiss(); true }
                                ActionConfirm -> { onConfirm(); true }
                                else -> false
                            }
                            else -> false
                        }
                    },
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Image(
                    painter = painterResource(id = R.drawable.streamnet_tv_logo_full),
                    contentDescription = stringResource(R.string.app_name),
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .widthIn(max = 210.dp)
                        .height(52.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = stringResource(R.string.streamnet_tv_login_title),
                    style = ArflixTypography.sectionTitle,
                    color = TextPrimary,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = stringResource(R.string.settings_streamnet_tv_login_note),
                    style = ArflixTypography.caption,
                    color = TextSecondary,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(bottom = 24.dp)
                )

                StreamNetLoginField(
                    label = stringResource(R.string.settings_label_streamnet_user),
                    placeholder = stringResource(R.string.settings_ph_streamnet_user),
                    value = username,
                    onValueChange = onUsernameChange,
                    icon = Icons.Default.Person,
                    focused = focusedIndex == FieldUser,
                    accentColor = accentColor,
                    requester = userRequester,
                )
                Spacer(modifier = Modifier.height(16.dp))
                StreamNetLoginField(
                    label = stringResource(R.string.settings_label_streamnet_password),
                    placeholder = stringResource(R.string.settings_ph_streamnet_password),
                    value = password,
                    onValueChange = onPasswordChange,
                    icon = Icons.Default.Lock,
                    focused = focusedIndex == FieldPassword,
                    accentColor = accentColor,
                    requester = passwordRequester,
                    isSecret = true,
                )
                Spacer(modifier = Modifier.height(18.dp))

                CloudActionButton(
                    label = stringResource(R.string.streamnet_tv_login_paste),
                    icon = Icons.Default.ContentPaste,
                    focused = focusedIndex == ActionPaste,
                    style = CloudActionStyle.Outlined,
                    accentColor = accentColor,
                    enabled = true,
                    onClick = { pasteIntoLastField() },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    CloudActionButton(
                        label = stringResource(R.string.cancel),
                        icon = Icons.Default.Close,
                        focused = focusedIndex == ActionCancel,
                        style = CloudActionStyle.Ghost,
                        accentColor = accentColor,
                        enabled = true,
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f)
                    )
                    CloudActionButton(
                        label = stringResource(R.string.streamnet_tv_login_connect),
                        icon = Icons.Default.Check,
                        focused = focusedIndex == ActionConfirm,
                        style = CloudActionStyle.Primary,
                        accentColor = accentColor,
                        enabled = true,
                        onClick = onConfirm,
                        modifier = Modifier.weight(1.2f)
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun StreamNetLoginField(
    label: String,
    placeholder: String,
    value: String,
    onValueChange: (String) -> Unit,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    focused: Boolean,
    accentColor: Color,
    requester: FocusRequester,
    isSecret: Boolean = false,
) {
    val fieldShape = RoundedCornerShape(14.dp)
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = label,
            style = ArflixTypography.caption,
            color = if (focused) accentColor else TextSecondary,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        androidx.compose.material3.TextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = true,
            shape = fieldShape,
            placeholder = {
                Text(text = placeholder, style = ArflixTypography.body, color = TextSecondary.copy(alpha = 0.6f))
            },
            leadingIcon = {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = if (focused) accentColor else TextSecondary,
                    modifier = Modifier.size(20.dp)
                )
            },
            visualTransformation = if (isSecret) PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
            textStyle = ArflixTypography.body.copy(color = TextPrimary),
            colors = androidx.compose.material3.TextFieldDefaults.colors(
                focusedTextColor = TextPrimary,
                unfocusedTextColor = TextPrimary,
                focusedContainerColor = accentColor.copy(alpha = 0.08f),
                unfocusedContainerColor = Color.White.copy(alpha = 0.05f),
                focusedIndicatorColor = Color.Transparent,
                unfocusedIndicatorColor = Color.Transparent,
                cursorColor = accentColor
            ),
            modifier = Modifier
                .fillMaxWidth()
                .focusRequester(requester)
                .border(
                    width = if (focused) 2.dp else 1.dp,
                    color = if (focused) accentColor else Color.White.copy(alpha = 0.16f),
                    shape = fieldShape
                )
        )
    }
}
