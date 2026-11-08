package com.arflix.tv.data.repository

import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType

private val descriptionStopWords = (
    "und oder aber als auf aus bei bis das dem den der des die ein eine einem einen einer eines " +
        "fur hat haben ihr ihre ihrer ihm ihn ist mit nach nicht noch sich sie sind uber um " +
        "von vor war werden wird zum zur auch durch kann konnen muss nur schon sein seine " +
        "seiner seinerseits zwischen sowie the and are was were with for from this that " +
        "his her their they them who she you into has have not can will"
    ).split(' ').toSet()

private fun descriptionTokens(text: String): Set<String> =
    normalizeIptvArtworkTitle(text).split(' ')
        .filter { it.length >= 3 && it !in descriptionStopWords && it.any(Char::isLetter) }
        .toSet()

internal fun iptvArtworkDescriptionScores(
    description: String?,
    candidates: List<MediaItem>,
): Map<Pair<MediaType, Int>, Double> {
    val requested = descriptionTokens(description.orEmpty())
    if (requested.size < 2) return emptyMap()
    // Keep localized and English overviews: character and place names often survive translation.
    val tokensByRef = candidates.groupBy { it.mediaType to it.id }
        .mapValues { (_, aliases) -> aliases.flatMap { descriptionTokens(it.overview) }.toSet() }
    val populated = tokensByRef.values.filter { it.isNotEmpty() }
    if (populated.size < 2) return emptyMap()
    return tokensByRef.mapValues { (_, tokens) ->
        val distinctiveMatches = requested.intersect(tokens).count { token ->
            populated.count { token in it } * 2 <= populated.size
        }
        // A single shared word is not enough to override the existing title/type ranking.
        if (distinctiveMatches < 2) {
            0.0
        } else {
            // A TMDB overview describes the whole series, not the episode on air, and a reboot shares its
            // characters with the original: the S.W.A.T. episode "Hondo ... Luca ..." (2017) shares exactly
            // those two names with the 1975 overview (2 of 12 words, 58 points) and used to pull the old series
            // above the current one. Weak overlap is ignored; strong overlap still decides between versions.
            (350.0 * distinctiveMatches / requested.size).takeIf { it >= MIN_DESCRIPTION_SCORE } ?: 0.0
        }
    }
}

private const val MIN_DESCRIPTION_SCORE = 100.0
