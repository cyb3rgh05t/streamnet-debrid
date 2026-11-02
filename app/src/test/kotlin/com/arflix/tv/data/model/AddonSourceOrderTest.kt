package com.arflix.tv.data.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AddonSourceOrderTest {
    @Test
    fun currentManifestIdPreservesOrderEvenWithResolutionInAddonName() {
        val first = nzb(0).copy(addonId = "com.streamnet.nzb", addonName = "StreamNet NZB 1080p", size = "8 GB")
        val second = first.copy(addonSourceOrder = 1, size = "50 GB", quality = "2160p")
        assertTrue(first.isStreamNetNzbSource())
        assertEquals(listOf(first, second), listOf(second, first).sortedWith(::compareNzbSourceOrder))
        assertEquals(listOf(first, second), nzbAutoplayCandidates(listOf(second, first)))
    }

    @Test
    fun vodAndSmartPlayPrecedeOtherAddonsRegardlessOfInstalledAddonOrder() {
        val other = nzb(0).copy(addonId = "other", addonName = "Other")
        val release = nzb(0)
        val smart = nzb(5, "Smart Play").copy(addonId = "com.streamnet.nzb", addonName = "StreamNet NZB 1080p")
        val vod = other.copy(addonId = "iptv_xtream_vod")
        assertTrue(smart.isNzbSmartPlay())
        assertEquals(listOf(vod, smart, other, release),
            listOf(other, release, smart, vod).sortedBy { it.sourceListPriority() })
    }

    private fun nzb(order: Int?, label: String = "Release") = StreamSource(
        source = label, addonName = "StreamNet NZB - NZB", addonId = "com.usenet.streamer",
        quality = "1080p", size = "1 GB", url = "https://example.test/release",
        addonSourceOrder = order, rawLabel = label
    )

    @Test
    fun manualOrderKeepsSmartPlayFirstAndAddonPriorityOverSize() {
        val smart = nzb(0, "Smart Play").copy(quality = "Unknown", size = "")
        val preferred = nzb(1)
        val larger = nzb(2).copy(size = "23 GB")
        assertEquals(listOf(smart, preferred, larger),
            listOf(larger, preferred, smart).sortedWith(::compareNzbSourceOrder))
    }

    @Test
    fun autoplaySkipsSmartPlayAndRestoresConcreteOrderWithoutMovingOtherAddons() {
        val other = nzb(0).copy(addonId = "other", addonName = "Other")
        val first = nzb(1)
        val second = nzb(2)
        val smart = nzb(0, "Smart Play")
        assertEquals(listOf(first, other, second),
            nzbAutoplayCandidates(listOf(second, other, smart, first)))
        assertTrue(nzbAutoplayCandidates(listOf(smart)).isEmpty())
        assertFalse(other.isNzbSmartPlay())
    }

    @Test
    fun removedReleaseDoesNotRewindOrderAndLegacyEntriesKeepArrivalOrder() {
        assertEquals(listOf(nzb(2), nzb(3)), nzbAutoplayCandidates(listOf(nzb(3), nzb(2))))
        val a = nzb(null, "First")
        val b = nzb(null, "Second")
        assertEquals(listOf(a, b), nzbAutoplayCandidates(listOf(a, b)))
    }

    @Test
    fun smartPlayDetectionIsRestrictedToNzbAddonAndUsesRawName() {
        assertTrue(nzb(0).copy(rawLabel = "StreamNet NZB\nSmart Play").isNzbSmartPlay())
        assertFalse(nzb(0, "Smart Play").copy(addonId = "other", addonName = "Other").isNzbSmartPlay())
    }
}
