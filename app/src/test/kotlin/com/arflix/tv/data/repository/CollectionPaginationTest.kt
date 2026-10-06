package com.arflix.tv.data.repository

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CollectionPaginationTest {
    @Test
    fun `cached Doctor Strange boundary is insufficient to decide timeline exhaustion`() {
        val cachedCount = 44
        val required = collectionPageProbeCount(offset = 32, limit = 12)
        assertTrue(cachedCount < required)
        val refreshedCount = 69
        val nextOffset = collectionPageNextOffset(32, 12)
        assertTrue(nextOffset < refreshedCount)
    }

    @Test
    fun `timeline pages probe beyond exact cached boundary and reach all 69 entries`() {
        var cachedCount = 0
        var offset = 0
        val consumed = mutableListOf<Int>()
        var limit = 8
        do {
            val required = collectionPageProbeCount(offset, limit)
            if (cachedCount < required) cachedCount = minOf(69, required + 20)
            val page = (0 until cachedCount).drop(offset).take(limit)
            consumed += page
            offset = collectionPageNextOffset(offset, page.size)
            val hasMore = offset < cachedCount
            limit = 12
        } while (hasMore)

        assertEquals((0 until 69).toList(), consumed)
        assertEquals(69, offset)
        assertEquals(45, collectionPageProbeCount(32, 12))
    }

    @Test
    fun `metadata failures do not rewind consumed source references`() {
        val consumedRefs = 12
        val renderedItems = 9
        val nextOffset = collectionPageNextOffset(32, consumedRefs)
        assertEquals(44, nextOffset)
        assertTrue(nextOffset > 32 + renderedItems)
    }

    @Test
    fun `probe count cannot overflow`() {
        assertEquals(Int.MAX_VALUE, collectionPageProbeCount(Int.MAX_VALUE - 8, 12))
    }
}
