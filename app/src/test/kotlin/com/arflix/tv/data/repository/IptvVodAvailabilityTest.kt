package com.arflix.tv.data.repository

import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType
import io.mockk.mockk
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class IptvVodAvailabilityTest {
    private val repository = IptvRepository(
        context = mockk(relaxed = true),
        okHttpClient = mockk(relaxed = true),
        profileManager = mockk(relaxed = true),
        invalidationBus = mockk(relaxed = true),
    )

    @Test
    fun `provider title is normalized for Home availability matching`() {
        assertEquals(
            IptvRepository.XtreamVodAvailabilityKey(MediaType.MOVIE, "example"),
            repository.xtreamVodAvailabilityKey("The Example (2025) [4K]", MediaType.MOVIE),
        )
    }

    @Test
    fun `movie and series availability remain distinct`() {
        val movie = repository.xtreamVodAvailabilityKey("Example", MediaType.MOVIE)
        val series = repository.xtreamVodAvailabilityKey("Example", MediaType.TV)

        assertEquals(MediaType.MOVIE, movie?.mediaType)
        assertEquals(MediaType.TV, series?.mediaType)
    }

    @Test
    fun `blank provider title is ignored`() {
        assertNull(repository.xtreamVodAvailabilityKey("  ", MediaType.MOVIE))
    }

    @Test
    fun `excluded provider category is removed from Home availability`() {
        assertEquals(false, isXtreamVodCategoryIncluded(" 42 ", setOf("42")))
        assertEquals(true, isXtreamVodCategoryIncluded("43", setOf("42")))
        assertEquals(true, isXtreamVodCategoryIncluded(null, setOf("42")))
    }

    @Test
    fun `matching TMDB id confirms same-title movie`() {
        val availability = IptvRepository.XtreamVodAvailability(
            setOf(
                repository.xtreamVodAvailabilityKey(
                    rawTitle = "The Example",
                    mediaType = MediaType.MOVIE,
                    tmdbId = "123",
                    year = 2025,
                )!!,
            ),
        )

        assertEquals(true, availability.contains(MediaItem(123, "The Example", year = "2025")))
    }

    @Test
    fun `different TMDB id rejects same-title movie`() {
        val availability = IptvRepository.XtreamVodAvailability(
            setOf(
                repository.xtreamVodAvailabilityKey(
                    rawTitle = "The Example",
                    mediaType = MediaType.MOVIE,
                    tmdbId = "456",
                    year = 2025,
                )!!,
            ),
        )

        assertEquals(false, availability.contains(MediaItem(123, "The Example", year = "2025")))
    }

    @Test
    fun `different year rejects title fallback when provider has no id`() {
        val availability = IptvRepository.XtreamVodAvailability(
            setOf(
                repository.xtreamVodAvailabilityKey(
                    rawTitle = "The Example",
                    mediaType = MediaType.MOVIE,
                    year = 1999,
                )!!,
            ),
        )

        assertEquals(false, availability.contains(MediaItem(123, "The Example", year = "2025")))
    }

    @Test
    fun `title fallback remains available when provider exposes no metadata`() {
        val availability = IptvRepository.XtreamVodAvailability(
            setOf(repository.xtreamVodAvailabilityKey("The Example", MediaType.MOVIE)!!),
        )

        assertEquals(true, availability.contains(MediaItem(123, "The Example", year = "2025")))
    }

    @Test
    fun `VOD title fallback rejects candidates that only share a title word`() {
        assertEquals(false, iptvVodTitlesMatchExactly("The Example Documentary", "The Example"))
        assertEquals(false, iptvVodTitlesMatchExactly("Example of Something", "The Example"))
    }

    @Test
    fun `VOD title fallback accepts exact titles with formatting and year noise`() {
        assertEquals(true, iptvVodTitlesMatchExactly("The Example (2025) [4K]", "The Example"))
        assertEquals(true, iptvVodTitlesMatchExactly("Example, The", "The Example"))
    }

    @Test
    fun `VOD fallback rejects known year mismatch but tolerates adjacent release year`() {
        assertEquals(false, iptvVodYearsCompatible(2025, 1999))
        assertEquals(true, iptvVodYearsCompatible(2025, 2024))
        assertEquals(true, iptvVodYearsCompatible(2025, null))
    }
}