package com.arflix.tv.data.repository

import com.arflix.tv.data.model.Category
import com.arflix.tv.data.model.MediaItem
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import org.junit.Test

class HomeCatalogLoadingTest {
    @Test
    fun `first page is usable before slow second page completes`() = runBlocking {
        val firstPublished = CompletableDeferred<Category>()
        val releaseSecond = CompletableDeferred<Unit>()
        val item = MediaItem(1, "First")
        val loading = async {
            loadHomeCategoryProgressively(
                "movies", "Movies",
                fetchPage = { page ->
                    if (page == 1) {
                        MediaRepository.CategoryPageResult(listOf(item), hasMore = true)
                    } else {
                        releaseSecond.await()
                        MediaRepository.CategoryPageResult(listOf(MediaItem(2, "Second")), hasMore = false)
                    }
                },
                onReady = { firstPublished.complete(it) },
            )
        }
        assertThat(firstPublished.await().items).containsExactly(item)
        assertThat(loading.isCompleted).isFalse()
        releaseSecond.complete(Unit)
        assertThat(loading.await().items.map { it.id }).containsExactly(1, 2).inOrder()
    }

    @Test
    fun `fast row publishes without waiting for another provider`() = runBlocking {
        val releaseSlow = CompletableDeferred<Unit>()
        val fastPublished = CompletableDeferred<Category>()
        val slow = async {
            loadHomeCategoryProgressively("slow", "Slow", {
                releaseSlow.await()
                MediaRepository.CategoryPageResult(listOf(MediaItem(1, "Slow")), false)
            }, {})
        }
        val fast = async {
            loadHomeCategoryProgressively("fast", "Fast", {
                MediaRepository.CategoryPageResult(listOf(MediaItem(2, "Fast")), false)
            }, { fastPublished.complete(it) })
        }
        assertThat(fastPublished.await().id).isEqualTo("fast")
        assertThat(slow.isCompleted).isFalse()
        releaseSlow.complete(Unit)
        fast.await()
        slow.await()
        Unit
    }

    @Test
    fun `empty second page preserves published first page`() = runBlocking {
        val updates = mutableListOf<Category>()
        val result = loadHomeCategoryProgressively("movies", "Movies", { page ->
            MediaRepository.CategoryPageResult(
                if (page == 1) listOf(MediaItem(1, "First")) else emptyList(),
                hasMore = page == 1,
            )
        }, { updates.add(it) })
        assertThat(result.items.map { it.id }).containsExactly(1)
        assertThat(updates).hasSize(1)
    }

    @Test
    fun `second page is deduplicated capped and published in page order`() = runBlocking {
        val updates = mutableListOf<Category>()
        val result = loadHomeCategoryProgressively("movies", "Movies", { page ->
            MediaRepository.CategoryPageResult(
                (if (page == 1) 1..20 else 15..65).map { MediaItem(it, "Item $it") },
                hasMore = true,
            )
        }, { updates.add(it) })
        assertThat(updates.map { it.items.size }).containsExactly(20, 40).inOrder()
        assertThat(result.items.map { it.id }).containsExactlyElementsIn(1..40).inOrder()
    }

    @Test
    fun `single page requires no enrichment request`(): Unit = runBlocking {
        val pages = mutableListOf<Int>()
        loadHomeCategoryProgressively("movies", "Movies", { page ->
            pages.add(page)
            MediaRepository.CategoryPageResult(listOf(MediaItem(1, "First")), hasMore = false)
        }, {})
        assertThat(pages).containsExactly(1)
    }

    @Test
    fun `cancellation propagates without publishing a completed row`() = runBlocking {
        val cancellation = kotlinx.coroutines.CancellationException("profile changed")
        var published = false
        try {
            loadHomeCategoryProgressively("movies", "Movies", { throw cancellation }, { published = true })
            throw AssertionError("Expected cancellation")
        } catch (error: kotlinx.coroutines.CancellationException) {
            assertThat(error).isSameInstanceAs(cancellation)
        }
        assertThat(published).isFalse()
    }
}
