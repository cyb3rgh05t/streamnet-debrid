package com.arflix.tv.ui.screens.details

import com.arflix.tv.data.model.CastMember
import com.arflix.tv.data.model.Episode
import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.model.Review
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class DetailsDescriptionNavigationTest {
    private val movie = MediaItem(id = 1, title = "Movie")
    private val series = movie.copy(mediaType = MediaType.TV)

    @Test
    fun `description is reachable even with no other rails or missing overview`() {
        assertThat(detailsFocusSections(DetailsUiState(item = movie)))
            .containsExactly(FocusSection.DESCRIPTION, FocusSection.BUTTONS).inOrder()
    }

    @Test
    fun `series without loaded episodes does not reserve an invisible season rail`() {
        assertThat(detailsFocusSections(DetailsUiState(item = series, totalSeasons = 3)))
            .containsExactly(FocusSection.DESCRIPTION, FocusSection.BUTTONS).inOrder()
    }

    @Test
    fun `hero description precedes buttons and TV rails`() {
        val state = DetailsUiState(
            item = series,
            totalSeasons = 2,
            episodes = listOf(Episode(1, 1, 1, "Episode", imdbRating = "8.5")),
            cast = listOf(CastMember(1, "Actor")),
            reviews = listOf(Review("review", "Author", content = "Review")),
            collectionItems = listOf(movie),
            similar = listOf(movie)
        )
        assertThat(detailsFocusSections(state)).containsExactly(
            FocusSection.DESCRIPTION, FocusSection.BUTTONS, FocusSection.SEASONS, FocusSection.EPISODES,
            FocusSection.RATINGS, FocusSection.CAST,
            FocusSection.REVIEWS, FocusSection.COLLECTION, FocusSection.SIMILAR
        ).inOrder()
    }

    @Test
    fun `disabled or invalid episode ratings do not introduce a focus stop`() {
        val state = DetailsUiState(
            item = series,
            episodes = listOf(Episode(1, 1, 1, "Episode", imdbRating = "8.5")),
            showEpisodeRatings = false
        )
        assertThat(detailsFocusSections(state)).containsExactly(
            FocusSection.DESCRIPTION, FocusSection.BUTTONS, FocusSection.EPISODES
        ).inOrder()
        assertThat(detailsFocusSections(state.copy(
            showEpisodeRatings = true,
            episodes = listOf(Episode(1, 1, 1, "Episode", imdbRating = "N/A"))
        ))).doesNotContain(FocusSection.RATINGS)
    }

    @Test
    fun `long descriptions advance by three quarters of the page preserving reading overlap`() {
        assertThat(descriptionPageScrollDistance(0, 1800, 0, 600, true)).isEqualTo(450f)
        assertThat(descriptionPageScrollDistance(-450, 1800, 0, 600, false)).isEqualTo(-450f)
    }

    @Test
    fun `last page and upward movement clamp to description boundaries`() {
        assertThat(descriptionPageScrollDistance(-1100, 1800, 0, 600, true)).isEqualTo(100f)
        assertThat(descriptionPageScrollDistance(-100, 1800, 0, 600, false)).isEqualTo(-100f)
        assertThat(descriptionPageScrollDistance(6, 300, 0, 600, true)).isEqualTo(0f)
        assertThat(descriptionPageScrollDistance(6, 300, 0, 600, false)).isEqualTo(0f)
    }
}
