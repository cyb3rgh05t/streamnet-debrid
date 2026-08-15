package com.arflix.tv.data.repository

import android.content.Context
import com.arflix.tv.data.model.CatalogConfig
import com.arflix.tv.data.model.CollectionGroupKind
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.util.Constants
import com.arflix.tv.util.normalizeAppLanguage
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

data class GenreFanartEntry(
    val id: Int = 0,
    val name: String = "",
    val backdrops: List<String> = emptyList()
)

@Singleton
class GenreFanartRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val okHttpClient: OkHttpClient
) {
    private val gson = Gson()
    private val listType = TypeToken.getParameterized(List::class.java, GenreFanartEntry::class.java).type
    private val cachePreferences = context.getSharedPreferences(CACHE_PREFERENCES, Context.MODE_PRIVATE)

    suspend fun decorateCatalogs(catalogs: List<CatalogConfig>): List<CatalogConfig> = coroutineScope {
        val needsMovies = catalogs.any { it.collectionGroup == CollectionGroupKind.MOVIE_GENRE }
        val needsTv = catalogs.any { it.collectionGroup == CollectionGroupKind.TV_GENRE }
        if ((!needsMovies && !needsTv) || Constants.VODWISHARR_API_KEY.isBlank()) {
            return@coroutineScope catalogs
        }

        val movieEntries = async {
            if (needsMovies) loadGenres(MediaType.MOVIE) else emptyList()
        }
        val tvEntries = async {
            if (needsTv) loadGenres(MediaType.TV) else emptyList()
        }
        val movieById = movieEntries.await().associateBy { it.id }
        val tvById = tvEntries.await().associateBy { it.id }

        catalogs.map { catalog ->
            val entries = when (catalog.collectionGroup) {
                CollectionGroupKind.MOVIE_GENRE -> movieById
                CollectionGroupKind.TV_GENRE -> tvById
                else -> return@map catalog
            }
            val genreId = catalog.collectionSources.firstNotNullOfOrNull { it.tmdbGenreId }
                ?: return@map catalog
            val entry = entries[genreId] ?: return@map catalog
            val artworkUrl = tmdbGenreFanartUrl(entry.backdrops, genreId)
            catalog.copy(
                title = entry.name.trim().ifBlank { catalog.title },
                collectionCoverImageUrl = artworkUrl ?: catalog.collectionCoverImageUrl,
                collectionFocusGifUrl = artworkUrl ?: catalog.collectionFocusGifUrl,
                collectionHeroImageUrl = artworkUrl ?: catalog.collectionHeroImageUrl,
                collectionHeroGifUrl = artworkUrl ?: catalog.collectionHeroGifUrl
            )
        }
    }

    private suspend fun loadGenres(mediaType: MediaType): List<GenreFanartEntry> = withContext(Dispatchers.IO) {
        val language = currentLanguage()
        val cacheKey = "${mediaType.name.lowercase(Locale.US)}_$language"
        val cachedJson = cachePreferences.getString("${cacheKey}_json", null)
        val cachedAt = cachePreferences.getLong("${cacheKey}_at", 0L)
        val cached = parseEntries(cachedJson)
        if (cached.isNotEmpty() && System.currentTimeMillis() - cachedAt < CACHE_TTL_MS) {
            return@withContext cached
        }

        val endpoint = if (mediaType == MediaType.MOVIE) "discover/genreslider/movie" else "discover/genreslider/tv"
        val url = (Constants.VODWISHARR_API_URL + endpoint).toHttpUrl().newBuilder()
            .addQueryParameter("language", language)
            .build()
        val request = Request.Builder()
            .url(url)
            .header("Accept", "application/json")
            .header("X-API-Key", Constants.VODWISHARR_API_KEY)
            .build()
        val fresh = runCatching {
            okHttpClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return@use emptyList()
                val body = response.body.string()
                parseEntries(body).also { entries ->
                    if (entries.isNotEmpty()) {
                        cachePreferences.edit()
                            .putString("${cacheKey}_json", body)
                            .putLong("${cacheKey}_at", System.currentTimeMillis())
                            .apply()
                    }
                }
            }
        }.getOrDefault(emptyList())
        fresh.ifEmpty { cached }
    }

    private fun parseEntries(json: String?): List<GenreFanartEntry> {
        if (json.isNullOrBlank()) return emptyList()
        return runCatching {
            (gson.fromJson<List<GenreFanartEntry>>(json, listType) ?: emptyList())
                .filter { it.id > 0 && it.name.isNotBlank() }
        }.getOrDefault(emptyList())
    }

    private fun currentLanguage(): String {
        val raw = context.getSharedPreferences("app_locale", Context.MODE_PRIVATE)
            .getString("locale_tag", Locale.getDefault().toLanguageTag())
        return normalizeAppLanguage(raw).ifBlank { "en-US" }
    }

    companion object {
        private const val CACHE_PREFERENCES = "genre_fanart_cache_v1"
        private const val CACHE_TTL_MS = 24L * 60L * 60L * 1000L

        private val tones = mapOf(
            "red" to ("991B1B" to "FCA5A5"),
            "darkred" to ("1F2937" to "F87171"),
            "blue" to ("032541" to "01B4E4"),
            "lightblue" to ("1F2937" to "60A5FA"),
            "darkblue" to ("1F2937" to "2864D2"),
            "orange" to ("92400E" to "FCD34D"),
            "darkorange" to ("552C01" to "D47C1D"),
            "green" to ("087D29" to "21CB51"),
            "lightgreen" to ("065F46" to "6EE7B7"),
            "purple" to ("5B21B6" to "C4B5FD"),
            "darkpurple" to ("480C8B" to "A96BEF"),
            "yellow" to ("777E0D" to "E4ED55"),
            "pink" to ("9D174D" to "F9A8D4"),
            "black" to ("1F2937" to "D1D5DB")
        )
        private val toneByGenreId = mapOf(
            28 to "red", 12 to "darkpurple", 16 to "blue", 35 to "orange",
            80 to "darkblue", 99 to "lightgreen", 18 to "pink", 10751 to "yellow",
            14 to "lightblue", 36 to "orange", 27 to "black", 10402 to "blue",
            9648 to "purple", 10749 to "pink", 878 to "lightblue", 10770 to "red",
            53 to "black", 10752 to "darkred", 37 to "orange", 10759 to "darkpurple",
            10762 to "blue", 10763 to "black", 10764 to "darkorange", 10765 to "lightblue",
            10766 to "pink", 10767 to "lightgreen", 10768 to "darkred"
        )

        internal fun tmdbGenreFanartUrl(
            backdrops: List<String>,
            genreId: Int,
            size: String = "w1280"
        ): String? {
            val path = backdrops.getOrNull(4) ?: backdrops.lastOrNull() ?: return null
            if (!path.startsWith('/')) return null
            val tone = tones[toneByGenreId[genreId]] ?: tones.getValue("black")
            return "https://image.tmdb.org/t/p/${size}_filter(duotone,${tone.first},${tone.second})$path"
        }
    }
}