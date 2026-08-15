package com.arflix.tv.data.repository

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class GenreFanartRepositoryTest {
    @Test
    fun `fanart uses fifth backdrop and genre colors`() {
        val paths = (0..4).map { "/backdrop-$it.jpg" }

        assertEquals(
            "https://image.tmdb.org/t/p/w1280_filter(duotone,991B1B,FCA5A5)/backdrop-4.jpg",
            GenreFanartRepository.tmdbGenreFanartUrl(paths, genreId = 28)
        )
    }

    @Test
    fun `fanart falls back to last backdrop and rejects invalid paths`() {
        assertEquals(
            "https://image.tmdb.org/t/p/w1280_filter(duotone,1F2937,D1D5DB)/last.jpg",
            GenreFanartRepository.tmdbGenreFanartUrl(listOf("/first.jpg", "/last.jpg"), genreId = -1)
        )
        assertNull(GenreFanartRepository.tmdbGenreFanartUrl(emptyList(), genreId = 28))
        assertNull(GenreFanartRepository.tmdbGenreFanartUrl(listOf("invalid.jpg"), genreId = 28))
    }
}