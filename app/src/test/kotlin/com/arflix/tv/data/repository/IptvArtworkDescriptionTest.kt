package com.arflix.tv.data.repository

import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class IptvArtworkDescriptionTest {
    private val ukGhosts = MediaItem(
        1, "Ghosts", year = "2019", mediaType = MediaType.TV, popularity = 100f,
        overview = "Alison und Mike leben mit Geistern in Button House.",
    )
    private val usGhosts = ukGhosts.copy(
        id = 2, year = "2021", popularity = 80f,
        overview = "Sam und Jay leben mit Geistern in Woodstone.",
    )
    private val germanGhosts = ukGhosts.copy(
        id = 3, year = "2025", popularity = 200f,
        overview = "Emma und Felix leben mit Geistern auf einem Anwesen.",
    )

    @Test
    fun `scattered topic words in a long synopsis do not overpower the series slot`() {
        val documentary = MediaItem(
            id = 10, title = "Shared Title", mediaType = MediaType.MOVIE,
            overview = "Apollo Astronauten Mond Raumfahrt.",
        )
        val series = MediaItem(
            id = 20, title = "Shared Title", mediaType = MediaType.TV,
            overview = "An alternate history with an international cast.",
        )
        val specific = "Apollo Astronauten Mond Raumfahrt."
        val broad = specific + " Ein Unfall beim Training entfacht eine Debatte. " +
            "Die Crew beschuetzt Familien waehrend eines politischen Konflikts. " +
            "Geheime Plaene veraendern Beziehungen zwischen Freunden und Kollegen."
        val candidates = listOf(documentary, series)
        val ref = MediaType.MOVIE to documentary.id

        val specificScore = iptvArtworkDescriptionScores(specific, candidates).getValue(ref)
        val broadScore = iptvArtworkDescriptionScores(broad, candidates).getValue(ref)
        assertTrue(specificScore > 150.0)
        assertTrue(broadScore < 150.0)
        assertEquals(documentary.id, rankIptvArtworkCandidates(
            "Shared Title", candidates, 50 * 60_000L, null, description = specific,
        ).first().id)
        assertEquals(series.id, rankIptvArtworkCandidates(
            "Shared Title", candidates, 50 * 60_000L, null, description = broad,
        ).first().id)
    }

    @Test
    fun `duplicate localized aliases do not increase description confidence`() {
        val candidates = listOf(ukGhosts, usGhosts, germanGhosts)
        val description = "Sam und Jay suchen einen Anwalt fur Woodstone."
        assertEquals(
            iptvArtworkDescriptionScores(description, candidates),
            iptvArtworkDescriptionScores(description, candidates + usGhosts + usGhosts),
        )
    }

    @Test
    fun `ghosts US episode description defeats more popular namesakes`() {
        val items = listOf(germanGhosts, ukGhosts, usGhosts)
        listOf(items, items.reversed()).forEach {
            assertEquals(usGhosts.id, rankIptvArtworkCandidates(
                "Ghosts", it, 30 * 60_000L, null,
                description = "Sam und Jay suchen einen Anwalt fur Woodstone.",
            ).first().id)
        }
    }

    @Test
    fun `description can also select UK or German ghosts instead of forcing US`() {
        val items = listOf(usGhosts, germanGhosts, ukGhosts)
        assertEquals(ukGhosts.id, rankIptvArtworkCandidates(
            "Ghosts", items, 30 * 60_000L, null,
            description = "Alison und Mike planen eine Feier.",
        ).first().id)
        assertEquals(germanGhosts.id, rankIptvArtworkCandidates(
            "Ghosts", items, 30 * 60_000L, null,
            description = "Emma und Felix suchen Hilfe.",
        ).first().id)
    }

    @Test
    fun `equalizer current series description defeats movie duration and older series`() {
        val movie = MediaItem(
            10, "The Equalizer", year = "2014", mediaType = MediaType.MOVIE,
            overview = "Robert McCall in Boston hilft Teri.", popularity = 500f,
        )
        val old = movie.copy(
            id = 11, year = "1985", mediaType = MediaType.TV,
            overview = "Robert McCall hilft Menschen in New York.",
        )
        val current = old.copy(
            id = 12, year = "2021", popularity = 10f,
            overview = "Robyn McCall hilft mit Mel und Harry. Delilah ist ihre Tochter.",
        )
        val items = listOf(old, movie, current)
        assertEquals(current.id, rankIptvArtworkCandidates(
            "The Equalizer", items, 100 * 60_000L, null,
            description = "Robyn und Delilah brauchen Hilfe von Harry.",
        ).first().id)
        assertEquals(movie.id, rankIptvArtworkCandidates(
            "The Equalizer", items, 50 * 60_000L, null,
            description = "McCall beschutzt Teri in Boston.",
        ).first().id)
        assertEquals(old.id, rankIptvArtworkCandidates(
            "The Equalizer", items, 50 * 60_000L, null,
            description = "Robert bekommt einen Auftrag in New York.",
        ).first().id)
    }

    @Test
    fun `english overview aliases contribute without replacing localized artwork`() {
        val localized = usGhosts.copy(overview = "Eine amerikanische Geisterkomodie.", backdrop = "/de.jpg")
        val english = localized.copy(overview = "Sam and Jay meet ghosts at Woodstone.", backdrop = "/en.jpg")
        val ranked = rankIptvArtworkCandidates(
            "Ghosts", listOf(germanGhosts, ukGhosts, localized, english), 30 * 60_000L, null,
            description = "Sam und Jay suchen einen Anwalt.",
        )
        assertEquals(localized.id, ranked.first().id)
        assertEquals("/de.jpg", ranked.first().backdrop)
    }

    @Test
    fun `missing descriptions single names and common plot words retain existing ranking`() {
        val items = listOf(germanGhosts, ukGhosts, usGhosts)
        val baseline = rankIptvArtworkCandidates("Ghosts", items, 30 * 60_000L, null)
        listOf(null, "", "Sam", "Sie leben mit Geistern.").forEach { description ->
            assertEquals(baseline, rankIptvArtworkCandidates(
                "Ghosts", items, 30 * 60_000L, null, description = description,
            ))
        }
    }

    @Test
    fun `description cannot authorize unrelated titles or override explicit year`() {
        val unrelated = usGhosts.copy(id = 9, title = "Other Show")
        assertTrue(rankIptvArtworkCandidates(
            "Ghosts", listOf(unrelated), 30 * 60_000L, null,
            description = "Sam und Jay in Woodstone.",
        ).isEmpty())
        assertEquals(ukGhosts.id, rankIptvArtworkCandidates(
            "Ghosts", listOf(ukGhosts, usGhosts), 30 * 60_000L, 2019,
            description = "Sam und Jay in Woodstone.",
        ).single().id)
    }

    @Test
    fun `two shared character names do not pull a reboot back to its original`() {
        // Real TMDB data: S.W.A.T. (2017) s02e07 names Luca and Hondo, which are also characters of the
        // 1975 series. Two of twelve words used to give the old series 58 points and win.
        val current = MediaItem(
            71790, "S.W.A.T.", year = "2017", mediaType = MediaType.TV, popularity = 115f,
            overview = "Die Serie dreht sich um einen lokal verwurzelten Seargent, der im Spannungsfeld zwischen " +
                "der Loyalität zur Straße und seinen polizeilichen Pflichten mit seinem Team die letzte Bastion " +
                "der Verbrechensbekämpfung führt.",
        )
        val original = MediaItem(
            11129, "S.W.A.T.", year = "1975", mediaType = MediaType.TV, popularity = 6f,
            overview = "Lieutenant Dan Hondo Harrelson leitet die Spezialeinheit, zu der auch Dominic Luca " +
                "gehört, bestehend aus ehemaligen Soldaten für besonders gefährliche Aufträge.",
        )
        val description = "Luca und sein Vater helfen mit ihrer Erfahrung aus einem alten Entführungsfall, nach " +
            "einem Nachahmungstäter zu fahnden. Hondo muss sich bei einer rassistischen Verkehrskontrolle " +
            "zusammenreißen."
        listOf(listOf(current, original), listOf(original, current)).forEach { items ->
            assertEquals(current.id, rankIptvArtworkCandidates(
                "S.W.A.T.", items, 45 * 60_000L, null, description = description,
            ).first().id)
        }
        assertTrue(iptvArtworkDescriptionScores(description, listOf(current, original)).values.all { it == 0.0 })
    }

    @Test
    fun `a renamed series is found through its old title as alias`() {
        // Real TMDB data: the series is now "Hubert ohne Staller", the guide still says "Hubert und Staller".
        val renamed = MediaItem(53193, "Hubert ohne Staller", year = "2011", mediaType = MediaType.TV, popularity = 20f)
        val tvMovie = MediaItem(
            378782, "Hubert und Staller - Unter Wölfen", year = "2016", mediaType = MediaType.MOVIE, popularity = 3f,
        )
        assertTrue(iptvArtworkAliasLookupWorthTrying("Hubert und Staller", renamed.title))
        assertTrue(!iptvArtworkAliasLookupWorthTrying("Live NFL Cincinnati Bengals", renamed.title))
        assertEquals(
            "Hubert und Staller",
            iptvArtworkAliasMatch("Hubert und Staller", listOf("Hubert & Staller", "Heiter bis tödlich - Hubert und Staller", "Hubert und Staller")),
        )
        assertEquals(null, iptvArtworkAliasMatch("Hubert und Staller", listOf("Hubert & Staller", "Heiter bis tödlich - Hubert und Staller")))
        // Without the alias the TV movie wins; with it the series does, for an episode-length programme.
        assertEquals(tvMovie.id, rankIptvArtworkCandidates("Hubert und Staller", listOf(renamed, tvMovie), 45 * 60_000L, null).single().id)
        val aliased = renamed.copy(title = "Hubert und Staller")
        assertEquals(renamed.id, rankIptvArtworkCandidates("Hubert und Staller", listOf(aliased, tvMovie), 45 * 60_000L, null).first().id)
    }
}
