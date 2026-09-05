package com.arflix.tv.data.repository

import com.arflix.tv.data.api.TmdbContentRating
import com.arflix.tv.data.api.TmdbContentRatingsResponse
import com.arflix.tv.data.api.TmdbReleaseDate
import com.arflix.tv.data.api.TmdbReleaseDatesRegion
import com.arflix.tv.data.api.TmdbReleaseDatesResponse
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class GermanCertificationTest {

    @Test
    fun `movie certification prefers valid German theatrical rating`() {
        val response = TmdbReleaseDatesResponse(
            results = listOf(
                TmdbReleaseDatesRegion("US", listOf(TmdbReleaseDate("R", 3))),
                TmdbReleaseDatesRegion(
                    "DE",
                    listOf(
                        TmdbReleaseDate("", 3),
                        TmdbReleaseDate("FSK 16", 3),
                        TmdbReleaseDate("12", 4)
                    )
                )
            )
        )

        assertThat(germanCertification(response)).isEqualTo("FSK 16")
    }

    @Test
    fun `movie certification ignores foreign and unsupported ratings`() {
        val response = TmdbReleaseDatesResponse(
            results = listOf(
                TmdbReleaseDatesRegion("US", listOf(TmdbReleaseDate("PG-13", 3))),
                TmdbReleaseDatesRegion("DE", listOf(TmdbReleaseDate("ab 14", 3)))
            )
        )

        assertThat(germanCertification(response)).isEmpty()
    }

    @Test
    fun `tv certification normalizes German FSK prefix`() {
        val response = TmdbContentRatingsResponse(
            results = listOf(
                TmdbContentRating("US", "TV-MA"),
                TmdbContentRating("de", "FSK 12")
            )
        )

        assertThat(germanCertification(response)).isEqualTo("FSK 12")
    }
}