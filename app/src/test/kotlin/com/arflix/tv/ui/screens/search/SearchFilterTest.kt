package com.arflix.tv.ui.screens.search

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class SearchFilterTest {
    @Test
    fun `anime without genre relies only on anime keyword`() {
        assertThat(buildAnimeGenreFilter(null)).isNull()
    }

    @Test
    fun `anime with genre includes animation and selected genre`() {
        assertThat(buildAnimeGenreFilter("10759")).isEqualTo("16,10759")
    }

    @Test
    fun `animation genre is not duplicated`() {
        assertThat(buildAnimeGenreFilter("16")).isEqualTo("16")
    }
}