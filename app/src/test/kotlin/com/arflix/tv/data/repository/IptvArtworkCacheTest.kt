package com.arflix.tv.data.repository

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.io.IOException

class IptvArtworkCacheTest {
    private val key = iptvArtworkKey("Tatort", "de-DE", null)

    @Test
    fun `home and tv reuse the same normalized program result`() = runBlocking {
        val cache = IptvArtworkCache { 0L }
        var loads = 0
        val homeKey = iptvArtworkKey("Tatort HD - S01 E02", "de-DE", 60 * 60_000L)
        assertEquals(key, homeKey)
        assertEquals("backdrop", cache.getOrLoad(homeKey) { loads++; "backdrop" })
        assertEquals("backdrop", cache.getOrLoad(key) { loads++; "different" })
        assertEquals(1, loads)
    }

    @Test
    fun `language and movie duration boundary keep results separate`() {
        assertEquals(key, iptvArtworkKey("Tatort", "de-DE", 75 * 60_000L - 1))
        assertNotEquals(key, iptvArtworkKey("Tatort", "de-DE", 75 * 60_000L))
        assertNotEquals(key, iptvArtworkKey("Tatort", "en-US", null))
        assertNotEquals(key, iptvArtworkKey("Tatort: Borowski", "de-DE", null))
    }

    @Test
    fun `parallel home and tv requests perform one lookup`() = runBlocking {
        val cache = IptvArtworkCache { 0L }
        val started = CompletableDeferred<Unit>()
        val release = CompletableDeferred<Unit>()
        var loads = 0
        val home = async {
            cache.getOrLoad(key) {
                loads++
                started.complete(Unit)
                release.await()
                "shared"
            }
        }
        started.await()
        val tv = async { cache.getOrLoad(key) { loads++; "different" } }
        release.complete(Unit)
        assertEquals(listOf("shared", "shared"), awaitAll(home, tv))
        assertEquals(1, loads)
    }

    @Test
    fun `miss expires after exactly ten minutes`() = runBlocking {
        var clock = 0L
        val cache = IptvArtworkCache { clock }
        assertNull(cache.getOrLoad(key) { null })
        clock = 10 * 60_000L - 1
        assertNull(cache.getOrLoad(key) { "too early" })
        clock++
        assertEquals("retry", cache.getOrLoad(key) { "retry" })
    }

    @Test
    fun `refresh clears misses but keeps successful artwork`() = runBlocking {
        val cache = IptvArtworkCache { 0L }
        val other = iptvArtworkKey("Tagesschau", "de-DE", null)
        assertNull(cache.getOrLoad(key) { null })
        assertEquals("hit", cache.getOrLoad(other) { "hit" })
        cache.clearMisses()
        assertEquals("retry", cache.getOrLoad(key) { "retry" })
        assertEquals("hit", cache.getOrLoad(other) { "different" })
    }

    @Test
    fun `failed request is not stored as a miss`() = runBlocking {
        val cache = IptvArtworkCache { 0L }
        var caught = false
        try {
            cache.getOrLoad(key) { throw IOException("offline") }
        } catch (e: IOException) {
            caught = true
        }
        assertEquals(true, caught)
        assertEquals("retry", cache.getOrLoad(key) { "retry" })
    }

    @Test
    fun `cancelled request releases its lock without caching a miss`() = runBlocking {
        val cache = IptvArtworkCache { 0L }
        var cancelled = false
        try {
            cache.getOrLoad(key) { throw CancellationException("screen closed") }
        } catch (e: CancellationException) {
            cancelled = true
        }
        assertEquals(true, cancelled)
        assertEquals("retry", cache.getOrLoad(key) { "retry" })
    }

    @Test
    fun `cache evicts old programs after 256 entries`() = runBlocking {
        val cache = IptvArtworkCache { 0L }
        cache.getOrLoad(key) { "old" }
        repeat(256) { index ->
            cache.getOrLoad(iptvArtworkKey("Program $index", "de-DE", null)) { "art $index" }
        }
        assertEquals("new", cache.getOrLoad(key) { "new" })
    }
}
