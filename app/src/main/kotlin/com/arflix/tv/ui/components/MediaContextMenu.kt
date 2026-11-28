package com.arflix.tv.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarOutline
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import com.arflix.tv.R

/**
 * Context menu for media cards on the home screen, opened by long press or the Menu button.
 * Rendered by the shared [ArvioMenuDialog] so every long-press menu looks and behaves the same.
 */
@Composable
fun MediaContextMenu(
    isVisible: Boolean,
    title: String,
    isInWatchlist: Boolean,
    isWatched: Boolean,
    isContinueWatching: Boolean = false,
    isIptvChannel: Boolean = false,
    isFavoriteChannel: Boolean = false,
    onPlay: () -> Unit,
    onViewDetails: () -> Unit,
    onToggleWatchlist: () -> Unit,
    onToggleWatched: () -> Unit,
    onToggleFavoriteChannel: () -> Unit = {},
    onRemoveFromContinueWatching: (() -> Unit)? = null,
    onDismiss: () -> Unit
) {
    if (!isVisible) return
    fun entry(label: String, icon: ImageVector, action: () -> Unit) =
        ArvioMenuEntry(label, icon) {
            action()
            onDismiss()
        }

    val entries = buildList {
        add(entry(stringResource(R.string.play), Icons.Default.PlayArrow, onPlay))
        add(
            entry(
                stringResource(if (isIptvChannel) R.string.program_info else R.string.details),
                Icons.Default.Info,
                onViewDetails
            )
        )
        if (isIptvChannel) {
            add(
                entry(
                    stringResource(if (isFavoriteChannel) R.string.remove_from_favorites else R.string.add_to_favorites),
                    if (isFavoriteChannel) Icons.Default.Star else Icons.Default.StarOutline,
                    onToggleFavoriteChannel
                )
            )
        } else {
            add(
                entry(
                    stringResource(if (isInWatchlist) R.string.remove_from_watchlist else R.string.add_to_watchlist),
                    if (isInWatchlist) Icons.Default.Remove else Icons.Default.Add,
                    onToggleWatchlist
                )
            )
            add(
                entry(
                    stringResource(if (isWatched) R.string.unwatched else R.string.watched),
                    if (isWatched) Icons.Default.Visibility else Icons.Default.Check,
                    onToggleWatched
                )
            )
            if (isContinueWatching && onRemoveFromContinueWatching != null) {
                add(entry(stringResource(R.string.delete), Icons.Default.Close, onRemoveFromContinueWatching))
            }
        }
    }

    ArvioMenuDialog(title = title, entries = entries, onDismiss = onDismiss)
}
