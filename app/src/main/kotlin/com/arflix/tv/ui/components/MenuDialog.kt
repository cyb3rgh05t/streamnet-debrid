package com.arflix.tv.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.arflix.tv.ui.screens.tv.live.LiveColors
import com.arflix.tv.ui.screens.tv.live.LiveType
import kotlinx.coroutines.delay

data class ArvioMenuEntry(
    val label: String,
    val icon: ImageVector,
    val onClick: () -> Unit,
)

/**
 * The one long-press / action menu of the app (Home, details, watchlist, Live TV). It lives in its
 * own window so the D-pad keys of the screen underneath cannot interfere; Back or a tap outside
 * dismisses it.
 */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ArvioMenuDialog(
    title: String,
    entries: List<ArvioMenuEntry>,
    onDismiss: () -> Unit,
    subtitle: String? = null,
) {
    if (entries.isEmpty()) return
    val firstFocus = remember { FocusRequester() }
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        LaunchedEffect(Unit) {
            repeat(5) {
                if (runCatching { firstFocus.requestFocus() }.isSuccess) return@LaunchedEffect
                delay(40L)
            }
        }
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.6f))
                .pointerInput(Unit) { detectTapGestures(onTap = { onDismiss() }) },
            contentAlignment = Alignment.Center,
        ) {
            Column(
                modifier = Modifier
                    .width(320.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(LiveColors.PanelRaised)
                    .border(1.5.dp, LiveColors.Accent.copy(alpha = 0.72f), RoundedCornerShape(14.dp))
                    .pointerInput(Unit) { detectTapGestures { } }
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = title,
                    style = LiveType.ChannelName.copy(color = LiveColors.Fg, fontSize = 15.sp),
                    textAlign = TextAlign.Center,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 6.dp, vertical = 4.dp),
                )
                if (!subtitle.isNullOrBlank()) {
                    Text(
                        text = subtitle,
                        style = LiveType.CellTitle.copy(color = LiveColors.FgDim, fontSize = 12.sp),
                        textAlign = TextAlign.Center,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                entries.forEachIndexed { index, entry ->
                    ArvioMenuRow(
                        entry = entry,
                        modifier = if (index == 0) Modifier.focusRequester(firstFocus) else Modifier,
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun ArvioMenuRow(
    entry: ArvioMenuEntry,
    modifier: Modifier = Modifier,
) {
    var focused by remember { mutableStateOf(false) }
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(42.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(if (focused) LiveColors.Panel else LiveColors.PanelDeep)
            .border(
                width = if (focused) 2.dp else 1.dp,
                color = if (focused) LiveColors.FocusRing else LiveColors.Divider,
                shape = RoundedCornerShape(10.dp),
            )
            .onFocusChanged { focused = it.hasFocus }
            // clickable is already focusable; a second focus target made the first click only move focus.
            .clickable(onClick = entry.onClick)
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(
            imageVector = entry.icon,
            contentDescription = null,
            tint = if (focused) LiveColors.Accent else LiveColors.FgDim,
            modifier = Modifier.size(18.dp),
        )
        Text(
            text = entry.label,
            style = LiveType.CellTitle.copy(color = if (focused) LiveColors.Fg else LiveColors.FgDim, fontSize = 13.sp),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}
