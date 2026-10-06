package com.arflix.tv.ui.screens.home

import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.repository.ContinueWatchingItem
import org.junit.Assert.assertEquals
import org.junit.Test

class ContinueWatchingMergeTest {
    private fun item(position: Long, progress: Int, time: Long) = ContinueWatchingItem(
        id = 969681, title = "Movie", mediaType = MediaType.MOVIE,
        resumePositionSeconds = position, progress = progress, updatedAtMs = time
    )

    @Test
    fun cloudHistoryReplacesOldFourSecondSnapshot() {
        val merged = mergeTraktAndRecentLocalContinueWatching(
            emptyList(), listOf(item(4, 0, 1)), listOf(item(90, 1, 2))
        )
        assertEquals(90L, merged.single().resumePositionSeconds)
        assertEquals(1, merged.single().progress)
    }

    @Test
    fun newestActiveRecordCanHaveLowerProgress() {
        val merged = mergeTraktAndRecentLocalContinueWatching(
            listOf(item(500, 50, 1)), emptyList(), listOf(item(120, 12, 2))
        )
        assertEquals(120L, merged.single().resumePositionSeconds)
        assertEquals(12, merged.single().progress)
    }

    @Test
    fun activeEpisodeWinsOverNewerEmptyEpisodeLikeWeb() {
        val active = item(500, 50, 1).copy(mediaType = MediaType.TV, season = 1, episode = 2)
        val empty = item(0, 0, 2).copy(mediaType = MediaType.TV, season = 1, episode = 3)
        val merged = mergeTraktAndRecentLocalContinueWatching(
            emptyList(), listOf(active), listOf(empty)
        )
        assertEquals(2, merged.single().episode)
    }

    @Test
    fun eligibilityMatchesWebProgressAndResumeThresholds() {
        assertEquals(false, isActiveContinueWatchingResume(item(9, 0, 1)))
        assertEquals(true, isActiveContinueWatchingResume(item(10, 0, 1)))
        assertEquals(true, isActiveContinueWatchingResume(item(0, 1, 1)))
        assertEquals(false, isActiveContinueWatchingResume(item(900, 90, 1)))
        assertEquals(1, continueWatchingProgressPercent(30, 6000, 0f))
        assertEquals(43, continueWatchingProgressPercent(2849, 6642, 0.42f))
        assertEquals(20, continueWatchingProgressPercent(0, 0, 0.2f))
    }
}
