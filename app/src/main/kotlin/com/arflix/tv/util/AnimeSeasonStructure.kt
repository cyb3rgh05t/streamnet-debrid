package com.arflix.tv.util

import com.arflix.tv.data.model.EpisodeIdentity

/** A provider entry that can become one user-visible anime season. */
internal data class AnimeProviderSeason(
    val kitsuId: Int,
    val tmdbSeason: Int?,
    val episodeCount: Int
)

internal data class AnimeSeasonStructure(
    val seasons: Map<Int, List<EpisodeIdentity>>
) {
    val seasonCount: Int get() = seasons.size

    fun identityForDisplay(season: Int, episode: Int): EpisodeIdentity? =
        seasons[season]?.firstOrNull { it.displayEpisode == episode }

    fun identityForTmdb(season: Int, episode: Int): EpisodeIdentity? =
        seasons.values.asSequence().flatten().firstOrNull {
            it.tmdbSeason == season && it.tmdbEpisode == episode
        }

    fun nextAfterDisplay(season: Int, episode: Int): EpisodeIdentity? {
        identityForDisplay(season, episode + 1)?.let { return it }
        return seasons[season + 1]?.firstOrNull()
    }

    fun previousBeforeDisplay(season: Int, episode: Int): EpisodeIdentity? {
        identityForDisplay(season, episode - 1)?.let { return it }
        return seasons[season - 1]?.lastOrNull()
    }

    fun canonicalEpisodesForDisplaySeason(season: Int): Map<Int, List<Int>> =
        seasons[season].orEmpty()
            .groupBy { it.tmdbSeason }
            .mapValues { (_, identities) -> identities.map { it.tmdbEpisode } }

    fun progressForCanonicalEpisodes(
        watched: Set<Pair<Int, Int>>
    ): Map<Int, Pair<Int, Int>> = seasons.mapValues { (_, identities) ->
        identities.count { (it.tmdbSeason to it.tmdbEpisode) in watched } to identities.size
    }
}

internal fun fallbackAdjacentEpisodeIdentity(
    current: EpisodeIdentity,
    forward: Boolean
): EpisodeIdentity? {
    val delta = if (forward) 1 else -1
    val displayEpisode = current.displayEpisode + delta
    val tmdbEpisode = current.tmdbEpisode + delta
    if (displayEpisode <= 0 || tmdbEpisode <= 0) return null
    return EpisodeIdentity(
        displaySeason = current.displaySeason,
        displayEpisode = displayEpisode,
        tmdbSeason = current.tmdbSeason,
        tmdbEpisode = tmdbEpisode
    )
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
    if (validProviders.sumOf { it.episodeCount } != canonicalEpisodes.size) return null

    val explicitlyMapped = validProviders.all { it.tmdbSeason != null }
    if (explicitlyMapped) {
        val result = linkedMapOf<Int, List<EpisodeIdentity>>()
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
                    EpisodeIdentity(
                        displaySeason = displaySeason,
                        displayEpisode = displayEpisode,
                        tmdbSeason = tmdbSeason,
                        tmdbEpisode = tmdbEpisode++,
                        kitsuId = provider.kitsuId,
                        kitsuEpisode = displayEpisode
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
    val result = linkedMapOf<Int, List<EpisodeIdentity>>()
    var canonicalIndex = 0
    validProviders.forEachIndexed { index, provider ->
        val remaining = canonicalEpisodes.size - canonicalIndex
        val take = provider.episodeCount
        if (take <= 0 || (index != validProviders.lastIndex && take > remaining)) return null
        val displaySeason = index + 1
        result[displaySeason] = (0 until take).map { offset ->
            val (tmdbSeason, tmdbEpisode) = canonicalEpisodes[canonicalIndex + offset]
            EpisodeIdentity(
                displaySeason = displaySeason,
                displayEpisode = offset + 1,
                tmdbSeason = tmdbSeason,
                tmdbEpisode = tmdbEpisode,
                kitsuId = provider.kitsuId,
                kitsuEpisode = offset + 1
            )
        }
        canonicalIndex += take
    }
    if (canonicalIndex != canonicalEpisodes.size) return null

    return AnimeSeasonStructure(result).takeIf { it.seasonCount > 1 }
}
