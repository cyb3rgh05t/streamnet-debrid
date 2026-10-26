package com.arflix.tv.network

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class RequestHeadersTest {
    @Test
    fun overridesReplaceBaseHeadersIgnoringCase() {
        val merged = mergeRequestHeaders(
            base = mapOf("Accept" to "*/*", "User-Agent" to "VLC/3.0.20 LibVLC/3.0.20"),
            overrides = mapOf("user-agent" to "AddonAgent/1.0", "Referer" to "https://example.test"),
        )

        assertThat(merged.keys.count { it.equals("User-Agent", ignoreCase = true) }).isEqualTo(1)
        assertThat(merged.entries.single { it.key.equals("user-agent", ignoreCase = true) }.value)
            .isEqualTo("AddonAgent/1.0")
        assertThat(merged["Accept"]).isEqualTo("*/*")
        assertThat(merged["Referer"]).isEqualTo("https://example.test")
    }

    @Test
    fun iptvUserAgentKeepsVlcTokensAndAddsAppNameAndVersion() {
        assertThat(IPTV_USER_AGENT).startsWith("VLC/3.0.20 LibVLC/3.0.20 ")
        assertThat(IPTV_USER_AGENT).contains("StreamNet/")
        assertThat(IPTV_USER_AGENT).endsWith(com.arflix.tv.BuildConfig.VERSION_NAME)
    }

    @Test
    fun withoutOverridesTheBaseIsKeptAsIs() {
        val base = mapOf("User-Agent" to "VLC/3.0.20 LibVLC/3.0.20", "Connection" to "keep-alive")

        assertThat(mergeRequestHeaders(base)).isEqualTo(base)
    }
}
