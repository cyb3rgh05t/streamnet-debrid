package com.arflix.tv.data.repository

import com.arflix.tv.data.api.TmdbApi
import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.io.IOException

class MediaRepositoryLogoTest {
    private val api = mockk<TmdbApi>()
    private val repository = MediaRepository(
        context = mockk(relaxed = true),
        tmdbApi = api,
        tvdbApi = mockk(),
        fanartApi = mockk(),
        traktRepository = mockk(),
        traktApi = mockk(),
        okHttpClient = mockk(),
        streamRepository = mockk(),
        homeServerRepository = mockk(),
    )

    @Test
    fun `live channel and collection hashes never request TMDB logos`() = runBlocking {
        for (status in listOf("iptv:streamnet_tv:xtream:70217", "collection:services")) {
            assertNull(repository.getLogoUrl(MediaItem(id = 1146933910, title = "Local item", mediaType = MediaType.TV, status = status)))
        }
        coVerify(exactly = 0) { api.getImages(any(), any(), any(), any()) }
    }

    @Test
    fun `regular media items still request TMDB logos`() = runBlocking {
        coEvery { api.getImages("tv", 42, any(), any()) } returns mockk(relaxed = true)
        assertNull(repository.getLogoUrl(MediaItem(id = 42, title = "Series", mediaType = MediaType.TV)))
        coVerify(exactly = 1) { api.getImages("tv", 42, any(), any()) }
    }

    @Test
    fun `parallel logo requests share one lookup including a cached miss`() = runBlocking {
        val started = CompletableDeferred<Unit>()
        val release = CompletableDeferred<Unit>()
        coEvery { api.getImages(any(), any(), any(), any()) } coAnswers {
            started.complete(Unit)
            release.await()
            mockk(relaxed = true)
        }
        val first = async { repository.getLogoUrl(MediaType.MOVIE, 42) }
        started.await()
        val others = List(8) {
            async(start = CoroutineStart.UNDISPATCHED) {
                repository.getLogoUrl(MediaType.MOVIE, 42)
            }
        }
        release.complete(Unit)
        assertEquals(List(9) { null }, (listOf(first) + others).awaitAll())
        assertNull(repository.getLogoUrl(MediaType.MOVIE, 42))
        coVerify(exactly = 1) { api.getImages(any(), any(), any(), any()) }
    }

    @Test
    fun `shared network failure respects each callers propagation policy and allows retry`() = runBlocking {
        val started = CompletableDeferred<Unit>()
        val release = CompletableDeferred<Unit>()
        val failure = IOException("offline")
        coEvery { api.getImages(any(), any(), any(), any()) } coAnswers {
            started.complete(Unit)
            release.await()
            throw failure
        }
        val quiet = async { repository.getLogoUrl(MediaType.TV, 42) }
        started.await()
        val strict = async(start = CoroutineStart.UNDISPATCHED) {
            runCatching { repository.getLogoUrl(MediaType.TV, 42, propagateNetworkFailure = true) }
        }
        release.complete(Unit)
        assertNull(quiet.await())
        val propagated = strict.await().exceptionOrNull()
        assertEquals(IOException::class.java, propagated?.javaClass)
        assertEquals(failure.message, propagated?.message)
        coVerify(exactly = 1) { api.getImages(any(), any(), any(), any()) }
        coEvery { api.getImages(any(), any(), any(), any()) } returns mockk(relaxed = true)
        assertNull(repository.getLogoUrl(MediaType.TV, 42))
        coVerify(exactly = 2) { api.getImages(any(), any(), any(), any()) }
    }

    @Test
    fun `warmed logos and cached misses remain language specific`() = runBlocking {
        repository.contentLanguage = "de-DE"
        repository.cacheLogoUrl(MediaType.MOVIE, 42, "https://example.test/de.png")
        assertEquals("https://example.test/de.png", repository.getLogoUrl(MediaType.MOVIE, 42))
        coEvery { api.getImages(any(), any(), any(), "en,null") } returns mockk(relaxed = true)
        repository.contentLanguage = "en-US"
        assertNull(repository.getLogoUrl(MediaType.MOVIE, 42))
        assertNull(repository.getLogoUrl(MediaType.MOVIE, 42))
        repository.contentLanguage = "de-DE"
        assertEquals("https://example.test/de.png", repository.getLogoUrl(MediaType.MOVIE, 42))
        coVerify(exactly = 1) { api.getImages(any(), any(), any(), any()) }
    }

    @Test
    fun `cancelling a waiting caller does not cancel the shared logo request`() = runBlocking {
        val started = CompletableDeferred<Unit>()
        val release = CompletableDeferred<Unit>()
        coEvery { api.getImages(any(), any(), any(), any()) } coAnswers {
            started.complete(Unit)
            release.await()
            mockk(relaxed = true)
        }
        val first = async { repository.getLogoUrl(MediaType.MOVIE, 42) }
        started.await()
        val waiter = async(start = CoroutineStart.UNDISPATCHED) {
            repository.getLogoUrl(MediaType.MOVIE, 42)
        }
        waiter.cancelAndJoin()
        release.complete(Unit)
        assertNull(first.await())
        assertNull(repository.getLogoUrl(MediaType.MOVIE, 42))
        coVerify(exactly = 1) { api.getImages(any(), any(), any(), any()) }
    }
}