package com.arflix.tv.data.repository

import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.provider.BaseColumns
import androidx.annotation.RequiresApi
import androidx.tvprovider.media.tv.Channel
import androidx.tvprovider.media.tv.ChannelLogoUtils
import androidx.tvprovider.media.tv.PreviewProgram
import androidx.tvprovider.media.tv.TvContractCompat
import androidx.tvprovider.media.tv.WatchNextProgram
import com.arflix.tv.MainActivity
import com.arflix.tv.R
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.model.SportsAddonCapabilities
import com.arflix.tv.navigation.Screen
import com.arflix.tv.util.AppLogger
import com.arflix.tv.util.Constants
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

data class LauncherContinueWatchingRequest(
    val mediaType: MediaType,
    val mediaId: Int,
    val season: Int? = null,
    val episode: Int? = null,
    val startPositionMs: Long? = null
)

internal fun launcherPublishingItems(items: List<ContinueWatchingItem>): List<ContinueWatchingItem> =
    items.distinctBy { listOf(it.mediaType.name, it.id, it.season, it.episode) }
        .take(Constants.MAX_CONTINUE_WATCHING)

internal fun launcherEngagementTime(baseTimeMs: Long, index: Int): Long =
    baseTimeMs - index * 1000L

internal data class LauncherPlayback(val durationMs: Int, val positionMs: Int)

internal fun ContinueWatchingItem.launcherPlayback(): LauncherPlayback {
    val duration = durationSeconds.coerceIn(0L, Int.MAX_VALUE / 1000L) * 1000L
    val position = when {
        isUpNext -> 0L
        resumePositionSeconds > 0L -> resumePositionSeconds.coerceAtMost(Int.MAX_VALUE / 1000L) * 1000L
        progress > 5 -> duration * progress.coerceIn(0, 100) / 100L
        else -> 0L
    }
    return LauncherPlayback(
        duration.toInt(),
        (if (duration > 0L) position.coerceAtMost(duration) else position).toInt()
    )
}

