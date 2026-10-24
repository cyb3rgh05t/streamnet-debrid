package com.arflix.tv.data.repository

data class SourceEpisodeTarget(val season: Int, val episode: Int)

/**
 * Series whose season layout in stream sources differs from the one the app shows (TMDB).
 * Only the source lookup is remapped; the app keeps showing its own seasons and episodes.
 */
object SourceSeasonRemap {
    private const val OPEN_END = Int.MAX_VALUE

    /** App episodes [fromEpisode]..[toEpisode] of [appSeason] map to [sourceSeason], starting at [sourceFirstEpisode]. */
    private data class Segment(
        val appSeason: Int,
        val fromEpisode: Int,
        val toEpisode: Int,
        val sourceSeason: Int,
        val sourceFirstEpisode: Int,
    )

    private val rulesByTmdbId: Map<Int, List<Segment>> = mapOf(
        // Lupin: TMDB folds Part 1 and Part 2 into season 1 (episodes 1-10); sources list them as
        // seasons 1 and 2 with five episodes each. Parts 3 and 4 follow as source seasons 3 and 4.
        96677 to listOf(
            Segment(appSeason = 1, fromEpisode = 1, toEpisode = 5, sourceSeason = 1, sourceFirstEpisode = 1),
            Segment(appSeason = 1, fromEpisode = 6, toEpisode = OPEN_END, sourceSeason = 2, sourceFirstEpisode = 1),
            Segment(appSeason = 2, fromEpisode = 1, toEpisode = OPEN_END, sourceSeason = 3, sourceFirstEpisode = 1),
            Segment(appSeason = 3, fromEpisode = 1, toEpisode = OPEN_END, sourceSeason = 4, sourceFirstEpisode = 1),
        ),
    )

    fun resolve(tmdbId: Int?, season: Int, episode: Int): SourceEpisodeTarget {
        val segments = tmdbId?.let(rulesByTmdbId::get) ?: return SourceEpisodeTarget(season, episode)
        val segment = segments.firstOrNull {
            it.appSeason == season && episode in it.fromEpisode..it.toEpisode
        } ?: return SourceEpisodeTarget(season, episode)
        return SourceEpisodeTarget(
            season = segment.sourceSeason,
            episode = segment.sourceFirstEpisode + (episode - segment.fromEpisode),
        )
    }
}
