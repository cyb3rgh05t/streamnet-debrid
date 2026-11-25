package com.arflix.tv.ui.screens.details

import com.arflix.tv.data.model.Episode
import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.repository.SeriesEpisodeAvailability
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class EpisodeAvailabilityFilterTest {
    private fun episode(season: Int, number: Int) =
        Episode(id = season * 100 + number, episodeNumber = number, seasonNumber = season, name = "S${season}E$number")

    private fun state(episodes: List<Episode>, initialIndex: Int = 0, totalSeasons: Int = 3) = DetailsUiState(
        item = MediaItem(id = 1, title = "Show", mediaType = MediaType.TV),
        episodes = episodes,
        totalSeasons = totalSeasons,
        initialEpisodeIndex = initialIndex,
    )

    private fun provider(vararg offered: Pair<Int, Int>) = SeriesEpisodeAvailability(
        episodeCheck = { season, episode -> (season to episode) in offered.toSet() },
        seasonCheck = { season -> offered.any { it.first == season } },
    )

    @Test
    fun `episodes the provider lacks are hidden`() {
        val all = (1..5).map { episode(1, it) }
        val filtered = applyEpisodeAvailability(state(all), provider(1 to 1, 1 to 2, 1 to 4))

        assertThat(filtered.episodes.map { it.episodeNumber }).containsExactly(1, 2, 4).inOrder()
    }

    @Test
    fun `without availability data nothing changes`() {
        val s = state((1..3).map { episode(1, it) })
        assertThat(applyEpisodeAvailability(s, null)).isSameInstanceAs(s)
    }

    @Test
    fun `movies are never filtered`() {
        val movie = state(emptyList()).copy(item = MediaItem(id = 1, title = "Movie"))
        assertThat(applyEpisodeAvailability(movie, provider())).isSameInstanceAs(movie)
    }

    @Test
    fun `a season the provider does not carry keeps its list and is flagged`() {
        val season3 = (1..4).map { episode(3, it) }
        val filtered = applyEpisodeAvailability(state(season3), provider(1 to 1, 2 to 1))

        assertThat(filtered.episodes).isEqualTo(season3)
        assertThat(filtered.unavailableSeasons).containsExactly(3)
    }

    @Test
    fun `fully available season is untouched`() {
        val all = (1..3).map { episode(1, it) }
        val s = state(all)
        val filtered = applyEpisodeAvailability(s, provider(1 to 1, 1 to 2, 1 to 3, 2 to 1, 3 to 1))
        assertThat(filtered.episodes).isEqualTo(all)
        assertThat(filtered.unavailableSeasons).isEmpty()
    }

    @Test
    fun `the focused start episode follows its episode or moves to the next visible one`() {
        val all = (1..6).map { episode(1, it) }
        val offered = provider(1 to 2, 1 to 5, 1 to 6)

        // Episode 5 stays addressable: it moves from index 4 to index 1.
        assertThat(applyEpisodeAvailability(state(all, initialIndex = 4), offered).initialEpisodeIndex).isEqualTo(1)
        // Episode 3 is hidden, so the next visible one (5) takes over.
        assertThat(applyEpisodeAvailability(state(all, initialIndex = 2), offered).initialEpisodeIndex).isEqualTo(1)
        // Nothing visible after episode 6's hidden successors: the last one.
        assertThat(remapEpisodeIndex(all, listOf(all[1]), 5)).isEqualTo(0)
    }
}
