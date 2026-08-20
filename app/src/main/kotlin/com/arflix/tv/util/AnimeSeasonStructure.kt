package com.arflix.tv.util

/** A provider entry that can become one user-visible anime season. */
internal data class AnimeProviderSeason(
    val kitsuId: Int,
    val tmdbSeason: Int?,
    val episodeCount: Int
)

/** Maps one user-visible anime episode back to the canonical TMDB episode. */
internal data class AnimeEpisodeIdentity(
    val displaySeason: Int,
    val displayEpisode: Int,
    val tmdbSeason: Int,
    val tmdbEpisode: Int,
    val kitsuId: Int
)

internal data class AnimeSeasonStructure(
    val seasons: Map<Int, List<AnimeEpisodeIdentity>>
) {
    val seasonCount: Int get() = seasons.size

    fun identityForDisplay(season: Int, episode: Int): AnimeEpisodeIdentity? =
        seasons[season]?.firstOrNull { it.displayEpisode == episode }

    fun identityForTmdb(season: Int, episode: Int): AnimeEpisodeIdentity? =
        seasons.values.asSequence().flatten().firstOrNull {
            it.tmdbSeason == season && it.tmdbEpisode == episode
        }

    fun nextAfterDisplay(season: Int, episode: Int): AnimeEpisodeIdentity? {
        identityForDisplay(season, episode + 1)?.let { return it }
        return seasons[season + 1]?.firstOrNull()
    }
}

/**
 * Builds an anime-facing season structure without title-specific rules.
 *
 * TMDB remains the canonical identity used by Trakt/history. ARM/Kitsu only controls how those
 * canonical episodes are grouped and numbered for display and addon lookup. If the provider data
 * is incomplete or contradictory, null is returned so callers safely keep the normal TMDB view.
 */
internal fun buildAnimeSeasonStructure(
    tmdbSeasonEpisodeCounts: Map<Int, Int>,
    providerSeasons: List<AnimeProviderSeason>
): AnimeSeasonStructure? {
    val canonicalEpisodes = tmdbSeasonEpisodeCounts
        .filterKeys { it > 0 }
        .toSortedMap()
        .flatMap { (season, count) ->
            (1..count.coerceAtLeast(0)).map { episode -> season to episode }
        }
    if (canonicalEpisodes.isEmpty()) return null

    val validProviders = providerSeasons
        .filter { it.kitsuId > 0 && it.episodeCount > 0 }
        .distinctBy { Triple(it.kitsuId, it.tmdbSeason, it.episodeCount) }
    if (validProviders.size < 2) return null

    val explicitlyMapped = validProviders.all { it.tmdbSeason != null }
    if (explicitlyMapped) {
        val result = linkedMapOf<Int, List<AnimeEpisodeIdentity>>()
        var displaySeason = 1
        var explicitMappingValid = true
        validProviders.groupBy { it.tmdbSeason!! }.toSortedMap().forEach { (tmdbSeason, entries) ->
            val available = tmdbSeasonEpisodeCounts[tmdbSeason]
            if (available == null || entries.sumOf { it.episodeCount } > available) {
                explicitMappingValid = false
                return@forEach
            }
            var tmdbEpisode = 1
            entries.forEach { provider ->
                result[displaySeason] = (1..provider.episodeCount).map { displayEpisode ->
                    AnimeEpisodeIdentity(
                        displaySeason = displaySeason,
                        displayEpisode = displayEpisode,
                        tmdbSeason = tmdbSeason,
                        tmdbEpisode = tmdbEpisode++,
                        kitsuId = provider.kitsuId
                    )
                }
                displaySeason++
            }
        }
        if (explicitMappingValid) {
            return AnimeSeasonStructure(result).takeIf { it.seasonCount > 1 }
        }
    }

    // Some TMDB records merge multiple official anime seasons into one canonical season even
    // though ARM labels each Kitsu entry with its official season. When the episode totals match
    // exactly, preserve TMDB identity by distributing the official seasons over the canonical
    // episode sequence. Any incomplete or contradictory provider data still falls back to TMDB.
    if (validProviders.sumOf { it.episodeCount } != canonicalEpisodes.size) return null
    val result = linkedMapOf<Int, List<AnimeEpisodeIdentity>>()
    var canonicalIndex = 0
    validProviders.forEachIndexed { index, provider ->
        val remaining = canonicalEpisodes.size - canonicalIndex
        val take = provider.episodeCount
        if (take <= 0 || (index != validProviders.lastIndex && take > remaining)) return null
        val displaySeason = index + 1
        result[displaySeason] = (0 until take).map { offset ->
            val (tmdbSeason, tmdbEpisode) = canonicalEpisodes[canonicalIndex + offset]
            AnimeEpisodeIdentity(
                displaySeason = displaySeason,
                displayEpisode = offset + 1,
                tmdbSeason = tmdbSeason,
                tmdbEpisode = tmdbEpisode,
                kitsuId = provider.kitsuId
            )
        }
        canonicalIndex += take
    }
    if (canonicalIndex != canonicalEpisodes.size) return null

    return AnimeSeasonStructure(result).takeIf { it.seasonCount > 1 }
}
