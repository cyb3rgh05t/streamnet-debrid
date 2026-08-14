package com.arflix.tv.data.repository

import com.arflix.tv.data.model.MediaType
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import java.util.concurrent.atomic.AtomicLong
import javax.inject.Inject
import javax.inject.Singleton

sealed interface ContinueWatchingUpdate {
    val profileId: String

    data class Upsert(
        override val profileId: String,
        val item: ContinueWatchingItem
    ) : ContinueWatchingUpdate

    data class Remove(
        override val profileId: String,
        val mediaType: MediaType?,
        val tmdbId: Int,
        val season: Int?,
        val episode: Int?
    ) : ContinueWatchingUpdate
}

/** In-process updates keep Home in sync without polling Trakt during playback. */
@Singleton
class ContinueWatchingUpdates @Inject constructor() {
    private val revisionCounter = AtomicLong(0L)
    private val _updates = MutableSharedFlow<ContinueWatchingUpdate>(
        extraBufferCapacity = 32,
        onBufferOverflow = BufferOverflow.DROP_OLDEST
    )
    val updates: SharedFlow<ContinueWatchingUpdate> = _updates.asSharedFlow()
    val revision: Long get() = revisionCounter.get()

    fun upsert(profileId: String, item: ContinueWatchingItem) {
        revisionCounter.incrementAndGet()
        _updates.tryEmit(ContinueWatchingUpdate.Upsert(profileId, item))
    }

    fun remove(
        profileId: String,
        mediaType: MediaType?,
        tmdbId: Int,
        season: Int?,
        episode: Int?
    ) {
        revisionCounter.incrementAndGet()
        _updates.tryEmit(
            ContinueWatchingUpdate.Remove(
                profileId = profileId,
                mediaType = mediaType,
                tmdbId = tmdbId,
                season = season,
                episode = episode
            )
        )
    }
}
