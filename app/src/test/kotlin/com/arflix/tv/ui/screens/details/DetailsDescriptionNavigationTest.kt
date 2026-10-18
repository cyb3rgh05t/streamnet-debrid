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
    fun `visible season buttons keep their position instead of locking to the leading edge`() {
        assertThat(detailsSeasonScrollDelta(160, 90, 600)).isEqualTo(0)
        assertThat(detailsSeasonScrollDelta(480, 120, 600)).isEqualTo(0)
        assertThat(detailsSeasonScrollDelta(0, 90, 600)).isEqualTo(0)
    }

    @Test
    fun `season scrolling reveals only the clipped part using actual button width`() {
        assertThat(detailsSeasonScrollDelta(-24, 90, 600)).isEqualTo(-24)
        assertThat(detailsSeasonScrollDelta(540, 90, 600)).isEqualTo(30)
        assertThat(detailsSeasonScrollDelta(540, 120, 600)).isEqualTo(60)
    }

    @Test
    fun `movie actions move straight to cast and back with one key each`() {
        val state = DetailsUiState(item = movie, cast = listOf(CastMember(1, "Actor")))
        assertThat(moveDetailsVerticalFocus(state, FocusSection.BUTTONS, down = true))
            .isEqualTo(FocusSection.CAST)
        assertThat(moveDetailsVerticalFocus(state, FocusSection.CAST, down = false))
            .isEqualTo(FocusSection.BUTTONS)
    }

    @Test
    fun `series keeps a visible season stop between actions and episodes in both directions`() {
        val state = DetailsUiState(
            item = series, totalSeasons = 3,
            episodes = listOf(Episode(1, 1, 1, "Episode"))
        )
        assertThat(moveDetailsVerticalFocus(state, FocusSection.BUTTONS, down = true))
            .isEqualTo(FocusSection.SEASONS)
        assertThat(moveDetailsVerticalFocus(state, FocusSection.SEASONS, down = true))
            .isEqualTo(FocusSection.EPISODES)
        assertThat(moveDetailsVerticalFocus(state, FocusSection.EPISODES, down = false))
            .isEqualTo(FocusSection.SEASONS)
        assertThat(moveDetailsVerticalFocus(state, FocusSection.SEASONS, down = false))
            .isEqualTo(FocusSection.BUTTONS)
    }

    @Test
    fun `single season series also keeps the visible season button in both directions`() {
        val state = DetailsUiState(
            item = series, totalSeasons = 1,
            episodes = listOf(Episode(1, 1, 1, "Episode"))
        )
        assertThat(moveDetailsVerticalFocus(state, FocusSection.BUTTONS, down = true))
            .isEqualTo(FocusSection.SEASONS)
        assertThat(moveDetailsVerticalFocus(state, FocusSection.SEASONS, down = true))
            .isEqualTo(FocusSection.EPISODES)
        assertThat(moveDetailsVerticalFocus(state, FocusSection.EPISODES, down = false))
            .isEqualTo(FocusSection.SEASONS)
        assertThat(moveDetailsVerticalFocus(state, FocusSection.SEASONS, down = false))
            .isEqualTo(FocusSection.BUTTONS)
    }

    @Test
    fun `description is not a focus stop and unloaded sections fall back to actions`() {
        val state = DetailsUiState(item = series)
        assertThat(moveDetailsVerticalFocus(state, FocusSection.BUTTONS, down = false))
            .isEqualTo(FocusSection.BUTTONS)
        assertThat(moveDetailsVerticalFocus(state, FocusSection.DESCRIPTION, down = true))
            .isEqualTo(FocusSection.BUTTONS)
        assertThat(moveDetailsVerticalFocus(state, FocusSection.SEASONS, down = true))
            .isEqualTo(FocusSection.BUTTONS)
    }

    @Test
    fun `only actions are focusable with no other rails or missing overview`() {
        assertThat(detailsFocusSections(DetailsUiState(item = movie)))
            .containsExactly(FocusSection.BUTTONS)
    }

    @Test
    fun `series without loaded episodes does not reserve an invisible season rail`() {
        assertThat(detailsFocusSections(DetailsUiState(item = series, totalSeasons = 3)))
            .containsExactly(FocusSection.BUTTONS)
    }

    @Test
    fun `actions precede TV rails without a description focus stop`() {
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
            FocusSection.BUTTONS, FocusSection.SEASONS, FocusSection.EPISODES,
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
            FocusSection.BUTTONS, FocusSection.SEASONS, FocusSection.EPISODES
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
