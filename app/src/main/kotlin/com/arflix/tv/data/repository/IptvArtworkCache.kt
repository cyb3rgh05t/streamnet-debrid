package com.arflix.tv.data.repository

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.Locale

internal data class IptvArtworkKey(
    val title: String,
    val language: String,
    val preferMovie: Boolean,
)

internal fun iptvArtworkKey(rawTitle: String, language: String, durationMs: Long?): IptvArtworkKey =
    IptvArtworkKey(
        title = cleanIptvArtworkTitle(rawTitle).lowercase(Locale.US),
        language = language,
        preferMovie = durationMs != null && durationMs >= 75 * 60_000L,
    )

internal class IptvArtworkCache(private val nowMs: () -> Long) {
    private data class Entry(val url: String?, val expiresAt: Long)

    private val entries = object : LinkedHashMap<IptvArtworkKey, Entry>(256, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<IptvArtworkKey, Entry>): Boolean =
            size > 256
    }
    // Fixed lock stripes coalesce same-key lookups without retaining a lock per program.
    private val locks = List(32) { Mutex() }

    suspend fun getOrLoad(key: IptvArtworkKey, load: suspend () -> String?): String? =
        locks[(key.hashCode() and Int.MAX_VALUE) % locks.size].withLock {
            val cached = synchronized(entries) { entries[key] }
            if (cached != null && cached.expiresAt > nowMs()) {
                return@withLock cached.url
            }
            val url = load()?.takeIf { it.isNotBlank() }
            synchronized(entries) {
                entries[key] = Entry(url, if (url != null) Long.MAX_VALUE else nowMs() + 10 * 60_000L)
            }
            url
        }

    fun clearMisses() {
        synchronized(entries) {
            entries.entries.removeAll { it.value.url == null }
        }
    }
}
