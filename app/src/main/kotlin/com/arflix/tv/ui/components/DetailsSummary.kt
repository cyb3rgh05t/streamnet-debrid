package com.arflix.tv.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.material3.Icon
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Subject
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.input.key.*
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.arflix.tv.R
import com.arflix.tv.ui.skin.ArvioSkin
import com.arflix.tv.ui.skin.resolveAccentColor
import com.arflix.tv.util.LocalDeviceType
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import coil.compose.AsyncImage

@Composable
internal fun DetailsSummary(
    text: String,
    style: TextStyle,
    color: Color,
    modifier: Modifier = Modifier,
    focused: Boolean = false,
    openRequest: Int = 0,
    onOverflowChanged: (Boolean) -> Unit = {},
    title: String = "",
    posterUrl: String? = null,
) {
    val accent = resolveAccentColor(ArvioSkin.colors.accent)
    var overflowing by remember(text) { mutableStateOf(false) }
    var expanded by remember(text) { mutableStateOf(false) }
    val overflowCallback by rememberUpdatedState(onOverflowChanged)
    LaunchedEffect(text, overflowing) { overflowCallback(overflowing) }
    LaunchedEffect(openRequest) {
        if (openRequest > 0 && overflowing) expanded = true
    }
    Column(
        modifier = modifier
            .then(if (overflowing) Modifier.clickable { expanded = true } else Modifier)
    ) {
        Text(
            text = text, style = style, color = color,
            maxLines = 8, overflow = TextOverflow.Ellipsis,
            onTextLayout = { overflowing = it.hasVisualOverflow },
        )
        if (overflowing) {
            Row(
                modifier = Modifier.padding(top = 8.dp)
                    .background(accent.copy(alpha = if (focused) 0.2f else 0.08f), RoundedCornerShape(8.dp))
                    .border(1.dp, accent.copy(alpha = if (focused) 0.8f else 0.3f), RoundedCornerShape(8.dp))
                    .padding(horizontal = 10.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Icon(Icons.Outlined.ExpandMore, contentDescription = null, tint = accent, modifier = Modifier.size(16.dp))
                Text(
                    text = stringResource(R.string.summary_read_more),
                    style = ArvioSkin.typography.button,
                    color = ArvioSkin.colors.textPrimary,
                )
            }
        }
    }
    if (expanded) {
        val scroll = rememberScrollState()
        val scope = rememberCoroutineScope()
        val closeButtonFocus = remember { FocusRequester() }
        val isTv = !LocalDeviceType.current.isTouchDevice()
        val dialogShape = RoundedCornerShape(ArvioSkin.radius.lg)
        var closeFocused by remember { mutableStateOf(false) }
        var posterFailed by remember(posterUrl) { mutableStateOf(false) }
        Dialog(
            onDismissRequest = { expanded = false },
            properties = DialogProperties(usePlatformDefaultWidth = false),
        ) {
            LaunchedEffect(isTv) {
                if (isTv) {
                    // Das Dialogfenster nimmt Fokusanfragen erst nach dem ersten Frame an.
                    repeat(20) {
                        delay(50)
                        if (closeFocused) return@LaunchedEffect
                        runCatching { closeButtonFocus.requestFocus() }
                    }
                }
            }
            Column(
                modifier = Modifier
                    .widthIn(min = 280.dp, max = 560.dp)
                    .clip(dialogShape)
                    .background(ArvioSkin.colors.surfaceRaised)
                    .border(1.dp, accent.copy(alpha = 0.32f), dialogShape)
                    .padding(24.dp)
                    .onPreviewKeyEvent {
                        if (it.key == Key.Back) {
                            if (it.type == KeyEventType.KeyUp) expanded = false
                            true
                        } else if (it.type == KeyEventType.KeyDown &&
                            (it.key == Key.DirectionDown || it.key == Key.DirectionUp)
                        ) {
                            val direction = if (it.key == Key.DirectionDown) 1 else -1
                            scope.launch { scroll.animateScrollTo(
                                (scroll.value + direction * 120).coerceIn(0, scroll.maxValue)
                            ) }
                            true
                        } else false
                    },
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    if (!posterUrl.isNullOrBlank() && !posterFailed) {
                        AsyncImage(
                            model = posterUrl,
                            contentDescription = title,
                            contentScale = ContentScale.Crop,
                            onError = { posterFailed = true },
                            modifier = Modifier.size(width = 48.dp, height = 72.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .border(1.dp, accent.copy(alpha = 0.3f), RoundedCornerShape(8.dp)),
                        )
                    } else Icon(
                        Icons.Outlined.Subject, contentDescription = null, tint = accent,
                        modifier = Modifier
                            .background(accent.copy(alpha = 0.1f), RoundedCornerShape(12.dp))
                            .padding(10.dp).size(24.dp),
                    )
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(3.dp),
                    ) {
                        if (title.isNotBlank()) {
                            Text(stringResource(R.string.summary_full), style = ArvioSkin.typography.caption, color = accent)
                        }
                        Text(
                            title.ifBlank { stringResource(R.string.summary_full) },
                            style = ArvioSkin.typography.sectionTitle,
                            color = ArvioSkin.colors.textPrimary,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
                Spacer(Modifier.height(16.dp))
                Text(
                    text = text, style = style.copy(shadow = null), color = ArvioSkin.colors.textPrimary,
                    modifier = Modifier.heightIn(max = 360.dp).verticalScroll(scroll),
                )
                Spacer(Modifier.height(24.dp))
                Row(
                    modifier = Modifier
                        .align(Alignment.End)
                        .focusRequester(closeButtonFocus)
                        .onFocusChanged { closeFocused = it.isFocused }
                        .heightIn(min = 48.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(accent.copy(alpha = if (closeFocused) 0.22f else 0.06f))
                        .border(
                            if (closeFocused) 1.5.dp else 1.dp,
                            accent.copy(alpha = if (closeFocused) 1f else 0.45f),
                            RoundedCornerShape(10.dp),
                        )
                        .clickable(role = Role.Button) { expanded = false }
                        .padding(horizontal = 24.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        stringResource(R.string.summary_close),
                        style = ArvioSkin.typography.button,
                        color = ArvioSkin.colors.textPrimary,
                    )
                }
            }
        }
    }
}
