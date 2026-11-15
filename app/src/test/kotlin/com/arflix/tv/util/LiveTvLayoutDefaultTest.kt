package com.arflix.tv.util

import org.junit.Assert.assertEquals
import org.junit.Test

class LiveTvLayoutDefaultTest {
    @Test
    fun freshInstallDefaultsToClassic() {
        assertEquals("classic", LiveTvLayoutDefault.defaultFor(1_000L, 1_000L))
        assertEquals("classic", LiveTvLayoutDefault.defaultFor(1_000L, 2_500L))
    }

    @Test
    fun updatedInstallKeepsNetflixLayout() {
        assertEquals("streamnet", LiveTvLayoutDefault.defaultFor(1_000L, 60_000L))
    }
}
