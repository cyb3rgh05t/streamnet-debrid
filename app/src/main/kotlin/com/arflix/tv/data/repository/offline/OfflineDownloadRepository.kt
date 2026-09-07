package com.arflix.tv.data.repository.offline

import android.content.Context
import android.net.Uri
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.offline.Download
import androidx.media3.exoplayer.offline.DownloadManager
import androidx.media3.exoplayer.offline.DownloadRequest
import androidx.media3.exoplayer.offline.DownloadService
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.model.StreamSource
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.security.MessageDigest
import javax.inject.Inject
import javax.inject.Singleton

data class OfflineDownloadItem(
    val id: String,
    val title: String,
    val subtitle: String,
    val stateKey: String,
    val percent: Float,
    val bytesDownloaded: Long,
    val mediaType: MediaType? = null,
    val mediaId: Int = 0,
    val seasonNumber: Int? = null,
    val episodeNumber: Int? = null,
    val tmdbSeasonNumber: Int? = null,
    val tmdbEpisodeNumber: Int? = null,
    val streamUrl: String? = null,
    val addonId: String? = null,
    val sourceName: String? = null,
    val posterUrl: String? = null,
    val backdropUrl: String? = null
) {
    val canPlay: Boolean
        get() = stateKey == "completed" && mediaType != null && mediaId > 0 && !streamUrl.isNullOrBlank()
    val canPause: Boolean
        get() = stateKey == "downloading" || stateKey == "queued" || stateKey == "restarting"
    val canResume: Boolean
        get() = stateKey == "paused"
}

data class OfflineDownloadEvent(
    val download: OfflineDownloadItem
)

