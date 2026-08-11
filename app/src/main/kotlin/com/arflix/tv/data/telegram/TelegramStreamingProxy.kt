package com.arflix.tv.data.telegram

import android.content.Context
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import io.ktor.http.ContentRange
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.cio.CIO
import io.ktor.server.engine.embeddedServer
import io.ktor.server.response.header
import io.ktor.server.response.respond
import io.ktor.server.response.respondBytesWriter
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import io.ktor.utils.io.writeFully
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import org.drinkless.tdlib.TdApi
import java.net.ServerSocket
import javax.inject.Inject
import javax.inject.Singleton

internal object TelegramBufferPolicy {
    const val LOW_STORAGE_PREFETCH_BYTES = 2 * 1024 * 1024L
    const val MIN_PREFETCH_BYTES = 4 * 1024 * 1024L
    const val MAX_PREFETCH_BYTES = 20 * 1024 * 1024L
    const val DEFAULT_PREFETCH_BYTES = 8 * 1024 * 1024L
    const val LOW_STORAGE_THRESHOLD_BYTES = 500 * 1024 * 1024L

    private const val TARGET_BUFFER_SECONDS = 60L
    private const val DEFAULT_ESTIMATED_DURATION_SECONDS = 90 * 60L

    fun prefetchBytes(totalSize: Long, usableSpace: Long): Long {
        val target = when {
            usableSpace < LOW_STORAGE_THRESHOLD_BYTES -> LOW_STORAGE_PREFETCH_BYTES
            totalSize <= 0L -> DEFAULT_PREFETCH_BYTES
            else -> {
                val bytesPerSecond = (totalSize / DEFAULT_ESTIMATED_DURATION_SECONDS)
                    .coerceAtLeast(1L)
                (bytesPerSecond * TARGET_BUFFER_SECONDS)
                    .coerceIn(MIN_PREFETCH_BYTES, MAX_PREFETCH_BYTES)
            }
        }

        return if (totalSize > 0L) minOf(target, totalSize) else target
    }
}

/**
 * Runs a local Ktor HTTP server on a random port.
 * ExoPlayer streams from http://localhost:PORT/file/{fileId}
 * with full Range request support.
 *
 * TDLib downloads the requested byte range on demand via downloadFile
 * with offset + limit parameters, enabling seek without full download.
 */
