package com.arflix.tv.data.repository

import com.arflix.tv.data.api.TmdbEpisode
import com.arflix.tv.data.api.TmdbMovieDetails
import com.arflix.tv.data.api.TmdbTvDetails
import org.junit.Assert.assertEquals
import org.junit.Test

class MediaLanguageFallbackTest {
    @Test
    fun `movie and TV detail mapping preserve TMDB popularity for collection sorting`() {
        val movie = TmdbMovieDetails(id = 1, title = "Popular Movie", popularity = 123.4f)
            .toMediaItem()
        val series = TmdbTvDetails(id = 2, name = "Popular Series", popularity = 98.7f)
            .toMediaItem()

        assertEquals(123.4f, movie.popularity, 0f)
        assertEquals(98.7f, series.popularity, 0f)
    }

    @Test
    fun `english movie details only fill missing localized fields`() {
        val localized = TmdbMovieDetails(
            id = 1,
            title = "Deutscher Titel",
            overview = "",
            posterPath = "/de.jpg",
            backdropPath = "",
        )
        val english = TmdbMovieDetails(
            id = 1,
            title = "English title",
            overview = "English plot",
            posterPath = "/en.jpg",
            backdropPath = "/backdrop.jpg",
        )

        val merged = mergeMovieDetailsLanguageFallback(localized, english)

        assertEquals("Deutscher Titel", merged.title)
        assertEquals("English plot", merged.overview)
        assertEquals("/de.jpg", merged.posterPath)
        assertEquals("/backdrop.jpg", merged.backdropPath)
    }

    @Test
    fun `english episode fills missing localized name overview and still`() {
        val localized = TmdbEpisode(id = 2, episodeNumber = 3, name = "", overview = "")
        val english = TmdbEpisode(
            id = 2,
            episodeNumber = 3,
            name = "English episode",
            overview = "English episode plot",
            stillPath = "/episode.jpg",
        )

        val merged = mergeEpisodeLanguageFallback(localized, english)

        assertEquals("English episode", merged.name)
        assertEquals("English episode plot", merged.overview)
        assertEquals("/episode.jpg", merged.stillPath)
    }
}