package com.arflix.tv.ui.screens.details

import com.arflix.tv.data.model.Episode
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.repository.SeriesEpisodeAvailability

/**
 * Shows only the episodes the IPTV provider carries (IPTV-only mode).
 *
 * The state keeps the full TMDB list; this is applied on the way to the screen, so nothing that
 * works on the full list (watched marks, season progress) changes. Rules that keep it safe:
 * - without availability data nothing is touched,
 * - a season the provider does not carry keeps its TMDB list (hiding it all would also hide the
 *   season selector) and is reported in [DetailsUiState.unavailableSeasons] so it can be dimmed.
 */
internal fun applyEpisodeAvailability(
    state: DetailsUiState,
    availability: SeriesEpisodeAvailability?,
): DetailsUiState {
    if (availability == null || state.item?.mediaType != MediaType.TV) return state

    val unavailableSeasons = (1..state.totalSeasons).filterNot(availability::hasSeason).toSet()
    val episodes = state.episodes
    val visible = episodes.filter { availability.hasEpisode(it.tmdbSeasonNumber, it.tmdbEpisodeNumber) }
    // Nothing of this season at the provider: leave the list alone instead of emptying the screen.
    if (visible.isEmpty() || visible.size == episodes.size) {
        return if (state.unavailableSeasons == unavailableSeasons) state
        else state.copy(unavailableSeasons = unavailableSeasons)
    }
    return state.copy(
        episodes = visible,
        initialEpisodeIndex = remapEpisodeIndex(episodes, visible, state.initialEpisodeIndex),
        unavailableSeasons = unavailableSeasons,
    )
}

/** The same episode in the filtered list, or the next visible one when it was hidden. */
internal fun remapEpisodeIndex(all: List<Episode>, visible: List<Episode>, index: Int): Int {
    if (visible.isEmpty()) return 0
    val start = index.coerceIn(0, (all.size - 1).coerceAtLeast(0))
    for (position in start until all.size) {
        val found = visible.indexOfFirst { it.id == all[position].id && it.identity == all[position].identity }
        if (found >= 0) return found
    }
    return visible.lastIndex.coerceAtLeast(0)
}
