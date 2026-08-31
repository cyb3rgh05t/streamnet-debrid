package com.arflix.tv.ui.screens.home

import com.arflix.tv.data.repository.ContinueWatchingItem

internal fun mergeContinueWatchingVisuals(
    preferred: ContinueWatchingItem,
    fallback: ContinueWatchingItem
): ContinueWatchingItem = preferred.copy(
    title = preferred.title.ifBlank { fallback.title },
    episodeTitle = preferred.episodeTitle ?: fallback.episodeTitle,
    backdropPath = preferred.backdropPath ?: fallback.backdropPath,
    posterPath = preferred.posterPath ?: fallback.posterPath,
    streamKey = preferred.streamKey ?: fallback.streamKey,
    streamAddonId = preferred.streamAddonId ?: fallback.streamAddonId,
    streamTitle = preferred.streamTitle ?: fallback.streamTitle,
    year = preferred.year.ifBlank { fallback.year },
    releaseDate = preferred.releaseDate.ifBlank { fallback.releaseDate },
    overview = preferred.overview.ifBlank { fallback.overview },
    imdbRating = preferred.imdbRating.ifBlank { fallback.imdbRating },
    duration = preferred.duration.ifBlank { fallback.duration },
    durationSeconds = maxOf(preferred.durationSeconds, fallback.durationSeconds),
    budget = preferred.budget ?: fallback.budget,
    totalEpisodes = if (preferred.totalEpisodes > 0) preferred.totalEpisodes else fallback.totalEpisodes,
    watchedEpisodes = if (preferred.watchedEpisodes > 0) preferred.watchedEpisodes else fallback.watchedEpisodes,
    updatedAtMs = maxOf(preferred.updatedAtMs, fallback.updatedAtMs)
)

internal fun mergeTraktAndRecentLocalContinueWatching(
    traktItems: List<ContinueWatchingItem>,
    localItems: List<ContinueWatchingItem>,
    historyItems: List<ContinueWatchingItem>
): List<ContinueWatchingItem> {
    val freshestLocalByExactEpisode = (localItems + historyItems)
        .groupBy { item ->
            "${item.mediaType}:${item.id}:${item.season ?: -1}:${item.episode ?: -1}"
        }
        .mapValues { (_, candidates) -> candidates.maxWithOrNull(continueWatchingRecencyComparator) }

    val traktKeys = traktItems.mapTo(mutableSetOf()) { item ->
        "${item.mediaType}:${item.id}:${item.season ?: -1}:${item.episode ?: -1}"
    }
    val mergedTraktItems = traktItems.map { traktItem ->
        val exactKey = "${traktItem.mediaType}:${traktItem.id}:${traktItem.season ?: -1}:${traktItem.episode ?: -1}"
        val local = freshestLocalByExactEpisode[exactKey]
        if (local == null) {
            traktItem
        } else {
            mergeContinueWatchingVisuals(
                preferred = traktItem.copy(
                    resumePositionSeconds = maxOf(traktItem.resumePositionSeconds, local.resumePositionSeconds),
                    durationSeconds = maxOf(traktItem.durationSeconds, local.durationSeconds),
                    progress = maxOf(traktItem.progress, local.progress)
                ),
                fallback = local
            )
        }
    }
    val missingLocalItems = (localItems + historyItems)
        .filter { item ->
            val exactKey = "${item.mediaType}:${item.id}:${item.season ?: -1}:${item.episode ?: -1}"
            exactKey !in traktKeys
        }
        .groupBy { item -> "${item.mediaType}:${item.id}" }
        .mapNotNull { (_, candidates) -> candidates.maxWithOrNull(continueWatchingRecencyComparator) }

    return (mergedTraktItems + missingLocalItems)
        .groupBy { item -> "${item.mediaType}:${item.id}" }
        .mapNotNull { (_, candidates) -> candidates.maxWithOrNull(continueWatchingRecencyComparator) }
        .sortedByDescending { it.updatedAtMs }
}

private val continueWatchingRecencyComparator =
    compareBy<ContinueWatchingItem> { it.updatedAtMs }
        .thenBy { it.resumePositionSeconds }
        .thenBy { it.progress }