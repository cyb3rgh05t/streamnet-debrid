package com.arflix.tv.data.repository

import com.arflix.tv.data.api.TraktIds
import com.arflix.tv.data.api.TraktMovieInfo
import com.arflix.tv.data.api.TraktPublicListItem
import com.arflix.tv.data.api.TraktShowInfo
import com.arflix.tv.data.model.MediaType
import org.junit.Assert.assertEquals
import org.junit.Test

class TraktPersonalListsTest {

    @Test
    fun `personal lists request the current singular Trakt media types`() {
        assertEquals("movie,show", TRAKT_PERSONAL_LIST_ITEM_TYPES)
    }

    @Test
    fun `personal list rows preserve rank and map movies and shows`() {
        val rows = listOf(
            TraktPublicListItem(
                rank = 2,
                type = "show",
                show = TraktShowInfo("Second", 2025, TraktIds(tmdb = 22))
            ),
            TraktPublicListItem(
                rank = 1,
                type = "movie",
                movie = TraktMovieInfo("First", 2024, TraktIds(tmdb = 11))
            )
        )

        val items = mapTraktPersonalListItems(rows, limit = 100)

        assertEquals(listOf(11, 22), items.map { it.id })
        assertEquals(listOf(MediaType.MOVIE, MediaType.TV), items.map { it.mediaType })
        assertEquals(listOf(0, 1), items.map { it.sourceOrder })
    }

    @Test
    fun `personal list mapper ignores unusable rows and removes duplicates`() {
        val rows = listOf(
            TraktPublicListItem(
                rank = 1,
                type = "movie",
                movie = TraktMovieInfo("Missing", 2024, TraktIds(tmdb = null))
            ),
            TraktPublicListItem(
                rank = 2,
                type = "movie",
                movie = TraktMovieInfo("Kept", 2024, TraktIds(tmdb = 11))
            ),
            TraktPublicListItem(
                rank = 3,
                type = "movie",
                movie = TraktMovieInfo("Duplicate", 2024, TraktIds(tmdb = 11))
            )
        )

        val items = mapTraktPersonalListItems(rows, limit = 100)

        assertEquals(listOf(11), items.map { it.id })
    }
}
