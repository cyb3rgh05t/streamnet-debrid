package com.arflix.tv.data.repository

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
}