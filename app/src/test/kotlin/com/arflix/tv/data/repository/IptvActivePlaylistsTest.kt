package com.arflix.tv.data.repository

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class IptvActivePlaylistsTest {
    private fun newRepository(): IptvRepository = IptvRepository(
        context = io.mockk.mockk(relaxed = true),
        okHttpClient = io.mockk.mockk(relaxed = true),
        profileManager = io.mockk.mockk(relaxed = true),
        invalidationBus = io.mockk.mockk(relaxed = true)
    )

    @Test
    fun `disabled playlists do not fall back to legacy url`() {
        val repository = newRepository()
        val config = IptvConfig(
            m3uUrl = "https://example.com/legacy.m3u",
            playlists = listOf(
                IptvPlaylistEntry(
                    id = "playlist-1",
                    name = "Disabled",
                    m3uUrl = "https://example.com/current.m3u",
                    enabled = false
                )
            )
        )

        assertTrue(repository.activePlaylists(config).isEmpty())
    }

    @Test
    fun `legacy url remains available before playlist entries exist`() {
        val repository = newRepository()
        val config = IptvConfig(
            m3uUrl = "https://example.com/legacy.m3u",
            epgUrl = "https://example.com/guide.xml"
        )

        val active = repository.activePlaylists(config)

        assertEquals(1, active.size)
        assertEquals("https://example.com/legacy.m3u", active.single().m3uUrl)
        assertEquals(listOf("https://example.com/guide.xml"), active.single().epgUrls)
    }

    @Test
    fun `blank protected preset does not hide legacy url`() {
        val repository = newRepository()
        val config = IptvConfig(
            m3uUrl = "https://example.com/legacy.m3u",
            playlists = ensureStreamNetTvPreset(emptyList())
        )

        val active = repository.activePlaylists(config)

        assertEquals(1, active.size)
        assertEquals("https://example.com/legacy.m3u", active.single().m3uUrl)
    }

    @Test
    fun `legacy playlist json defaults missing import flags to enabled`() {
        val decoded = decodePlaylistJsonCompat(
            """[{"id":"legacy","name":"Legacy","m3uUrl":"https://example.com/list.m3u"}]"""
        )

        assertEquals(1, decoded.size)
        assertTrue(decoded.single().importLiveTv)
        assertTrue(decoded.single().importVod)
        assertTrue(decoded.single().importSeries)
    }

    @Test
    fun `playlist json preserves explicitly disabled import flags`() {
        val decoded = decodePlaylistJsonCompat(
            """[{"id":"current","name":"Current","m3uUrl":"https://example.com/list.m3u","importLiveTv":false,"importVod":false,"importSeries":false}]"""
        )

        assertEquals(1, decoded.size)
        assertTrue(!decoded.single().importLiveTv)
        assertTrue(!decoded.single().importVod)
        assertTrue(!decoded.single().importSeries)
    }

    @Test
    fun `vod and series imports are filtered independently`() {
        val repository = newRepository()
        val vodOnly = IptvPlaylistEntry(
            id = "vod",
            name = "VOD",
            m3uUrl = "https://example.com/vod.m3u",
            importLiveTv = false,
            importVod = true,
            importSeries = false
        )
        val seriesOnly = IptvPlaylistEntry(
            id = "series",
            name = "Series",
            m3uUrl = "https://example.com/series.m3u",
            importLiveTv = false,
            importVod = false,
            importSeries = true
        )
        val config = IptvConfig(playlists = listOf(vodOnly, seriesOnly))

        assertEquals(listOf(vodOnly), repository.activeVodPlaylists(config))
        assertEquals(listOf(seriesOnly), repository.activeSeriesPlaylists(config))
    }

    @Test
    fun `disabled playlists are excluded from every import type`() {
        val repository = newRepository()
        val disabled = IptvPlaylistEntry(
            id = "disabled",
            name = "Disabled",
            m3uUrl = "https://example.com/all.m3u",
            enabled = false
        )
        val config = IptvConfig(m3uUrl = disabled.m3uUrl, playlists = listOf(disabled))

        assertTrue(repository.activePlaylists(config).isEmpty())
        assertTrue(repository.activeVodPlaylists(config).isEmpty())
        assertTrue(repository.activeSeriesPlaylists(config).isEmpty())
    }
}