@Singleton
@UnstableApi
class OfflineDownloadRepository @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val downloadsById = linkedMapOf<String, OfflineDownloadItem>()
    private val _downloads = MutableStateFlow<List<OfflineDownloadItem>>(emptyList())
    val downloads: StateFlow<List<OfflineDownloadItem>> = _downloads.asStateFlow()
    private val _completionEvents = MutableSharedFlow<OfflineDownloadEvent>(extraBufferCapacity = 8)
    val completionEvents: SharedFlow<OfflineDownloadEvent> = _completionEvents
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    init {
        val manager = OfflineDownloadComponents.downloadManager(context)
        manager.addListener(object : DownloadManager.Listener {
            override fun onDownloadChanged(
                downloadManager: DownloadManager,
                download: Download,
                finalException: Exception?
            ) {
                updateDownload(download.toOfflineItem())
                publishDownloads()
            }

            override fun onDownloadRemoved(downloadManager: DownloadManager, download: Download) {
                downloadsById.remove(download.request.id)
                publishDownloads()
            }
        })
        scope.launch {
            while (isActive) {
                refreshDownloadsFromIndex(manager)
                delay(1000L)
            }
        }
    }

    fun canDownload(stream: StreamSource): Boolean {
        val url = stream.url?.trim().orEmpty()
        if (!url.startsWith("http://", ignoreCase = true) && !url.startsWith("https://", ignoreCase = true)) {
            return false
        }
        val lower = url.substringBefore('?').lowercase()
        return lower.endsWith(".mp4") || lower.endsWith(".m4v") || lower.endsWith(".mkv") ||
            lower.endsWith(".webm") || lower.endsWith(".m3u8") || lower.endsWith(".mpd") ||
            stream.behaviorHints?.notWebReady != true
    }

    fun enqueue(
        mediaType: MediaType,
        mediaId: Int,
        episodeKey: String?,
        title: String,
        subtitle: String?,
        posterUrl: String? = null,
        backdropUrl: String? = null,
        stream: StreamSource
    ): Result<Unit> = runCatching {
        val url = stream.url?.trim().orEmpty()
        require(canDownload(stream)) { "Source is not downloadable" }
        val request = DownloadRequest.Builder(
            buildDownloadId(mediaType, mediaId, episodeKey, stream),
            Uri.parse(url)
        )
            .setMimeType(inferMimeType(url))
            .setData(
                JSONObject()
                    .put("title", title)
                    .put("subtitle", subtitle.orEmpty())
                    .put("mediaType", mediaType.name)
                    .put("mediaId", mediaId)
                    .put("seasonNumber", episodeKey?.substringAfter('s')?.substringBefore('e')?.toIntOrNull() ?: JSONObject.NULL)
                    .put("episodeNumber", episodeKey?.substringAfter('e')?.substringBefore(':')?.toIntOrNull() ?: JSONObject.NULL)
                    .put("streamUrl", url)
                    .put("posterUrl", posterUrl.orEmpty())
                    .put("backdropUrl", backdropUrl.orEmpty())
                    .put("addonName", stream.addonName)
                    .put("addonId", stream.addonId)
                    .put("sourceName", stream.source)
                    .put("quality", stream.quality)
                    .toString()
                    .toByteArray(Charsets.UTF_8)
            )
            .build()
        OfflineDownloadComponents.downloadManager(context)
        DownloadService.sendAddDownload(
            context,
            OfflineDownloadService::class.java,
            request,
            false
        )
    }

    fun remove(id: String) {
        DownloadService.sendRemoveDownload(
            context,
            OfflineDownloadService::class.java,
            id,
            false
        )
    }

    fun pause(id: String) {
        DownloadService.sendSetStopReason(
            context,
            OfflineDownloadService::class.java,
            id,
            1,
            false
        )
    }

    fun resume(id: String) {
        DownloadService.sendSetStopReason(
            context,
            OfflineDownloadService::class.java,
            id,
            Download.STOP_REASON_NONE,
            false
        )
    }

    fun getDownload(id: String): OfflineDownloadItem? {
        downloadsById[id]?.let { return it }
        return runCatching {
            OfflineDownloadComponents.downloadManager(context)
                .downloadIndex
                .getDownload(id)
                ?.toOfflineItem()
                ?.also { item -> downloadsById[id] = item }
        }.getOrNull()
    }

    private fun Download.toOfflineItem(): OfflineDownloadItem {
        val rawData = runCatching { request.data.toString(Charsets.UTF_8) }.getOrDefault("")
        val metadata = runCatching { JSONObject(rawData) }.getOrNull()
        val lines = if (metadata == null) rawData.lines() else emptyList()
        val title = metadata?.optString("title")?.takeIf { it.isNotBlank() }
            ?: lines.getOrNull(0)?.takeIf { it.isNotBlank() }
            ?: request.id
        val details = metadata?.let { json ->
            listOf(
                json.optString("subtitle"),
                json.optString("addonName"),
                json.optString("quality")
            ).filter { it.isNotBlank() }.joinToString(" • ")
        } ?: lines.drop(1).filter { it.isNotBlank() }.joinToString(" • ")
        return OfflineDownloadItem(
            id = request.id,
            title = title,
            subtitle = details,
            stateKey = stateKey(),
            percent = percentDownloaded.takeIf { it >= 0f } ?: 0f,
            bytesDownloaded = bytesDownloaded,
            mediaType = metadata?.optString("mediaType")?.let { value -> runCatching { MediaType.valueOf(value) }.getOrNull() },
            mediaId = metadata?.optInt("mediaId", 0) ?: 0,
            seasonNumber = metadata?.optIntOrNull("seasonNumber"),
            episodeNumber = metadata?.optIntOrNull("episodeNumber"),
            tmdbSeasonNumber = metadata?.optIntOrNull("seasonNumber"),
            tmdbEpisodeNumber = metadata?.optIntOrNull("episodeNumber"),
            streamUrl = metadata?.optString("streamUrl")?.takeIf { it.isNotBlank() } ?: request.uri.toString(),
            addonId = metadata?.optString("addonId")?.takeIf { it.isNotBlank() },
            sourceName = metadata?.optString("sourceName")?.takeIf { it.isNotBlank() },
            posterUrl = metadata?.optString("posterUrl")?.takeIf { it.isNotBlank() },
            backdropUrl = metadata?.optString("backdropUrl")?.takeIf { it.isNotBlank() }
        )
    }

    private fun JSONObject.optIntOrNull(name: String): Int? = if (has(name) && !isNull(name)) optInt(name) else null

    private fun Download.stateKey(): String = when (state) {
        Download.STATE_COMPLETED -> "completed"
        Download.STATE_DOWNLOADING -> "downloading"
        Download.STATE_FAILED -> "failed"
        Download.STATE_QUEUED -> "queued"
        Download.STATE_REMOVING -> "removing"
        Download.STATE_RESTARTING -> "restarting"
        Download.STATE_STOPPED -> "paused"
        else -> "unknown"
    }

    private fun publishDownloads() {
        _downloads.value = downloadsById.values.sortedBy { it.title.lowercase() }
    }

    private fun refreshDownloadsFromIndex(manager: DownloadManager) {
        runCatching {
            val cursor = manager.downloadIndex.getDownloads(
                Download.STATE_QUEUED,
                Download.STATE_STOPPED,
                Download.STATE_DOWNLOADING,
                Download.STATE_COMPLETED,
                Download.STATE_FAILED,
                Download.STATE_REMOVING,
                Download.STATE_RESTARTING
            )
            try {
                val next = linkedMapOf<String, OfflineDownloadItem>()
                while (cursor.moveToNext()) {
                    val item = cursor.download.toOfflineItem()
                    next[item.id] = item
                    maybeEmitCompleted(item)
                }
                downloadsById.clear()
                downloadsById.putAll(next)
                publishDownloads()
            } finally {
                cursor.close()
            }
        }
    }

    private fun updateDownload(item: OfflineDownloadItem) {
        maybeEmitCompleted(item)
        downloadsById[item.id] = item
    }

    private fun maybeEmitCompleted(item: OfflineDownloadItem) {
        val previous = downloadsById[item.id]
        if (previous != null && previous.stateKey != "completed" && item.stateKey == "completed") {
            _completionEvents.tryEmit(OfflineDownloadEvent(item))
        }
    }

    private fun buildDownloadId(
        mediaType: MediaType,
        mediaId: Int,
        episodeKey: String?,
        stream: StreamSource
    ): String {
        val raw = listOf(
            mediaType.name,
            mediaId.toString(),
            episodeKey.orEmpty(),
            stream.addonId,
            stream.source,
            stream.url.orEmpty()
        ).joinToString("|")
        return "streamnet:${sha256(raw).take(24)}"
    }

    private fun inferMimeType(url: String): String? {
        val lower = url.substringBefore('?').lowercase()
        return when {
            lower.endsWith(".m3u8") -> MimeTypes.APPLICATION_M3U8
            lower.endsWith(".mpd") -> MimeTypes.APPLICATION_MPD
            lower.endsWith(".mp4") || lower.endsWith(".m4v") -> MimeTypes.VIDEO_MP4
            lower.endsWith(".webm") -> MimeTypes.VIDEO_WEBM
            else -> null
        }
    }

    private fun sha256(value: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(value.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { byte -> "%02x".format(byte) }
    }
}
