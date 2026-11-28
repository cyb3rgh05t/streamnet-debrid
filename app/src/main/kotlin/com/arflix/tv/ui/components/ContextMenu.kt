package com.arflix.tv.ui.components

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.foundation.focusable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.arflix.tv.R
import com.arflix.tv.ui.theme.ArflixTypography
import com.arflix.tv.ui.theme.BackgroundCard
import com.arflix.tv.ui.theme.BackgroundElevated
import com.arflix.tv.ui.theme.Pink
import com.arflix.tv.ui.theme.TextPrimary
import com.arflix.tv.ui.theme.TextSecondary
import com.arflix.tv.ui.skin.resolveAccentColor
import com.arflix.tv.ui.theme.contrastingContentColor
import com.arflix.tv.util.LocalDeviceType

/**
 * Context menu action
 */
data class ContextAction(
    val id: String,
    val label: String,
    val icon: ImageVector,
    val color: Color = TextPrimary
)

/**
 * Predefined context actions
 */
object ContextActions {
    val play = ContextAction("play", "Play", Icons.Default.PlayArrow, Pink)
    val selectSource = ContextAction("sources", "Select Source", Icons.Default.Info, TextPrimary)
    val markWatched = ContextAction("mark_watched", "Mark as Watched", Icons.Default.Visibility, Color(0xFF22C55E))
    val markUnwatched = ContextAction("mark_unwatched", "Mark as Unwatched", Icons.Default.VisibilityOff, TextSecondary)
    val addWatchlist = ContextAction("add_watchlist", "Add to Watchlist", Icons.Default.BookmarkBorder, Pink)
    val removeWatchlist = ContextAction("remove_watchlist", "Remove from Watchlist", Icons.Default.Bookmark, TextSecondary)
    val viewDetails = ContextAction("view_details", "View Details", Icons.Default.Info, TextPrimary)
    val markSeasonWatched = ContextAction("mark_season_watched", "Mark Season Watched", Icons.Default.Check, Color(0xFF22C55E))
    val markSeasonUnwatched = ContextAction("mark_season_unwatched", "Mark Season Unwatched", Icons.Default.Clear, TextSecondary)
}

@Composable
private fun localizedContextActionLabel(action: ContextAction): String = when (action.id) {
    "play" -> stringResource(R.string.context_action_play)
    "sources" -> stringResource(R.string.stream_title_select_source)
    "mark_watched" -> stringResource(R.string.component_mark_watched)
    "mark_unwatched" -> stringResource(R.string.context_action_mark_unwatched)
    "add_watchlist" -> stringResource(R.string.add_to_watchlist)
    "remove_watchlist" -> stringResource(R.string.remove_from_watchlist)
    "view_details" -> stringResource(R.string.context_action_view_details)
    "mark_season_watched" -> stringResource(R.string.context_action_mark_season_watched)
    "mark_season_unwatched" -> stringResource(R.string.context_action_mark_season_unwatched)
    else -> action.label
}

/**
 * Context menu for media items and episodes, shown in the shared [ArvioMenuDialog].
 */
@Composable
fun ContextMenu(
    isVisible: Boolean,
    title: String,
    subtitle: String? = null,
    actions: List<ContextAction>,
    onAction: (ContextAction) -> Unit = {},
    onDismiss: () -> Unit = {}
) {
    if (!isVisible) return
    val entries = actions.map { action ->
        ArvioMenuEntry(
            label = localizedContextActionLabel(action),
            icon = action.icon,
            onClick = { onAction(action) }
        )
    }
    ArvioMenuDialog(
        title = title,
        subtitle = subtitle,
        entries = entries,
        onDismiss = onDismiss
    )
}
/**
 * Episode context menu with standard actions
 */
@Composable
fun EpisodeContextMenu(
    isVisible: Boolean,
    episodeName: String,
    seasonEpisode: String,
    isWatched: Boolean,
    onPlay: () -> Unit,
    onSelectSource: () -> Unit,
    onToggleWatched: () -> Unit,
    onDismiss: () -> Unit
) {
    val actions = listOf(
        ContextActions.play,
        ContextActions.selectSource,
        if (isWatched) ContextActions.markUnwatched else ContextActions.markWatched
    )

    ContextMenu(
        isVisible = isVisible,
        title = episodeName,
        subtitle = seasonEpisode,
        actions = actions,
        onAction = { action ->
            when (action.id) {
                "play" -> onPlay()
                "sources" -> onSelectSource()
                "mark_watched", "mark_unwatched" -> onToggleWatched()
            }
            onDismiss()
        },
        onDismiss = onDismiss
    )
}

@Composable
fun SeasonContextMenu(
    isVisible: Boolean,
    seasonNumber: Int,
    onMarkSeasonWatched: () -> Unit,
    onMarkSeasonUnwatched: () -> Unit,
    onDismiss: () -> Unit
) {
    ContextMenu(
        isVisible = isVisible,
        title = stringResource(R.string.context_title_season, seasonNumber),
        subtitle = stringResource(R.string.context_quick_actions),
        actions = listOf(
            ContextActions.markSeasonWatched,
            ContextActions.markSeasonUnwatched
        ),
        onAction = { action ->
            when (action.id) {
                "mark_season_watched" -> onMarkSeasonWatched()
                "mark_season_unwatched" -> onMarkSeasonUnwatched()
            }
            onDismiss()
        },
        onDismiss = onDismiss
    )
}

/**
 * Media item context menu with standard actions
 */
@Composable
fun MediaContextMenu(
    isVisible: Boolean,
    title: String,
    year: String? = null,
    isWatched: Boolean,
    isInWatchlist: Boolean,
    onPlay: () -> Unit,
    onSelectSource: () -> Unit,
    onToggleWatched: () -> Unit,
    onToggleWatchlist: () -> Unit,
    onViewDetails: () -> Unit,
    onDismiss: () -> Unit
) {
    val actions = listOf(
        ContextActions.play,
        ContextActions.selectSource,
        if (isWatched) ContextActions.markUnwatched else ContextActions.markWatched,
        if (isInWatchlist) ContextActions.removeWatchlist else ContextActions.addWatchlist,
        ContextActions.viewDetails
    )

    ContextMenu(
        isVisible = isVisible,
        title = title,
        subtitle = year,
        actions = actions,
        onAction = { action ->
            when (action.id) {
                "play" -> onPlay()
                "sources" -> onSelectSource()
                "mark_watched", "mark_unwatched" -> onToggleWatched()
                "add_watchlist", "remove_watchlist" -> onToggleWatchlist()
                "view_details" -> onViewDetails()
            }
            onDismiss()
        },
        onDismiss = onDismiss
    )
}
