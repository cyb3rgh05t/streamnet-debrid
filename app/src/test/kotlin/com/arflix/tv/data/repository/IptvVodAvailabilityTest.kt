package com.arflix.tv.data.repository

import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType
import io.mockk.mockk
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class IptvVodAvailabilityTest {
    private val repository = IptvRepository(
        context = mockk(relaxed = true),
        okHttpClient = mockk(relaxed = true),
        profileManager = mockk(relaxed = true),
        invalidationBus = mockk(relaxed = true),
    )

    @Test
    fun `provider title is normalized for Home availability matching`() {
        assertEquals(
            IptvRepository.XtreamVodAvailabilityKey(MediaType.MOVIE, "example", year = 2025),
            repository.xtreamVodAvailabilityKey("The Example (2025) [4K]", MediaType.MOVIE),
        )
    }

    @Test
    fun `movie and series availability remain distinct`() {
        val movie = repository.xtreamVodAvailabilityKey("Example", MediaType.MOVIE)
        val series = repository.xtreamVodAvailabilityKey("Example", MediaType.TV)

        assertEquals(MediaType.MOVIE, movie?.mediaType)
        assertEquals(MediaType.TV, series?.mediaType)
    }

    @Test
    fun `blank provider title is ignored`() {
        assertNull(repository.xtreamVodAvailabilityKey("  ", MediaType.MOVIE))
    }

    @Test
    fun `excluded provider category is removed from Home availability`() {
        assertEquals(false, isXtreamVodCategoryIncluded(" 42 ", setOf("42")))
        assertEquals(true, isXtreamVodCategoryIncluded("43", setOf("42")))
        assertEquals(true, isXtreamVodCategoryIncluded(null, setOf("42")))
    }

    @Test
    fun `matching TMDB id confirms same-title movie`() {
        val availability = IptvRepository.XtreamVodAvailability(
            setOf(
                repository.xtreamVodAvailabilityKey(
                    rawTitle = "The Example",
                    mediaType = MediaType.MOVIE,
                    tmdbId = "123",
                    year = 2025,
                )!!,
            ),
        )

        assertEquals(true, availability.contains(MediaItem(123, "The Example", year = "2025")))
    }

    @Test
    fun `different TMDB id rejects same-title movie`() {
        val availability = IptvRepository.XtreamVodAvailability(
            setOf(
                repository.xtreamVodAvailabilityKey(
                    rawTitle = "The Example",
                    mediaType = MediaType.MOVIE,
                    tmdbId = "456",
                    year = 2025,
                )!!,
            ),
        )

        assertEquals(false, availability.contains(MediaItem(123, "The Example", year = "2025")))
    }

    @Test
    fun `different year rejects title fallback when provider has no id`() {
        val availability = IptvRepository.XtreamVodAvailability(
            setOf(
                repository.xtreamVodAvailabilityKey(
                    rawTitle = "The Example",
                    mediaType = MediaType.MOVIE,
                    year = 1999,
                )!!,
            ),
        )

        assertEquals(false, availability.contains(MediaItem(123, "The Example", year = "2025")))
    }

    @Test
    fun `title fallback remains available when provider exposes no metadata`() {
        val availability = IptvRepository.XtreamVodAvailability(
            setOf(repository.xtreamVodAvailabilityKey("The Example", MediaType.MOVIE)!!),
        )

        assertEquals(true, availability.contains(MediaItem(123, "The Example", year = "2025")))
    }

    @Test
    fun `VOD title fallback rejects candidates that only share a title word`() {
        assertEquals(false, iptvVodTitlesMatchExactly("The Example Documentary", "The Example"))
        assertEquals(false, iptvVodTitlesMatchExactly("Example of Something", "The Example"))
    }

    @Test
    fun `VOD title fallback accepts exact titles with formatting and year noise`() {
        assertEquals(true, iptvVodTitlesMatchExactly("The Example (2025) [4K]", "The Example"))
        assertEquals(true, iptvVodTitlesMatchExactly("Example, The", "The Example"))
    }

    @Test
    fun `VOD fallback rejects known year mismatch but tolerates adjacent release year`() {
        assertEquals(false, iptvVodYearsCompatible(2025, 1999))
        assertEquals(true, iptvVodYearsCompatible(2025, 2024))
        assertEquals(true, iptvVodYearsCompatible(2025, null))
    }

    @Test
    fun `matching id accepts localized titles for movies and series`() {
        MediaType.entries.forEach { type ->
            val availability = IptvRepository.XtreamVodAvailability(
                setOf(repository.xtreamVodAvailabilityKey("Provider Original Title", type, tmdbId = "123")!!),
            )
            assertEquals(true, availability.contains(MediaItem(123, "Lokaler Titel", mediaType = type)))
            assertEquals(false, availability.contains(MediaItem(456, "Provider Original Title", mediaType = type)))
        }
    }

    @Test
    fun `search and playback share title normalization and year tolerance`() {
        listOf("Example, The (2024) [4K]", "The Example (2024) 1080p WEB-DL").forEach { name ->
            val availability = IptvRepository.XtreamVodAvailability(
                setOf(repository.xtreamVodAvailabilityKey(name, MediaType.MOVIE)!!),
            )
            assertEquals(true, iptvVodTitlesMatchExactly(name, "The Example"))
            assertEquals(true, availability.contains(MediaItem(123, "The Example", year = "2025")))
            assertEquals(false, availability.contains(MediaItem(123, "The Example", year = "1999")))
        }
    }

    @Test
    fun `zero provider id is treated as unknown rather than conflicting`() {
        val availability = IptvRepository.XtreamVodAvailability(
            setOf(repository.xtreamVodAvailabilityKey("Example", MediaType.MOVIE, tmdbId = "0")!!),
        )
        assertEquals(true, availability.contains(MediaItem(123, "Example")))
    }

    @Test
    fun `availability accepts umlaut transcription in either direction`() {
        listOf("Für alle Fälle" to "Fuer alle Faelle", "Fuer alle Faelle" to "Für alle Fälle").forEach { (provider, query) ->
            val availability = IptvRepository.XtreamVodAvailability(
                setOf(repository.xtreamVodAvailabilityKey(provider, MediaType.TV)!!),
            )
            assertEquals(true, availability.contains(MediaItem(123, query, mediaType = MediaType.TV)))
        }
    }

    @Test
    fun `exact title matching preserves word order and meaningful short words`() {
        assertEquals(false, iptvVodTitlesMatchExactly("Dog Bites Man", "Man Bites Dog"))
        assertEquals(false, iptvVodTitlesMatchExactly("In Time", "Time"))
        assertEquals(false, iptvVodTitlesMatchExactly("The Equalizer 2", "The Equalizer"))
        assertEquals(true, iptvVodTitlesMatchExactly("1917", "1917"))
    }

    @Test
    fun `movie title matching tolerates an inner sequel number on one side only`() {
        assertEquals(true, iptvVodMovieTitlesMatch("Pacific Rim 2: Uprising (2018)", "Pacific Rim: Uprising"))
        assertEquals(true, iptvVodMovieTitlesMatch("Pacific Rim: Uprising", "Pacific Rim 2: Uprising"))
        assertEquals(false, iptvVodMovieTitlesMatch("Pacific Rim (2013)", "Pacific Rim: Uprising"))
        assertEquals(false, iptvVodMovieTitlesMatch("The Equalizer 2", "The Equalizer"))
        assertEquals(false, iptvVodMovieTitlesMatch("Rocky 2 Rematch", "Rocky 3 Rematch"))
        assertEquals(false, iptvVodMovieTitlesMatch("Dog Bites Man", "Man Bites Dog"))
        assertEquals(true, iptvVodMovieTitlesMatch("1917", "1917"))
        assertEquals(false, iptvVodTitlesMatchExactly("Pacific Rim 2: Uprising", "Pacific Rim: Uprising"))
    }

    @Test
    fun `indexed availability gives the same answer as the per-key reference on mixed data`() {
        val rnd = java.util.Random(42)
        val titles = listOf("alpha", "beta", "gamma", "delta", "the matrix", "heat", "ronin", "up")
        fun key(i: Int): IptvRepository.XtreamVodAvailabilityKey {
            val withTmdb = rnd.nextInt(3) != 0
            val withImdb = rnd.nextInt(3) != 0
            return IptvRepository.XtreamVodAvailabilityKey(
                mediaType = if (rnd.nextBoolean()) MediaType.MOVIE else MediaType.TV,
                normalizedTitle = titles[rnd.nextInt(titles.size)],
                tmdbId = if (withTmdb) (1 + rnd.nextInt(40)).toString() else null,
                imdbId = if (withImdb) "tt${1 + rnd.nextInt(40)}" else null,
                year = if (rnd.nextInt(4) == 0) null else 1995 + rnd.nextInt(6),
            )
        }
        val keys = (0 until 120).map(::key).toSet()
        val availability = IptvRepository.XtreamVodAvailability(keys)

        fun reference(item: MediaItem): Boolean {
            if (item.mediaType != MediaType.MOVIE && item.mediaType != MediaType.TV) return false
            val titleKey = iptvVodTitleKey(item.title)
            val tmdb = item.id.takeIf { it > 0 }?.toString()
            val imdb = item.homeServerImdbId?.trim()?.lowercase()?.takeIf { it.matches(Regex("tt\\d+")) }
            val year = sequenceOf(item.year, item.releaseDate.orEmpty())
                .mapNotNull { Regex("(?:19|20)\\d{2}").find(it)?.value?.toIntOrNull() }
                .firstOrNull()
            return keys.any { k ->
                k.mediaType == item.mediaType &&
                    (iptvVodIdentityMatch(tmdb, imdb, k.tmdbId, k.imdbId)
                        ?: (titleKey.isNotBlank() && k.normalizedTitle == titleKey &&
                            iptvVodYearsCompatible(year, k.year)))
            }
        }

        var trueCount = 0
        repeat(4_000) {
            val titleSource = titles[rnd.nextInt(titles.size)] + if (rnd.nextInt(5) == 0) " (2001)" else ""
            val item = MediaItem(
                id = if (rnd.nextInt(5) == 0) 0 else 1 + rnd.nextInt(45),
                title = if (rnd.nextInt(8) == 0) "" else titleSource,
                mediaType = if (rnd.nextBoolean()) MediaType.MOVIE else MediaType.TV,
                year = if (rnd.nextBoolean()) (1993 + rnd.nextInt(10)).toString() else "",
                homeServerImdbId = when (rnd.nextInt(4)) {
                    0 -> "tt${1 + rnd.nextInt(45)}"
                    1 -> " TT${1 + rnd.nextInt(45)} "
                    2 -> "not-an-id"
                    else -> null
                },
            )
            val expected = reference(item)
            if (expected) trueCount++
            assertEquals(
                "item=${item.id}/${item.title}/${item.mediaType}/${item.homeServerImdbId} " +
                    "candidates=${keys.filter { it.mediaType == item.mediaType && (it.imdbId == item.homeServerImdbId?.trim()?.lowercase() || it.tmdbId == item.id.toString()) }}",
                expected,
                availability.contains(item),
            )
        }
        // The data must exercise both answers, otherwise the comparison proves nothing.
        assert(trueCount in 200..3_800) { "trueCount=$trueCount" }
    }

    @Test
    fun `tv session browsing stays local while a played channel syncs`() {
        val base = IptvTvSessionState(
            lastChannelId = "a:1",
            lastGroupName = "all",
            lastFocusedZone = "GUIDE",
            lastOpenedAt = 10L,
            recentChannelIds = listOf("a:1"),
        )
        assertEquals(false, tvSessionNeedsCloudSync(base, base.copy(lastGroupName = "sports")))
        assertEquals(false, tvSessionNeedsCloudSync(base, base.copy(lastFocusedZone = "CHANNEL_LIST")))
        assertEquals(true, tvSessionNeedsCloudSync(base, base.copy(lastChannelId = "a:2")))
        assertEquals(true, tvSessionNeedsCloudSync(base, base.copy(recentChannelIds = listOf("a:1", "a:2"))))
        assertEquals(true, tvSessionNeedsCloudSync(base, base.copy(lastOpenedAt = 20L)))
    }

    @Test
    fun `series binding keys never mix ids with same title remakes`() {
        val old = iptvSeriesBindingKeys("provider", "1", "tt0000001", "The Equalizer", 1985)
        val current = iptvSeriesBindingKeys("provider", "2", "tt0000002", "The Equalizer", 2021)
        assertEquals(listOf("provider|tmdb:1"), old)
        assertEquals(listOf("provider|tmdb:2"), current)
        assertEquals(
            emptySet<String>(),
            iptvSeriesBindingKeys("provider", null, null, "The Equalizer", 1985).toSet()
                .intersect(iptvSeriesBindingKeys("provider", null, null, "The Equalizer", 2021).toSet()),
        )
    }
}