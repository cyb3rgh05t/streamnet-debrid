package com.arflix.tv.data.repository

import org.junit.Assert.assertEquals
import org.junit.Test

class TraktPaginationTest {

    @Test
    fun `short pages continue to append unique results`() {
        val target = mutableListOf<String>()
        val seen = linkedSetOf<String>()

        assertEquals(2, appendUniqueTraktPage(target, seen, listOf("a", "b")) { it })
        assertEquals(2, appendUniqueTraktPage(target, seen, listOf("c", "d")) { it })
        assertEquals(listOf("a", "b", "c", "d"), target)
    }

    @Test
    fun `repeated page stops adding duplicates`() {
        val target = mutableListOf<String>()
        val seen = linkedSetOf<String>()

        appendUniqueTraktPage(target, seen, listOf("a", "b")) { it }

        assertEquals(0, appendUniqueTraktPage(target, seen, listOf("a", "b")) { it })
        assertEquals(listOf("a", "b"), target)
    }

    @Test
    fun `overlapping pages preserve order and append unseen items`() {
        val target = mutableListOf<String>()
        val seen = linkedSetOf<String>()

        appendUniqueTraktPage(target, seen, listOf("a", "b")) { it }

        assertEquals(1, appendUniqueTraktPage(target, seen, listOf("b", "c")) { it })
        assertEquals(listOf("a", "b", "c"), target)
    }
}
