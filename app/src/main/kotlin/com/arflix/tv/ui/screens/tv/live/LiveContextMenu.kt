package com.arflix.tv.ui.screens.tv.live

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import kotlinx.coroutines.delay
import com.arflix.tv.R
import com.arflix.tv.ui.components.ArvioMenuDialog
import com.arflix.tv.ui.components.ArvioMenuEntry

/** Long-press menu of a channel: favorite, source, position in its category and hide/unhide. */
@Composable
internal fun ChannelContextMenu(
    channel: EnrichedChannel,
    isFavorite: Boolean,
    hasVariants: Boolean,
    canMove: Boolean,
    inHiddenChannels: Boolean,
    // The Netflix rail runs left to right, so its moves read left/right instead of up/down.
    horizontal: Boolean = false,
    onToggleFavorite: () -> Unit,
    onOpenVariants: () -> Unit,
    onMoveToTop: () -> Unit,
    onMoveUp: () -> Unit,
    onMoveDown: () -> Unit,
    onToggleHidden: () -> Unit,
    onDismiss: () -> Unit,
) {
    fun entry(label: String, icon: ImageVector, action: () -> Unit) = ArvioMenuEntry(label, icon) {
        onDismiss()
        action()
    }
    val entries = if (inHiddenChannels) {
        listOf(entry(stringResource(R.string.live_menu_unhide_channel), Icons.Filled.Visibility, onToggleHidden))
    } else {
        buildList {
            add(
                entry(
                    stringResource(if (isFavorite) R.string.live_menu_remove_favorite else R.string.live_menu_add_favorite),
                    if (isFavorite) Icons.Filled.StarBorder else Icons.Filled.Star,
                    onToggleFavorite,
                )
            )
            if (hasVariants) {
                add(entry(stringResource(R.string.live_label_choose_source), Icons.Filled.SwapHoriz, onOpenVariants))
            }
            if (canMove) {
                val (topLabel, upLabel, downLabel) = if (horizontal) {
                    Triple(R.string.live_menu_move_start, R.string.live_menu_move_left, R.string.live_menu_move_right)
                } else {
                    Triple(R.string.live_menu_move_top, R.string.live_menu_move_up, R.string.live_menu_move_down)
                }
                add(entry(stringResource(topLabel), if (horizontal) Icons.Filled.KeyboardArrowLeft else Icons.Filled.KeyboardArrowUp, onMoveToTop))
                add(entry(stringResource(upLabel), if (horizontal) Icons.Filled.KeyboardArrowLeft else Icons.Filled.KeyboardArrowUp, onMoveUp))
                add(entry(stringResource(downLabel), if (horizontal) Icons.Filled.KeyboardArrowRight else Icons.Filled.KeyboardArrowDown, onMoveDown))
            }
            add(entry(stringResource(R.string.live_menu_hide_channel), Icons.Filled.VisibilityOff, onToggleHidden))
        }
    }
    ArvioMenuDialog(title = channel.name, entries = entries, onDismiss = onDismiss)
}
