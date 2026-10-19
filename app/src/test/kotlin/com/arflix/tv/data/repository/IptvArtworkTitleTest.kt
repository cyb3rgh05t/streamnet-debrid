package com.arflix.tv.data.repository

import com.arflix.tv.data.api.TmdbTvDetails
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.model.MediaItem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class IptvArtworkTitleTest {
    @Test
    fun `real blacklist results prefer US original over newer translated namesake`() {
        val original = MediaItem(46952, "The Blacklist", year = "2013", mediaType = MediaType.TV,
            popularity = 182.36f, backdrop = "/2eIlCirgcvEwmCSYh2wDfz5Sxvz.jpg")
        val namesake = MediaItem(216969, "The Blacklist", year = "2022", mediaType = MediaType.TV,
            popularity = 0.50f, backdrop = "/A0tIv0kDDOURdl3nZtsUFY9YyRM.jpg")
        val spinoff = MediaItem(68018, "The Blacklist: Redemption", year = "2017", mediaType = MediaType.TV,
            popularity = 10.85f)
        val originals = mapOf(
            (MediaType.TV to original.id) to "The Blacklist",
            (MediaType.TV to namesake.id) to "القائمة السوداء",
            (MediaType.TV to spinoff.id) to "The Blacklist: Redemption",
        )

        listOf(null, 46 * 60_000L).forEach { duration ->
            listOf(listOf(namesake, spinoff, original), listOf(original, spinoff, namesake)).forEach { items ->
                val selected = rankIptvArtworkCandidates("The Blacklist", items, duration, null, originals).first()
                assertEquals(46952, selected.id)
                assertEquals("/2eIlCirgcvEwmCSYh2wDfz5Sxvz.jpg", selected.backdrop)
            }
        }
        assertEquals(namesake, rankIptvArtworkCandidates("The Blacklist", listOf(original, namesake),
            46 * 60_000L, 2022, originals).single())
    }

    @Test
    fun `newest equalizer is preferred within the same original title family`() {
        val old = MediaItem(4297, "The Equalizer", year = "1985", mediaType = MediaType.TV, popularity = 100f)
        val current = old.copy(id = 95205, year = "2021", popularity = 49.48f)
        val originals = mapOf((MediaType.TV to old.id) to "The Equalizer", (MediaType.TV to current.id) to "The Equalizer")

        assertEquals(current, rankIptvArtworkCandidates("The Equalizer", listOf(old, current),
            55 * 60_000L, null, originals).first())
    }

    @Test
    fun `localized namesakes use title family relevance before release year`() {
        val established = MediaItem(1, "Lokaler Titel", year = "2013", mediaType = MediaType.TV, popularity = 180f)
        val unrelated = established.copy(id = 2, year = "2022", popularity = 0.5f)
        val originals = mapOf((MediaType.TV to 1) to "Established Original", (MediaType.TV to 2) to "Different Original")

        assertEquals(established, rankIptvArtworkCandidates("Lokaler Titel", listOf(unrelated, established),
            46 * 60_000L, null, originals).first())
    }

    @Test
    fun `shared title words and substrings alone cannot authorize artwork`() {
        listOf(
            "The Blacklist" to "Blacklist unrelated documentary",
            "The Blacklist" to "The Blacklist Murders",
            "It" to "Vikings",
            "Tatort" to "Tatortreiniger",
        ).forEach { (requested, candidate) ->
            assertTrue(rankIptvArtworkCandidates(requested,
                listOf(MediaItem(1, candidate, mediaType = MediaType.TV)), 46 * 60_000L, null).isEmpty())
        }
        assertTrue(iptvArtworkTitlesCompatible("NCIS: Origins: Enter Sandman", "NCIS: Origins"))
        assertTrue(iptvArtworkTitlesCompatible("Ancient Aliens - Unerklärliche Phänomene", "Ancient Aliens"))
    }

    @Test
    fun `equalizer prefers the latest series independently of popularity and result order`() {
        val old = MediaItem(1, "The Equalizer", year = "1985", mediaType = MediaType.TV, popularity = 500f)
        val current = old.copy(id = 2, year = "2021", popularity = 1f)
        val movie = old.copy(id = 3, year = "2014", mediaType = MediaType.MOVIE, popularity = 1_000f)

        listOf(listOf(old, movie, current), listOf(current, movie, old)).forEach { items ->
            assertEquals(current, rankIptvArtworkCandidates("The Equalizer", items, 55 * 60_000L, null).first())
        }
        assertEquals(old, rankIptvArtworkCandidates("The Equalizer", listOf(current, old), 55 * 60_000L, 1985).single())
        assertEquals(movie, rankIptvArtworkCandidates("The Equalizer", listOf(current, movie), 110 * 60_000L, null).first())
    }

    @Test
    fun `year is retained separately while artwork search title stays clean`() {
        assertEquals(2021, iptvArtworkYear("The Equalizer (2021) - S01 E02"))
        assertEquals(1985, iptvArtworkYear("The Equalizer [1985]"))
        assertEquals(2021, iptvArtworkYear("The Equalizer 2021"))
        assertEquals("The Equalizer", cleanIptvArtworkTitle("The Equalizer (2021) - S01 E02"))
        assertEquals("The Equalizer", cleanIptvArtworkTitle("The Equalizer 2021"))
        assertEquals("1917", cleanIptvArtworkTitle("1917"))
    }

    @Test
    fun `explicit year never falls back to another remake`() {
        val old = MediaItem(1, "The Equalizer", year = "1985", mediaType = MediaType.TV)
        assertTrue(rankIptvArtworkCandidates("The Equalizer", listOf(old), 55 * 60_000L, 2021).isEmpty())
    }

    @Test
    fun `english alias keeps localized subtitle from promoting the older equalizer`() {
        val old = MediaItem(1, "The Equalizer", year = "1985", mediaType = MediaType.TV)
        val localized = MediaItem(2, "The Equalizer - Schutzengel in New York", year = "2021",
            mediaType = MediaType.TV, backdrop = "/localized.jpg")
        val english = localized.copy(title = "The Equalizer", backdrop = "/english.jpg")

        val ranked = rankIptvArtworkCandidates("The Equalizer", listOf(old, localized, english), 55 * 60_000L, null)

        assertEquals(2, ranked.size)
        assertEquals(2, ranked.first().id)
        assertEquals("/localized.jpg", ranked.first().backdrop)
    }

    @Test
    fun `episode suffix is removed before series lookup`() {
        assertEquals("Die Höhle der Löwen", cleanIptvArtworkTitle("Die Höhle der Löwen - S12 E03 Gründer-Special"))
        assertEquals("Tatort", cleanIptvArtworkTitle("Tatort: Folge 1275 - Borowski"))
    }

    @Test
    fun `diacritics normalize without dropping letters`() {
        assertEquals("hohle lowen", normalizeIptvArtworkTitle("Die Höhle der Löwen"))
    }

    @Test
    fun `exact localized title outranks partial title`() {
        assertTrue(
            iptvArtworkTitleScore("Die Höhle der Löwen", "Die Höhle der Löwen") >
                iptvArtworkTitleScore("Die Höhle der Löwen", "Löwen im Revier")
        )
    }

    @Test
    fun `unrelated series title has no match score`() {
        assertEquals(0.0, iptvArtworkTitleScore("Tatort", "Tagesschau"), 0.0)
    }

    @Test
    fun `episode subtitle creates progressively shorter series queries`() {
        assertEquals(
            listOf("NCIS: Origins: Enter Sandman", "NCIS: Origins", "NCIS"),
            iptvArtworkSearchQueries("NCIS: Origins: Enter Sandman")
        )
        assertEquals(
            listOf("NCIS: New Orleans", "NCIS"),
            iptvArtworkSearchQueries("NCIS: New Orleans")
        )
    }

    @Test
    fun `specific ncis spinoff outranks franchise parent for episode subtitle`() {
        val requested = "NCIS: Origins: Enter Sandman"

        assertTrue(
            iptvArtworkTitleScore(requested, "NCIS: Origins") >
                iptvArtworkTitleScore(requested, "NCIS")
        )
        assertTrue(
            iptvArtworkTitleScore("NCIS: New Orleans", "NCIS: New Orleans") >
                iptvArtworkTitleScore("NCIS: New Orleans", "NCIS")
        )
    }

    @Test
    fun `german navy cis title matches the specific tmdb spinoff`() {
        assertEquals("ncis origins", normalizeIptvArtworkTitle("Navy CIS: Origins"))
        assertEquals(
            1_000.0,
            iptvArtworkTitleScore("Navy CIS: Origins", "NCIS: Origins"),
            0.0
        )
        assertTrue(
            iptvArtworkTitleScore("Navy CIS: Origins", "NCIS: Origins") >
                iptvArtworkTitleScore("Navy CIS: Origins", "Navy CIS")
        )
        assertTrue(
            iptvArtworkTitleScore("Navy CIS: New Orleans", "NCIS: New Orleans") >
                iptvArtworkTitleScore("Navy CIS: New Orleans", "Navy CIS")
        )
    }

    @Test
    fun `equalizer episode prefers series over more popular same titled movie`() {
        val durationMs = 55 * 60_000L
        assertTrue(
            iptvArtworkCandidateScore("The Equalizer", "The Equalizer", MediaType.TV, durationMs, 10f) >
                iptvArtworkCandidateScore("The Equalizer", "The Equalizer", MediaType.MOVIE, durationMs, 250f)
        )
    }

    @Test
    fun `short duration does not promote a different series over an exact movie title`() {
        val durationMs = 55 * 60_000L
        assertTrue(
            iptvArtworkCandidateScore("The Equalizer", "The Equalizer", MediaType.MOVIE, durationMs) >
                iptvArtworkCandidateScore("The Equalizer", "The Equalizer 2", MediaType.TV, durationMs)
        )
    }

    @Test
    fun `unknown or invalid duration does not imply a series`() {
        listOf(null, 0L, -1L).forEach { durationMs ->
            assertEquals(
                iptvArtworkCandidateScore("The Equalizer", "The Equalizer", MediaType.MOVIE, durationMs),
                iptvArtworkCandidateScore("The Equalizer", "The Equalizer", MediaType.TV, durationMs),
                0.0
            )
        }
    }

    @Test
    fun `long exact movie outranks same titled tv result`() {
        val durationMs = 99 * 60_000L

        assertTrue(
            iptvArtworkCandidateScore("Rambo", "Rambo", MediaType.MOVIE, durationMs) >
                iptvArtworkCandidateScore("Rambo", "Rambo", MediaType.TV, durationMs)
        )
    }

    @Test
    fun `logos prefer app language then english then neutral`() {
        assertTrue(artworkLanguageRank("de", "de-DE", neutralFirst = false) > artworkLanguageRank("en", "de-DE", false))
        assertTrue(artworkLanguageRank("en", "de-DE", neutralFirst = false) > artworkLanguageRank("00", "de-DE", false))
    }

    @Test
    fun `backdrops prefer neutral then app language then english`() {
        assertTrue(artworkLanguageRank("00", "de-DE", neutralFirst = true) > artworkLanguageRank("deu", "de-DE", true))
        assertTrue(artworkLanguageRank("deu", "de-DE", neutralFirst = true) > artworkLanguageRank("eng", "de-DE", true))
    }

    @Test
    fun `english details only fill missing localized fields`() {
        val localized = TmdbTvDetails(id = 1, name = "Dark", overview = "", posterPath = "/de.jpg")
        val english = TmdbTvDetails(
            id = 1,
            name = "Dark English",
            overview = "English plot",
            posterPath = "/en.jpg",
            backdropPath = "/neutral.jpg",
        )

        val merged = mergeTvDetailsLanguageFallback(localized, english)

        assertEquals("Dark", merged.name)
        assertEquals("English plot", merged.overview)
        assertEquals("/de.jpg", merged.posterPath)
        assertEquals("/neutral.jpg", merged.backdropPath)
    }
}