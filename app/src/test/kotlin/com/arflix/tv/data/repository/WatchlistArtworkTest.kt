package com.arflix.tv.data.repository

import com.arflix.tv.util.Constants
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class WatchlistArtworkTest {

    @Test
    fun relativeTmdbPosterPathBecomesLoadableUrl() {
        assertThat(normalizeWatchlistArtworkUrl("/poster.jpg", isBackdrop = false))
            .isEqualTo("${Constants.IMAGE_BASE}/poster.jpg")
    }

    @Test
    fun relativeTmdbBackdropPathUsesLargeArtwork() {
        assertThat(normalizeWatchlistArtworkUrl("/backdrop.jpg", isBackdrop = true))
            .isEqualTo("${Constants.BACKDROP_BASE_LARGE}/backdrop.jpg")
    }

    @Test
    fun absoluteAndProtocolRelativeUrlsRemainUsable() {
        assertThat(normalizeWatchlistArtworkUrl("https://cdn.example/poster.jpg", isBackdrop = false))
            .isEqualTo("https://cdn.example/poster.jpg")
        assertThat(normalizeWatchlistArtworkUrl("//cdn.example/poster.jpg", isBackdrop = false))
            .isEqualTo("https://cdn.example/poster.jpg")
    }

    @Test
    fun blankArtworkDoesNotCreateInvalidImageRequest() {
        assertThat(normalizeWatchlistArtworkUrl("  ", isBackdrop = false)).isNull()
        assertThat(normalizeWatchlistArtworkUrl(null, isBackdrop = true)).isNull()
    }
}
