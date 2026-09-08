package com.arflix.tv.ui.screens.tv.live

import androidx.compose.foundation.focusGroup
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.media3.exoplayer.ExoPlayer
import com.arflix.tv.data.model.IptvNowNext
import com.arflix.tv.data.model.IptvProgram
import kotlinx.coroutines.delay

@Composable
internal fun LiveTvClassicLayout(
    providerFilters: List<TvProviderFilter>,
    selectedProviderId: String,
    isTouchDevice: Boolean,
    providerFocus: FocusRequester,
    onSelectProvider: (String) -> Unit,
    onMoveProviderUp: () -> Unit,
    onMoveProviderDown: () -> Unit,
    previewDisplayChannel: EnrichedChannel?,
    guideClockMillis: Long,
    previewNowNext: IptvNowNext?,
    favoriteSet: Set<String>,
    exoPlayer: ExoPlayer,
    onFavoriteToggle: (String) -> Unit,
    onFullscreenClick: () -> Unit,
    variantCountFor: (EnrichedChannel) -> Int,
    onOpenVariants: (EnrichedChannel) -> Unit,
    lookupBackdrop: suspend (IptvProgram) -> String?,
    lookupLogo: suspend (IptvProgram) -> String?,
    titleTextSize: String,
    descriptionTextSize: String,
    compactTouchLayout: Boolean,
    landscapeCompactMiniPlayer: Boolean,
    tabletLandscapeMiniPlayer: Boolean,
    tree: LiveCategoryTree,
    selectedCategoryId: String,
    sidebarExpanded: Boolean,
    sidebarListState: LazyListState,
    sidebarFocus: FocusRequester,
    onSelectCategory: (String) -> Unit,
    onOpenSearch: () -> Unit,
    onHideCategory: (String?, String) -> Unit,
    onUnhideCategory: (String?, String) -> Unit,
    onMoveCategoryUp: (String?, String) -> Unit,
    onMoveCategoryToTop: (String?, String) -> Unit,
    onMoveCategoryDown: (String?, String) -> Unit,
    onCategoryFocusEnter: () -> Unit,
    onMoveCategoryRight: () -> Unit,
    onMoveUpFromSearch: () -> Unit,
    focusSelectedCategorySignal: Int,
    focusSearchCategorySignal: Int,
    guideDisplayChannels: List<EnrichedChannel>,
    channelWindowOffset: Int,
    totalChannelCount: Int,
    nowNext: Map<String, IptvNowNext>,
    epgLoadingChannelIds: Set<String>,
    epgAttemptedChannelIds: Set<String>,
    hasGuideSource: Boolean,
    selectedDisplayChannelId: String?,
    focusSelectedChannelSignal: Int,
    focusEpgSignal: Int,
    focusMode: EpgGridFocusMode,
    scrollResetKey: String,
    gridFocused: Boolean,
    backHandlingEnabled: Boolean,
    onChannelSelect: (EnrichedChannel, IptvProgram?) -> Unit,
    onProgramSelect: (EnrichedChannel, IptvProgram?) -> Unit,
    onChannelFocused: (EnrichedChannel) -> Unit,
    onMoveLeftFromChannels: () -> Unit,
    onEnterEpg: (EnrichedChannel) -> Unit,
    onExitEpg: (EnrichedChannel?) -> Unit,
    onRequestPreviousChannels: () -> Unit,
    onRequestNextChannels: () -> Unit,
    contentTopPadding: Dp,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(top = contentTopPadding),
    ) {
        ProviderSelector(
            providers = providerFilters,
            selectedId = selectedProviderId,
            focusRequester = if (!isTouchDevice) providerFocus else null,
            onSelect = onSelectProvider,
            onMoveUp = onMoveProviderUp,
            onMoveDown = onMoveProviderDown,
            modifier = Modifier.fillMaxWidth(),
        )
        val classicBackdropUrl by produceState<String?>(
            initialValue = null,
            key1 = previewDisplayChannel?.id,
            key2 = previewNowNext?.now?.startUtcMillis,
        ) {
            value = null
            if (isTouchDevice) return@produceState
            val program = previewNowNext?.now?.takeIf { it.title.isNotBlank() } ?: return@produceState
            delay(200L)
            value = runCatching { lookupBackdrop(program) }.getOrNull()
        }
        val classicProgramLogoUrl by produceState<String?>(
            initialValue = null,
            key1 = previewDisplayChannel?.id,
            key2 = previewNowNext?.now?.startUtcMillis,
        ) {
            value = null
            if (isTouchDevice) return@produceState
            val program = previewNowNext?.now?.takeIf { it.title.isNotBlank() } ?: return@produceState
            delay(200L)
            value = runCatching { lookupLogo(program) }.getOrNull()
        }
        MiniPlayerRow(
            exoPlayer = exoPlayer,
            channel = previewDisplayChannel,
            clockTickMillis = guideClockMillis,
            nowNext = previewNowNext,
            onFavoriteToggle = onFavoriteToggle,
            favoriteSet = favoriteSet,
            onFullscreenClick = onFullscreenClick,
            variantCount = previewDisplayChannel?.let { variantCountFor(it) } ?: 1,
            onOpenVariants = previewDisplayChannel?.let { channel -> { onOpenVariants(channel) } },
            backdropUrl = classicBackdropUrl,
            programLogoUrl = classicProgramLogoUrl,
            titleTextSize = titleTextSize,
            descriptionTextSize = descriptionTextSize,
            compact = compactTouchLayout,
            landscapeCompact = landscapeCompactMiniPlayer,
            tabletLandscape = tabletLandscapeMiniPlayer,
            modifier = Modifier.fillMaxWidth(),
        )

        if (isTouchDevice) {
            TouchCategoryRail(
                tree = tree,
                selectedId = selectedCategoryId,
                onSelect = onSelectCategory,
                onOpenSearch = onOpenSearch,
                modifier = Modifier.fillMaxWidth(),
            )
            EpgGrid(
                channels = guideDisplayChannels,
                channelWindowOffset = channelWindowOffset,
                totalChannelCount = totalChannelCount,
                clockTickMillis = guideClockMillis,
                nowNext = nowNext,
                epgLoadingChannelIds = epgLoadingChannelIds,
                epgAttemptedChannelIds = epgAttemptedChannelIds,
                isGuideBackfillLoading = false,
                hasGuideSource = hasGuideSource,
                selectedChannelId = selectedDisplayChannelId,
                focusSelectedChannelSignal = focusSelectedChannelSignal,
                focusEpgSignal = focusEpgSignal,
                focusMode = focusMode,
                scrollResetKey = scrollResetKey,
                compact = compactTouchLayout,
                gridFocused = focusMode == EpgGridFocusMode.Epg,
                onChannelSelect = onChannelSelect,
                onProgramSelect = onProgramSelect,
                onChannelFocused = onChannelFocused,
                onChannelFavoriteToggle = onFavoriteToggle,
                favorites = favoriteSet,
                variantCountFor = variantCountFor,
                onOpenVariants = onOpenVariants,
                onMoveLeftFromChannels = onMoveLeftFromChannels,
                onEnterEpg = onEnterEpg,
                onExitEpg = onExitEpg,
                onRequestPreviousChannels = onRequestPreviousChannels,
                onRequestNextChannels = onRequestNextChannels,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
            )
        } else {
            Row(modifier = Modifier.fillMaxSize()) {
                CategorySidebar(
                    tree = tree,
                    selectedId = selectedCategoryId,
                    expanded = sidebarExpanded,
                    listState = sidebarListState,
                    focusRequester = sidebarFocus,
                    onSelect = onSelectCategory,
                    onOpenSearch = onOpenSearch,
                    onHideCategory = onHideCategory,
                    onUnhideCategory = onUnhideCategory,
                    onMoveCategoryUp = onMoveCategoryUp,
                    onMoveCategoryToTop = onMoveCategoryToTop,
                    onMoveCategoryDown = onMoveCategoryDown,
                    onFocusEnter = onCategoryFocusEnter,
                    onMoveRight = onMoveCategoryRight,
                    onMoveUpFromSearch = onMoveUpFromSearch,
                    focusSelectedCategorySignal = focusSelectedCategorySignal,
                    focusSearchSignal = focusSearchCategorySignal,
                    modifier = Modifier.fillMaxHeight().focusGroup(),
                )
                EpgGrid(
                    channels = guideDisplayChannels,
                    channelWindowOffset = channelWindowOffset,
                    totalChannelCount = totalChannelCount,
                    clockTickMillis = guideClockMillis,
                    nowNext = nowNext,
                    epgLoadingChannelIds = epgLoadingChannelIds,
                    epgAttemptedChannelIds = epgAttemptedChannelIds,
                    isGuideBackfillLoading = false,
                    hasGuideSource = hasGuideSource,
                    selectedChannelId = selectedDisplayChannelId,
                    focusSelectedChannelSignal = focusSelectedChannelSignal,
                    focusEpgSignal = focusEpgSignal,
                    focusMode = focusMode,
                    scrollResetKey = scrollResetKey,
                    compact = false,
                    gridFocused = gridFocused,
                    backHandlingEnabled = backHandlingEnabled,
                    onChannelSelect = onChannelSelect,
                    onProgramSelect = onProgramSelect,
                    onChannelFocused = onChannelFocused,
                    onChannelFavoriteToggle = onFavoriteToggle,
                    favorites = favoriteSet,
                    variantCountFor = variantCountFor,
                    onOpenVariants = onOpenVariants,
                    onMoveLeftFromChannels = onMoveLeftFromChannels,
                    onEnterEpg = onEnterEpg,
                    onExitEpg = onExitEpg,
                    onRequestPreviousChannels = onRequestPreviousChannels,
                    onRequestNextChannels = onRequestNextChannels,
                    modifier = Modifier.weight(1f).fillMaxSize(),
                )
            }
        }
    }
}