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
import androidx.media3.common.VideoSize
import androidx.media3.exoplayer.ExoPlayer
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.arflix.tv.R
import com.arflix.tv.data.model.IptvNowNext
import com.arflix.tv.data.model.IptvProgram
import kotlinx.coroutines.delay

// Netflix-style Live TV layout for TV mode only. Touch layout stays in LiveTvScreen.

private val HeroHeight = 260.dp          // smaller hero → more room for channel rail
private val CategoryRowHeight = 48.dp
private val ChannelCardWidth = 220.dp
private val HeroCornerRadius = 18.dp
private val CardCornerRadius = 14.dp
private const val HeroUpcomingMax = 4

private data class NetflixCategoryItem(val id: String, val label: String, val count: Int)

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
internal fun LiveTvNetflixLayout(
    tree: LiveCategoryTree,
    selectedCategoryId: String,
    channels: List<EnrichedChannel>,
    playingChannelId: String?,
    focusedChannelId: String?,
    playingChannel: EnrichedChannel?,
    nowNextMap: Map<String, IptvNowNext>,
    favoriteSet: Set<String>,
    exoPlayer: ExoPlayer,
    guideClockMillis: Long,
    variantCountFor: (EnrichedChannel) -> Int,
    isFullScreen: Boolean,
    lookupBackdrop: suspend (String) -> String? = { null },
    onSelectCategory: (String) -> Unit,
    onOpenSearch: () -> Unit,
    onCategoryFocused: () -> Unit,
    onChannelFocused: (EnrichedChannel) -> Unit,
    onChannelSelected: (EnrichedChannel) -> Unit,
    onFavoriteToggle: (String) -> Unit,
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
    var heroVideoAspectRatio by remember { mutableStateOf(16f / 9f) }
    var previewChannelId by remember { mutableStateOf(focusedChannelId ?: playingChannelId) }
    LaunchedEffect(channels, focusedChannelId, playingChannelId) {
        if (channels.none { it.id == previewChannelId }) {
            previewChannelId = focusedChannelId?.takeIf { id -> channels.any { it.id == id } }
                ?: playingChannelId?.takeIf { id -> channels.any { it.id == id } }
                ?: channels.firstOrNull()?.id
        }
    }
    val previewChannel = channels.firstOrNull { it.id == previewChannelId }
        ?: playingChannel
    val previewNowNext = previewChannel?.let { nowNextMap[it.id] }
    val previewBackdropUrl by produceState<String?>(
        initialValue = null,
        key1 = previewNowNext?.now?.title,
    ) {
        val title = previewNowNext?.now?.title?.takeIf { it.isNotBlank() } ?: return@produceState
        delay(200L)
        value = runCatching { lookupBackdrop(title) }.getOrNull()
    }
    Column(modifier = modifier.fillMaxSize().background(LiveColors.Bg)) {
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
                focusRequester = heroFocusRequester,
                onClick = onOpenFullscreen,
                onMoveUp = onMoveUpFromCategory,
                onMoveDown = { runCatching { categoryFocusRequester.requestFocus() } },
                onVideoAspectRatioChanged = { heroVideoAspectRatio = it },
                modifier = Modifier
                    .fillMaxHeight()
                    .aspectRatio(heroVideoAspectRatio, matchHeightConstraintsFirst = true),
            )
            HeroInfoPanel(
                channel = previewChannel,
                clockTickMillis = guideClockMillis,
                nowNext = previewNowNext,
                isFavorite = previewChannel?.id?.let { it in favoriteSet } == true,
                backdropUrl = previewBackdropUrl,
                modifier = Modifier.weight(1f).fillMaxHeight(),
            )
        }

        Spacer(Modifier.height(4.dp))

        NetflixCategoryChipRow(
            tree = tree,
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
    focusRequester: FocusRequester,
    onClick: () -> Unit,
    onMoveUp: () -> Unit,
    onMoveDown: () -> Unit,
    onVideoAspectRatioChanged: (Float) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    val textureViewRef = remember { mutableStateOf<android.view.TextureView?>(null) }
    var focused by remember { mutableStateOf(false) }

    LaunchedEffect(isFullScreen) {
        if (!isFullScreen) {
            delay(120L)
            textureViewRef.value?.takeIf { it.isAvailable }?.let { tv ->
                runCatching { exoPlayer.setVideoTextureView(tv) }
            }
        }
    }

    DisposableEffect(exoPlayer) {
        val listener = object : Player.Listener {
            override fun onVideoSizeChanged(videoSize: VideoSize) {
                val w = videoSize.width; val h = videoSize.height
                if (w > 0 && h > 0)
                    onVideoAspectRatioChanged(w.toFloat() * videoSize.pixelWidthHeightRatio / h)
            }
        }
        exoPlayer.addListener(listener)
        onDispose {
            exoPlayer.removeListener(listener)
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
            .onFocusChanged { focused = it.hasFocus }
            .focusable()
            .onKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown) return@onKeyEvent false
                when (event.key) {
                    Key.DirectionUp -> { onMoveUp(); true }
                    Key.DirectionDown -> { onMoveDown(); true }
                    Key.DirectionCenter, Key.Enter -> { onClick(); true }
                    else -> false
                }
            }
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (channel != null) {
            Box(modifier = Modifier.fillMaxSize().background(
                Brush.radialGradient(colors = listOf(channel.brandBg, LiveColors.Bg))
            ))
        }
        AndroidView(
            factory = { ctx ->
                android.view.TextureView(ctx).also { tv ->
                    textureViewRef.value = tv
                    tv.surfaceTextureListener = object : android.view.TextureView.SurfaceTextureListener {
                        override fun onSurfaceTextureAvailable(s: android.graphics.SurfaceTexture, w: Int, h: Int) {
                            runCatching { exoPlayer.setVideoTextureView(tv) }
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
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(HeroCornerRadius))
            .background(LiveColors.PanelDeep),
    ) {
        if (!backdropUrl.isNullOrBlank()) {
            AsyncImage(
                model = backdropUrl, contentDescription = null, contentScale = ContentScale.Crop,
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
            modifier = Modifier.fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (channel != null) {
                    ChannelLogo(channel = channel, size = 48.dp, showBackground = false)
                } else {
                    Spacer(Modifier.size(48.dp))
                }
                val group = channel?.source?.group?.takeIf { it.isNotBlank() }
                Column(modifier = Modifier.weight(1f)) {
                    if (!group.isNullOrBlank()) {
                        Text(text = group,
                            style = LiveType.ChannelName.copy(color = LiveColors.Fg, fontSize = 13.sp),
                            maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
                if (isFavorite) {
                    Icon(imageVector = Icons.Filled.Star, contentDescription = null,
                        tint = LiveColors.Accent, modifier = Modifier.size(13.dp))
                }
            }

            Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(LiveColors.Divider))

            val nowProgram = nowNext?.now
            Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Text(text = "NOW", style = LiveType.SectionTag.copy(color = LiveColors.Accent))
                Text(
                    text = nowProgram?.title ?: stringResource(R.string.live_placeholder_guide_pending),
                    style = LiveType.ProgramTitle.copy(color = LiveColors.Fg, fontSize = 13.sp),
                    maxLines = 2, overflow = TextOverflow.Ellipsis,
                )
                val desc = nowProgram?.description?.trim().orEmpty()
                if (desc.isNotBlank()) {
                    Text(text = desc, style = LiveType.BodySynopsis.copy(color = LiveColors.FgDim),
                        maxLines = 3, overflow = TextOverflow.Ellipsis)
                }
                if (nowProgram != null) {
                    val progress = ((clockTickMillis - nowProgram.startUtcMillis).toFloat() /
                        (nowProgram.endUtcMillis - nowProgram.startUtcMillis).coerceAtLeast(1L)).coerceIn(0f, 1f)
                    val minsLeft = ((nowProgram.endUtcMillis - clockTickMillis) / 60_000L).coerceAtLeast(0L)
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = "${formatClock(nowProgram.startUtcMillis)} – ${formatClock(nowProgram.endUtcMillis)}",
                            style = LiveType.TimeMono.copy(color = LiveColors.FgMute),
                        )
                        if (minsLeft > 0L) {
                            Text("·", style = LiveType.TimeMono.copy(color = LiveColors.FgMute))
                            Text("$minsLeft min left", style = LiveType.TimeMono.copy(color = LiveColors.Accent))
                        }
                    }
                    LinearProgressIndicator(
                        progress = { progress }, color = LiveColors.Accent, trackColor = LiveColors.Panel,
                        modifier = Modifier.fillMaxWidth().height(3.dp).clip(RoundedCornerShape(999.dp)),
                    )
                }
            }

            val upcoming = remember(nowNext) { collectUpcoming(nowNext).take(HeroUpcomingMax) }
            if (upcoming.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(text = "UPCOMING", style = LiveType.SectionTag.copy(color = LiveColors.FgMute))
                    upcoming.forEach { program ->
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text(text = formatClock(program.startUtcMillis),
                                style = LiveType.TimeMono.copy(color = LiveColors.FgMute),
                                modifier = Modifier.width(40.dp))
                            Text(text = program.title,
                                style = LiveType.CellTitle.copy(color = LiveColors.FgDim),
                                maxLines = 1, overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
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
    val items = rememberNetflixCategoryItems(tree)
    val listState = rememberLazyListState()
    val selectedIndex = remember(items, selectedId) {
        items.indexOfFirst { it.id == selectedId }.coerceAtLeast(0)
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
private fun rememberNetflixCategoryItems(tree: LiveCategoryTree): List<NetflixCategoryItem> {
    // Resolve labels at Composable scope before entering remember.
    val allTop = tree.top.map { it to liveCategoryLabel(it.label) }
    val allGlobal = tree.global.categories.map { it to liveCategoryLabel(it.label) }
    val allCountries = tree.countries.categories.map { it to liveCategoryLabel(it.label) }
    val allAdult = tree.adult.categories.map { it to liveCategoryLabel(it.label) }
    return remember(tree) {
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
    playingChannelId: String?,
    focusedChannelId: String?,
    nowNextMap: Map<String, IptvNowNext>,
    favoriteSet: Set<String>,
    clockTickMillis: Long,
    lookupBackdrop: suspend (String) -> String?,
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
    modifier: Modifier = Modifier,
) {
    if (channels.isEmpty()) {
        Box(modifier = modifier, contentAlignment = Alignment.CenterStart) {
            Text(text = stringResource(R.string.live_placeholder_guide_pending),
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
    nowNext: IptvNowNext?,
    clockTickMillis: Long,
    isPlaying: Boolean,
    isFavorite: Boolean,
    lookupBackdrop: suspend (String) -> String?,
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

    // Async TMDB backdrop for the current program; cached by TvViewModel.
    val cardBackdropUrl by produceState<String?>(initialValue = null, key1 = now?.title) {
        val title = now?.title?.takeIf { it.isNotBlank() } ?: return@produceState
        delay(200L)
        value = runCatching { lookupBackdrop(title) }.getOrNull()
    }

    Column(
        modifier = modifier
            .width(ChannelCardWidth)
            .clip(RoundedCornerShape(CardCornerRadius))
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
                shape = RoundedCornerShape(CardCornerRadius),
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
            .combinedClickable(onClick = onClick, onLongClick = onLongPress)
            ,
    ) {
        // — Logo / backdrop area
        Box(
            modifier = Modifier.fillMaxWidth().height(80.dp),
            contentAlignment = Alignment.Center,
        ) {
            Box(modifier = Modifier.fillMaxSize().background(
                Brush.verticalGradient(colors = listOf(
                    channel.brandBg.copy(alpha = if (cardBackdropUrl.isNullOrBlank()) 0.65f else 0.45f),
                    Color.Transparent,
                ))
            ))
            if (!cardBackdropUrl.isNullOrBlank()) {
                AsyncImage(
                    model = cardBackdropUrl, contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize().graphicsLayer { alpha = 0.5f },
                )
                Box(modifier = Modifier.fillMaxSize().background(
                    Brush.verticalGradient(colors = listOf(
                        Color.Transparent, LiveColors.PanelDeep.copy(alpha = 0.75f)
                    ))
                ))
            }
            ChannelLogo(channel = channel, size = 52.dp, showBackground = false)
            Row(
                modifier = Modifier.align(Alignment.TopStart).padding(6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                if (isPlaying) {
                    Box(modifier = Modifier.size(6.dp).clip(RoundedCornerShape(999.dp)).background(LiveColors.LiveRed))
                    Text(text = "LIVE", style = LiveType.Badge.copy(color = LiveColors.LiveRed))
                }
            }
            if (isFavorite) {
                Icon(imageVector = Icons.Filled.Star, contentDescription = null,
                    tint = LiveColors.Accent,
                    modifier = Modifier.align(Alignment.TopEnd).padding(6.dp).size(12.dp))
            }
        }

        // — Info section
        Column(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            verticalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(text = "CH ${channel.number}",
                    style = LiveType.NumberMono.copy(color = LiveColors.Accent, fontSize = 9.sp))
                Text("·", style = LiveType.TimeMono.copy(color = LiveColors.FgMute))
                Text(text = channel.name,
                    style = LiveType.ChannelName.copy(color = LiveColors.Fg, fontSize = 10.sp),
                    maxLines = 1, overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f))
            }
            Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(LiveColors.Divider))
            Text(text = now?.title ?: "—",
                style = LiveType.ProgramTitle.copy(color = LiveColors.Fg, fontSize = 9.sp),
                maxLines = 1, overflow = TextOverflow.Ellipsis)
            if (now != null) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(text = formatClock(now.startUtcMillis),
                        style = LiveType.TimeMono.copy(color = LiveColors.FgMute, fontSize = 8.sp))
                    LinearProgressIndicator(
                        progress = { progress },
                        color = if (isPlaying) LiveColors.Accent else LiveColors.FgMute.copy(alpha = 0.5f),
                        trackColor = LiveColors.Panel,
                        modifier = Modifier.weight(1f).height(2.dp).clip(RoundedCornerShape(999.dp)),
                    )
                    if (minsLeft != null && minsLeft > 0L) {
                        Text(text = "${minsLeft}m",
                            style = LiveType.TimeMono.copy(
                                color = if (isPlaying) LiveColors.Accent else LiveColors.FgMute,
                                fontSize = 8.sp))
                    }
                }
            }
            val nextTitle = nowNext?.next?.title
            if (!nextTitle.isNullOrBlank()) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text(text = "▸", style = LiveType.Badge.copy(color = LiveColors.FgMute, fontSize = 7.sp))
                    Text(text = nextTitle,
                        style = LiveType.CellTitle.copy(color = LiveColors.FgMute, fontSize = 8.sp),
                        maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
        }
    }
}
