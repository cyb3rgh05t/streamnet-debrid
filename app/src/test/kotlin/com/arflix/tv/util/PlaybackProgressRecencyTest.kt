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

    @Test
    fun `server clock ahead of the device does not make stale cloud progress win`() {
        val serverAheadMs = 5 * 60_000L
        assertFalse(isLocalPlaybackNewer(now, "2026-10-30T14:33:00Z", null))
        assertTrue(isLocalPlaybackNewer(now, "2026-10-30T14:33:00Z", null, serverAheadMs))
        assertFalse(isLocalPlaybackNewer(now, "2026-10-30T14:36:00Z", null, serverAheadMs))
    }

    @Test
    fun `own earlier push in the same session is not a stale push`() {
        val sessionStart = now
        val firstPush = sessionStart + 60_000L
        assertTrue(isStalePush(firstPush, sessionStart, ownLastPushUpdatedAtMs = 0L))
        assertFalse(isStalePush(firstPush, sessionStart, ownLastPushUpdatedAtMs = firstPush))
    }

    @Test
    fun `write from another device after our last push is still rejected`() {
        val sessionStart = now
        val ownPush = sessionStart + 60_000L
        assertTrue(isStalePush(ownPush + 30_000L, sessionStart, ownLastPushUpdatedAtMs = ownPush))
    }

    @Test
    fun `cloud entry from before the session or within grace is accepted`() {
        assertFalse(isStalePush(now - 3_600_000L, now, 0L))
        assertFalse(isStalePush(now + 9_000L, now, 0L))
    }

    @Test
    fun `server clock offset shifts the session start used for stale detection`() {
        val serverAheadMs = 5 * 60_000L
        val cloudWrittenBeforeSession = now + serverAheadMs - 30_000L
        assertTrue(isStalePush(cloudWrittenBeforeSession, now, 0L))
        assertFalse(isStalePush(cloudWrittenBeforeSession, now, 0L, serverAheadMs))
    }
}
