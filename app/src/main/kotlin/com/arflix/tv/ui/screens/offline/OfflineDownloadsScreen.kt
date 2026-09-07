package com.arflix.tv.ui.screens.offline

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.arflix.tv.R
import com.arflix.tv.data.repository.offline.OfflineDownloadItem
import com.arflix.tv.ui.components.AppTopBar
import com.arflix.tv.ui.components.AppTopBarHeight
import com.arflix.tv.ui.components.MobileContentTopInset
import com.arflix.tv.ui.components.SidebarItem
import com.arflix.tv.ui.components.topBarFocusedItem
import com.arflix.tv.ui.components.topBarMaxIndex
import com.arflix.tv.ui.skin.ArvioFocusableSurface
import com.arflix.tv.ui.skin.ArvioSkin
import com.arflix.tv.ui.skin.rememberArvioCardShape
import com.arflix.tv.ui.skin.resolveAccentColor
import com.arflix.tv.ui.theme.ArflixTypography
import com.arflix.tv.ui.theme.Pink
import com.arflix.tv.ui.theme.TextPrimary
import com.arflix.tv.ui.theme.TextSecondary
import com.arflix.tv.ui.theme.appBackgroundDark
import com.arflix.tv.util.LocalDeviceType
import androidx.compose.ui.layout.ContentScale

