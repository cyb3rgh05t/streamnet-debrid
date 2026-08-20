package com.arflix.tv.util

import com.arflix.tv.data.model.EpisodeIdentity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AnimeSeasonStructureTest {

    @Test
    fun `My Dress-Up Darling splits one TMDB season into two anime seasons`() {
        val result = buildAnimeSeasonStructure(
            tmdbSeasonEpisodeCounts = mapOf(1 to 24),
            providerSeasons = listOf(
                AnimeProviderSeason(kitsuId = 44382, tmdbSeason = 1, episodeCount = 12),
                AnimeProviderSeason(kitsuId = 46492, tmdbSeason = 2, episodeCount = 12)
            )
        )!!

        assertEquals(2, result.seasonCount)
        assertEquals(12, result.seasons.getValue(1).size)
        assertEquals(12, result.seasons.getValue(2).size)
        val seasonTwoFirst = result.seasons.getValue(2).first()
        assertEquals(1, seasonTwoFirst.displayEpisode)
        assertEquals(1, seasonTwoFirst.tmdbSeason)
        assertEquals(13, seasonTwoFirst.tmdbEpisode)
    }

    @Test
    fun `Rent-a-Girlfriend creates one display season per provider entry`() {
        val result = buildAnimeSeasonStructure(
            tmdbSeasonEpisodeCounts = mapOf(1 to 48),
            providerSeasons = listOf(
                AnimeProviderSeason(43019, null, 12),
                AnimeProviderSeason(45588, null, 12),
                AnimeProviderSeason(47194, null, 12),
                AnimeProviderSeason(48817, null, 12)
            )
        )!!

        assertEquals(4, result.seasonCount)
        assertTrue(result.seasons.values.all { it.size == 12 })
        assertEquals(37, result.seasons.getValue(4).first().tmdbEpisode)
    }

    @Test
    fun `explicit ARM TMDB season entries preserve canonical tracking identity`() {
        val result = buildAnimeSeasonStructure(
            tmdbSeasonEpisodeCounts = mapOf(1 to 12, 2 to 24),
            providerSeasons = listOf(
                AnimeProviderSeason(100, 1, 12),
                AnimeProviderSeason(200, 2, 12),
                AnimeProviderSeason(201, 2, 12)
            )
        )!!

        assertEquals(3, result.seasonCount)
        assertEquals(2, result.seasons.getValue(3).first().tmdbSeason)
        assertEquals(13, result.seasons.getValue(3).first().tmdbEpisode)
    }

    @Test
    fun `Mushoku Tensei cours can split one canonical season without losing TMDB identity`() {
        val result = buildAnimeSeasonStructure(
            tmdbSeasonEpisodeCounts = mapOf(1 to 23),
            providerSeasons = listOf(
                AnimeProviderSeason(1, null, 11),
                AnimeProviderSeason(2, null, 12)
            )
        )!!

        assertEquals(2, result.seasonCount)
        assertEquals(12, result.seasons.getValue(2).size)
        assertEquals(12, result.seasons.getValue(2).first().tmdbEpisode)
        assertEquals(23, result.seasons.getValue(2).last().tmdbEpisode)
    }

    @Test
    fun `incomplete provider data safely falls back to TMDB`() {
        assertNull(
            buildAnimeSeasonStructure(
                tmdbSeasonEpisodeCounts = mapOf(1 to 24),
                providerSeasons = listOf(
                    AnimeProviderSeason(100, null, 12),
                    AnimeProviderSeason(200, null, 20)
                )
            )
        )
    }

    @Test
    fun `single long-running provider entry does not invent seasons`() {
        assertNull(
            buildAnimeSeasonStructure(
                tmdbSeasonEpisodeCounts = mapOf(1 to 61, 2 to 16),
                providerSeasons = listOf(AnimeProviderSeason(12, null, 77))
            )
        )
    }

    @Test
    fun `Naruto style long series remains on its TMDB structure`() {
        assertNull(
            buildAnimeSeasonStructure(
                tmdbSeasonEpisodeCounts = mapOf(1 to 35, 2 to 65, 3 to 41, 4 to 42, 5 to 37),
                providerSeasons = listOf(AnimeProviderSeason(11, null, 220))
            )
        )
    }

    @Test
    fun `classic series without anime provider seasons are unchanged`() {
        listOf(
            mapOf(1 to 7, 2 to 13, 3 to 13, 4 to 13, 5 to 16), // Breaking Bad
            mapOf(1 to 9, 2 to 7),                              // The Last of Us
            mapOf(1 to 10, 2 to 10, 3 to 10, 4 to 10, 5 to 10, 6 to 10, 7 to 7, 8 to 6)
        ).forEach { tmdbSeasons ->
            assertNull(buildAnimeSeasonStructure(tmdbSeasons, emptyList()))
        }
    }

    @Test
    fun `next display episode resolves to canonical Trakt coordinates across a cour boundary`() {
        val result = buildAnimeSeasonStructure(
            mapOf(1 to 24),
            listOf(AnimeProviderSeason(1, null, 12), AnimeProviderSeason(2, null, 12))
        )!!

        val next = result.nextAfterDisplay(1, 12)!!
        assertEquals(2, next.displaySeason)
        assertEquals(1, next.displayEpisode)
        assertEquals(1, next.tmdbSeason)
        assertEquals(13, next.tmdbEpisode)
    }

    @Test
    fun `previous display episode crosses back to the prior official season`() {
        val result = buildAnimeSeasonStructure(
            mapOf(1 to 24),
            listOf(AnimeProviderSeason(1, null, 12), AnimeProviderSeason(2, null, 12))
        )!!

        val previous = result.previousBeforeDisplay(2, 1)!!
        assertEquals(1, previous.displaySeason)
        assertEquals(12, previous.displayEpisode)
        assertEquals(1, previous.tmdbSeason)
        assertEquals(12, previous.tmdbEpisode)
    }

    @Test
    fun `stream identity retains exact Kitsu override after TMDB conversion`() {
        val result = buildAnimeSeasonStructure(
            mapOf(1 to 24),
            listOf(AnimeProviderSeason(101, null, 12), AnimeProviderSeason(202, null, 12))
        )!!

        val identity = result.identityForDisplay(2, 8)!!
        assertEquals(1, identity.tmdbSeason)
        assertEquals(20, identity.tmdbEpisode)
        assertEquals("kitsu:202:8", identity.kitsuQuery)
    }

    @Test
    fun `season progress is calculated on displayed anime seasons`() {
        val result = buildAnimeSeasonStructure(
            mapOf(1 to 24),
            listOf(AnimeProviderSeason(1, null, 12), AnimeProviderSeason(2, null, 12))
        )!!

        val progress = result.progressForCanonicalEpisodes(
            ((1..12).map { 1 to it } + listOf(1 to 13, 1 to 14)).toSet()
        )
        assertEquals(12 to 12, progress[1])
        assertEquals(2 to 12, progress[2])
    }

    @Test
    fun `Trakt grouping always returns canonical coordinates`() {
        val result = buildAnimeSeasonStructure(
            mapOf(1 to 24),
            listOf(AnimeProviderSeason(1, null, 12), AnimeProviderSeason(2, null, 12))
        )!!

        assertEquals(mapOf(1 to (13..24).toList()), result.canonicalEpisodesForDisplaySeason(2))
    }

    @Test
    fun `partial explicit ARM mapping falls back instead of hiding episodes`() {
        assertNull(
            buildAnimeSeasonStructure(
                mapOf(1 to 24),
                listOf(
                    AnimeProviderSeason(100, 1, 6),
                    AnimeProviderSeason(200, 1, 6)
                )
            )
        )
    }

    @Test
    fun `fallback next keeps local display numbering for absolute TMDB episodes`() {
        val next = fallbackAdjacentEpisodeIdentity(
            current = EpisodeIdentity(
                displaySeason = 22,
                displayEpisode = 1,
                tmdbSeason = 22,
                tmdbEpisode = 1089
            ),
            forward = true
        )!!

        assertEquals(22, next.displaySeason)
        assertEquals(2, next.displayEpisode)
        assertEquals(22, next.tmdbSeason)
        assertEquals(1090, next.tmdbEpisode)
    }

    @Test
    fun `fallback previous keeps local display numbering for absolute TMDB episodes`() {
        val previous = fallbackAdjacentEpisodeIdentity(
            current = EpisodeIdentity(
                displaySeason = 22,
                displayEpisode = 2,
                tmdbSeason = 22,
                tmdbEpisode = 1090
            ),
            forward = false
        )!!

        assertEquals(1, previous.displayEpisode)
        assertEquals(1089, previous.tmdbEpisode)
    }
}
