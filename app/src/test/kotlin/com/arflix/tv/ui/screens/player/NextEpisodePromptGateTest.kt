package com.arflix.tv.ui.screens.player

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class NextEpisodePromptGateTest {

    @Test
    fun dismissedPromptDoesNotReopenWhilePlayerRemainsEnded() {
        val gate = NextEpisodePromptGate()
        val episode = PlaybackEpisodeKey(mediaId = 42, seasonNumber = 1, episodeNumber = 3)

        assertThat(gate.tryOpen(episode, eligible = true)).isTrue()

        // Closing the overlay does not change ExoPlayer's STATE_ENDED. The next polling tick must
        // therefore reject this same episode instead of starting a fresh countdown.
        assertThat(gate.tryOpen(episode, eligible = true)).isFalse()
    }

    @Test
    fun nextEpisodeCanOpenItsOwnPrompt() {
        val gate = NextEpisodePromptGate()

        assertThat(
            gate.tryOpen(
                PlaybackEpisodeKey(mediaId = 42, seasonNumber = 1, episodeNumber = 3),
                eligible = true,
            )
        ).isTrue()
        assertThat(
            gate.tryOpen(
                PlaybackEpisodeKey(mediaId = 42, seasonNumber = 1, episodeNumber = 4),
                eligible = true,
            )
        ).isTrue()
    }

    @Test
    fun ineligibleStateDoesNotConsumeTheEpisode() {
        val gate = NextEpisodePromptGate()
        val episode = PlaybackEpisodeKey(mediaId = 42, seasonNumber = 1, episodeNumber = 3)

        assertThat(gate.tryOpen(episode, eligible = false)).isFalse()
        assertThat(gate.tryOpen(episode, eligible = true)).isTrue()
    }
}