private enum class OfflineFocusZone {
    TOP_BAR,
    CONTENT
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun OfflineDownloadsScreen(
    viewModel: OfflineDownloadsViewModel = hiltViewModel(),
    currentProfile: com.arflix.tv.data.model.Profile? = null,
    onNavigateToHome: () -> Unit = {},
    onNavigateToSearch: () -> Unit = {},
    onNavigateToWatchlist: () -> Unit = {},
    onNavigateToTv: () -> Unit = {},
    onNavigateToSettings: () -> Unit = {},
    onSwitchProfile: () -> Unit = {},
    onPlayOfflineDownload: (OfflineDownloadItem) -> Unit = {},
    onBack: () -> Unit = {}
) {
    val downloads by viewModel.downloads.collectAsStateWithLifecycle()
    val isTouch = LocalDeviceType.current.isTouchDevice()
    val focusRequester = remember { FocusRequester() }
    var focusZone by remember { mutableStateOf(OfflineFocusZone.CONTENT) }
    var topBarFocused by remember { mutableIntStateOf(0) }
    var contentFocused by remember { mutableIntStateOf(0) }
    var contentActionFocused by remember { mutableIntStateOf(0) }
    val accent = resolveAccentColor(fallback = Pink)
    val gridColumns = if (isTouch) 2 else 4

    BackHandler(onBack = onBack)

    LaunchedEffect(downloads.size) {
        contentFocused = contentFocused.coerceIn(0, (downloads.size - 1).coerceAtLeast(0))
        contentActionFocused = 0
    }

    LaunchedEffect(isTouch) {
        if (!isTouch) focusRequester.requestFocus()
    }

    fun activateFocusedDownload() {
        val item = downloads.getOrNull(contentFocused) ?: return
        when {
            contentActionFocused == 1 -> viewModel.remove(item.id)
            item.canPlay -> onPlayOfflineDownload(item)
            item.canPause -> viewModel.pause(item.id)
            item.canResume -> viewModel.resume(item.id)
            else -> viewModel.remove(item.id)
        }
    }

    fun activateTopBar() {
        when (topBarFocusedItem(topBarFocused, currentProfile != null)) {
            SidebarItem.SEARCH -> onNavigateToSearch()
            SidebarItem.HOME -> onNavigateToHome()
            SidebarItem.WATCHLIST -> onNavigateToWatchlist()
            SidebarItem.OFFLINE -> Unit
            SidebarItem.TV -> onNavigateToTv()
            SidebarItem.SETTINGS -> onNavigateToSettings()
            null -> onSwitchProfile()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(appBackgroundDark())
            .focusRequester(focusRequester)
            .focusable(enabled = !isTouch)
            .onPreviewKeyEvent { event ->
                if (isTouch || event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                when (event.key) {
                    Key.DirectionUp -> {
                        if (focusZone == OfflineFocusZone.CONTENT) {
                            if (contentFocused >= gridColumns) contentFocused -= gridColumns else focusZone = OfflineFocusZone.TOP_BAR
                        }
                        true
                    }
                    Key.DirectionDown -> {
                        when (focusZone) {
                            OfflineFocusZone.TOP_BAR -> focusZone = OfflineFocusZone.CONTENT
                            OfflineFocusZone.CONTENT -> {
                                val next = contentFocused + gridColumns
                                if (next <= downloads.lastIndex) contentFocused = next
                            }
                        }
                        true
                    }
                    Key.DirectionLeft -> {
                        when (focusZone) {
                            OfflineFocusZone.TOP_BAR -> if (topBarFocused > 0) topBarFocused--
                            OfflineFocusZone.CONTENT -> {
                                if (contentActionFocused == 0) {
                                    contentActionFocused = 1
                                } else if (contentFocused % gridColumns > 0) {
                                    contentFocused--
                                    contentActionFocused = 0
                                }
                            }
                        }
                        true
                    }
                    Key.DirectionRight -> {
                        when (focusZone) {
                            OfflineFocusZone.TOP_BAR -> topBarFocused = (topBarFocused + 1).coerceAtMost(topBarMaxIndex(currentProfile != null))
                            OfflineFocusZone.CONTENT -> {
                                if (contentActionFocused == 1) {
                                    contentActionFocused = 0
                                } else if (contentFocused < downloads.lastIndex && contentFocused % gridColumns < gridColumns - 1) {
                                    contentFocused++
                                    contentActionFocused = 0
                                }
                            }
                        }
                        true
                    }
                    Key.Enter, Key.DirectionCenter -> {
                        when (focusZone) {
                            OfflineFocusZone.TOP_BAR -> activateTopBar()
                            OfflineFocusZone.CONTENT -> activateFocusedDownload()
                        }
                        true
                    }
                    Key.Back, Key.Escape -> {
                        onBack()
                        true
                    }
                    else -> false
                }
            }
    ) {
        if (!isTouch) {
            AppTopBar(
                selectedItem = SidebarItem.OFFLINE,
                isFocused = focusZone == OfflineFocusZone.TOP_BAR,
                focusedIndex = topBarFocused,
                profile = currentProfile
            )
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = if (isTouch) MobileContentTopInset else AppTopBarHeight - 10.dp)
                .padding(horizontal = if (isTouch) 18.dp else 0.dp, vertical = if (isTouch) 8.dp else 0.dp)
        ) {
            Column(modifier = Modifier.padding(horizontal = if (isTouch) 0.dp else 24.dp, vertical = if (isTouch) 0.dp else 1.dp)) {
                OfflineDownloadsTitlePill(accent = accent)
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = offlineDownloadsSummary(downloads),
                    style = ArflixTypography.caption,
                    color = TextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.height(if (isTouch) 20.dp else 18.dp))

            if (downloads.isEmpty()) {
                EmptyOfflineDownloads(accent = accent)
            } else {
                val gridState = rememberLazyGridState()
                LaunchedEffect(contentFocused, downloads.size) {
                    if (!isTouch && downloads.isNotEmpty()) {
                        gridState.animateScrollToItem(contentFocused.coerceIn(0, downloads.lastIndex))
                    }
                }
                LazyVerticalGrid(
                    columns = GridCells.Fixed(gridColumns),
                    state = gridState,
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    verticalArrangement = Arrangement.spacedBy(18.dp),
                    contentPadding = PaddingValues(start = 24.dp, top = 8.dp, end = 24.dp, bottom = 32.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    itemsIndexed(downloads, key = { _, item -> item.id }) { index, item ->
                        OfflineDownloadTile(
                            item = item,
                            isFocused = contentFocused == index && focusZone == OfflineFocusZone.CONTENT,
                            focusedActionIndex = if (contentFocused == index && focusZone == OfflineFocusZone.CONTENT) contentActionFocused else -1,
                            onFocused = { contentFocused = index; focusZone = OfflineFocusZone.CONTENT; contentActionFocused = 0 },
                            onPrimaryFocused = { contentFocused = index; focusZone = OfflineFocusZone.CONTENT; contentActionFocused = 0 },
                            onRemoveFocused = { contentFocused = index; focusZone = OfflineFocusZone.CONTENT; contentActionFocused = 1 },
                            onClick = {
                                when {
                                    item.canPlay -> onPlayOfflineDownload(item)
                                    item.canPause -> viewModel.pause(item.id)
                                    item.canResume -> viewModel.resume(item.id)
                                    else -> viewModel.remove(item.id)
                                }
                            },
                            onRemove = { viewModel.remove(item.id) },
                            accent = accent
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun OfflineDownloadsTitlePill(accent: Color) {
    Row(
        modifier = Modifier
            .background(accent.copy(alpha = 0.16f), RoundedCornerShape(999.dp))
            .border(1.dp, accent.copy(alpha = 0.72f), RoundedCornerShape(999.dp))
            .padding(horizontal = 15.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Icon(Icons.Default.Download, contentDescription = null, tint = accent, modifier = Modifier.size(17.dp))
        Text(
            text = stringResource(R.string.offline_downloads_section),
            style = ArflixTypography.label.copy(fontWeight = FontWeight.Bold),
            color = TextPrimary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun EmptyOfflineDownloads(accent: Color) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.Download, contentDescription = null, tint = accent, modifier = Modifier.size(38.dp))
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                text = stringResource(R.string.offline_downloads_empty_title),
                style = ArflixTypography.cardTitle,
                color = TextPrimary
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = stringResource(R.string.offline_downloads_empty_desc),
                style = ArflixTypography.caption,
                color = TextSecondary
            )
        }
    }
}

@Composable
private fun OfflineDownloadTile(
    item: OfflineDownloadItem,
    isFocused: Boolean,
    focusedActionIndex: Int,
    onFocused: () -> Unit,
    onPrimaryFocused: () -> Unit,
    onRemoveFocused: () -> Unit,
    onClick: () -> Unit,
    onRemove: () -> Unit,
    accent: Color
) {
    val action = item.primaryAction()
    val progress = when {
        item.stateKey == "completed" -> 1f
        item.percent > 0f -> (item.percent / 100f).coerceIn(0f, 1f)
        else -> 0f
    }
    val statusColor = when {
        item.stateKey == "failed" -> Color(0xFFFF6B6B)
        isFocused -> TextPrimary
        else -> TextSecondary
    }
    val shape = rememberArvioCardShape(ArvioSkin.radius.md)
    val artworkUrl = item.backdropUrl ?: item.posterUrl

    Column(modifier = Modifier.fillMaxWidth()) {
        ArvioFocusableSurface(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(16f / 9f),
            shape = shape,
            backgroundColor = Color(0xFF121212),
            outlineColor = accent,
            outlineWidth = 2.5.dp,
            showRestBorder = true,
            focusedScale = 1.045f,
            enableSystemFocus = true,
            isFocusedOverride = isFocused,
            onClick = {
                onPrimaryFocused()
                onClick()
            },
            onLongClick = {
                onFocused()
                onRemove()
            },
            onFocusChanged = { if (it) onFocused() }
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                if (!artworkUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = artworkUrl,
                        contentDescription = item.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                }
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    if (artworkUrl.isNullOrBlank()) accent.copy(alpha = if (isFocused) 0.34f else 0.20f) else Color.Black.copy(alpha = 0.10f),
                                    if (artworkUrl.isNullOrBlank()) Color(0xFF1A1A1F) else Color.Black.copy(alpha = 0.24f),
                                    Color.Black.copy(alpha = if (artworkUrl.isNullOrBlank()) 0.96f else 0.84f)
                                )
                            )
                        )
                )
                if (artworkUrl.isNullOrBlank()) {
                    Icon(
                        imageVector = Icons.Default.Download,
                        contentDescription = null,
                        tint = accent.copy(alpha = if (isFocused) 0.56f else 0.34f),
                        modifier = Modifier
                            .align(Alignment.Center)
                            .size(46.dp)
                    )
                }
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(10.dp)
                        .clickable {
                            onPrimaryFocused()
                            onClick()
                        }
                        .background(if (focusedActionIndex == 0) accent else Color.Black.copy(alpha = 0.58f), RoundedCornerShape(999.dp))
                        .border(1.dp, accent.copy(alpha = if (focusedActionIndex == 0) 0.85f else 0.42f), RoundedCornerShape(999.dp))
                        .padding(horizontal = 10.dp, vertical = 5.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = action.label,
                        style = ArflixTypography.label.copy(fontWeight = FontWeight.Bold),
                        color = if (focusedActionIndex == 0) Color.Black else accent,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Box(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(10.dp)
                        .clickable {
                            onRemoveFocused()
                            onRemove()
                        }
                        .background(if (focusedActionIndex == 1) accent else Color.Black.copy(alpha = 0.58f), RoundedCornerShape(999.dp))
                        .border(1.dp, accent.copy(alpha = if (focusedActionIndex == 1) 0.85f else 0.42f), RoundedCornerShape(999.dp))
                        .padding(horizontal = 9.dp, vertical = 5.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                        Icon(Icons.Default.Delete, contentDescription = null, tint = if (focusedActionIndex == 1) Color.Black else accent, modifier = Modifier.size(15.dp))
                        Text(
                            text = stringResource(R.string.delete),
                            style = ArflixTypography.label.copy(fontWeight = FontWeight.Bold),
                            color = if (focusedActionIndex == 1) Color.Black else accent,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .fillMaxWidth()
                        .background(
                            Brush.verticalGradient(
                                listOf(Color.Transparent, Color.Black.copy(alpha = 0.72f), Color.Black.copy(alpha = 0.92f))
                            )
                        )
                        .padding(12.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                        Icon(action.icon, contentDescription = null, tint = statusColor, modifier = Modifier.size(18.dp))
                        Text(
                            text = item.progressLabel(),
                            style = ArflixTypography.caption.copy(fontWeight = FontWeight.SemiBold),
                            color = statusColor,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    OfflineDownloadProgressBar(
                        progress = progress,
                        accent = accent,
                        trackColor = Color.White.copy(alpha = if (isFocused) 0.20f else 0.11f)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = item.title,
            style = ArflixTypography.cardTitle.copy(fontWeight = FontWeight.SemiBold),
            color = if (isFocused) TextPrimary else TextPrimary.copy(alpha = 0.9f),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = item.statusText(),
            style = ArflixTypography.caption,
            color = TextSecondary,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun OfflineDownloadProgressBar(
    progress: Float,
    accent: Color,
    trackColor: Color
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(7.dp)
            .background(trackColor, RoundedCornerShape(999.dp))
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(progress.coerceIn(0f, 1f))
                .height(7.dp)
                .background(accent, RoundedCornerShape(999.dp))
        )
    }
}

private data class OfflineAction(val label: String, val icon: ImageVector)

@Composable
private fun OfflineDownloadItem.primaryAction(): OfflineAction = when {
    canPlay -> OfflineAction(stringResource(R.string.play), Icons.Default.PlayArrow)
    canPause -> OfflineAction(stringResource(R.string.offline_download_action_pause), Icons.Default.Pause)
    canResume -> OfflineAction(stringResource(R.string.offline_download_action_resume), Icons.Default.Refresh)
    else -> OfflineAction(stringResource(R.string.delete), Icons.Default.Delete)
}

@Composable
private fun OfflineDownloadItem.statusText(): String {
    val state = when (stateKey) {
        "completed" -> stringResource(R.string.offline_download_status_completed)
        "downloading" -> stringResource(R.string.offline_download_status_downloading, percent.toInt().coerceIn(0, 100))
        "failed" -> stringResource(R.string.offline_download_status_failed)
        "queued" -> stringResource(R.string.offline_download_status_queued)
        "removing" -> stringResource(R.string.offline_download_status_removing)
        "restarting" -> stringResource(R.string.offline_download_status_restarting)
        "paused" -> stringResource(R.string.offline_download_status_paused)
        else -> stringResource(R.string.offline_download_status_unknown)
    }
    return listOf(subtitle, state, formatDownloadBytes(bytesDownloaded)).filter { it.isNotBlank() }.joinToString(" • ")
}

@Composable
private fun OfflineDownloadItem.progressLabel(): String {
    return when (stateKey) {
        "completed" -> stringResource(R.string.offline_download_status_completed)
        "downloading" -> stringResource(R.string.offline_download_status_downloading, percent.toInt().coerceIn(0, 100))
        "queued" -> stringResource(R.string.offline_download_status_queued)
        "paused" -> stringResource(R.string.offline_download_status_paused)
        "failed" -> stringResource(R.string.offline_download_status_failed)
        else -> stringResource(R.string.offline_download_status_unknown)
    }
}

@Composable
private fun offlineDownloadsSummary(downloads: List<OfflineDownloadItem>): String {
    if (downloads.isEmpty()) return stringResource(R.string.offline_downloads_empty_desc)
    val active = downloads.count { it.stateKey == "downloading" || it.stateKey == "queued" || it.stateKey == "restarting" }
    val completed = downloads.count { it.stateKey == "completed" }
    return when {
        active > 0 -> stringResource(R.string.offline_download_status_active_count, active)
        completed > 0 -> stringResource(R.string.offline_download_status_completed_count, completed)
        else -> stringResource(R.string.offline_download_status_unknown)
    }
}

private fun formatDownloadBytes(bytes: Long): String {
    if (bytes <= 0L) return ""
    val gib = bytes / (1024.0 * 1024.0 * 1024.0)
    if (gib >= 1.0) return "%.1f GB".format(gib)
    val mib = bytes / (1024.0 * 1024.0)
    return "%.0f MB".format(mib)
}
