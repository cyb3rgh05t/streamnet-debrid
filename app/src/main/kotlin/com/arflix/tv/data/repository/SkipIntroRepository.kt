package com.arflix.tv.data.repository
import androidx.annotation.Keep
import com.arflix.tv.data.api.AniSkipApi
import com.arflix.tv.data.api.ArmApi
import com.arflix.tv.data.api.IntroDbApi
import com.arflix.tv.data.api.TheIntroDbApi
import com.arflix.tv.data.model.MediaType
import retrofit2.HttpException
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton

@Keep
data class SkipInterval(
    val startMs: Long,
    val endMs: Long,
    val type: String,      // "intro", "recap", "outro", "op", "ed", "mixed-op", "mixed-ed", ...
    val provider: String,  // "theintrodb", "introdb" or "aniskip"
    val endsAtMediaEnd: Boolean = false
)

@Singleton
class SkipIntroRepository @Inject constructor(
    private val theIntroDbApi: TheIntroDbApi,
    private val introDbApi: IntroDbApi,
    private val aniSkipApi: AniSkipApi,
    private val armApi: ArmApi
) {
    private val cache = ConcurrentHashMap<String, List<SkipInterval>>()
    private val malIdCache = ConcurrentHashMap<String, String>()

    suspend fun getSkipIntervals(
        mediaType: MediaType,
        tmdbId: Int,
        imdbId: String?,
        season: Int? = null,
        episode: Int? = null
    ): List<SkipInterval> {
        val cacheKey = "$mediaType:$tmdbId:${imdbId.orEmpty()}:${season ?: 0}:${episode ?: 0}"
        cache[cacheKey]?.let { return it }

        // 1) TheIntroDB uses StreamNet's native TMDB identities and covers movies too.
        val theIntroDb = fetchFromTheIntroDb(tmdbId.takeIf { it > 0 }, imdbId, season, episode)
        if (theIntroDb.isNotEmpty()) {
            cache[cacheKey] = theIntroDb
            return theIntroDb
        }

        // 2) Legacy IntroDB and AniSkip remain TV-only fallbacks.
        if (mediaType != MediaType.TV || imdbId.isNullOrBlank() || season == null || episode == null) {
            return emptyList()
        }
        val introDb = fetchFromIntroDb(imdbId, season, episode)
        if (introDb.isNotEmpty()) {
            cache[cacheKey] = introDb
            return introDb
        }

        // 3) AniSkip (anime) via ARM (IMDB -> MAL)
        val malId = resolveMalId(imdbId)
        if (malId != null) {
            val aniSkip = fetchFromAniSkip(malId, episode)
            if (aniSkip.isNotEmpty()) {
                cache[cacheKey] = aniSkip
                return aniSkip
            }
        }

        return emptyList()
    }

    private suspend fun fetchFromTheIntroDb(
        tmdbId: Int?,
        imdbId: String?,
        season: Int?,
        episode: Int?
    ): List<SkipInterval> = try {
        val body = theIntroDbApi.getMedia(tmdbId, imdbId, season, episode)
        buildList {
            fun add(type: String, segments: List<com.arflix.tv.data.api.TheIntroDbSegment>?) {
                segments.orEmpty().forEach { segment ->
                    val start = segment.startMs ?: return@forEach
                    val end = segment.endMs
                    if (start < 0L || (end != null && end <= start)) return@forEach
                    add(
                        SkipInterval(
                            startMs = start,
                            endMs = end ?: OPEN_ENDED_SEGMENT_END_MS,
                            type = type,
                            provider = "theintrodb",
                            endsAtMediaEnd = end == null
                        )
                    )
                }
            }
            add("recap", body.recap)
            add("intro", body.intro)
            add("credits", body.credits)
            add("preview", body.preview)
        }.sortedBy { it.startMs }
    } catch (_: HttpException) {
        emptyList()
    } catch (e: Exception) {
        if (e is kotlinx.coroutines.CancellationException) throw e
        emptyList()
    }

    private suspend fun fetchFromIntroDb(imdbId: String, season: Int, episode: Int): List<SkipInterval> {
        return try {
            val body = introDbApi.getSegments(imdbId, season, episode)

            val out = mutableListOf<SkipInterval>()

            fun addIfValid(type: String, segment: com.arflix.tv.data.api.IntroDbSegment?) {
                segment ?: return
                val startMs = if (segment.startMs > 0L) segment.startMs else ((segment.startSec ?: 0.0) * 1000).toLong()
                val endMs = if (segment.endMs > 0L) segment.endMs else ((segment.endSec ?: 0.0) * 1000).toLong()
                if (endMs <= startMs || startMs < 0L) return
                out += SkipInterval(startMs, endMs, type, "introdb")
            }

            addIfValid("recap", body.recap)
            addIfValid("intro", body.intro)
            addIfValid("outro", body.outro)

            out.sortedBy { it.startMs }
        } catch (_: HttpException) {
            emptyList()
        } catch (e: Exception) {
            if (e is kotlinx.coroutines.CancellationException) throw e

            emptyList()
        }
    }

    private suspend fun fetchFromAniSkip(malId: String, episode: Int): List<SkipInterval> {
        return try {
            val types = listOf("op", "ed", "recap", "mixed-op", "mixed-ed")
            val body = aniSkipApi.getSkipTimes(malId, episode, types)
            if (!body.found) return emptyList()

            body.results
                .orEmpty()
                .mapNotNull { r ->
                    val startMs = (r.interval.startTime * 1000.0).toLong()
                    val endMs = (r.interval.endTime * 1000.0).toLong()
                    if (endMs > startMs) {
                        SkipInterval(
                            startMs = startMs,
                            endMs = endMs,
                            type = r.skipType,
                            provider = "aniskip"
                        )
                    } else null
                }
                .sortedBy { it.startMs }
        } catch (_: HttpException) {
            emptyList()
        } catch (e: Exception) {
            if (e is kotlinx.coroutines.CancellationException) throw e

            emptyList()
        }
    }

    private suspend fun resolveMalId(imdbId: String): String? {
        val cached = malIdCache[imdbId]
        if (cached != null) return cached.takeIf { it != NO_MAL_ID }

        val malId = try {
            armApi.resolve(imdbId).firstOrNull()?.myanimelist?.toString()
        } catch (_: HttpException) {
            null
        } catch (_: Exception) {
            null
        }

        malIdCache[imdbId] = malId ?: NO_MAL_ID
        return malId
    }

    private companion object {
        private const val NO_MAL_ID = "__none__"
        private const val OPEN_ENDED_SEGMENT_END_MS = Long.MAX_VALUE - 1_000L
    }
}
