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
import org.robolectric.annotation.Config
import java.util.Locale

// Robolectric 4.11 ships no SDK 36 sandbox; pin to its highest supported image.
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
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
    fun toMediaItem_derivesMovieProgressFromResumePositionWhenPercentageIsMissing() {
        val item = ContinueWatchingItem(
            id = 123,
            title = "Example Movie",
            mediaType = MediaType.MOVIE,
            progress = 0,
            resumePositionSeconds = 600L,
            durationSeconds = 1200L
        )

        val mediaItem = item.toMediaItem()

        assertEquals(50, mediaItem.progress)
        assertEquals("10min left", mediaItem.timeRemainingLabel)
        assertEquals("Continue from 10:00", mediaItem.subtitle)
    }

    @Test
    fun toMediaItem_resolvesRelativeTmdbArtworkPaths() {
        val relativeArtwork = ContinueWatchingItem(
            id = 123,
            title = "Example Movie",
            mediaType = MediaType.MOVIE,
            progress = 50,
            posterPath = "/poster.jpg",
            backdropPath = "/backdrop.jpg"
        ).toMediaItem()
        val absoluteArtwork = ContinueWatchingItem(
            id = 456,
            title = "Existing Movie",
            mediaType = MediaType.MOVIE,
            progress = 50,
            posterPath = "https://cdn.example/poster.jpg",
            backdropPath = "https://cdn.example/backdrop.jpg"
        ).toMediaItem()

        assertEquals("https://image.tmdb.org/t/p/w780/poster.jpg", relativeArtwork.image)
        assertEquals("https://image.tmdb.org/t/p/original/backdrop.jpg", relativeArtwork.backdrop)
        assertEquals("https://cdn.example/poster.jpg", absoluteArtwork.image)
        assertEquals("https://cdn.example/backdrop.jpg", absoluteArtwork.backdrop)
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
