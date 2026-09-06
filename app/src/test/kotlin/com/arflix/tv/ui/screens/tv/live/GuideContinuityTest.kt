package com.arflix.tv.ui.screens.tv.live

import com.arflix.tv.data.model.IptvNowNext
import com.arflix.tv.data.model.IptvProgram
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class GuideContinuityTest {
    private val past = IptvProgram("Past", startUtcMillis = 0, endUtcMillis = 100)
    private val live = IptvProgram("Live", startUtcMillis = 100, endUtcMillis = 200)
    private val next = IptvProgram("Next", startUtcMillis = 200, endUtcMillis = 300)

    @Test
    fun clockPromotesNextAndRetainsArchive() {
        val cached = IptvNowNext(now = past, next = live, upcoming = listOf(live, next))
        val current = cached.atTime(100)

        assertEquals(live, current.now)
        assertEquals(next, current.next)
        assertEquals(listOf(past), current.recent)
        assertEquals(listOf(live, next), current.atTime(300).recent.drop(1))
        assertNull(current.atTime(300).now)
    }

    @Test
    fun liveRecoveryIsBoundedAndNeverSeeksCatchupToLive() {
        var now = 0L
        val recovery = LiveWindowRecovery { now }

        assertFalse(recovery.claim(isCatchup = true))
        assertTrue(recovery.claim(isCatchup = false))
        assertFalse(recovery.claim(isCatchup = false))
        now = 60_000L
        assertTrue(recovery.claim(isCatchup = false))
    }
}