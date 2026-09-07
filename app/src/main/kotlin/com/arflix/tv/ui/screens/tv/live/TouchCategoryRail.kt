package com.arflix.tv.ui.screens.tv.live

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
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
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.arflix.tv.R

private data class TouchCategoryRailItem(
    val id: String,
    val label: String,
    val count: Int,
)

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TouchCategoryRail(
    tree: LiveCategoryTree,
    selectedId: String,
    onSelect: (String) -> Unit,
    onOpenSearch: () -> Unit,
    focusRequester: FocusRequester? = null,
    focusSelectedCategorySignal: Int = 0,
    onFocused: () -> Unit = {},
    onMoveUp: () -> Unit = {},
    onMoveDown: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    val items = rememberTouchRailItems(tree, selectedId)
    val focusTargetId = items.firstOrNull { it.id == selectedId }?.id ?: items.firstOrNull()?.id
    LaunchedEffect(focusSelectedCategorySignal, selectedId, items) {
        if (focusSelectedCategorySignal > 0 && focusTargetId != null) {
            runCatching { focusRequester?.requestFocus() }
        }
    }

    LazyRow(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
    ) {
        item(key = "search") {
            Row(
                modifier = Modifier
                    .height(38.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(LiveColors.PanelRaised)
                    .clickable(onClick = onOpenSearch)
                    .padding(horizontal = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.Search,
                    contentDescription = stringResource(R.string.search),
                    tint = LiveColors.FgDim,
                )
                Text(
                    text = stringResource(R.string.live_label_search_channels),
                    style = LiveType.CatLabel.copy(color = LiveColors.Fg),
                )
            }
        }

        itemsIndexed(items, key = { index, item -> "${item.id}#$index" }) { index, item ->
            val active = selectedId == item.id
            val focusTarget = focusRequester != null && item.id == focusTargetId
            var focused by remember(item.id) { mutableStateOf(false) }
            Box(
                modifier = Modifier
                    .height(38.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(
                        when {
                            active -> LiveColors.Accent
                            focused -> LiveColors.PanelRaised
                            else -> LiveColors.PanelDeep
                        }
                    )
                    .border(
                        width = if (focused) 2.dp else 1.dp,
                        color = when {
                            focused -> LiveColors.FocusRing
                            active -> LiveColors.Accent.copy(alpha = 0.72f)
                            else -> LiveColors.Divider
                        },
                        shape = RoundedCornerShape(999.dp),
                    )
                    .then(if (focusTarget) Modifier.focusRequester(focusRequester) else Modifier)
                    .onFocusChanged {
                        focused = it.hasFocus
                        if (it.hasFocus) onFocused()
                    }
                    .focusable(enabled = focusRequester != null)
                    .onKeyEvent { event ->
                        if (focusRequester == null || event.type != KeyEventType.KeyDown) return@onKeyEvent false
                        when (event.key) {
                            Key.DirectionLeft -> {
                                val previous = items.getOrNull(index - 1)
                                if (previous != null) onSelect(previous.id) else onOpenSearch()
                                true
                            }
                            Key.DirectionRight -> {
                                items.getOrNull(index + 1)?.let { onSelect(it.id) }
                                true
                            }
                            Key.DirectionUp -> {
                                onMoveUp()
                                true
                            }
                            Key.DirectionDown -> {
                                onMoveDown()
                                true
                            }
                            Key.DirectionCenter, Key.Enter -> {
                                onSelect(item.id)
                                true
                            }
                            else -> false
                        }
                    }
                    .clickable { onSelect(item.id) }
                    .padding(horizontal = 14.dp),
                contentAlignment = Alignment.Center,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = item.label,
                        style = LiveType.CatLabel.copy(
                            color = if (active) LiveColors.Bg else LiveColors.Fg,
                        ),
                    )
                    if (item.count > 0) {
                        Spacer(Modifier.width(2.dp))
                        Text(
                            text = formatCount(item.count),
                            style = LiveType.NumberMono.copy(
                                color = if (active) LiveColors.Bg.copy(alpha = 0.82f) else LiveColors.FgMute,
                            ),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun rememberTouchRailItems(
    tree: LiveCategoryTree,
    selectedId: String,
): List<TouchCategoryRailItem> {
    val base = buildList {
        tree.top.forEach { add(TouchCategoryRailItem(it.id, liveCategoryLabel(it.label), it.count)) }
        tree.global.categories.forEach { add(TouchCategoryRailItem(it.id, liveCategoryLabel(it.label), it.count)) }
        tree.countries.categories.forEach { add(TouchCategoryRailItem(it.id, liveCategoryLabel(it.label), it.count)) }
        tree.adult.categories.forEach { add(TouchCategoryRailItem(it.id, liveCategoryLabel(it.label), it.count)) }
    }.distinctBy { it.id }.toMutableList()

    val selected = tree.byId(selectedId)
    if (selected != null && base.none { it.id == selectedId }) {
        base.add(0, TouchCategoryRailItem(selected.id, liveCategoryLabel(selected.label), selected.count))
    }

    return base
}
