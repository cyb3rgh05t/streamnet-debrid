package com.arflix.tv.data.repository

import com.arflix.tv.data.api.TmdbTvDetails
import com.arflix.tv.data.model.MediaType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class IptvArtworkTitleTest {
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