package com.arflix.tv.ui.screens.details

import com.arflix.tv.R
import org.junit.Assert.assertEquals
import org.junit.Test

class EpisodePlayLabelTest {
    @Test
    fun newSeriesStartsFirstEpisode() {
        assertEquals(R.string.play_start_s1e1, episodePlayLabelResource(1, 1, false))
        assertEquals(R.string.play_start_s1e1, episodePlayLabelResource(1, 1, false, 0L))
    }

    @Test
    fun firstEpisodeWithResumePositionContinues() {
        assertEquals(R.string.continue_season_episode, episodePlayLabelResource(1, 1, false, 30_000L))
    }

    @Test
    fun existingSeriesAndLaterEpisodesKeepContinueLabel() {
        assertEquals(R.string.continue_season_episode, episodePlayLabelResource(1, 1, true))
        assertEquals(R.string.continue_season_episode, episodePlayLabelResource(1, 2, false))
        assertEquals(R.string.continue_season_episode, episodePlayLabelResource(2, 1, false))
    }
}
