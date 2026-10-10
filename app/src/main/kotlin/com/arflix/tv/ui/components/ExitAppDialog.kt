package com.arflix.tv.ui.components

import androidx.compose.foundation.border
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.style.TextAlign
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

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ExitAppDialog(onConfirm: () -> Unit, onDismiss: () -> Unit) {
    val cancelFocusRequester = remember { FocusRequester() }
    val colors = ArvioSkin.colors
    val accent = resolveAccentColor(colors.accent)
    val shape = RoundedCornerShape(ArvioSkin.radius.lg)
    val buttonShape = RoundedCornerShape(ArvioSkin.radius.sm)

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 420.dp)
                .border(1.dp, colors.textMuted.copy(alpha = 0.15f), shape),
            shape = shape,
            colors = SurfaceDefaults.colors(containerColor = colors.surfaceRaised)
        ) {
            Column(
                modifier = Modifier.padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .background(accent.copy(alpha = 0.08f), RoundedCornerShape(16.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Outlined.PowerSettingsNew,
                        contentDescription = null,
                        tint = accent,
                        modifier = Modifier.size(26.dp)
                    )
                }
                Spacer(Modifier.height(20.dp))
                Text(
                    text = stringResource(R.string.exit_app_title),
                    style = ArvioSkin.typography.sectionTitle,
                    color = colors.textPrimary,
                    textAlign = TextAlign.Center
                )
                Spacer(Modifier.height(12.dp))
                Text(
                    text = stringResource(R.string.exit_app_message),
                    style = ArvioSkin.typography.body,
                    color = colors.textMuted,
                    textAlign = TextAlign.Center
                )
                Spacer(Modifier.height(28.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    val buttonColors = ButtonDefaults.colors(
                        containerColor = colors.surface,
                        contentColor = colors.textPrimary,
                        focusedContainerColor = colors.surface,
                        focusedContentColor = colors.textPrimary
                    )
                    val buttonBorder = ButtonDefaults.border(
                        border = Border(
                            border = BorderStroke(1.dp, colors.textMuted.copy(alpha = 0.15f)),
                            shape = buttonShape
                        ),
                        focusedBorder = Border(
                            border = BorderStroke(2.dp, accent),
                            shape = buttonShape
                        )
                    )
                    val buttonShapes = ButtonDefaults.shape(shape = buttonShape)
                    val buttonScale = ButtonDefaults.scale(focusedScale = 1f)
                    Button(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f).height(44.dp).focusRequester(cancelFocusRequester),
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
                        modifier = Modifier.weight(1f).height(44.dp),
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
        LaunchedEffect(Unit) { cancelFocusRequester.requestFocus() }
    }
}
