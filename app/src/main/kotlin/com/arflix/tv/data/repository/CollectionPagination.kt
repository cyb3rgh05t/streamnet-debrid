package com.arflix.tv.data.repository

internal fun collectionPageProbeCount(offset: Int, limit: Int): Int =
    (offset.toLong() + limit + 1).coerceAtMost(Int.MAX_VALUE.toLong()).toInt()

internal fun collectionPageNextOffset(offset: Int, consumedRefs: Int): Int =
    offset + consumedRefs
