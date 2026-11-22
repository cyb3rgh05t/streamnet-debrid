package com.arflix.tv.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.tv.material3.Border
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Surface
import androidx.tv.material3.SurfaceDefaults
import androidx.tv.material3.Text
import com.arflix.tv.R
import com.arflix.tv.ui.skin.ArvioSkin
import com.arflix.tv.ui.skin.resolveAccentColor
import com.arflix.tv.ui.theme.contrastingContentColor
import com.arflix.tv.util.LocalDeviceType
import androidx.compose.material3.Button as TouchButton
import androidx.compose.material3.ButtonDefaults as TouchButtonDefaults
import androidx.compose.material3.OutlinedButton as TouchOutlinedButton

/**
 * Shown after profile selection when the cloud could not be read, so the app cannot tell whether a
 * playlist is already stored there. Lets the user retry, set the playlist up now, or decide later.
 */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun CloudSetupUnavailableDialog(
    isRetrying: Boolean,
    onRetry: () -> Unit,
    onSetup: () -> Unit,
    onDismiss: () -> Unit,
) {
    val isTouchDevice = LocalDeviceType.current.isTouchDevice()
    val retryFocusRequester = remember { FocusRequester() }
    val colors = ArvioSkin.colors
    val accent = resolveAccentColor(colors.accent)
    val shape = RoundedCornerShape(ArvioSkin.radius.lg)

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier
                .widthIn(max = 560.dp)
                .fillMaxWidth()
                .border(1.dp, accent.copy(alpha = 0.22f), shape),
            shape = shape,
            colors = SurfaceDefaults.colors(containerColor = colors.surfaceRaised)
        ) {
            Column(
                modifier = Modifier
                    .background(
                        Brush.linearGradient(
                            listOf(accent.copy(alpha = 0.07f), colors.surfaceRaised, colors.surfaceRaised)
                        )
                    )
                    .padding(28.dp)
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(18.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(60.dp)
                            .background(accent.copy(alpha = 0.08f), RoundedCornerShape(18.dp))
                            .border(1.dp, accent.copy(alpha = 0.2f), RoundedCornerShape(18.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.CloudOff,
                            contentDescription = null,
                            tint = accent,
                            modifier = Modifier.size(30.dp)
                        )
                    }
                    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        Text(
                            text = "StreamNet",
                            style = ArvioSkin.typography.body.copy(fontSize = 12.sp, fontWeight = FontWeight.Medium),
                            color = accent
                        )
                        Text(
                            text = stringResource(R.string.tv_setup_cloud_unavailable_title),
                            style = ArvioSkin.typography.sectionTitle,
                            color = colors.textPrimary
                        )
                    }
                }
                Spacer(Modifier.height(20.dp))
                Text(
                    text = stringResource(R.string.tv_setup_cloud_unavailable_message),
                    style = ArvioSkin.typography.body,
                    color = colors.textMuted
                )
                Spacer(Modifier.height(24.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    DialogButton(
                        text = stringResource(R.string.retry),
                        accent = accent,
                        filled = true,
                        enabled = !isRetrying,
                        isTouchDevice = isTouchDevice,
                        onClick = onRetry,
                        modifier = Modifier.focusRequester(retryFocusRequester),
                    )
                    DialogButton(
                        text = stringResource(R.string.tv_setup_cloud_unavailable_setup),
                        accent = accent,
                        filled = false,
                        enabled = true,
                        isTouchDevice = isTouchDevice,
                        onClick = onSetup,
                    )
                    DialogButton(
                        text = stringResource(R.string.later),
                        accent = accent,
                        filled = false,
                        enabled = true,
                        isTouchDevice = isTouchDevice,
                        onClick = onDismiss,
                    )
                }
            }
        }
        LaunchedEffect(isTouchDevice) {
            if (!isTouchDevice) retryFocusRequester.requestFocus()
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun RowScope.DialogButton(
    text: String,
    accent: Color,
    filled: Boolean,
    enabled: Boolean,
    isTouchDevice: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = ArvioSkin.colors
    val buttonShape = RoundedCornerShape(10.dp)
    if (isTouchDevice) {
        val buttonModifier = modifier.weight(1f).height(48.dp)
        if (filled) {
            TouchButton(
                onClick = onClick,
                enabled = enabled,
                modifier = buttonModifier,
                shape = buttonShape,
                contentPadding = PaddingValues(horizontal = 8.dp),
                colors = TouchButtonDefaults.buttonColors(
                    containerColor = accent,
                    contentColor = contrastingContentColor(accent),
                ),
            ) {
                Text(text = text, style = ArvioSkin.typography.button, maxLines = 1)
            }
        } else {
            TouchOutlinedButton(
                onClick = onClick,
                modifier = buttonModifier,
                shape = buttonShape,
                contentPadding = PaddingValues(horizontal = 8.dp),
                border = BorderStroke(1.dp, accent),
                colors = TouchButtonDefaults.outlinedButtonColors(contentColor = colors.textPrimary),
            ) {
                Text(text = text, style = ArvioSkin.typography.button, color = colors.textPrimary, maxLines = 1)
            }
        }
    } else {
        val border = Border(border = BorderStroke(1.dp, accent), shape = buttonShape)
        Button(
            onClick = onClick,
            enabled = enabled,
            modifier = modifier.weight(1f).height(42.dp),
            colors = ButtonDefaults.colors(
                containerColor = if (filled) accent.copy(alpha = 0.22f) else Color.Transparent,
                contentColor = colors.textMuted,
                focusedContainerColor = accent,
                focusedContentColor = contrastingContentColor(accent),
            ),
            shape = ButtonDefaults.shape(shape = buttonShape),
            border = ButtonDefaults.border(border = border, focusedBorder = border),
            scale = ButtonDefaults.scale(focusedScale = 1f),
        ) {
            Text(
                text = text,
                modifier = Modifier.fillMaxWidth(),
                style = ArvioSkin.typography.button,
                textAlign = TextAlign.Center,
                maxLines = 1,
            )
        }
    }
}
