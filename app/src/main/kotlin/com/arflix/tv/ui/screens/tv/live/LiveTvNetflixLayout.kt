@file:Suppress("UnsafeOptInUsageError")

package com.arflix.tv.ui.screens.tv.live

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.arflix.tv.R
import com.arflix.tv.data.model.IptvNowNext
import com.arflix.tv.data.model.IptvProgram
import com.arflix.tv.ui.components.LoadingIndicator
import kotlinx.coroutines.delay
import java.text.DateFormat
import java.util.Date

// Netflix-style Live TV layout for TV mode only. Touch layout stays in LiveTvScreen.

private val HeroHeight = 260.dp          // smaller hero → more room for channel rail
private val CategoryRowHeight = 48.dp
private val ChannelCardWidth = 220.dp
private val HeroCornerRadius = 18.dp
private val CardCornerRadius = 14.dp
private const val HeroUpcomingMax = 2

private data class NetflixCategoryItem(val id: String, val label: String, val count: Int)

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
internal fun LiveTvNetflixLayout(
    tree: LiveCategoryTree,
    selectedCategoryId: String,
    hiddenGroups: Set<String>,
    groupOrder: List<String>,
    channels: List<EnrichedChannel>,
    playingChannelId: String?,
    focusedChannelId: String?,
    playingChannel: EnrichedChannel?,
    nowNextMap: Map<String, IptvNowNext>,
    favoriteSet: Set<String>,
    exoPlayer: ExoPlayer,
    guideClockMillis: Long,
    playlistLastRefreshedAtMillis: Long?,
    isPlaylistRefreshing: Boolean,
    variantCountFor: (EnrichedChannel) -> Int,
    isFullScreen: Boolean,
    isBuffering: Boolean = false,
    lookupBackdrop: suspend (IptvProgram) -> String? = { null },
    lookupLogo: suspend (IptvProgram) -> String? = { null },
    onSelectCategory: (String) -> Unit,
    onOpenSearch: () -> Unit,
    onCategoryFocused: () -> Unit,
    onChannelFocused: (EnrichedChannel) -> Unit,
    onChannelSelected: (EnrichedChannel) -> Unit,
    onFavoriteToggle: (String) -> Unit,
    onRefreshPlaylist: () -> Unit,
    onOpenVariants: (EnrichedChannel) -> Unit,
    onMoveUpFromCategory: () -> Unit,
    onMoveDownToChannels: () -> Unit,
    onOpenFullscreen: () -> Unit,
    focusSelectedChannelSignal: Int,
    focusSelectedCategorySignal: Int,
    categoryFocusRequester: FocusRequester,
    modifier: Modifier = Modifier,
) {
    var railEntrySignal by remember { mutableIntStateOf(0) }
    var railFocusPending by remember { mutableStateOf(false) }
    val heroFocusRequester = remember { FocusRequester() }
    var previewChannelId by remember { mutableStateOf(focusedChannelId ?: playingChannelId) }
    LaunchedEffect(channels, focusedChannelId, playingChannelId) {
        if (channels.none { it.id == previewChannelId }) {
            previewChannelId = focusedChannelId?.takeIf { id -> channels.any { it.id == id } }
                ?: playingChannelId?.takeIf { id -> channels.any { it.id == id } }
                ?: channels.firstOrNull()?.id
        }
    }
    val previewChannel = if (channels.isEmpty()) {
        null
    } else {
        channels.firstOrNull { it.id == previewChannelId } ?: playingChannel
    }
    val previewNowNext = previewChannel?.let { nowNextMap[it.id] }
    val emptyCategoryMessage = when {
        channels.isNotEmpty() -> null
        selectedCategoryId == "fav" -> stringResource(R.string.live_empty_no_favorites)
        else -> stringResource(R.string.live_empty_no_channels_category)
    }
    val selectedCountryCode = remember(tree, selectedCategoryId) {
        tree.countryCodeForCategory(selectedCategoryId)
    }
    val selectedCategoryName = remember(tree, selectedCategoryId) {
        tree.byId(selectedCategoryId)?.label
    }
    val previewFallbackArtwork = remember(
        previewChannel?.source?.group,
        previewChannel?.country,
        selectedCountryCode,
        selectedCategoryName,
    ) {
        previewChannel?.let { channel ->
            liveChannelFallbackArtwork(
                channel.source.group,
                channel.country,
                selectedCountryCode,
                selectedCategoryName,
            )
        }
    }
    val previewBackdropUrl by produceState<String?>(
        initialValue = null,
        key1 = previewChannel?.id,
        key2 = previewNowNext?.now?.startUtcMillis,
    ) {
        value = null
        val program = previewNowNext?.now?.takeIf { it.title.isNotBlank() } ?: return@produceState
        delay(200L)
        value = runCatching { lookupBackdrop(program) }.getOrNull()
    }
    val previewProgramLogoUrl by produceState<String?>(
        initialValue = null,
        key1 = previewChannel?.id,
        key2 = previewNowNext?.now?.startUtcMillis,
    ) {
        value = null
        val program = previewNowNext?.now?.takeIf { it.title.isNotBlank() } ?: return@produceState
        delay(200L)
        value = runCatching { lookupLogo(program) }.getOrNull()
    }
    Column(modifier = modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(HeroHeight)
                .padding(start = 24.dp, end = 24.dp, top = 12.dp, bottom = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            HeroVideoCard(
                exoPlayer = exoPlayer,
                channel = playingChannel,
                isFullScreen = isFullScreen,
                isBuffering = isBuffering,
                focusRequester = heroFocusRequester,
                onClick = onOpenFullscreen,
                onMoveUp = onMoveUpFromCategory,
                onMoveDown = { runCatching { categoryFocusRequester.requestFocus() } },
                modifier = Modifier
                    .fillMaxHeight()
                    .aspectRatio(16f / 9f, matchHeightConstraintsFirst = true),
            )
            HeroInfoPanel(
                channel = previewChannel,
                clockTickMillis = guideClockMillis,
                nowNext = previewNowNext,
                isFavorite = previewChannel?.id?.let { it in favoriteSet } == true,
                backdropUrl = previewBackdropUrl,
                fallbackBackdropUrl = previewFallbackArtwork
                    ?.takeUnless { it.isCountryFlag }
                    ?.assetPath,
                programLogoUrl = previewProgramLogoUrl,
                playlistLastRefreshedAtMillis = playlistLastRefreshedAtMillis,
                isPlaylistRefreshing = isPlaylistRefreshing,
                onRefreshPlaylist = onRefreshPlaylist,
                onMoveUp = onMoveUpFromCategory,
                emptyMessage = emptyCategoryMessage,
                modifier = Modifier.weight(1f).fillMaxHeight(),
            )
        }

        Spacer(Modifier.height(4.dp))

        NetflixCategoryChipRow(
            tree = tree,
            hiddenGroups = hiddenGroups,
            groupOrder = groupOrder,
            selectedId = selectedCategoryId,
            onSelect = onSelectCategory,
            onOpenSearch = onOpenSearch,
            onFocused = onCategoryFocused,
            onMoveUp = { runCatching { heroFocusRequester.requestFocus() } },
            onMoveDown = {
                onMoveDownToChannels()
                railFocusPending = true
                railEntrySignal += 1
            },
            focusRequester = categoryFocusRequester,
            focusSelectedCategorySignal = focusSelectedCategorySignal,
            modifier = Modifier
                .fillMaxWidth()
                .height(CategoryRowHeight)
                .padding(horizontal = 24.dp),
        )

        NetflixChannelRail(
            channels = channels,
            selectedCountryCode = selectedCountryCode,
            selectedCategoryName = selectedCategoryName,
            playingChannelId = playingChannelId,
            focusedChannelId = focusedChannelId,
            nowNextMap = nowNextMap,
            favoriteSet = favoriteSet,
            clockTickMillis = guideClockMillis,
            lookupBackdrop = lookupBackdrop,
            onChannelFocused = { channel ->
                previewChannelId = channel.id
                onChannelFocused(channel)
            },
            onChannelSelected = onChannelSelected,
            onFavoriteToggle = onFavoriteToggle,
            variantCountFor = variantCountFor,
            onOpenVariants = onOpenVariants,
            onMoveUp = { runCatching { categoryFocusRequester.requestFocus() } },
            focusSelectedChannelSignal = focusSelectedChannelSignal,
            railEntrySignal = railEntrySignal,
            railFocusPending = railFocusPending,
            onRailFocusSettled = { railFocusPending = false },
            emptyMessage = emptyCategoryMessage,
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 4.dp),
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun HeroVideoCard(
    exoPlayer: ExoPlayer,
    channel: EnrichedChannel?,
    isFullScreen: Boolean,
    isBuffering: Boolean,
    focusRequester: FocusRequester,
    onClick: () -> Unit,
    onMoveUp: () -> Unit,
    onMoveDown: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val textureViewRef = remember { mutableStateOf<android.view.TextureView?>(null) }
    val fullScreenState = rememberUpdatedState(isFullScreen)
    var focused by remember { mutableStateOf(false) }

    LaunchedEffect(isFullScreen) {
        if (isFullScreen) {
            textureViewRef.value?.let { tv ->
                runCatching { exoPlayer.clearVideoTextureView(tv) }
            }
        } else {
            delay(120L)
            textureViewRef.value?.takeIf { it.isAvailable }?.let { tv ->
                runCatching { exoPlayer.setVideoTextureView(tv) }
            }
        }
    }

    DisposableEffect(exoPlayer) {
        onDispose {
            textureViewRef.value?.let { tv -> runCatching { exoPlayer.clearVideoTextureView(tv) } }
        }
    }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(HeroCornerRadius))
            .background(LiveColors.PanelDeep)
            .border(
                width = if (focused) 3.dp else 0.dp,
                color = if (focused) LiveColors.FocusRing else Color.Transparent,
                shape = RoundedCornerShape(HeroCornerRadius),
            )
            .focusRequester(focusRequester)
            .onFocusChanged { focused = it.isFocused }
            .focusable()
            .onKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown) return@onKeyEvent false
                when (event.key) {
                    Key.DirectionUp -> {
                        onMoveUp()
                        true
                    }
                    Key.DirectionDown -> { onMoveDown(); true }
                    Key.DirectionCenter, Key.Enter -> { onClick(); true }
                    else -> false
                }
            }
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(LiveColors.Panel, LiveColors.PanelDeep),
                    )
                ),
            contentAlignment = Alignment.Center,
        ) {
            if (channel != null) {
                ChannelLogo(channel = channel, size = 72.dp, showBackground = false)
            }
        }
        AndroidView(
            factory = { ctx ->
                android.view.TextureView(ctx).also { tv ->
                    textureViewRef.value = tv
                    tv.surfaceTextureListener = object : android.view.TextureView.SurfaceTextureListener {
                        override fun onSurfaceTextureAvailable(s: android.graphics.SurfaceTexture, w: Int, h: Int) {
                            if (!fullScreenState.value) {
                                runCatching { exoPlayer.setVideoTextureView(tv) }
                            }
                        }
                        override fun onSurfaceTextureSizeChanged(s: android.graphics.SurfaceTexture, w: Int, h: Int) {}
                        override fun onSurfaceTextureDestroyed(s: android.graphics.SurfaceTexture): Boolean {
                            runCatching { exoPlayer.clearVideoTextureView(tv) }
                            return true
                        }
                        override fun onSurfaceTextureUpdated(s: android.graphics.SurfaceTexture) {}
                    }
                }
            },
            modifier = Modifier.fillMaxSize(),
        )
        if (isBuffering && !isFullScreen) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.72f)),
                contentAlignment = Alignment.Center,
            ) {
                LoadingIndicator(size = 44.dp, color = LiveColors.Accent, strokeWidth = 3.dp)
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun HeroInfoPanel(
    channel: EnrichedChannel?,
    clockTickMillis: Long,
    nowNext: IptvNowNext?,
    isFavorite: Boolean,
    backdropUrl: String?,
    fallbackBackdropUrl: String?,
    programLogoUrl: String?,
    playlistLastRefreshedAtMillis: Long?,
    isPlaylistRefreshing: Boolean,
    onRefreshPlaylist: () -> Unit,
    onMoveUp: () -> Unit,
    emptyMessage: String?,
    modifier: Modifier = Modifier,
) {
    val effectiveBackdropUrl = backdropUrl?.takeIf { it.isNotBlank() }
        ?: fallbackBackdropUrl?.takeIf { it.isNotBlank() }
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(HeroCornerRadius))
            .background(LiveColors.PanelDeep),
    ) {
        if (!effectiveBackdropUrl.isNullOrBlank()) {
            AsyncImage(
                model = effectiveBackdropUrl, contentDescription = null, contentScale = ContentScale.Crop,
                alignment = Alignment.TopCenter,
                modifier = Modifier.fillMaxSize().graphicsLayer { alpha = 0.55f },
            )
            Box(modifier = Modifier.fillMaxSize().background(
                Brush.verticalGradient(colors = listOf(
                    LiveColors.PanelDeep.copy(alpha = 0.55f),
                    LiveColors.PanelDeep.copy(alpha = 0.85f),
                    LiveColors.PanelDeep.copy(alpha = 0.95f),
                ))
            ))
        }
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                val group = channel?.source?.group?.takeIf { it.isNotBlank() }
                Column(modifier = Modifier.weight(1f)) {
                    channel?.name?.takeIf { it.isNotBlank() }?.let { channelName ->
                        Text(
                            text = channelName,
                            style = LiveType.ChannelName.copy(color = LiveColors.Fg, fontSize = 12.sp),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    if (!group.isNullOrBlank()) {
                        Text(
                            text = liveCategoryLabel(group),
                            style = LiveType.SectionTag.copy(color = LiveColors.Accent, fontSize = 9.sp),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
                if (isFavorite) {
                    Icon(imageVector = Icons.Filled.Star, contentDescription = null,
                        tint = LiveColors.Accent, modifier = Modifier.size(13.dp))
                }
                if (channel != null) {
                    ChannelLogo(
                        channel = channel,
                        size = 36.dp,
                        showBackground = false,
                        imagePadding = 1.dp,
                    )
                } else {
                    Spacer(Modifier.size(36.dp))
                }
            }

            Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(LiveColors.Divider))

            val nowProgram = nowNext?.now
            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                if (emptyMessage == null) {
                    Text(text = stringResource(R.string.live_badge_now), style = LiveType.SectionTag.copy(color = LiveColors.Accent))
                }
                if (!programLogoUrl.isNullOrBlank() && emptyMessage == null && nowProgram != null) {
                    AsyncImage(
                        model = programLogoUrl,
                        contentDescription = nowProgram.title,
                        contentScale = ContentScale.Fit,
                        alignment = Alignment.CenterStart,
                        modifier = Modifier.width(260.dp).height(32.dp),
                    )
                } else {
                    Text(
                        text = emptyMessage
                            ?: nowProgram?.title
                            ?: stringResource(R.string.live_empty_no_programme),
                        style = LiveType.ProgramTitle.copy(color = LiveColors.Fg, fontSize = 13.sp),
                        maxLines = 2, overflow = TextOverflow.Ellipsis,
                    )
                }
                val desc = nowProgram?.description?.trim().orEmpty().ifBlank {
                    if (emptyMessage == null && nowProgram == null) {
                        stringResource(R.string.live_empty_no_programme_description)
                    } else {
                        ""
                    }
                }
                if (desc.isNotBlank()) {
                    Text(
                        text = desc,
                        style = LiveType.BodySynopsis.copy(color = LiveColors.FgDim),
                        maxLines = 4,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                if (nowProgram != null) {
                    val progress = ((clockTickMillis - nowProgram.startUtcMillis).toFloat() /
                        (nowProgram.endUtcMillis - nowProgram.startUtcMillis).coerceAtLeast(1L)).coerceIn(0f, 1f)
                    val minsLeft = ((nowProgram.endUtcMillis - clockTickMillis) / 60_000L).coerceAtLeast(0L)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text(
                            text = "${formatClock(nowProgram.startUtcMillis)} – ${formatClock(nowProgram.endUtcMillis)}",
                            style = LiveType.TimeMono.copy(color = LiveColors.FgMute),
                        )
                        if (minsLeft > 0L) {
                            Text("·", style = LiveType.TimeMono.copy(color = LiveColors.FgMute))
                            Text(stringResource(R.string.live_label_minutes_left, minsLeft), style = LiveType.TimeMono.copy(color = LiveColors.Accent))
                        }
                    }
                    LinearProgressIndicator(
                        progress = { progress },
                        color = LiveColors.Accent,
                        trackColor = LiveColors.Panel,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(3.dp)
                            .clip(RoundedCornerShape(999.dp)),
                    )
                }
            }

            val upcoming = remember(nowNext) { collectUpcoming(nowNext).take(HeroUpcomingMax) }
            if (upcoming.isNotEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    Text(
                        text = stringResource(R.string.live_label_upcoming).uppercase(),
                        style = LiveType.SectionTag.copy(color = LiveColors.FgMute, fontSize = 8.sp),
                    )
                    upcoming.forEach { program ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Text(
                                text = formatClock(program.startUtcMillis),
                                style = LiveType.TimeMono.copy(color = LiveColors.Accent, fontSize = 9.sp),
                                modifier = Modifier.width(40.dp),
                            )
                            Text(
                                text = program.title,
                                style = LiveType.CellTitle.copy(color = LiveColors.Fg, fontSize = 9.sp),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f),
                            )
                            val startsInMinutes = ((program.startUtcMillis - clockTickMillis) / 60_000L)
                                .coerceAtLeast(0L)
                            Text(
                                text = stringResource(R.string.live_label_starts_in_min, startsInMinutes),
                                style = LiveType.TimeMono.copy(color = LiveColors.FgMute, fontSize = 8.sp),
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
            ) {
                PlaylistRefreshControl(
                    lastRefreshedAtMillis = playlistLastRefreshedAtMillis,
                    isRefreshing = isPlaylistRefreshing,
                    onRefresh = onRefreshPlaylist,
                    onMoveUp = onMoveUp,
                )
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun PlaylistRefreshControl(
    lastRefreshedAtMillis: Long?,
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    onMoveUp: () -> Unit,
) {
    var focused by remember { mutableStateOf(false) }
    val formattedTimestamp = remember(lastRefreshedAtMillis) {
        lastRefreshedAtMillis?.let { timestamp ->
            DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT).format(Date(timestamp))
        }
    }
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(if (focused) LiveColors.PanelRaised else LiveColors.Panel.copy(alpha = 0.72f))
            .border(
                width = if (focused) 2.dp else 1.dp,
                color = if (focused) LiveColors.FocusRing else LiveColors.Divider,
                shape = RoundedCornerShape(6.dp),
            )
            .onFocusChanged { focused = it.hasFocus }
            .focusable(enabled = !isRefreshing)
            .onKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown) return@onKeyEvent false
                when (event.key) {
                    Key.DirectionUp -> {
                        onMoveUp()
                        true
                    }
                    Key.DirectionCenter, Key.Enter -> {
                        if (!isRefreshing) onRefresh()
                        !isRefreshing
                    }
                    else -> false
                }
            }
            .clickable(enabled = !isRefreshing, onClick = onRefresh)
            .padding(horizontal = 8.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(
            text = formattedTimestamp?.let { stringResource(R.string.live_playlist_updated, it) }
                ?: stringResource(R.string.live_playlist_not_updated),
            style = LiveType.TimeMono.copy(color = LiveColors.FgMute, fontSize = 8.sp),
            maxLines = 1,
        )
        if (isRefreshing) {
            LoadingIndicator(size = 14.dp, color = LiveColors.Accent, strokeWidth = 2.dp)
        } else {
            Icon(
                imageVector = Icons.Filled.Refresh,
                contentDescription = stringResource(R.string.live_refresh_playlist),
                tint = if (focused) LiveColors.Accent else LiveColors.FgDim,
                modifier = Modifier.size(14.dp),
            )
        }
    }
}

private fun collectUpcoming(nowNext: IptvNowNext?): List<IptvProgram> {
    if (nowNext == null) return emptyList()
    val list = ArrayList<IptvProgram>(6)
    nowNext.next?.let(list::add)
    nowNext.later?.let(list::add)
    list.addAll(nowNext.upcoming)
    return list.distinctBy { it.startUtcMillis to it.title }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun NetflixCategoryChipRow(
    tree: LiveCategoryTree,
    hiddenGroups: Set<String>,
    groupOrder: List<String>,
    selectedId: String,
    onSelect: (String) -> Unit,
    onOpenSearch: () -> Unit,
    onFocused: () -> Unit,
    onMoveUp: () -> Unit,
    onMoveDown: () -> Unit,
    focusRequester: FocusRequester,
    focusSelectedCategorySignal: Int,
    modifier: Modifier = Modifier,
) {
    val items = rememberNetflixCategoryItems(tree, hiddenGroups, groupOrder)
    val listState = rememberLazyListState()
    val selectedIndex = remember(items, selectedId) {
        items.indexOfFirst { it.id == selectedId }
            .takeIf { it >= 0 }
            ?.plus(1) // Search is the first LazyRow item.
            ?: 0
    }
    LaunchedEffect(focusSelectedCategorySignal, selectedIndex) {
        if (focusSelectedCategorySignal > 0) {
            runCatching { listState.scrollToItem(selectedIndex) }
            runCatching { focusRequester.requestFocus() }
        }
    }
    LazyRow(
        state = listState, modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = PaddingValues(horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        item(key = "__search") {
            NetflixChip(
                label = stringResource(R.string.live_label_search_channels),
                count = null, isSelected = false, onFocused = onFocused, onClick = onOpenSearch,
                onKeyMoveUp = onMoveUp, onKeyMoveDown = onMoveDown,
                focusRequester = if (items.isEmpty()) focusRequester else null,
                iconContent = {
                    Icon(imageVector = Icons.Filled.Search, contentDescription = null,
                        tint = LiveColors.FgDim, modifier = Modifier.size(13.dp))
                },
            )
        }
        itemsIndexed(items, key = { _, item -> item.id }) { _, item ->
            NetflixChip(
                label = item.label, count = item.count, isSelected = item.id == selectedId,
                onFocused = onFocused, onClick = { onSelect(item.id) },
                onKeyMoveUp = onMoveUp, onKeyMoveDown = onMoveDown,
                focusRequester = if (item.id == selectedId) focusRequester else null,
            )
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun NetflixChip(
    label: String, count: Int?, isSelected: Boolean,
    onFocused: () -> Unit, onClick: () -> Unit,
    onKeyMoveUp: () -> Unit, onKeyMoveDown: () -> Unit,
    focusRequester: FocusRequester?,
    iconContent: (@Composable () -> Unit)? = null,
) {
    var focused by remember { mutableStateOf(false) }
    val bg = when {
        focused -> LiveColors.PanelRaised
        isSelected -> LiveColors.Accent.copy(alpha = 0.32f)
        else -> LiveColors.Panel
    }
    val fg = when { focused -> LiveColors.Fg; isSelected -> LiveColors.Fg; else -> LiveColors.FgDim }
    Row(
        modifier = Modifier
            .height(36.dp)
            .clip(RoundedCornerShape(999.dp))
            .background(bg)
            .border(width = if (focused) 2.dp else 0.dp,
                color = if (focused) LiveColors.FocusRing else Color.Transparent,
                shape = RoundedCornerShape(999.dp))
            .then(if (focusRequester != null) Modifier.focusRequester(focusRequester) else Modifier)
            .onFocusChanged { focused = it.hasFocus; if (it.hasFocus) onFocused() }
            .focusable()
            .onKeyEvent { ev ->
                if (ev.type != KeyEventType.KeyDown) return@onKeyEvent false
                when (ev.key) {
                    Key.DirectionUp -> { onKeyMoveUp(); true }
                    Key.DirectionDown -> { onKeyMoveDown(); true }
                    Key.DirectionCenter, Key.Enter -> { onClick(); true }
                    else -> false
                }
            }
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        if (iconContent != null) iconContent()
        Text(text = label, style = LiveType.CatLabel.copy(color = fg), maxLines = 1, overflow = TextOverflow.Ellipsis)
        if (count != null && count > 0) {
            Text(text = count.toString(), style = LiveType.NumberMono.copy(color = fg.copy(alpha = 0.7f)))
        }
    }
}

@Composable
private fun rememberNetflixCategoryItems(
    tree: LiveCategoryTree,
    hiddenGroups: Set<String>,
    groupOrder: List<String>,
): List<NetflixCategoryItem> {
    // Resolve labels at Composable scope before entering remember.
    val allTop = tree.top.map { it to liveCategoryLabel(it.label) }
    val orderedGlobal = remember(tree.global.categories, hiddenGroups, groupOrder) {
        val orderByKey = groupOrder.withIndex().associate { (index, key) -> key to index }
        tree.global.categories
            .withIndex()
            .filter { (_, category) ->
                val playlistId = category.playlistId
                val groupName = category.playlistGroupName
                playlistId == null || groupName == null ||
                    com.arflix.tv.data.model.PlaylistGroupKey.build(playlistId, groupName) !in hiddenGroups
            }
            .sortedWith(
                compareBy<IndexedValue<LiveCategory>> { (_, category) ->
                    val playlistId = category.playlistId
                    val groupName = category.playlistGroupName
                    if (playlistId == null || groupName == null) {
                        Int.MAX_VALUE
                    } else {
                        orderByKey[com.arflix.tv.data.model.PlaylistGroupKey.build(playlistId, groupName)]
                            ?: Int.MAX_VALUE
                    }
                }.thenBy { it.index }
            )
            .map { it.value }
    }
    val allGlobal = orderedGlobal.map { it to liveCategoryLabel(it.label) }
    val allCountries = tree.countries.categories.map { it to liveCategoryLabel(it.label) }
    val allAdult = tree.adult.categories.map { it to liveCategoryLabel(it.label) }
    return remember(tree, orderedGlobal) {
        buildList {
            allTop.forEach { (cat, label) -> add(NetflixCategoryItem(cat.id, label, cat.count)) }
            allGlobal.forEach { (cat, label) -> add(NetflixCategoryItem(cat.id, label, cat.count)) }
            allCountries.forEach { (cat, label) -> add(NetflixCategoryItem(cat.id, label, cat.count)) }
            allAdult.forEach { (cat, label) -> add(NetflixCategoryItem(cat.id, label, cat.count)) }
        }.distinctBy { it.id }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun NetflixChannelRail(
    channels: List<EnrichedChannel>,
    selectedCountryCode: String?,
    selectedCategoryName: String?,
    playingChannelId: String?,
    focusedChannelId: String?,
    nowNextMap: Map<String, IptvNowNext>,
    favoriteSet: Set<String>,
    clockTickMillis: Long,
    lookupBackdrop: suspend (IptvProgram) -> String?,
    onChannelFocused: (EnrichedChannel) -> Unit,
    onChannelSelected: (EnrichedChannel) -> Unit,
    onFavoriteToggle: (String) -> Unit,
    variantCountFor: (EnrichedChannel) -> Int,
    onOpenVariants: (EnrichedChannel) -> Unit,
    onMoveUp: () -> Unit,
    focusSelectedChannelSignal: Int,
    railEntrySignal: Int,
    railFocusPending: Boolean,
    onRailFocusSettled: () -> Unit,
    emptyMessage: String?,
    modifier: Modifier = Modifier,
) {
    if (channels.isEmpty()) {
        Box(modifier = modifier, contentAlignment = Alignment.CenterStart) {
            Text(text = emptyMessage ?: stringResource(R.string.live_empty_no_channels_category),
                style = LiveType.CatLabel.copy(color = LiveColors.FgMute),
                modifier = Modifier.padding(horizontal = 16.dp))
        }
        return
    }
    val listState = rememberLazyListState()
    val focusRequesters = remember { LinkedHashMap<String, FocusRequester>() }
    val anchorId = focusedChannelId ?: playingChannelId
    val anchorIndex = remember(channels, anchorId) {
        channels.indexOfFirst { it.id == anchorId }.takeIf { it >= 0 } ?: 0
    }
    // rememberUpdatedState: anchorIndex NOT in key set → browsing never re-triggers a scroll snap.
    val latestAnchorIndex by rememberUpdatedState(anchorIndex)
    val channelWindowKey = remember(channels) {
        "${channels.size}:${channels.firstOrNull()?.id.orEmpty()}:${channels.lastOrNull()?.id.orEmpty()}"
    }
    LaunchedEffect(channelWindowKey) {
        runCatching { listState.scrollToItem(latestAnchorIndex.coerceAtLeast(0)) }
    }
    suspend fun requestAnchorFocus(): Boolean {
        val index = latestAnchorIndex.coerceAtLeast(0)
        runCatching { listState.scrollToItem(index) }
        repeat(40) {
            delay(50L)
            val id = channels.getOrNull(index)?.id
            val req = id?.let { focusRequesters[it] }
            if (req != null && runCatching { req.requestFocus() }.isSuccess) {
                return true
            }
        }
        return false
    }
    LaunchedEffect(focusSelectedChannelSignal) {
        if (focusSelectedChannelSignal > 0) requestAnchorFocus()
    }
    LaunchedEffect(railEntrySignal, railFocusPending, channelWindowKey) {
        if (railFocusPending && requestAnchorFocus()) {
            onRailFocusSettled()
        }
    }

    LazyRow(
        state = listState, modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        itemsIndexed(channels, key = { _, ch -> ch.id }) { _, ch ->
            val requester = remember(ch.id) { FocusRequester() }
            DisposableEffect(ch.id, requester) {
                focusRequesters[ch.id] = requester
                onDispose { if (focusRequesters[ch.id] === requester) focusRequesters.remove(ch.id) }
            }
            NetflixChannelCard(
                channel = ch,
                selectedCountryCode = selectedCountryCode,
                selectedCategoryName = selectedCategoryName,
                nowNext = nowNextMap[ch.id],
                clockTickMillis = clockTickMillis,
                isPlaying = ch.id == playingChannelId,
                isFavorite = ch.id in favoriteSet,
                lookupBackdrop = lookupBackdrop,
                onFocused = { onChannelFocused(ch) },
                onClick = { onChannelSelected(ch) },
                onLongPress = { if (variantCountFor(ch) > 1) onOpenVariants(ch) else onFavoriteToggle(ch.id) },
                onKeyMoveUp = onMoveUp,
                modifier = Modifier.focusRequester(requester),
            )
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
private fun NetflixChannelCard(
    channel: EnrichedChannel,
    selectedCountryCode: String?,
    selectedCategoryName: String?,
    nowNext: IptvNowNext?,
    clockTickMillis: Long,
    isPlaying: Boolean,
    isFavorite: Boolean,
    lookupBackdrop: suspend (IptvProgram) -> String?,
    onFocused: () -> Unit,
    onClick: () -> Unit,
    onLongPress: () -> Unit,
    onKeyMoveUp: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var focused by remember { mutableStateOf(false) }
    var centerLongPressHandled by remember { mutableStateOf(false) }
    val now = nowNext?.now
    val progress = now?.let {
        ((clockTickMillis - it.startUtcMillis).toFloat() /
            (it.endUtcMillis - it.startUtcMillis).coerceAtLeast(1L)).coerceIn(0f, 1f)
    } ?: 0f
    val minsLeft = now?.let { ((it.endUtcMillis - clockTickMillis) / 60_000L).coerceAtLeast(0L) }
    val backgroundLogoUrl = remember(channel.logo) { safeChannelLogoUrl(channel.logo) }
    val fallbackArtwork = remember(channel.source.group, channel.country, selectedCountryCode, selectedCategoryName) {
        liveChannelFallbackArtwork(
            channel.source.group,
            channel.country,
            selectedCountryCode,
            selectedCategoryName,
        )
    }

    // Async TMDB backdrop for the current program; cached by TvViewModel.
    val cardBackdropUrl by produceState<String?>(
        initialValue = null,
        key1 = channel.id,
        key2 = now?.startUtcMillis,
    ) {
        value = null
        val program = now?.takeIf { it.title.isNotBlank() } ?: return@produceState
        delay(200L)
        value = runCatching { lookupBackdrop(program) }.getOrNull()
    }

    val shape = RoundedCornerShape(8.dp)

    Box(
        modifier = modifier
            .width(ChannelCardWidth)
            .aspectRatio(16f / 9f)
            .clip(shape)
            .background(when {
                focused -> LiveColors.PanelRaised
                isPlaying -> LiveColors.FocusBg
                else -> LiveColors.PanelDeep
            })
            .border(
                width = if (focused) 2.dp else if (isPlaying) 1.dp else 0.dp,
                color = when {
                    focused -> LiveColors.FocusRing
                    isPlaying -> LiveColors.Accent.copy(alpha = 0.55f)
                    else -> Color.Transparent
                },
                shape = shape,
            )
            .onFocusChanged { focused = it.hasFocus; if (it.hasFocus) onFocused() }
            .focusable()
            .onPreviewKeyEvent { ev ->
                if (ev.type == KeyEventType.KeyDown && ev.key == Key.DirectionUp) {
                    onKeyMoveUp(); return@onPreviewKeyEvent true
                }
                val isCenterKey = ev.key == Key.DirectionCenter || ev.key == Key.Enter
                if (isCenterKey && ev.type == KeyEventType.KeyDown && ev.nativeKeyEvent.repeatCount >= 1) {
                    if (!centerLongPressHandled) {
                        centerLongPressHandled = true
                        onLongPress()
                    }
                    return@onPreviewKeyEvent true
                }
                if (isCenterKey && ev.type == KeyEventType.KeyUp && centerLongPressHandled) {
                    centerLongPressHandled = false
                    return@onPreviewKeyEvent true
                }
                false
            }
            .combinedClickable(onClick = onClick, onLongClick = onLongPress),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.linearGradient(
                        listOf(
                            channel.brandBg.copy(alpha = 0.72f),
                            LiveColors.PanelDeep,
                        )
                    )
                )
        )
        if (!cardBackdropUrl.isNullOrBlank()) {
            AsyncImage(
                model = cardBackdropUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize().graphicsLayer { alpha = 0.52f },
            )
        }
        if (cardBackdropUrl.isNullOrBlank() && fallbackArtwork?.assetPath != null) {
            AsyncImage(
                model = fallbackArtwork.assetPath,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize().graphicsLayer { alpha = 0.58f },
            )
        }
        if (cardBackdropUrl.isNullOrBlank() && fallbackArtwork == null && !backgroundLogoUrl.isNullOrBlank()) {
            AsyncImage(
                model = backgroundLogoUrl,
                contentDescription = null,
                contentScale = ContentScale.FillBounds,
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer {
                        alpha = 0.26f
                        scaleX = 1.16f
                        scaleY = 1.16f
                    },
            )
        }
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Color.Black.copy(
                        alpha = if (cardBackdropUrl.isNullOrBlank() && fallbackArtwork == null) 0.22f else 0.12f
                    )
                )
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        0f to Color.Transparent,
                        0.52f to LiveColors.PanelDeep.copy(alpha = 0.52f),
                        1f to LiveColors.PanelDeep.copy(alpha = 0.98f),
                    )
                )
        )
        ChannelLogo(
            channel = channel,
            size = 64.dp,
            showBackground = false,
            imagePadding = 1.dp,
            modifier = Modifier.align(Alignment.TopCenter).padding(top = 5.dp),
        )
        Box(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(6.dp)
                .background(LiveColors.LiveRed, RoundedCornerShape(3.dp))
                .padding(horizontal = 5.dp, vertical = 1.dp)
        ) {
            Text(
                text = stringResource(R.string.live_badge_live),
                style = LiveType.Badge.copy(color = Color.White, fontSize = 7.sp),
            )
        }
        if (isFavorite) {
            Icon(
                imageVector = Icons.Filled.Star,
                contentDescription = null,
                tint = LiveColors.Accent,
                modifier = Modifier.align(Alignment.TopEnd).padding(6.dp).size(12.dp),
            )
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = channel.name,
                style = LiveType.ChannelName.copy(color = Color.White.copy(alpha = 0.78f), fontSize = 8.sp),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = now?.title ?: stringResource(R.string.live_status_guide_pending),
                style = LiveType.ProgramTitle.copy(color = Color.White, fontSize = 9.sp),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (now != null) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(
                        text = formatClock(now.startUtcMillis),
                        style = LiveType.TimeMono.copy(color = Color.White.copy(alpha = 0.58f), fontSize = 7.sp),
                    )
                    LinearProgressIndicator(
                        progress = { progress },
                        color = LiveColors.Accent,
                        trackColor = Color.White.copy(alpha = 0.12f),
                        modifier = Modifier.weight(1f).height(2.dp).clip(RoundedCornerShape(99.dp)),
                    )
                    if (minsLeft != null && minsLeft > 0L) {
                        Text(
                            text = stringResource(R.string.live_label_minutes_left, minsLeft),
                            style = LiveType.TimeMono.copy(color = LiveColors.Accent, fontSize = 7.sp),
                        )
                    }
                }
            }
            val nextTitle = nowNext?.next?.title
            if (!nextTitle.isNullOrBlank()) {
                Text(
                    text = "${stringResource(R.string.live_badge_next)}  $nextTitle",
                    style = LiveType.CellTitle.copy(color = Color.White.copy(alpha = 0.55f), fontSize = 7.sp),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}