@Singleton
class LauncherContinueWatchingRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val profileManager: ProfileManager,
    private val traktRepository: TraktRepository,
    private val remoteSyncManager: com.arflix.tv.data.repository.sync.RemoteSyncManager,
    private val watchHistoryRepository: WatchHistoryRepository,
    private val streamRepository: StreamRepository
) {
    companion object {
        private const val TAG = "LauncherCW"
        private const val CHANNEL_INTERNAL_ID = "arvio_continue_watching_channel"
        private const val PREVIEW_PROGRAM_PREFIX = "arvio_continue_preview"
        private const val WATCH_NEXT_PROGRAM_PREFIX = "arvio_continue_watchnext"
        private const val URI_SCHEME = "arvio"
        private const val URI_HOST = "continue"
    }

    private val publishMutex = Mutex()

    suspend fun refreshForCurrentProfile() = publishMutex.withLock {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || !supportsLauncherPublishing()) return@withLock

        val activeProfileId = runCatching { profileManager.getProfileIdSync() }.getOrDefault("")
        if (activeProfileId.isBlank()) {
            clearPublishedProgramsLocked()
            return@withLock
        }

        val items = launcherPublishingItems(loadPublisherItems())
        if (profileManager.getProfileIdSync() != activeProfileId) return@withLock
        withContext(Dispatchers.IO) {
            runTvProviderCall("refresh launcher continue watching") {
                syncPublishedRows(items)
            }
        }
    }

    suspend fun clearPublishedPrograms() = publishMutex.withLock {
        clearPublishedProgramsLocked()
    }

    private suspend fun clearPublishedProgramsLocked() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || !supportsLauncherPublishing()) return
        withContext(Dispatchers.IO) {
            runTvProviderCall("clear launcher continue watching") {
                val channelId = findExistingChannelId()
                if (channelId != null) {
                    deletePreviewPrograms(channelId)
                }
                deleteWatchNextPrograms()
            }
        }
    }

    private fun supportsLauncherPublishing(): Boolean {
        val pm = context.packageManager
        val hasTvFeature = pm.hasSystemFeature(android.content.pm.PackageManager.FEATURE_LEANBACK) ||
            pm.hasSystemFeature(android.content.pm.PackageManager.FEATURE_TELEVISION)
        if (!hasTvFeature) return false

        // Extra hardening: some phones/ROMs can expose odd feature combinations.
        // Only publish launcher channels if the TV provider authority actually exists.
        return runCatching {
            context.packageManager.resolveContentProvider("android.media.tv", 0) != null
        }.getOrDefault(false)
    }

    private suspend fun loadPublisherItems(): List<ContinueWatchingItem> {
        val installedAddons = streamRepository.installedAddons.first()
        val primaryItems = runCatching { remoteSyncManager.getContinueWatching() }.getOrDefault(emptyList())
        val filteredPrimary = primaryItems.filterNot { item ->
            SportsAddonCapabilities.isLiveStreamOrSportsItem(
                mediaType = item.mediaType,
                id = item.id,
                streamAddonId = item.streamAddonId,
                title = item.title,
                addons = installedAddons
            )
        }
        if (filteredPrimary.isNotEmpty()) {
            return filteredPrimary
        }

        val historyFallback = runCatching { watchHistoryRepository.getContinueWatching() }.getOrDefault(emptyList())
        return historyFallback
            .sortedByDescending { it.updated_at ?: it.paused_at.orEmpty() }
            .map { entry ->
                ContinueWatchingItem(
                    id = entry.show_tmdb_id,
                    title = entry.title.orEmpty(),
                    mediaType = if (entry.media_type == "tv") MediaType.TV else MediaType.MOVIE,
                    progress = (entry.progress * 100f).toInt().coerceIn(0, 99),
                    season = entry.season,
                    episode = entry.episode,
                    episodeTitle = entry.episode_title,
                    posterPath = entry.poster_path,
                    backdropPath = entry.backdrop_path,
                    resumePositionSeconds = entry.position_seconds,
                    durationSeconds = entry.duration_seconds,
                    streamAddonId = entry.stream_addon_id
                )
            }
            .filterNot { item ->
                SportsAddonCapabilities.isLiveStreamOrSportsItem(
                    mediaType = item.mediaType,
                    id = item.id,
                    streamAddonId = item.streamAddonId,
                    title = item.title,
                    addons = installedAddons
                )
            }
            .distinctBy { "${it.mediaType}:${it.id}:${it.season ?: -1}:${it.episode ?: -1}" }
    }


    @RequiresApi(Build.VERSION_CODES.O)
    private fun syncPublishedRows(items: List<ContinueWatchingItem>) {
        val channelId = ensurePreviewChannel() ?: return
        val engagementTimeMs = System.currentTimeMillis()
        syncPrograms(
            TvContractCompat.PreviewPrograms.CONTENT_URI,
            PREVIEW_PROGRAM_PREFIX,
            items.mapIndexed { index, item -> previewProgramValues(channelId, item, index) }
        )
        syncPrograms(
            TvContractCompat.WatchNextPrograms.CONTENT_URI,
            WATCH_NEXT_PROGRAM_PREFIX,
            items.mapIndexed { index, item -> watchNextProgramValues(item, index, engagementTimeMs) }
        )
    }

    private fun syncPrograms(uri: Uri, prefix: String, programs: List<ContentValues>) {
        val idColumn = TvContractCompat.PreviewPrograms.COLUMN_INTERNAL_PROVIDER_ID
        val existing = mutableMapOf<String, Long>()
        context.contentResolver.query(uri, arrayOf(BaseColumns._ID, idColumn), null, null, null)
            ?.use { cursor ->
                val rowIndex = cursor.getColumnIndexOrThrow(BaseColumns._ID)
                val keyIndex = cursor.getColumnIndexOrThrow(idColumn)
                while (cursor.moveToNext()) {
                    val key = cursor.getString(keyIndex).orEmpty()
                    if (!key.startsWith("$prefix:")) continue
                    val id = cursor.getLong(rowIndex)
                    if (existing.putIfAbsent(key, id) != null) {
                        context.contentResolver.delete(ContentUris.withAppendedId(uri, id), null, null)
                    }
                }
            } ?: error("TV provider returned no cursor for $uri")
        for (values in programs) {
            val key = values.getAsString(idColumn)
            val existingId = existing.remove(key)
            if (existingId == null) {
                checkNotNull(context.contentResolver.insert(uri, values)) { "TV provider insert failed for $key" }
            } else {
                check(context.contentResolver.update(ContentUris.withAppendedId(uri, existingId), values, null, null) == 1) {
                    "TV provider update failed for $key"
                }
            }
        }
        existing.values.forEach { id ->
            context.contentResolver.delete(ContentUris.withAppendedId(uri, id), null, null)
        }
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private fun ensurePreviewChannel(): Long? {
        findExistingChannelId()?.let { return it }

        val channel = Channel.Builder()
            .setType(TvContractCompat.Channels.TYPE_PREVIEW)
            .setDisplayName(context.getString(R.string.continue_watching))
            .setDescription("Resume watching in StreamNet")
            .setInternalProviderId(CHANNEL_INTERNAL_ID)
            .build()

        val channelUri = context.contentResolver.insert(
            TvContractCompat.Channels.CONTENT_URI,
            channel.toContentValues()
        ) ?: return null

        val channelId = ContentUris.parseId(channelUri)
        BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher)?.let { bitmap ->
            runCatching { ChannelLogoUtils.storeChannelLogo(context, channelId, bitmap) }
        }
        runCatching { TvContractCompat.requestChannelBrowsable(context, channelId) }
        return channelId
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private fun previewProgramValues(channelId: Long, item: ContinueWatchingItem, index: Int): ContentValues {
        val posterUri = item.launcherPosterArtUri()
        val thumbnailUri = item.launcherBackdropUri()
        val playback = item.launcherPlayback()
        val program = PreviewProgram.Builder()
            .setChannelId(channelId)
            .setType(item.toPreviewType())
            .setTitle(item.title.ifBlank { context.getString(R.string.continue_watching) })
            .setDescription(item.buildSubtitle())
            .setInternalProviderId(item.previewProgramId())
            .setPosterArtUri(posterUri)
            .setThumbnailUri(thumbnailUri)
            .setPosterArtAspectRatio(TvContractCompat.PreviewPrograms.ASPECT_RATIO_16_9)
            .setThumbnailAspectRatio(TvContractCompat.PreviewPrograms.ASPECT_RATIO_16_9)
            .setDurationMillis(playback.durationMs)
            .setLastPlaybackPositionMillis(playback.positionMs)
            .setIntentUri(buildLaunchIntent(item).toUri(Intent.URI_INTENT_SCHEME).let(Uri::parse))
            .setWeight((Constants.MAX_CONTINUE_WATCHING - index).coerceAtLeast(1))
            .build()

        return program.toContentValues()
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private fun watchNextProgramValues(item: ContinueWatchingItem, index: Int, engagementTimeMs: Long): ContentValues {
        val posterUri = item.launcherPosterArtUri()
        val thumbnailUri = item.launcherBackdropUri()
        val builder = WatchNextProgram.Builder()
            .setType(item.toPreviewType())
            .setTitle(item.title.ifBlank { context.getString(R.string.continue_watching) })
            .setDescription(item.buildSubtitle())
            .setInternalProviderId(item.watchNextProgramId())
            .setIntentUri(buildLaunchIntent(item).toUri(Intent.URI_INTENT_SCHEME).let(Uri::parse))
            .setPosterArtUri(posterUri)
            .setThumbnailUri(thumbnailUri)
            .setPosterArtAspectRatio(TvContractCompat.PreviewPrograms.ASPECT_RATIO_16_9)
            .setThumbnailAspectRatio(TvContractCompat.PreviewPrograms.ASPECT_RATIO_16_9)
            .setWatchNextType(if (item.isUpNext) TvContractCompat.WatchNextPrograms.WATCH_NEXT_TYPE_NEXT
                else TvContractCompat.WatchNextPrograms.WATCH_NEXT_TYPE_CONTINUE)
            .setLastEngagementTimeUtcMillis(launcherEngagementTime(engagementTimeMs, index))
        val playback = item.launcherPlayback()
        builder.setDurationMillis(playback.durationMs)
        builder.setLastPlaybackPositionMillis(playback.positionMs)
        return builder.build().toContentValues()
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private fun deletePreviewPrograms(channelId: Long) {
        val projection = arrayOf(BaseColumns._ID, TvContractCompat.PreviewPrograms.COLUMN_CHANNEL_ID)
        runTvProviderCall("delete preview rows") {
            context.contentResolver.query(
                TvContractCompat.PreviewPrograms.CONTENT_URI,
                projection,
                null,
                null,
                null
            )?.use { cursor ->
                val idIndex = cursor.getColumnIndexOrThrow(BaseColumns._ID)
                val channelIdIndex = cursor.getColumnIndexOrThrow(TvContractCompat.PreviewPrograms.COLUMN_CHANNEL_ID)
                while (cursor.moveToNext()) {
                    if (cursor.getLong(channelIdIndex) != channelId) continue
                    val rowId = cursor.getLong(idIndex)
                    context.contentResolver.delete(
                        ContentUris.withAppendedId(TvContractCompat.PreviewPrograms.CONTENT_URI, rowId),
                        null,
                        null
                    )
                }
            }
        }
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private fun deleteWatchNextPrograms() {
        val projection = arrayOf(BaseColumns._ID, TvContractCompat.WatchNextPrograms.COLUMN_INTERNAL_PROVIDER_ID)
        runTvProviderCall("delete watch-next rows") {
            context.contentResolver.query(
                TvContractCompat.WatchNextPrograms.CONTENT_URI,
                projection,
                null,
                null,
                null
            )?.use { cursor ->
                val idIndex = cursor.getColumnIndexOrThrow(BaseColumns._ID)
                val internalIdIndex = cursor.getColumnIndexOrThrow(TvContractCompat.WatchNextPrograms.COLUMN_INTERNAL_PROVIDER_ID)
                while (cursor.moveToNext()) {
                    val internalId = cursor.getString(internalIdIndex).orEmpty()
                    if (!internalId.startsWith(WATCH_NEXT_PROGRAM_PREFIX)) continue
                    val rowId = cursor.getLong(idIndex)
                    context.contentResolver.delete(
                        ContentUris.withAppendedId(TvContractCompat.WatchNextPrograms.CONTENT_URI, rowId),
                        null,
                        null
                    )
                }
            }
        }
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private fun findExistingChannelId(): Long? {
        val projection = arrayOf(BaseColumns._ID, TvContractCompat.Channels.COLUMN_INTERNAL_PROVIDER_ID)
        return runTvProviderCall("find existing preview channel", null) {
            context.contentResolver.query(
                TvContractCompat.Channels.CONTENT_URI,
                projection,
                null,
                null,
                null
            )?.use { cursor ->
                val idIndex = cursor.getColumnIndexOrThrow(BaseColumns._ID)
                val internalIdIndex = cursor.getColumnIndexOrThrow(TvContractCompat.Channels.COLUMN_INTERNAL_PROVIDER_ID)
                while (cursor.moveToNext()) {
                    if (cursor.getString(internalIdIndex) == CHANNEL_INTERNAL_ID) {
                        return@runTvProviderCall cursor.getLong(idIndex)
                    }
                }
            }
            null
        }
    }

    private fun runTvProviderCall(action: String, block: () -> Unit) {
        runCatching(block).onFailure { error ->
            AppLogger.w(TAG, "Skipping launcher publish action: $action", error)
        }
    }

    private fun <T> runTvProviderCall(action: String, fallback: T, block: () -> T): T {
        return runCatching(block).onFailure { error ->
            AppLogger.w(TAG, "Skipping launcher publish action: $action", error)
        }.getOrDefault(fallback)
    }

    private fun buildLaunchIntent(item: ContinueWatchingItem): Intent {
        val request = LauncherContinueWatchingRequest(
            mediaType = item.mediaType,
            mediaId = item.id,
            season = item.season,
            episode = item.episode,
            startPositionMs = item.resumePositionSeconds.takeIf { it > 0L }?.times(1000L)
        )
        return Intent(Intent.ACTION_VIEW).apply {
            setClass(context, MainActivity::class.java)
            data = request.toUri()
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
    }

    private fun ContinueWatchingItem.toPreviewType(): Int {
        return if (mediaType == MediaType.TV) {
            TvContractCompat.PreviewPrograms.TYPE_TV_EPISODE
        } else {
            TvContractCompat.PreviewPrograms.TYPE_MOVIE
        }
    }

    private fun ContinueWatchingItem.previewProgramId(): String {
        return "$PREVIEW_PROGRAM_PREFIX:${mediaType.name}:${id}:${season ?: -1}:${episode ?: -1}"
    }

    private fun ContinueWatchingItem.watchNextProgramId(): String {
        return "$WATCH_NEXT_PROGRAM_PREFIX:${mediaType.name}:${id}:${season ?: -1}:${episode ?: -1}"
    }

    private fun ContinueWatchingItem.launcherPosterArtUri(): Uri? {
        return launcherBackdropUri()
            ?: posterPath.normalizeLauncherTmdbImageUrl(preferBackdrop = false)
                ?.let(Uri::parse)
    }

    private fun ContinueWatchingItem.launcherBackdropUri(): Uri? {
        return backdropPath.normalizeLauncherTmdbImageUrl(preferBackdrop = true)
            ?.let(Uri::parse)
            ?: posterPath.normalizeLauncherTmdbImageUrl(preferBackdrop = false)
                ?.let(Uri::parse)
    }

    private fun String?.normalizeLauncherTmdbImageUrl(preferBackdrop: Boolean): String? {
        val value = this?.trim().orEmpty()
        if (value.isBlank()) return null

        return when {
            value.startsWith("/") -> {
                val base = if (preferBackdrop) Constants.BACKDROP_BASE_LARGE else Constants.IMAGE_BASE_LARGE
                "$base$value"
            }
            value.startsWith(Constants.BACKDROP_BASE) || value.startsWith(Constants.BACKDROP_BASE_LARGE) -> {
                if (preferBackdrop) {
                    value.substringAfter("/t/p/", missingDelimiterValue = value)
                        .takeIf { it != value }
                        ?.substringAfter('/', missingDelimiterValue = "")
                        ?.takeIf { it.isNotBlank() }
                        ?.let { path -> "${Constants.BACKDROP_BASE_LARGE}/$path" }
                        ?: value
                } else {
                    value
                }
            }
            value.startsWith(Constants.IMAGE_BASE) || value.startsWith(Constants.IMAGE_BASE_LARGE) -> {
                value.substringAfter("/t/p/", missingDelimiterValue = value)
                    .takeIf { it != value }
                    ?.substringAfter('/', missingDelimiterValue = "")
                    ?.takeIf { it.isNotBlank() }
                    ?.let { path ->
                        val base = if (preferBackdrop) Constants.BACKDROP_BASE_LARGE else Constants.IMAGE_BASE_LARGE
                        "$base/$path"
                    }
                    ?: value
            }
            value.startsWith("https://image.tmdb.org/t/p/") -> {
                val path = value.substringAfter("/t/p/").substringAfter('/', missingDelimiterValue = "")
                if (path.isBlank()) {
                    value
                } else {
                    val base = if (preferBackdrop) Constants.BACKDROP_BASE_LARGE else Constants.IMAGE_BASE_LARGE
                    "$base/$path"
                }
            }
            else -> value
        }
    }

    private fun ContinueWatchingItem.buildSubtitle(): String {
        return toMediaItem(context).subtitle.orEmpty()
    }
}

fun LauncherContinueWatchingRequest.toUri(): Uri {
    return Uri.Builder()
        .scheme("arvio")
        .authority("continue")
        .appendPath(mediaType.name.lowercase())
        .appendPath(mediaId.toString())
        .apply {
            season?.let { appendQueryParameter("season", it.toString()) }
            episode?.let { appendQueryParameter("episode", it.toString()) }
            startPositionMs?.let { appendQueryParameter("startPositionMs", it.toString()) }
        }
        .build()
}

fun Uri.toLauncherContinueWatchingRequest(): LauncherContinueWatchingRequest? {
    if (scheme != "arvio" || authority != "continue") return null
    val typeSegment = pathSegments.getOrNull(0) ?: return null
    val mediaId = pathSegments.getOrNull(1)?.toIntOrNull() ?: return null
    val mediaType = if (typeSegment.equals("tv", ignoreCase = true)) MediaType.TV else MediaType.MOVIE
    return LauncherContinueWatchingRequest(
        mediaType = mediaType,
        mediaId = mediaId,
        season = getQueryParameter("season")?.toIntOrNull(),
        episode = getQueryParameter("episode")?.toIntOrNull(),
        startPositionMs = getQueryParameter("startPositionMs")?.toLongOrNull()
    )
}
