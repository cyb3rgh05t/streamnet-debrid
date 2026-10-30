package com.arflix.tv.ui.components

import androidx.compose.foundation.border
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.PowerSettingsNew
import androidx.compose.material3.Icon
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.font.FontWeight
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

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ExitAppDialog(onConfirm: () -> Unit, onDismiss: () -> Unit) {
    val isTouchDevice = LocalDeviceType.current.isTouchDevice()
    val cancelFocusRequester = remember { FocusRequester() }
    val colors = ArvioSkin.colors
    val accent = resolveAccentColor(colors.accent)
    val shape = RoundedCornerShape(ArvioSkin.radius.lg)
    val buttonShape = RoundedCornerShape(10.dp)

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier
                .widthIn(max = 460.dp)
                .fillMaxWidth()
                .border(1.dp, accent.copy(alpha = 0.22f), shape),
            shape = shape,
            colors = SurfaceDefaults.colors(containerColor = colors.surfaceRaised)
        ) {
            Column(
                modifier = Modifier
                    .background(Brush.linearGradient(listOf(
                        accent.copy(alpha = 0.07f),
                        colors.surfaceRaised,
                        colors.surfaceRaised
                    )))
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
                            imageVector = Icons.Outlined.PowerSettingsNew,
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
                            text = stringResource(R.string.exit_app_title),
                            style = ArvioSkin.typography.sectionTitle,
                            color = colors.textPrimary
                        )
                    }
                }
                Spacer(Modifier.height(20.dp))
                Text(
                    text = stringResource(R.string.exit_app_message),
                    style = ArvioSkin.typography.body,
                    color = colors.textMuted
                )
                Spacer(Modifier.height(12.dp))
                Spacer(Modifier.height(20.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(if (isTouchDevice) 1f else 0.88f).align(Alignment.End),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (isTouchDevice) {
                        TouchButton(
                            onClick = onDismiss,
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = buttonShape,
                            contentPadding = PaddingValues(horizontal = 8.dp),
                            colors = TouchButtonDefaults.buttonColors(
                                containerColor = accent,
                                contentColor = contrastingContentColor(accent),
                            ),
                        ) {
                            Text(
                                text = stringResource(R.string.cancel),
                                style = ArvioSkin.typography.button,
                                maxLines = 1,
                            )
                        }
                        TouchOutlinedButton(
                            onClick = onConfirm,
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = buttonShape,
                            contentPadding = PaddingValues(horizontal = 8.dp),
                            border = BorderStroke(1.dp, accent),
                            colors = TouchButtonDefaults.outlinedButtonColors(contentColor = colors.textMuted),
                        ) {
                            Text(
                                text = stringResource(R.string.exit_app_confirm),
                                style = ArvioSkin.typography.button,
                                maxLines = 1,
                            )
                        }
                    } else {
                        val buttonColors = ButtonDefaults.colors(
                            containerColor = Color.Transparent,
                            contentColor = colors.textMuted,
                            focusedContainerColor = accent,
                            focusedContentColor = contrastingContentColor(accent)
                        )
                        val buttonBorder = ButtonDefaults.border(
                            border = Border(
                                border = BorderStroke(1.dp, accent),
                                shape = buttonShape
                            ),
                            focusedBorder = Border(
                                border = BorderStroke(1.dp, accent),
                                shape = buttonShape
                            )
                        )
                        val buttonShapes = ButtonDefaults.shape(shape = buttonShape)
                        val buttonScale = ButtonDefaults.scale(focusedScale = 1f)
                        Button(
                            onClick = onDismiss,
                            modifier = Modifier.weight(1f).height(42.dp).focusRequester(cancelFocusRequester),
                            colors = buttonColors,
                            shape = buttonShapes,
                            border = buttonBorder,
                            scale = buttonScale
                        ) {
                            Text(
                                text = stringResource(R.string.cancel),
                                modifier = Modifier.fillMaxWidth(),
                                style = ArvioSkin.typography.button,
                                textAlign = TextAlign.Center,
                                maxLines = 1
                            )
                        }
                        Button(
                            onClick = onConfirm,
                            modifier = Modifier.weight(1f).height(42.dp),
                            colors = buttonColors,
                            shape = buttonShapes,
                            border = buttonBorder,
                            scale = buttonScale
                        ) {
                            Text(
                                text = stringResource(R.string.exit_app_confirm),
                                modifier = Modifier.fillMaxWidth(),
                                style = ArvioSkin.typography.button,
                                textAlign = TextAlign.Center,
                                maxLines = 1
                            )
                        }
                    }
                }
            }
        }
        LaunchedEffect(isTouchDevice) {
            if (!isTouchDevice) cancelFocusRequester.requestFocus()
        }
    }
}
