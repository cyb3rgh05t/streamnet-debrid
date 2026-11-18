package com.arflix.tv.data.repository

import org.junit.Assert.assertEquals
import org.junit.Test

class StreamingRegionTest {
    @Test
    fun `automatic region follows the country of the content language`() {
        assertEquals("DE", effectiveStreamingRegion(STREAMING_REGION_AUTO, "de-DE"))
        assertEquals("CH", effectiveStreamingRegion(null, "de-CH"))
        assertEquals("BR", effectiveStreamingRegion("", "pt-BR"))
        assertEquals("US", effectiveStreamingRegion(STREAMING_REGION_AUTO, "en"))
    }

    @Test
    fun `explicit region wins and invalid values fall back to automatic`() {
        assertEquals("AT", effectiveStreamingRegion("at", "en-US"))
        assertEquals(STREAMING_REGION_AUTO, normalizeStreamingRegionSetting("ZZ"))
        assertEquals("DE", effectiveStreamingRegion("ZZ", "de-DE"))
    }
}
