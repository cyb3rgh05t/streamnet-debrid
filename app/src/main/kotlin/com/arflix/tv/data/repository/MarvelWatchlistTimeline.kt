package com.arflix.tv.data.repository

import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.model.CatalogConfig
import com.arflix.tv.data.model.CollectionSourceKind

internal data class MarvelTimelineEntry(
    val label: String,
    val mediaType: MediaType,
    val tmdbId: Int
)

/** Public title/ID snapshot from marvelwatchlist.com/de/, Story-Reihenfolge, 2026-10-10. */
internal object MarvelWatchlistTimeline {
    val sections = linkedMapOf(
        0 to "Vermächtnis: WKII & die 1940er",
        4 to "Vermächtnis: Die Fox-X-Men-Saga",
        13 to "Vermächtnis: 1990er",
        15 to "Vermächtnis: 2000er",
        33 to "Vermächtnis: Alternative Universen",
        38 to "Phase 1 — Die Avengers-Initiative (2008–2012)",
        49 to "Phase 2 — HYDRA & die Infinity-Steine (2012–2015)",
        58 to "Phase 3A — Street-Level-Helden (2015–2016)",
        64 to "Phase 3B — Civil War & Fallout (2016–2018)",
        97 to "Phase 3C — Ragnarök & der Infinity War (2018)",
        111 to "Vermächtnis: Zukunft (2029)",
        112 to "Phase 4 — Der Blip & Neuanfänge (2023)",
        122 to "Phase 4 — Das Multiversum öffnet sich (2024–2025)",
        146 to "Phase 5 — Der Multiversum-Krieg (2025–2026)",
        161 to "Phase 6 — Doomsday (2026)"
    )

    fun catalogForTimeline(catalog: CatalogConfig): CatalogConfig? =
        catalog.collectionSources.firstOrNull {
            it.kind == CollectionSourceKind.MARVEL_WATCHLIST_TIMELINE
        }?.let { catalog.copy(collectionSources = listOf(it)) }

    fun page(offset: Int, limit: Int): List<IndexedValue<MarvelTimelineEntry>> {
        require(offset >= 0 && limit > 0)
        return entries.withIndex().drop(offset).take(limit)
    }

    private fun film(id: Int, title: String) = MarvelTimelineEntry("[Film] $title", MediaType.MOVIE, id)
    private fun tv(id: Int, title: String) = MarvelTimelineEntry("[TV] $title", MediaType.TV, id)
    private fun special(id: Int, title: String, type: MediaType = MediaType.MOVIE) =
        MarvelTimelineEntry("[Special] $title", type, id)

