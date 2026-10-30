package com.arflix.tv.util

import java.time.Instant
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PlaybackProgressRecencyTest {
    private val now = Instant.parse("2026-10-30T14:30:00Z").toEpochMilli()

    @Test
    fun `newer local playback wins even after rewinding or replaying an older episode`() {
        assertTrue(isLocalPlaybackNewer(now, "2026-10-30T14:29:00Z", null))
    }

    @Test
    fun `newer cloud progress from another device is not overridden`() {
        assertFalse(isLocalPlaybackNewer(now, "2026-10-30T14:31:00Z", null))
        assertFalse(isLocalPlaybackNewer(now, "2026-10-30T14:29:00Z", "2026-10-30T14:31:00Z"))
    }

    @Test
    fun `missing remote timestamps prefer timestamped local progress`() {
        assertTrue(isLocalPlaybackNewer(now, null, null))
        assertFalse(isLocalPlaybackNewer(0L, null, null))
    }
}
