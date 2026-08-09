package com.arflix.tv.data.repository

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for the pure HubCloud/HubDrive URL classification and link-selection
 * logic that backs the playback resolver (PR #528 review follow-up).
 */
class HubCloudResolverTest {

    // --- registrableLabel ---------------------------------------------------

    @Test
    fun `registrable label is the second-level domain`() {
        assertEquals("hubcloud", registrableLabel("hubcloud.cx"))
        assertEquals("hubcloud", registrableLabel("hubcloud.ist"))
        assertEquals("hubcloud", registrableLabel("pixel.hubcloud.cx"))
        assertEquals("gamerxyt", registrableLabel("gamerxyt.com"))
        assertEquals("evil", registrableLabel("hubcloud.evil.com"))
    }

    @Test
    fun `gated host label rejects substring look-alikes`() {
        assertEquals("hubcloud", gatedHubHostLabel("hubcloud.cx"))
        assertEquals("hubcloud", gatedHubHostLabel("pixel.hubcloud.cx"))
        assertEquals("hubdrive", gatedHubHostLabel("www.hubdrive.dev"))
        assertNull(gatedHubHostLabel("hubcloud.evil.com"))
        assertNull(gatedHubHostLabel("not-hubcloud.com"))
    }

    // --- isHubCloudPageUrl --------------------------------------------------

    @Test
    fun `hubcloud drive and video pages are resolvable`() {
        assertTrue(isHubCloudPageUrl("https://hubcloud.cx/drive/abc123"))
        assertTrue(isHubCloudPageUrl("https://hubcloud.ist/video/xyz"))
        assertTrue(isHubCloudPageUrl("https://hubdrive.dev/file/def"))
        assertTrue(isHubCloudPageUrl("https://hubcloud.cx/drive/abc123|Referer=https%3A%2F%2Fhubcloud.cx"))
    }

    @Test
    fun `look-alike domain is not treated as hubcloud`() {
        assertFalse(isHubCloudPageUrl("https://hubcloud.evil.com/drive/abc123"))
        assertFalse(isHubCloudPageUrl("https://nothubcloud.com/drive/abc123"))
    }

    @Test
    fun `direct file endpoint on hubcloud domain is left as-is`() {
        // pixel.hubcloud.cx is a real direct endpoint (no drive/video path) — must
        // not be sent back through the page resolver.
        assertFalse(isHubCloudPageUrl("https://pixel.hubcloud.cx/?id=deadbeef"))
    }

    @Test
    fun `unrelated hosts are not hubcloud pages`() {
        assertFalse(isHubCloudPageUrl("https://example.com/drive/abc"))
        assertFalse(isHubCloudPageUrl("not a url"))
    }

    // --- isEmbeddedLinkLandingHost -----------------------------------------

    @Test
    fun `landing hosts are recognised by exact label`() {
        assertTrue(isEmbeddedLinkLandingHost("https://gamerxyt.com/hubcloud.php?id=1"))
        assertTrue(isEmbeddedLinkLandingHost("https://gamerxyt.com/dl.php?link=x"))
        assertTrue(isEmbeddedLinkLandingHost("https://hubcloud.cx/drive/admin"))
    }

    @Test
    fun `arbitrary proxy url with link param is not unwrapped`() {
        // The whole point of the gate: a legitimate proxy/auth URL that merely
        // carries ?url=/?link= must not be classified as a landing page.
        assertFalse(isEmbeddedLinkLandingHost("https://myproxy.example.com/stream?url=https://cdn/x.mkv"))
        assertFalse(isEmbeddedLinkLandingHost("https://hubcloud.evil.com/go?link=https://cdn/x.mkv"))
        assertFalse(isEmbeddedLinkLandingHost("https://any.host.example/dl.php?link=https://cdn/x.mkv"))
        assertFalse(isEmbeddedLinkLandingHost("https://hubcloud.evil.com/dl.php?link=https://cdn/x.mkv"))
    }

    // --- pickHubCloudDirectLink --------------------------------------------

    @Test
    fun `r2 signed link wins over fsl and pixel`() {
        val hrefs = listOf(
            "https://pixel.hubcloud.cx/?id=abc",
            "https://fsl.gigabytes.icu/movie.mkv?token=abc",
            "https://x.r2.cloudflarestorage.com/hub2/y?X-Amz-Signature=z"
        )
        assertEquals("https://x.r2.cloudflarestorage.com/hub2/y?X-Amz-Signature=z", pickHubCloudDirectLink(hrefs))
    }

    @Test
    fun `fsl chosen when no r2 present`() {
        val hrefs = listOf(
            "https://pixel.hubcloud.cx/?id=abc",
            "https://fsl.gigabytes.icu/movie.mkv?token=abc"
        )
        assertEquals("https://fsl.gigabytes.icu/movie.mkv?token=abc", pickHubCloudDirectLink(hrefs))
    }

    @Test
    fun `nav and junk links yield no direct link`() {
        val hrefs = listOf(
            "https://hubcloud.cx/drive/admin",
            "https://t.me/hubcloudreport",
            "https://one.one.one.one/"
        )
        assertNull(pickHubCloudDirectLink(hrefs))
    }

    // --- redactUrlForLog ----------------------------------------------------

    @Test
    fun `redaction strips query string with its tokens`() {
        assertEquals(
            "https://x.r2.cloudflarestorage.com/hub2/y?…",
            redactUrlForLog("https://x.r2.cloudflarestorage.com/hub2/y?X-Amz-Signature=secret&X-Amz-Expires=28800")
        )
    }

    @Test
    fun `redaction keeps a url without query untouched`() {
        assertEquals("https://hubcloud.cx/drive/abc", redactUrlForLog("https://hubcloud.cx/drive/abc"))
        assertEquals("", redactUrlForLog(null))
        assertEquals("", redactUrlForLog("   "))
    }
}
