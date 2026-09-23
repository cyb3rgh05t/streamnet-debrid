package com.arflix.tv.data.repository

import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class WatchlistMergeTest {

    @Test
    fun remoteMergePreservesLocalOnlyItemsAndUsesNewerRemoteDetails() {
        val localOnly = LocalWatchlistItem(
            tmdbId = 10,
            mediaType = "movie",
            title = "Local only",
            addedAt = 2_000L
        )
        val sharedLocal = LocalWatchlistItem(
            tmdbId = 20,
            mediaType = "tv",
            title = "Old title",
            addedAt = 1_000L
        )
        val remoteShared = MediaItem(
            id = 20,
            title = "Tracker title",
            mediaType = MediaType.TV,
            addedAt = 3_000L
        )

        val merged = mergeRemoteWatchlistItems(
            localItems = listOf(localOnly, sharedLocal),
            remoteItems = listOf(remoteShared),
            now = 4_000L
        )

        assertThat(merged.map { "${it.mediaType}:${it.tmdbId}" })
            .containsExactly("tv:20", "movie:10")
            .inOrder()
        assertThat(merged.first().title).isEqualTo("Tracker title")
        assertThat(merged.first().addedAt).isEqualTo(3_000L)
    }
}