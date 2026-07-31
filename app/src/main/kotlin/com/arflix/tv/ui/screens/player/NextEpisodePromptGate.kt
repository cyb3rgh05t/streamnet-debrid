package com.arflix.tv.ui.screens.player

internal data class PlaybackEpisodeKey(
    val mediaId: Int,
    val seasonNumber: Int,
    val episodeNumber: Int,
)

/**
 * Claims an end-of-episode prompt once per episode.
 *
 * The player polls ExoPlayer state continuously. STATE_ENDED remains active after the prompt is
 * dismissed, so visibility alone cannot guard against opening the same countdown again.
 */
internal class NextEpisodePromptGate {
    private var handledEpisode: PlaybackEpisodeKey? = null

    fun tryOpen(
        episode: PlaybackEpisodeKey?,
        eligible: Boolean,
    ): Boolean {
        if (!eligible || episode == null || handledEpisode == episode) return false
        handledEpisode = episode
        return true
    }
}
