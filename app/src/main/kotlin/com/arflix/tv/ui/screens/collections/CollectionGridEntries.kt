package com.arflix.tv.ui.screens.collections

import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.collectionCardKey
import com.arflix.tv.data.repository.MarvelWatchlistTimeline

internal fun localizedTimelineSection(title: String, translations: List<String>): String {
    val index = MarvelWatchlistTimeline.sections.values.indexOf(title)
    require(index >= 0 && translations.size == MarvelWatchlistTimeline.sections.size)
    return translations[index]
}

internal fun localizedTimelineLabel(label: String, movieLabel: String, episodesLabel: String): String =
    (if (label.startsWith("[Film] ")) "[$movieLabel] " + label.removePrefix("[Film] ") else label)
        .replace(" - Folgen ", " - $episodesLabel ")

internal sealed interface CollectionGridEntry {
    val key: String

    data class Heading(val title: String, override val key: String) : CollectionGridEntry
    data class Card(val item: MediaItem, val mediaIndex: Int) : CollectionGridEntry {
        override val key: String get() = item.collectionCardKey
    }
}

internal fun collectionGridEntries(items: List<MediaItem>): List<CollectionGridEntry> = buildList {
    items.forEachIndexed { index, item ->
        val section = item.timelineSection
        if (section != null && (index == 0 || section != items[index - 1].timelineSection)) {
            add(CollectionGridEntry.Heading(section, "section:${item.collectionCardKey}"))
        }
        add(CollectionGridEntry.Card(item, index))
    }
}

internal fun collectionCardGridIndex(items: List<MediaItem>, mediaIndex: Int): Int =
    2 + collectionGridEntries(items).indexOfFirst {
        it is CollectionGridEntry.Card && it.mediaIndex == mediaIndex
    }.also { require(it >= 0) }

internal fun collectionFirstRowCount(items: List<MediaItem>, columns: Int): Int =
    minOf(columns, items.takeWhile { it.timelineSection == items.firstOrNull()?.timelineSection }.size)
