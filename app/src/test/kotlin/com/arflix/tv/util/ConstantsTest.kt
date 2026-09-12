package com.arflix.tv.util

import org.junit.Assert.assertEquals
import org.junit.Test

class ConstantsTest {
    @Test
    fun `continue watching accepts one percent progress`() {
        assertEquals(1, Constants.MIN_PROGRESS_THRESHOLD)
    }
}