    val entries = listOf(
        film(1771, "Captain America: The First Avenger"),
        special(211387, "Marvel One-Shot: Agent Carter"),
        tv(61550, "Agent Carter (Season 1)"),
        tv(61550, "Agent Carter (Season 2)"),
        film(49538, "X-Men: First Class"),
        film(2080, "X-Men Origins: Wolverine"),
        film(36657, "X-Men"),
        film(36658, "X2: X-Men United"),
        film(36668, "X-Men: The Last Stand"),
        film(76170, "The Wolverine"),
        film(127585, "X-Men: Days of Future Past"),
        film(246655, "X-Men: Apocalypse"),
        film(320288, "Dark Phoenix"),
        film(299537, "Captain Marvel"),
        film(36647, "Blade"),
        film(36586, "Blade II"),
        film(36648, "Blade: Trinity"),
        tv(4619, "Blade: The Series (Season 1)"),
        film(557, "Spider-Man"),
        film(558, "Spider-Man 2"),
        film(559, "Spider-Man 3"),
        film(1930, "The Amazing Spider-Man"),
        film(102382, "The Amazing Spider-Man 2"),
        film(1250, "Ghost Rider"),
        film(71676, "Ghost Rider: Spirit of Vengeance"),
        film(9480, "Daredevil (2003)"),
        film(9947, "Elektra"),
        film(7220, "The Punisher (2004)"),
        film(13056, "Punisher: War Zone"),
        film(18882, "Man-Thing"),
        film(9738, "Fantastic Four (2005)"),
        film(1979, "Fantastic Four: Rise of the Silver Surfer"),
        film(1927, "Hulk (2003)"),
        film(324857, "Spider-Man: Into the Spider-Verse"),
        tv(220102, "Spider-Noir (Season 1)"),
        tv(138502, "X-Men '97 (Season 1)"),
        tv(138502, "X-Men '97 (Season 2)"),
        film(166424, "Fantastic Four (2015)"),
        film(1726, "Iron Man"),
        film(10138, "Iron Man 2"),
        film(1724, "The Incredible Hulk"),
        special(76122, "The Consultant"),
        special(76535, "A Funny Thing Happened on the Way to Thor's Hammer"),
        special(10138, "Iron Man 2 (Post-Credit Scene)"),
        film(10195, "Thor"),
        special(1771, "Captain America: The First Avenger (Credits)"),
        special(10195, "Thor (Post-Credit Scene)"),
        film(24428, "The Avengers"),
        special(119569, "Item 47"),
        film(68721, "Iron Man 3"),
        film(76338, "Thor: The Dark World"),
        tv(1403, "Agents of S.H.I.E.L.D. (Season 1) - Folgen 1–16"),
        special(253980, "All Hail the King"),
        film(100402, "Captain America: The Winter Soldier"),
        tv(1403, "Agents of S.H.I.E.L.D. (Season 1) - Folgen 17–22"),
        film(118340, "Guardians of the Galaxy"),
        film(283995, "Guardians of the Galaxy Vol. 2"),
        tv(1403, "Agents of S.H.I.E.L.D. (Season 2) - Folgen 1–19"),
        tv(61889, "Daredevil (Season 1)"),
        tv(38472, "Jessica Jones (Season 1)"),
        film(99861, "Avengers: Age of Ultron"),
        tv(1403, "Agents of S.H.I.E.L.D. (Season 2) - Folgen 20–22"),
        special(69069, "WHiH Newsfront (Season 1)", MediaType.TV),
        film(102899, "Ant-Man"),
        tv(1403, "Agents of S.H.I.E.L.D. (Season 3) - Folgen 1–19"),
        tv(61889, "Daredevil (Season 2)"),
        special(69069, "WHiH Newsfront (Season 2)", MediaType.TV),
        film(271110, "Captain America: Civil War"),
        tv(1403, "Agents of S.H.I.E.L.D. (Season 3) - Folgen 20–22"),
        special(413279, "Team Thor"),
        special(441829, "Team Thor: Part 2"),
        tv(62126, "Luke Cage (Season 1)"),
        tv(62127, "Iron Fist (Season 1)"),
        tv(62285, "The Defenders (Season 1)"),
        film(497698, "Black Widow"),
        tv(241388, "Eyes of Wakanda (Season 1)"),
        film(284054, "Black Panther"),
        film(315635, "Spider-Man: Homecoming"),
        tv(67178, "The Punisher (Season 1)"),
        film(284052, "Doctor Strange"),
        tv(66190, "Cloak & Dagger (Season 1)"),
        tv(1403, "Agents of S.H.I.E.L.D. (Season 4)"),
        tv(69088, "Agents of S.H.I.E.L.D.: Slingshot"),
        tv(68716, "Inhumans (Season 1)"),
        tv(38472, "Jessica Jones (Season 2)"),
        film(340102, "The New Mutants"),
        tv(67195, "Legion (Season 1)"),
        tv(67195, "Legion (Season 2)"),
        tv(67195, "Legion (Season 3)"),
        tv(69629, "The Gifted (Season 1)"),
        tv(69629, "The Gifted (Season 2)"),
        tv(62126, "Luke Cage (Season 2)"),
        tv(62127, "Iron Fist (Season 2)"),
        tv(61889, "Daredevil (Season 3)"),
        tv(66190, "Cloak & Dagger (Season 2)"),
        film(293660, "Deadpool"),
        film(383498, "Deadpool 2"),
        tv(1403, "Agents of S.H.I.E.L.D. (Season 5)"),
        tv(67466, "Runaways (Season 1)"),
        tv(67466, "Runaways (Season 2)"),
        tv(67466, "Runaways (Season 3)"),
        film(284053, "Thor: Ragnarok"),
        special(505945, "Team Darryl"),
        tv(67178, "The Punisher (Season 2)"),
        tv(38472, "Jessica Jones (Season 3)"),
        film(335983, "Venom"),
        film(363088, "Ant-Man and the Wasp"),
        film(299536, "Avengers: Infinity War"),
        special(363088, "Ant-Man & The Wasp (All Credits)"),
        special(299537, "Captain Marvel (Post-Credits Scene)"),
        tv(88987, "Helstrom (Season 1)"),
        film(263115, "Logan"),
        film(299534, "Avengers: Endgame"),
        tv(85271, "WandaVision (Season 1)"),
        special(85271, "WandaVision (Ep 9 Mid-Credit Scene)", MediaType.TV),
        tv(88396, "The Falcon and the Winter Soldier (Season 1)"),
        tv(84958, "Loki (Season 1)"),
        tv(91363, "What If...? (Season 1)"),
        tv(1403, "Agents of S.H.I.E.L.D. (Season 6)"),
        tv(1403, "Agents of S.H.I.E.L.D. (Season 7)"),
        special(758025, "Peter's To-Do List"),
        film(429617, "Spider-Man: Far From Home"),
        special(497698, "Black Widow (Post-Credit Scene)"),
        tv(88329, "Hawkeye (Season 1)"),
        film(524434, "Eternals"),
        film(566525, "Shang-Chi and the Legend of the Ten Rings"),
        film(580489, "Venom: Let There Be Carnage"),
        film(634649, "Spider-Man: No Way Home"),
        film(569094, "Spider-Man: Across the Spider-Verse"),
        film(526896, "Morbius"),
        special(209139, "The Daily Bugle (Season 1)", MediaType.TV),
        special(209139, "The Daily Bugle (Season 2)", MediaType.TV),
        film(453395, "Doctor Strange in the Multiverse of Madness"),
        tv(92749, "Moon Knight (Season 1)"),
        tv(92782, "Ms. Marvel (Season 1)"),
        film(616037, "Thor: Love and Thunder"),
        film(505642, "Black Panther: Wakanda Forever"),
        tv(92783, "She-Hulk (Season 1)"),
        tv(122226, "Echo (Season 1)"),
        tv(114471, "Ironheart (Season 1)"),
        special(894205, "Werewolf by Night"),
        special(774752, "GOTG Holiday Special"),
        special(232125, "I Am Groot (Season 1)", MediaType.TV),
        special(232125, "I Am Groot (Season 2)", MediaType.TV),
        film(640146, "Ant-Man and the Wasp: Quantumania"),
        film(447365, "Guardians of the Galaxy Vol. 3"),
        film(912649, "Venom: The Last Dance"),
        film(634492, "Madame Web"),
        film(539972, "Kraven the Hunter"),
        tv(114472, "Secret Invasion (Season 1)"),
        film(609681, "The Marvels"),
        tv(138505, "Marvel Zombies"),
        tv(84958, "Loki (Season 2)"),
        tv(91363, "What If...? (Season 2)"),
        tv(91363, "What If...? (Season 3)"),
        film(533535, "Deadpool & Wolverine"),
        tv(138501, "Agatha All Along (Season 1)"),
        tv(138503, "Your Friendly Neighborhood Spider-Man (Season 1)"),
        tv(202555, "Daredevil: Born Again (Season 1)"),
        film(822119, "Captain America: Brave New World"),
        film(986056, "Thunderbolts*"),
        tv(198178, "Wonder Man (Season 1)"),
        tv(202555, "Daredevil: Born Again (Season 2)"),
        special(1439930, "The Punisher: One Last Kill"),
        film(969681, "Spider-Man: Brand New Day"),
        tv(213375, "VisionQuest (Season 1)"),
        film(617126, "The Fantastic Four: First Steps"),
        film(1003596, "AVENGERS: DOOMSDAY")
    )

    fun card(item: MediaItem?, position: Int): MediaItem {
        val entry = entries[position]
        return decorate(item ?: MediaItem(
            id = entry.tmdbId,
            title = entry.label,
            mediaType = entry.mediaType,
            timelineMetadataUnavailable = true
        ), position)
    }

    fun decorate(item: MediaItem, position: Int): MediaItem {
        val entry = entries[position]
        require(item.id == entry.tmdbId && item.mediaType == entry.mediaType)
        return item.copy(
            title = entry.label,
            timelineEntryId = "marvel-watchlist-2026-10-10:$position",
            timelineSection = sections.entries.last { it.key <= position }.value,
            sourceOrder = position
        )
    }
}
