package com.arflix.tv.data.repository

/**
 * Which episodes of one series the IPTV provider actually offers. Built from the provider's own
 * episode lists and answers with the same rule playback uses to find an episode, so an episode that
 * shows up as available here is one the resolver can play.
 */
class SeriesEpisodeAvailability(
    private val episodeCheck: (season: Int, episode: Int) -> Boolean,
    private val seasonCheck: (season: Int) -> Boolean,
) {
    fun hasEpisode(season: Int, episode: Int): Boolean = episodeCheck(season, episode)

    /** False only when the provider is known to carry nothing of this season. */
    fun hasSeason(season: Int): Boolean = seasonCheck(season)
}
