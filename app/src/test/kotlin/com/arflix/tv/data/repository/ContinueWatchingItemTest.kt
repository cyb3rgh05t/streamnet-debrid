package com.arflix.tv.data.repository

import android.content.res.Configuration
import com.arflix.tv.data.model.MediaType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import java.util.Locale

@RunWith(RobolectricTestRunner::class)
class ContinueWatchingItemTest {

    @Test
    fun toMediaItem_upNextDoesNotDeriveResumeTimeFromShowProgress() {
        val item = ContinueWatchingItem(
            id = 123,
            title = "Example Show",
            mediaType = MediaType.TV,
            progress = 55,
            resumePositionSeconds = 0L,
            durationSeconds = 2700L,
            season = 4,
            episode = 29,
            isUpNext = true
        )

        val mediaItem = item.toMediaItem()

        assertEquals("Continue S4E29", mediaItem.subtitle)
        assertFalse(mediaItem.showPlaybackProgress)
        assertNull(mediaItem.timeRemainingLabel)
    }

    @Test
    fun toMediaItem_inProgressEpisodeCanStillUsePlaybackProgress() {
        val item = ContinueWatchingItem(
            id = 123,
            title = "Example Show",
            mediaType = MediaType.TV,
            progress = 50,
            resumePositionSeconds = 0L,
            durationSeconds = 2700L,
            season = 1,
            episode = 2
        )

        val mediaItem = item.toMediaItem()

        assertEquals("Continue S1E2 from 22:30", mediaItem.subtitle)
        assertEquals("22min left", mediaItem.timeRemainingLabel)
    }

    @Test
    fun toMediaItem_localizesGermanContinueWatchingBadges() {
        val baseContext = RuntimeEnvironment.getApplication()
        val configuration = Configuration(baseContext.resources.configuration).apply {
            setLocale(Locale.GERMAN)
        }
        val germanContext = baseContext.createConfigurationContext(configuration)
        val item = ContinueWatchingItem(
            id = 123,
            title = "Beispielserie",
            mediaType = MediaType.TV,
            progress = 50,
            durationSeconds = 2700L,
            season = 1,
            episode = 2
        )

        val mediaItem = item.toMediaItem(germanContext)

        assertEquals("S1E2 bei 22:30 fortsetzen", mediaItem.subtitle)
        assertEquals("Noch 22 Min.", mediaItem.timeRemainingLabel)
    }
}
