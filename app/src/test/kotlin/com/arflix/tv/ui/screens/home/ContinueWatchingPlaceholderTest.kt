package com.arflix.tv.ui.screens.home

import com.arflix.tv.data.model.Category
import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class ContinueWatchingPlaceholderTest {
    private fun placeholder(id: Int) =
        MediaItem(id = id, title = "", mediaType = MediaType.MOVIE, isPlaceholder = true)

    private fun real(id: Int) =
        MediaItem(id = id, title = "Movie $id", mediaType = MediaType.MOVIE)

    private val skeletonCw = Category("continue_watching", "Continue Watching", listOf(placeholder(-1), placeholder(-2)))
    private val trending = Category("trending", "Trending", listOf(real(1)))

    @Test
    fun placeholderOnlyContinueWatchingIsDroppedWhenNoSourceCanDeliverData() {
        val result = preserveLiveHomeRows(
            current = listOf(skeletonCw),
            incoming = listOf(trending),
            catalogOrder = listOf("trending"),
            keepContinueWatchingPlaceholders = false,
        )

        assertThat(result.map { it.id }).containsExactly("trending")
    }

    @Test
    fun placeholderRowStaysWhileAFetchIsStillExpected() {
        val result = preserveLiveHomeRows(
            current = listOf(skeletonCw),
            incoming = listOf(trending),
            catalogOrder = listOf("trending"),
            keepContinueWatchingPlaceholders = true,
        )

        assertThat(result.map { it.id }).contains("continue_watching")
    }

    @Test
    fun realContinueWatchingItemsAreAlwaysKept() {
        val realCw = Category("continue_watching", "Continue Watching", listOf(real(5)))

        val result = preserveLiveHomeRows(
            current = listOf(realCw),
            incoming = listOf(trending),
            catalogOrder = listOf("trending"),
            keepContinueWatchingPlaceholders = false,
        )

        assertThat(result.map { it.id }).contains("continue_watching")
    }
}
