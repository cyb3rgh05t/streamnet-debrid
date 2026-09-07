package com.arflix.tv.data.repository.offline

import android.app.Notification
import android.content.Context
import androidx.media3.common.util.NotificationUtil
import androidx.media3.common.util.UnstableApi
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.cache.Cache
import androidx.media3.datasource.cache.NoOpCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.offline.Download
import androidx.media3.exoplayer.offline.DownloadManager
import androidx.media3.exoplayer.offline.DownloadNotificationHelper
import androidx.media3.exoplayer.offline.DownloadService
import androidx.media3.exoplayer.scheduler.Scheduler
import com.arflix.tv.R
import com.arflix.tv.network.OkHttpProvider
import java.io.File
import java.util.concurrent.Executors

@UnstableApi
class OfflineDownloadService : DownloadService(
    FOREGROUND_NOTIFICATION_ID,
    DEFAULT_FOREGROUND_NOTIFICATION_UPDATE_INTERVAL,
    CHANNEL_ID,
    R.string.offline_download_notification_channel,
    0
) {
    override fun getDownloadManager(): DownloadManager = OfflineDownloadComponents.downloadManager(this)

    override fun getScheduler(): Scheduler? = null

    override fun getForegroundNotification(
        downloads: MutableList<Download>,
        notMetRequirements: Int
    ): Notification = OfflineDownloadComponents.notificationHelper(this).buildProgressNotification(
        this,
        R.drawable.ic_launcher_monochrome,
        null,
        null,
        downloads,
        notMetRequirements
    )

    companion object {
        private const val FOREGROUND_NOTIFICATION_ID = 9107
        private const val CHANNEL_ID = "offline_downloads"
    }
}

@UnstableApi
object OfflineDownloadComponents {
    private var databaseProvider: StandaloneDatabaseProvider? = null
    private var cache: Cache? = null
    private var downloadManager: DownloadManager? = null
    private var notificationHelper: DownloadNotificationHelper? = null

    @Synchronized
    fun downloadManager(context: Context): DownloadManager {
        val appContext = context.applicationContext
        return downloadManager ?: run {
            val database = databaseProvider ?: StandaloneDatabaseProvider(appContext).also { databaseProvider = it }
            val downloadCache = cache ?: SimpleCache(
                File(appContext.filesDir, "offline-download-cache"),
                NoOpCacheEvictor(),
                database
            ).also { cache = it }
            DownloadManager(
                appContext,
                database,
                downloadCache,
                OkHttpDataSource.Factory(OkHttpProvider.client),
                Executors.newFixedThreadPool(3)
            ).also {
                it.maxParallelDownloads = 2
                downloadManager = it
            }
        }
    }

    @Synchronized
    fun downloadCache(context: Context): Cache {
        downloadManager(context)
        return requireNotNull(cache) { "Offline download cache is not initialized" }
    }

    @Synchronized
    fun notificationHelper(context: Context): DownloadNotificationHelper {
        val appContext = context.applicationContext
        NotificationUtil.createNotificationChannel(
            appContext,
            "offline_downloads",
            R.string.offline_download_notification_channel,
            0,
            NotificationUtil.IMPORTANCE_LOW
        )
        return notificationHelper ?: DownloadNotificationHelper(
            appContext,
            "offline_downloads"
        ).also { notificationHelper = it }
    }
}
