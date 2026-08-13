package com.arflix.tv.ui.screens.tv.live

import com.arflix.tv.data.repository.IptvConfig

/**
 * Which guide sources a playlist can actually use.
 *
 * These rules decide whether the full-guide backfill runs, and they behave very
 * differently per source type, so they live here rather than inline in
 * TvViewModel where they could only be checked on a device.
 */
object LiveTvGuideSources {

    /** Channel count above which a playlist takes the paged/low-work code paths. */
    const val LARGE_LIST_CHANNEL_COUNT: Int = 10_000

    /**
     * Whether an explicit XMLTV guide URL is configured.
     *
     * Deliberately narrower than "has any EPG source": Xtream credentials also
     * yield a guide, but only through one HTTP call per channel, which is what
     * makes the backfill unaffordable on a huge playlist. An XMLTV source is a
     * single file, parsed with SAX and keeping only now/next/recent per channel,
     * so its cost tracks the channel count rather than the programme count.
     */
    fun hasXmltvSource(config: IptvConfig): Boolean {
        if (config.epgUrl.isNotBlank()) return true
        return config.playlists.any { playlist ->
            playlist.enabled &&
                (playlist.epgUrl.isNotBlank() || playlist.epgUrls.any { it.isNotBlank() })
        }
    }

    /**
     * Whether the on-device full-guide backfill may run.
     *
     * Large playlists skip it, because the Xtream path fans out into thousands
     * of requests. That guard used to apply to XMLTV too — and since the
     * "loads on demand" fallback (refreshEpgForChannels) skips every channel
     * without Xtream credentials, a large plain-M3U playlist ended up with no
     * guide at all, no matter how long it was left running. XMLTV is bounded,
     * so it is allowed through.
     */
    fun allowsFullGuideBackfill(config: IptvConfig, channelCount: Int): Boolean {
        if (channelCount < LARGE_LIST_CHANNEL_COUNT) return true
        return hasXmltvSource(config)
    }
}
