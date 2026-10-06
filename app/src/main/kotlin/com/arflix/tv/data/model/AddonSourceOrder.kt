package com.arflix.tv.data.model

internal fun StreamSource.isStreamNetNzbSource(): Boolean =
    addonId.equals("com.usenet.streamer", ignoreCase = true) ||
        addonName.substringBefore(" - ").trim().equals("StreamNet NZB", ignoreCase = true)

internal fun StreamSource.isNzbSmartPlay(): Boolean =
    isStreamNetNzbSource() && listOfNotNull(rawLabel, addonTitle, source)
        .any { Regex("""\bsmart\s*play\b""", RegexOption.IGNORE_CASE).containsMatchIn(it) }

internal fun compareNzbSourceOrder(a: StreamSource, b: StreamSource): Int =
    compareValues(if (a.isNzbSmartPlay()) 0 else 1, if (b.isNzbSmartPlay()) 0 else 1)
        .takeIf { it != 0 } ?: compareValues(a.addonSourceOrder ?: Int.MAX_VALUE, b.addonSourceOrder ?: Int.MAX_VALUE)

internal fun nzbAutoplayCandidates(ranked: List<StreamSource>): List<StreamSource> {
    val candidates = ranked.filterNot { it.isNzbSmartPlay() }
    val queues = candidates.filter { it.isStreamNetNzbSource() }
        .groupBy { it.addonId }
        .mapValues { (_, streams) -> streams.sortedWith(::compareNzbSourceOrder).iterator() }
    return candidates.map { stream ->
        if (stream.isStreamNetNzbSource()) queues.getValue(stream.addonId).next() else stream
    }
}
