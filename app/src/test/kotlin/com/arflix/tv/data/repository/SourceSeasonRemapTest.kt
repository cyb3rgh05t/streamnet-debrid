package com.arflix.tv.data.repository

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class SourceSeasonRemapTest {
    private val lupin = 96677

    @Test
    fun `lupin season one first five episodes stay in source season one`() {
        assertThat(SourceSeasonRemap.resolve(lupin, 1, 1)).isEqualTo(SourceEpisodeTarget(1, 1))
        assertThat(SourceSeasonRemap.resolve(lupin, 1, 5)).isEqualTo(SourceEpisodeTarget(1, 5))
    }

    @Test
    fun `lupin season one later episodes continue in source season two`() {
        assertThat(SourceSeasonRemap.resolve(lupin, 1, 6)).isEqualTo(SourceEpisodeTarget(2, 1))
        assertThat(SourceSeasonRemap.resolve(lupin, 1, 10)).isEqualTo(SourceEpisodeTarget(2, 5))
    }

    @Test
    fun `lupin later seasons shift by one source season`() {
        assertThat(SourceSeasonRemap.resolve(lupin, 2, 3)).isEqualTo(SourceEpisodeTarget(3, 3))
        assertThat(SourceSeasonRemap.resolve(lupin, 3, 7)).isEqualTo(SourceEpisodeTarget(4, 7))
    }

    @Test
    fun `other series and unknown ids are untouched`() {
        assertThat(SourceSeasonRemap.resolve(1399, 2, 4)).isEqualTo(SourceEpisodeTarget(2, 4))
        assertThat(SourceSeasonRemap.resolve(null, 1, 8)).isEqualTo(SourceEpisodeTarget(1, 8))
    }

    @Test
    fun `lupin seasons without a rule are untouched`() {
        assertThat(SourceSeasonRemap.resolve(lupin, 4, 1)).isEqualTo(SourceEpisodeTarget(4, 1))
    }
}
