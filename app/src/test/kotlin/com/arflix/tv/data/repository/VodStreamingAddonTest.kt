package com.arflix.tv.data.repository

import com.arflix.tv.data.model.Addon
import com.arflix.tv.data.model.AddonManifest
import com.arflix.tv.data.model.AddonResource
import com.arflix.tv.data.model.AddonType
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class VodStreamingAddonTest {
    @Test
    fun `collection-only addons never enter addon settings`() {
        val ids = listOf(
            "com.cyb3rgh05t.marveladdon.custom.marvel-mcu",
            "com.cyb3rgh05t.marveladdon.custom.marvel-mcu.movies.series",
            "com.joaogonp.marveladdon.custom.marvel-mcu.movies.series",
            "com.cyb3rgh05t.dcaddon.custom.dc-chronological",
            "com.cyb3rgh05t.starwarsaddon.custom.sw-movies-series-chronological",
        )

        ids.forEach { manifestId ->
            assertThat(
                isCollectionOnlyAddon(addon(id = "${manifestId}_abcdef", manifestId = manifestId))
            ).isTrue()
        }
        assertThat(
            isCollectionOnlyAddon(
                addon(
                    id = "new-marvel-addon-id",
                    manifestId = "new-marvel-addon-id",
                    url = "https://marvel.mystreamnet.club/catalog/marvel-mcu/manifest.json"
                )
            )
        ).isTrue()
        assertThat(isCollectionOnlyAddon(addon())).isFalse()
    }

    @Test
    fun `enabled movie stream addon counts as VOD`() {
        assertThat(isEnabledVodStreamingAddon(addon())).isTrue()
    }

    @Test
    fun `subtitle and disabled addons do not count as VOD`() {
        assertThat(isEnabledVodStreamingAddon(addon(type = AddonType.SUBTITLE))).isFalse()
        assertThat(isEnabledVodStreamingAddon(addon(enabled = false))).isFalse()
    }

    @Test
    fun `live only stream addon does not count as VOD`() {
        assertThat(isEnabledVodStreamingAddon(addon(resourceTypes = listOf("tv", "channel")))).isFalse()
    }

    @Test
    fun `fresh profile starts IPTV only until first VOD addon appears`() {
        val fresh = reconcileIptvOnlyAddonState(null, hasSeenVodAddon = false, hasVodAddon = false)
        assertThat(fresh.enabled).isTrue()
        assertThat(fresh.enabledChanged).isTrue()

        val withVod = reconcileIptvOnlyAddonState(
            currentEnabled = fresh.enabled,
            hasSeenVodAddon = fresh.hasSeenVodAddon,
            hasVodAddon = true,
        )
        assertThat(withVod.enabled).isFalse()
        assertThat(withVod.hasSeenVodAddon).isTrue()
    }

    @Test
    fun `manual IPTV only choice is preserved after VOD transition was handled`() {
        val reconciled = reconcileIptvOnlyAddonState(
            currentEnabled = true,
            hasSeenVodAddon = true,
            hasVodAddon = true,
        )

        assertThat(reconciled.enabled).isTrue()
        assertThat(reconciled.enabledChanged).isFalse()
    }

    private fun addon(
        id: String = "test-addon",
        manifestId: String = id,
        type: AddonType = AddonType.CUSTOM,
        enabled: Boolean = true,
        resourceTypes: List<String> = listOf("movie", "series"),
        url: String? = null,
    ) = Addon(
        id = id,
        name = "Test Addon",
        version = "1.0.0",
        description = "",
        isInstalled = true,
        isEnabled = enabled,
        type = type,
        url = url,
        manifest = AddonManifest(
            id = manifestId,
            name = "Test Addon",
            version = "1.0.0",
            resources = listOf(AddonResource("stream", resourceTypes)),
        ),
    )
}