@Singleton
class TelegramStreamingProxy @Inject constructor(
    @ApplicationContext private val context: Context,
    private val client: TelegramClient
) {
    companion object {
        private const val TAG = "TelegramProxy"
        private const val CHUNK_SIZE = 2 * 1024 * 1024
        private const val CACHE_CLEANUP_GRACE_MS = 30_000L
        private const val FILE_DELETE_TIMEOUT_MS = 5_000L
        private const val DOWNLOAD_TIMEOUT_MS = 30_000L
        private const val DOWNLOAD_PRIORITY = 32
        private const val POLL_INTERVAL_MS = 100L
    }

    private data class StreamRequestState(
        var activeRequests: Int = 0,
        var cleanupJob: Job? = null
    )

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var port: Int = 0
    private var server: io.ktor.server.engine.ApplicationEngine? = null
    @Volatile private var lastStreamedFileId: Int? = null
    private val requestStateMutex = Mutex()
    private val requestStates = mutableMapOf<Int, StreamRequestState>()

    fun start() {
        if (server != null) return
        port = findFreePort()
        server = embeddedServer(CIO, port = port) {
            routing {
                get("/file/{fileId}") {
                    val fileId = call.parameters["fileId"]?.toIntOrNull()
                    Log.d(TAG, "Request: fileId=$fileId range=${call.request.headers[HttpHeaders.Range]}")
                    if (fileId == null) {
                        call.respond(HttpStatusCode.BadRequest)
                        return@get
                    }

                    beginStreamRequest(fileId)
                    try {
                        val rangeHeader = call.request.headers[HttpHeaders.Range]
                        val (rangeStart, rangeEnd) = parseRange(rangeHeader)

                        val fileInfo = getFileInfo(fileId)
                        val totalSize = fileInfo?.second ?: 0L
                        val localPath = fileInfo?.first
                        Log.d(TAG, "FileInfo: fileId=$fileId totalSize=$totalSize localPath=$localPath")

                        if (totalSize <= 0L) {
                            call.respond(HttpStatusCode.NotFound)
                            return@get
                        }

                        val start = rangeStart ?: 0L
                        val end = rangeEnd ?: (totalSize - 1L)
                        val length = end - start + 1

                        call.response.header(HttpHeaders.ContentLength, length.toString())
                        call.response.header(HttpHeaders.AcceptRanges, "bytes")
                        call.response.header(
                            HttpHeaders.ContentRange,
                            "bytes $start-$end/$totalSize"
                        )

                        val status = if (rangeHeader != null) HttpStatusCode.PartialContent else HttpStatusCode.OK

                        call.respondBytesWriter(
                            contentType = ContentType.Video.Any,
                            status = status
                        ) {
                            var offset = start
                            while (offset <= end) {
                                val chunkSize = minOf(CHUNK_SIZE.toLong(), end - offset + 1).toInt()
                                val bytes = downloadChunk(fileId, localPath, offset, chunkSize, totalSize)
                                if (bytes == null || bytes.isEmpty()) break
                                writeFully(bytes)
                                offset += bytes.size
                            }
                        }
                    } finally {
                        withContext(NonCancellable) {
                            endStreamRequest(fileId)
                        }
                    }
                }
            }
        }
        server!!.start(wait = false)
        Log.d(TAG, "Streaming proxy started on port $port")
    }

    fun stop() {
        lastStreamedFileId?.let { scope.launch { deleteFile(it) } }
        lastStreamedFileId = null
        server?.stop(0, 0)
        server = null
        Log.d(TAG, "Streaming proxy stopped")
    }

    private suspend fun deleteFile(fileId: Int) {
        try {
            client.sendRequest(
                TdApi.CancelDownloadFile().also { request ->
                    request.fileId = fileId
                    request.onlyIfPending = false
                },
                timeoutMs = FILE_DELETE_TIMEOUT_MS
            )
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Log.w(TAG, "Failed to cancel cached file $fileId", e)
        }

        try {
            client.sendRequest(
                TdApi.DeleteFile().also { it.fileId = fileId },
                timeoutMs = FILE_DELETE_TIMEOUT_MS
            )
            Log.d(TAG, "Deleted cached file $fileId")
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Log.w(TAG, "Failed to delete cached file $fileId", e)
        }
    }

    private suspend fun beginStreamRequest(fileId: Int) {
        requestStateMutex.withLock {
            val state = requestStates.getOrPut(fileId) { StreamRequestState() }
            state.cleanupJob?.cancel()
            state.cleanupJob = null
            state.activeRequests += 1
            lastStreamedFileId = fileId
        }
    }

    private suspend fun endStreamRequest(fileId: Int) {
        requestStateMutex.withLock {
            val state = requestStates[fileId] ?: return@withLock
            state.activeRequests = (state.activeRequests - 1).coerceAtLeast(0)
            if (state.activeRequests != 0) return@withLock

            state.cleanupJob = scope.launch {
                delay(CACHE_CLEANUP_GRACE_MS)
                val cleanupJob = currentCoroutineContext()[Job]
                requestStateMutex.lock()
                try {
                    val current = requestStates[fileId]
                    if (current?.activeRequests == 0 && current.cleanupJob === cleanupJob) {
                        deleteFile(fileId)
                        requestStates.remove(fileId)
                        if (lastStreamedFileId == fileId) {
                            lastStreamedFileId = null
                        }
                    }
                } finally {
                    requestStateMutex.unlock()
                }
            }
        }
    }

    fun getUrl(fileId: Int): String {
        val url = "http://localhost:$port/file/$fileId"
        Log.d(TAG, "Generated stream URL: $url")
        return url
    }

    /**
     * Downloads a chunk of the file via TDLib and returns the raw bytes.
     * Uses DownloadFile to ensure the range is cached, then ReadFilePart to read it.
     */
    private suspend fun downloadChunk(
        fileId: Int,
        @Suppress("UNUSED_PARAMETER") localPath: String?,
        offset: Long,
        limit: Int,
        totalSize: Long
    ): ByteArray? {
        val freeSpace = runCatching { context.filesDir.usableSpace }.getOrDefault(Long.MAX_VALUE)
        val prefetchSize = TelegramBufferPolicy.prefetchBytes(totalSize, freeSpace)

        // Ask TDLib to prefetch a bounded window, but only wait for the current chunk.
        withTimeoutOrNull(DOWNLOAD_TIMEOUT_MS) {
            client.sendRequest(TdApi.DownloadFile().also { req ->
                req.fileId = fileId
                req.priority = DOWNLOAD_PRIORITY
                req.offset = offset
                req.limit = prefetchSize
                req.synchronous = false     // don't block — TDLib downloads while we poll
            })
        }

        // Poll until just the current chunk is available
        val ready = withTimeoutOrNull(DOWNLOAD_TIMEOUT_MS) {
            var attempts = 0
            while (attempts < 300) {
                val file = client.sendRequest(TdApi.GetFile(fileId)) as? TdApi.File
                val local = file?.local
                if (local != null && (local.isDownloadingCompleted || local.downloadedPrefixSize >= limit)) {
                    return@withTimeoutOrNull true
                }
                delay(POLL_INTERVAL_MS)
                attempts++
            }
            false
        }
        if (ready != true) return null

        // Read the bytes directly via TDLib — no file path or skip arithmetic needed
        val data = client.sendRequest(
            TdApi.ReadFilePart(fileId, offset, limit.toLong())
        ) as? TdApi.Data
        return data?.data?.takeIf { it.isNotEmpty() }
    }

    /** Returns (localPath, totalSize) for the file, or null if unavailable. */
    private suspend fun getFileInfo(fileId: Int): Pair<String?, Long>? {
        val file = client.sendRequest(TdApi.GetFile(fileId)) as? TdApi.File ?: return null
        val totalSize = file.size.takeIf { it > 0 } ?: file.expectedSize
        val localPath = file.local?.path?.takeIf { it.isNotBlank() }
        return Pair(localPath, totalSize)
    }

    private fun parseRange(header: String?): Pair<Long?, Long?> {
        if (header == null) return Pair(null, null)
        return try {
            val range = header.removePrefix("bytes=")
            val parts = range.split("-")
            val start = parts.getOrNull(0)?.toLongOrNull()
            val end = parts.getOrNull(1)?.toLongOrNull()
            Pair(start, end)
        } catch (e: Exception) {
            if (e is kotlinx.coroutines.CancellationException) throw e

            Pair(null, null)
        }
    }

    private fun findFreePort(): Int {
        ServerSocket(0).use { return it.localPort }
    }
}
