package com.arflix.tv.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.foundation.layout.Box
import androidx.compose.ui.unit.dp
import com.arflix.tv.R
import com.arflix.tv.ui.skin.ArvioSkin
import com.arflix.tv.ui.skin.resolveAccentColor
import com.arflix.tv.ui.theme.ArflixTypography
import com.arflix.tv.ui.theme.BackgroundElevated
import com.arflix.tv.ui.theme.TextPrimary
import com.arflix.tv.ui.theme.TextSecondary
import com.arflix.tv.util.LocalDeviceType

@Composable
fun UnknownSourcesModal(
    onDismiss: () -> Unit,
    onOpenSettings: () -> Unit
) {
    var focusedIndex by remember { mutableIntStateOf(1) }
    val focusRequester = remember { FocusRequester() }
    val accent = resolveAccentColor(fallback = ArvioSkin.colors.focusOutline)

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
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.72f))
                .clickable(onClick = onDismiss),
            contentAlignment = Alignment.Center
        ) {
            Column(
                modifier = Modifier
                    .then(
                        if (LocalDeviceType.current.isTouchDevice()) Modifier.fillMaxWidth(0.92f).widthIn(max = 600.dp)
                        else Modifier.width(620.dp)
                    )
                    .background(BackgroundElevated, RoundedCornerShape(18.dp))
                    .border(1.dp, accent.copy(alpha = 0.26f), RoundedCornerShape(18.dp))
                    .padding(if (LocalDeviceType.current.isTouchDevice()) 20.dp else 28.dp)
                    .focusRequester(focusRequester)
                    .focusable()
                    .clickable(enabled = false, onClick = {})
                    .onPreviewKeyEvent { event ->
                        if (event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                        when (event.key) {
                            Key.Back, Key.Escape -> { onDismiss(); true }
                            Key.DirectionLeft -> { focusedIndex = 0; true }
                            Key.DirectionRight -> { focusedIndex = 1; true }
                            Key.Enter, Key.DirectionCenter -> {
                                if (focusedIndex == 0) onDismiss() else onOpenSettings()
                                true
                            }
                            else -> false
                        }
                    },
                horizontalAlignment = Alignment.Start
            ) {
                androidx.compose.material3.Text(
                    text = stringResource(R.string.settings_allow_unknown_sources),
                    style = ArflixTypography.sectionTitle,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(12.dp))
                androidx.compose.material3.Text(
                    text = stringResource(R.string.settings_allow_unknown_sources_desc),
                    style = ArflixTypography.body,
                    color = TextSecondary
                )
                Spacer(modifier = Modifier.height(24.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    ActionButton(
                        label = stringResource(R.string.close),
                        isFocused = focusedIndex == 0,
                        onClick = onDismiss,
                        accent = accent,
                        highlighted = false
                    )
                    ActionButton(
                        label = stringResource(R.string.settings_open_settings),
                        isFocused = focusedIndex == 1,
                        onClick = onOpenSettings,
                        accent = accent,
                        highlighted = true
                    )
                }
            }
        }
    }
}

@Composable
private fun ActionButton(
    label: String,
    isFocused: Boolean,
    onClick: () -> Unit,
    accent: Color,
    highlighted: Boolean
) {
    val background = when {
        highlighted && isFocused -> accent
        isFocused -> Color.White.copy(alpha = 0.16f)
        highlighted -> accent.copy(alpha = 0.18f)
        else -> Color.White.copy(alpha = 0.08f)
    }
    val textColor = when {
        highlighted && isFocused -> ArvioSkin.colors.background
        highlighted -> accent
        else -> TextPrimary
    }

    Box(
        modifier = Modifier
            .background(background, RoundedCornerShape(10.dp))
            .border(1.dp, if (isFocused) accent else Color.White.copy(alpha = 0.12f), RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        androidx.compose.material3.Text(
            text = label,
            style = ArflixTypography.button,
            color = textColor
        )
    }
}