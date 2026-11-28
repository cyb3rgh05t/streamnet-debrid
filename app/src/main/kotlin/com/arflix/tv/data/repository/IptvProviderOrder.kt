package com.arflix.tv.data.repository

import com.arflix.tv.data.model.IptvChannel
import com.arflix.tv.data.model.PlaylistGroupKey

/**
 * Xtream providers expose their canonical group sequence through
 * `get_live_categories`. `get_live_streams` is frequently global-number ordered,
 * so flattening it directly makes groups appear in the wrong order. Bucket the
 * streams by category while retaining each bucket's provider response sequence.
 */
internal fun orderXtreamChannelsByProviderCategories(
    categoryIdsInProviderOrder: List<String>,
    categorizedChannels: List<Pair<String, IptvChannel>>,
): List<IptvChannel> {
    if (categorizedChannels.isEmpty()) return emptyList()

    val channelsByCategory = LinkedHashMap<String, MutableList<IptvChannel>>()
    categorizedChannels.forEach { (rawCategoryId, channel) ->
        val categoryId = rawCategoryId.trim()
        channelsByCategory.getOrPut(categoryId) { ArrayList() }.add(channel)
    }

    val ordered = ArrayList<IptvChannel>(categorizedChannels.size)
    categoryIdsInProviderOrder.asSequence()
        .map { it.trim() }
        .filter { it.isNotBlank() }
        .distinct()
        .forEach { categoryId ->
            channelsByCategory.remove(categoryId)?.let(ordered::addAll)
        }
    channelsByCategory.values.forEach(ordered::addAll)
    return ordered
}

/**
 * A saved group order belongs to the exact playlist source it was created for.
 * Reusing a playlist id for a different URL must not carry the old custom order
 * into the replacement provider.
 */
internal fun changedPlaylistSourceIds(
    previous: List<IptvPlaylistEntry>,
    current: List<IptvPlaylistEntry>,
): Set<String> {
    val previousById = previous.associateBy { it.id.trim() }
    val currentById = current.associateBy { it.id.trim() }
    return (previousById.keys + currentById.keys).asSequence()
        .filter { it.isNotBlank() }
        .filter { id ->
            previousById[id]?.m3uUrl?.trim() != currentById[id]?.m3uUrl?.trim()
        }
        .toSet()
}

internal fun retainGroupOrderForUnchangedSources(
    savedOrder: List<String>,
    changedPlaylistIds: Set<String>,
): List<String> {
    if (savedOrder.isEmpty() || changedPlaylistIds.isEmpty()) return savedOrder
    return savedOrder.filterNot { raw ->
        PlaylistGroupKey(raw.trim()).playlistId in changedPlaylistIds
    }
}

/**
 * Applies the user's channel preferences to a category's channel list: hidden channels are
 * dropped and, when [applyOrder] is set, channels with a saved rank come first in that order.
 * Unranked channels keep their incoming order behind them.
 */
internal fun <T> applyIptvChannelPreferences(
    channels: List<T>,
    hiddenIds: Set<String>,
    savedOrder: List<String>,
    applyOrder: Boolean,
    idOf: (T) -> String,
): List<T> {
    val visible = if (hiddenIds.isEmpty()) channels else channels.filterNot { idOf(it) in hiddenIds }
    if (!applyOrder || savedOrder.isEmpty() || visible.size < 2) return visible
    val rank = HashMap<String, Int>(savedOrder.size)
    savedOrder.forEachIndexed { index, id -> rank.putIfAbsent(id, index) }
    if (visible.none { idOf(it) in rank }) return visible
    return visible.sortedBy { rank[idOf(it)] ?: Int.MAX_VALUE }
}

/**
 * Moves [channelId] inside the list the user currently sees ([visibleIds], already in display
 * order) and returns the new saved order. Only the channels up to the moved position are
 * re-ranked, and they are put at the front of the saved list: ranked channels are shown first,
 * so the visible sequence becomes exactly the moved one while the saved list stays short.
 */
internal fun reorderIptvChannels(
    savedOrder: List<String>,
    visibleIds: List<String>,
    channelId: String,
    move: IptvGroupOrderMove,
): List<String> {
    val visible = visibleIds.map(String::trim).filter(String::isNotBlank).distinct()
    val target = channelId.trim()
    val position = visible.indexOf(target)
    val normalizedSaved = savedOrder.map(String::trim).filter(String::isNotBlank).distinct()
    if (position < 0) return normalizedSaved
    val prefix: List<String> = when (move) {
        IptvGroupOrderMove.UP -> {
            if (position == 0) return normalizedSaved
            visible.take(position - 1) + target + visible[position - 1]
        }
        IptvGroupOrderMove.DOWN -> {
            if (position == visible.lastIndex) return normalizedSaved
            visible.take(position) + visible[position + 1] + target
        }
        IptvGroupOrderMove.TOP -> {
            if (position == 0) return normalizedSaved
            listOf(target)
        }
    }
    val prefixSet = prefix.toHashSet()
    return prefix + normalizedSaved.filterNot { it in prefixSet }
}
