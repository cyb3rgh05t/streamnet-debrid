package com.arflix.tv.data.repository

import com.arflix.tv.data.model.MediaType
import com.arflix.tv.util.Constants
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class LauncherContinueWatchingTest {
    private fun item(id: Int, episode: Int? = null) = ContinueWatchingItem(
        id = id,
        title = "Title $id",
        mediaType = if (episode == null) MediaType.MOVIE else MediaType.TV,
        progress = 50,
        season = if (episode == null) null else 1,
        episode = episode
    )

    @Test
    fun `publishing removes repeats without reversing app order`() {
        val first = item(3)
        val episode = item(3, 1)
        assertEquals(
            listOf(first, episode, item(1), item(3, 2)),
            launcherPublishingItems(listOf(first, episode, first, item(1), episode, item(3, 2)))
        )
    }

    @Test
    fun `publishing limit applies after removing duplicates`() {
        val items = (1..100).flatMap { listOf(item(it), item(it)) }
        assertEquals((1..Constants.MAX_CONTINUE_WATCHING).toList(), launcherPublishingItems(items).map { it.id })
    }

    @Test
    fun `watch next timestamps retain descending source order`() {
        val times = (0..49).map { launcherEngagementTime(100_000L, it) }
        assertTrue(times.zipWithNext().all { (first, second) -> first > second })
    }

    @Test
    fun `playback metadata uses exact resume then percentage fallback`() {
        assertEquals(LauncherPlayback(100_000, 30_000),
            item(1).copy(durationSeconds = 100, resumePositionSeconds = 30).launcherPlayback())
        assertEquals(LauncherPlayback(100_000, 50_000),
            item(1).copy(durationSeconds = 100).launcherPlayback())
        assertEquals(LauncherPlayback(100_000, 0),
            item(1).copy(durationSeconds = 100, resumePositionSeconds = 30, isUpNext = true).launcherPlayback())
        assertEquals(LauncherPlayback(100_000, 100_000),
            item(1).copy(durationSeconds = 100, resumePositionSeconds = 200).launcherPlayback())
        assertTrue(item(1).copy(durationSeconds = Long.MAX_VALUE, resumePositionSeconds = Long.MAX_VALUE)
            .launcherPlayback().positionMs >= 0)
    }
}
