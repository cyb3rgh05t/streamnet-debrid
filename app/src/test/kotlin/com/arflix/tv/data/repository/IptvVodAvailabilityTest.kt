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
            IptvRepository.XtreamVodAvailabilityKey(MediaType.MOVIE, "example", year = 2025),
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

    @Test
    fun `matching id accepts localized titles for movies and series`() {
        MediaType.entries.forEach { type ->
            val availability = IptvRepository.XtreamVodAvailability(
                setOf(repository.xtreamVodAvailabilityKey("Provider Original Title", type, tmdbId = "123")!!),
            )
            assertEquals(true, availability.contains(MediaItem(123, "Lokaler Titel", mediaType = type)))
            assertEquals(false, availability.contains(MediaItem(456, "Provider Original Title", mediaType = type)))
        }
    }

    @Test
    fun `search and playback share title normalization and year tolerance`() {
        listOf("Example, The (2024) [4K]", "The Example (2024) 1080p WEB-DL").forEach { name ->
            val availability = IptvRepository.XtreamVodAvailability(
                setOf(repository.xtreamVodAvailabilityKey(name, MediaType.MOVIE)!!),
            )
            assertEquals(true, iptvVodTitlesMatchExactly(name, "The Example"))
            assertEquals(true, availability.contains(MediaItem(123, "The Example", year = "2025")))
            assertEquals(false, availability.contains(MediaItem(123, "The Example", year = "1999")))
        }
    }

    @Test
    fun `zero provider id is treated as unknown rather than conflicting`() {
        val availability = IptvRepository.XtreamVodAvailability(
            setOf(repository.xtreamVodAvailabilityKey("Example", MediaType.MOVIE, tmdbId = "0")!!),
        )
        assertEquals(true, availability.contains(MediaItem(123, "Example")))
    }

    @Test
    fun `availability accepts umlaut transcription in either direction`() {
        listOf("Für alle Fälle" to "Fuer alle Faelle", "Fuer alle Faelle" to "Für alle Fälle").forEach { (provider, query) ->
            val availability = IptvRepository.XtreamVodAvailability(
                setOf(repository.xtreamVodAvailabilityKey(provider, MediaType.TV)!!),
            )
            assertEquals(true, availability.contains(MediaItem(123, query, mediaType = MediaType.TV)))
        }
    }

    @Test
    fun `exact title matching preserves word order and meaningful short words`() {
        assertEquals(false, iptvVodTitlesMatchExactly("Dog Bites Man", "Man Bites Dog"))
        assertEquals(false, iptvVodTitlesMatchExactly("In Time", "Time"))
        assertEquals(false, iptvVodTitlesMatchExactly("The Equalizer 2", "The Equalizer"))
        assertEquals(true, iptvVodTitlesMatchExactly("1917", "1917"))
    }

    @Test
    fun `series binding keys never mix ids with same title remakes`() {
        val old = iptvSeriesBindingKeys("provider", "1", "tt0000001", "The Equalizer", 1985)
        val current = iptvSeriesBindingKeys("provider", "2", "tt0000002", "The Equalizer", 2021)
        assertEquals(listOf("provider|tmdb:1"), old)
        assertEquals(listOf("provider|tmdb:2"), current)
        assertEquals(
            emptySet<String>(),
            iptvSeriesBindingKeys("provider", null, null, "The Equalizer", 1985).toSet()
                .intersect(iptvSeriesBindingKeys("provider", null, null, "The Equalizer", 2021).toSet()),
        )
    }
}