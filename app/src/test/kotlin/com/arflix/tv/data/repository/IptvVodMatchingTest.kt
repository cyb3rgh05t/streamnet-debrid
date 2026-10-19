package com.arflix.tv.data.repository

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import io.mockk.mockk
import org.junit.Assert.assertEquals
import org.junit.Test

class IptvVodMatchingTest {
    private val repository = IptvRepository(
        context = mockk(relaxed = true),
        okHttpClient = mockk(relaxed = true),
        profileManager = mockk(relaxed = true),
        invalidationBus = mockk(relaxed = true),
    )
    private val gson = Gson()

    private fun catalogItems(className: String, items: List<Map<String, Any?>>): List<*> {
        val itemClass = Class.forName("com.arflix.tv.data.repository.IptvRepository\$$className")
        val type = TypeToken.getParameterized(List::class.java, itemClass).type
        return gson.fromJson(gson.toJson(items), type)
    }

    private fun invoke(target: Any, name: String, vararg args: Any?): Any? =
        target.javaClass.declaredMethods.single { it.name == name }.apply {
            isAccessible = true
        }.invoke(target, *args)

    private fun field(target: Any, name: String): Any? =
        target.javaClass.getDeclaredField(name).apply { isAccessible = true }.get(target)

    private fun movieMatches(
        title: String,
        items: List<Map<String, Any?>>,
        tmdb: String? = null,
        year: Int? = null,
    ): List<Int> {
        val catalog = catalogItems("XtreamVodStream", items)
        val index = invoke(repository, "buildVodCatalogIndex", catalog)
        val matches = invoke(repository, "findMovieCandidatesIndexed", index,
            IptvTitleNormalizer.normalize(title), tmdb, null, year) as List<*>
        return matches.map { field(requireNotNull(it), "streamId") as Int }
    }

    private fun seriesMatches(
        title: String,
        items: List<Map<String, Any?>>,
        tmdb: String? = null,
        year: Int? = null,
    ): List<Int> {
        val entries = items.map { item ->
            mapOf("normalizedName" to "", "canonicalTitleKey" to "", "titleTokens" to emptyList<String>()) + item
        }
        val resolver = requireNotNull(invoke(repository, "getSeriesResolver"))
        val index = invoke(resolver, "buildCatalogIndex", 0L, catalogItems("ResolverSeriesEntry", entries))
        val matches = invoke(resolver, "buildCandidates", index,
            IptvTitleNormalizer.normalize(title), tmdb, null, year) as List<*>
        return matches.map {
            field(requireNotNull(field(requireNotNull(it), "entry")), "seriesId") as Int
        }
    }

    @Test
    fun `movie title fallback rejects conflicting ids and known remake years`() {
        val items = listOf(
            mapOf("stream_id" to 1, "name" to "The Equalizer (2014)", "tmdb" to "999"),
            mapOf("stream_id" to 2, "name" to "The Equalizer (2014) [4K]"),
            mapOf("stream_id" to 3, "name" to "The Equalizer (1985)"),
        )
        assertEquals(listOf(2), movieMatches("The Equalizer", items, tmdb = "123", year = 2014))
    }

    @Test
    fun `movie id matching accepts localized title and bypasses title fallback`() {
        val items = listOf(
            mapOf("stream_id" to 1, "name" to "Lokaler Titel", "tmdb" to "123"),
            mapOf("stream_id" to 2, "name" to "Original Title"),
        )
        assertEquals(listOf(1), movieMatches("Original Title", items, tmdb = "123"))
    }

    @Test
    fun `short and numeric movie titles are not lost by the token index`() {
        assertEquals(listOf(1), movieMatches("It", listOf(mapOf("stream_id" to 1, "name" to "It (2017)"))))
        assertEquals(listOf(2), movieMatches("1917", listOf(mapOf("stream_id" to 2, "name" to "1917 [4K]"))))
    }

    @Test
    fun `movie umlaut transcription matches in either direction`() {
        assertEquals(listOf(1), movieMatches("Für alle Fälle",
            listOf(mapOf("stream_id" to 1, "name" to "Fuer alle Faelle"))))
        assertEquals(listOf(2), movieMatches("Fuer alle Faelle",
            listOf(mapOf("stream_id" to 2, "name" to "Für alle Fälle"))))
    }

    @Test
    fun `series id match never adds same title candidates from another identity`() {
        val items = listOf(
            mapOf("seriesId" to 1, "name" to "The Equalizer", "tmdb" to "123", "year" to 2021),
            mapOf("seriesId" to 2, "name" to "The Equalizer", "tmdb" to "456", "year" to 1985),
            mapOf("seriesId" to 3, "name" to "The Equalizer"),
        )
        assertEquals(listOf(1), seriesMatches("The Equalizer", items, tmdb = "123", year = 2021))
    }

    @Test
    fun `series title fallback rejects conflicts partial names and remake years`() {
        val items = listOf(
            mapOf("seriesId" to 1, "name" to "Example Show", "tmdb" to "999", "year" to 2021),
            mapOf("seriesId" to 2, "name" to "Example Show (2021) [HD]", "year" to 2021),
            mapOf("seriesId" to 3, "name" to "Example Show", "year" to 1985),
            mapOf("seriesId" to 4, "name" to "Example Show TV", "year" to 2021),
        )
        assertEquals(listOf(2), seriesMatches("Example Show", items, tmdb = "123", year = 2021))
    }

    @Test
    fun `short series titles can resolve without provider ids`() {
        assertEquals(listOf(1), seriesMatches("It", listOf(mapOf("seriesId" to 1, "name" to "It"))))
    }
}
