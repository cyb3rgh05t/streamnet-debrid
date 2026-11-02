package com.arflix.tv.util

import java.time.Instant
import java.time.format.DateTimeParseException

internal const val STALE_PUSH_GRACE_MS = 10_000L

// `serverClockOffsetMs` is the estimated server clock minus the device clock.
internal fun isLocalPlaybackNewer(
    localUpdatedAtMs: Long,
    remoteUpdatedAt: String?,
    remotePausedAt: String?,
    serverClockOffsetMs: Long = 0L,
): Boolean {
    fun epoch(value: String?): Long = try {
        value?.takeIf { it.isNotBlank() }?.let { Instant.parse(it).toEpochMilli() } ?: 0L
    } catch (error: DateTimeParseException) {
        AppLogger.w("PlaybackProgress", "Invalid remote playback timestamp")
        0L
    }
    return localUpdatedAtMs > 0L &&
        localUpdatedAtMs + serverClockOffsetMs >= maxOf(epoch(remoteUpdatedAt), epoch(remotePausedAt))
}

// A cloud entry written after this playback session started was written by another device,
// unless it is the result of one of our own earlier pushes in the same session.
internal fun isStalePush(
    cloudUpdatedAtMs: Long,
    sessionStartMs: Long,
    ownLastPushUpdatedAtMs: Long,
    serverClockOffsetMs: Long = 0L,
): Boolean =
    cloudUpdatedAtMs > sessionStartMs + serverClockOffsetMs + STALE_PUSH_GRACE_MS &&
        cloudUpdatedAtMs > ownLastPushUpdatedAtMs

data class EpisodePointer(val season: Int, val episode: Int)

data class EpisodeProgressSnapshot(
    val season: Int,
    val episode: Int,
    val completed: Boolean
)

data class WatchedEpisodeSnapshot(
    val season: Int,
    val episode: Int,
    val watchedAt: String?
)

data class InProgressSnapshot(
    val season: Int,
    val episode: Int,
    val progress: Float,
    val updatedAt: String?
)

object ContinueWatchingSelector {
    fun selectInProgressEpisode(
        inProgress: List<InProgressSnapshot>,
        watched: Set<EpisodePointer>,
        completionThreshold: Float
    ): EpisodePointer? {
        return inProgress
            .filter { it.progress > 0f && it.progress < completionThreshold }
            .filterNot { watched.contains(EpisodePointer(it.season, it.episode)) }
            .maxByOrNull { it.updatedAt ?: "" }
            ?.let { EpisodePointer(it.season, it.episode) }
    }

    fun selectNextEpisodeAfterLastWatched(
        episodes: List<EpisodeProgressSnapshot>,
        watched: Set<EpisodePointer>,
        lastWatched: WatchedEpisodeSnapshot?,
        includeSpecials: Boolean
    ): EpisodePointer? {
        val ordered = episodes
            .filter { includeSpecials || it.season != 0 }
            .sortedWith(compareBy({ it.season }, { it.episode }))

        if (ordered.isEmpty()) return null

        val lastIndex = lastWatched?.let { watchedEpisode ->
            ordered.indexOfFirst { it.season == watchedEpisode.season && it.episode == watchedEpisode.episode }
        } ?: -1

        val startIndex = if (lastIndex >= 0) lastIndex + 1 else 0

        for (i in startIndex until ordered.size) {
            val episode = ordered[i]
            val key = EpisodePointer(episode.season, episode.episode)
            if (!episode.completed && !watched.contains(key)) {
                return key
            }
        }

        return null
    }
}
