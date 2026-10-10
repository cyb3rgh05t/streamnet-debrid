package com.arflix.tv.data.repository

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import java.util.Locale
import java.util.concurrent.atomic.AtomicReference

internal class IptvArtworkRequests {
    private val failure = AtomicReference<Exception?>()

    suspend fun <T> load(request: suspend () -> T): T? = try {
        request()
    } catch (e: java.io.IOException) {
        failure.compareAndSet(null, e)
        null
    } catch (e: retrofit2.HttpException) {
        failure.compareAndSet(null, e)
        null
    } catch (e: com.google.gson.JsonParseException) {
        val invalidResponse = java.io.IOException("Invalid JSON response during IPTV artwork lookup", e)
        failure.compareAndSet(null, invalidResponse)
        null
    }

    fun throwIfFailed() {
        failure.get()?.let { throw it }
    }
}

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

internal class IptvLookupCache<T>(
    private val nowMs: () -> Long,
    private val isMiss: (T) -> Boolean,
) {
    private data class Entry<T>(val value: T, val expiresAt: Long)

    private val entries = object : LinkedHashMap<IptvArtworkKey, Entry<T>>(256, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<IptvArtworkKey, Entry<T>>): Boolean =
            size > 256
    }
    private val values = MutableStateFlow<Map<IptvArtworkKey, T>>(emptyMap())
    // Fixed lock stripes coalesce same-key lookups without retaining a lock per program.
    private val locks = List(32) { Mutex() }

    fun observe(key: IptvArtworkKey): Flow<T?> =
        values.map { it[key] }.distinctUntilChanged()

    suspend fun getOrLoad(key: IptvArtworkKey, load: suspend () -> T): T =
        locks[(key.hashCode() and Int.MAX_VALUE) % locks.size].withLock {
            val cached = synchronized(entries) { entries[key] }
            if (cached != null && cached.expiresAt > nowMs()) {
                return@withLock cached.value
            }
            val value = load()
            synchronized(entries) {
                entries[key] = Entry(value, if (!isMiss(value)) Long.MAX_VALUE else nowMs() + 10 * 60_000L)
                values.value = entries.mapValues { it.value.value }
            }
            value
        }

    fun clearMisses() {
        synchronized(entries) {
            entries.entries.removeAll { isMiss(it.value.value) }
            values.value = entries.mapValues { it.value.value }
        }
    }
}

internal class IptvArtworkCache(nowMs: () -> Long) {
    private val cache = IptvLookupCache<String?>(nowMs) { it == null }

    fun observe(key: IptvArtworkKey): Flow<String?> = cache.observe(key)

    suspend fun getOrLoad(key: IptvArtworkKey, load: suspend () -> String?): String? =
        cache.getOrLoad(key) { load()?.takeIf { it.isNotBlank() } }

    fun clearMisses() = cache.clearMisses()
}
