package com.arflix.tv.worker

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.arflix.tv.data.repository.IptvRepository
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeout

@HiltWorker
class IptvRefreshWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted workerParams: WorkerParameters,
    private val iptvRepository: IptvRepository,
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val config = iptvRepository.observeConfig().first()
        val isConfigured = config.m3uUrl.isNotBlank() ||
            config.stalkerPortalUrl.isNotBlank() ||
            config.playlists.any { it.enabled && it.m3uUrl.isNotBlank() }
        if (!isConfigured) return Result.success()

        return try {
            val bootstrapIfStale = inputData.getBoolean(KEY_BOOTSTRAP_IF_STALE, false)
            if (bootstrapIfStale) {
                iptvRepository.warmupFromCacheOnly()
                if (iptvRepository.cachedEpgAgeMs() < BOOTSTRAP_STALE_AFTER_MS) {
                    return Result.success()
                }
            }
            withTimeout(9 * 60_000L) {
                iptvRepository.loadSnapshot(
                    forcePlaylistReload = !bootstrapIfStale,
                    forceEpgReload = true,
                    allowNetworkEpgFetch = true,
                )
            }
            iptvRepository.notifyDataRefresh()
            Log.i(TAG, "Background playlist and EPG refresh completed")
            Result.success()
        } catch (error: TimeoutCancellationException) {
            Log.w(TAG, "Background IPTV refresh timed out")
            Result.retry()
        } catch (error: CancellationException) {
            throw error
        } catch (error: Exception) {
            Log.w(TAG, "Background IPTV refresh failed: ${error.message}", error)
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }

    companion object {
        const val TAG = "IptvRefreshWorker"
        const val WORK_NAME = "iptv_playlist_epg_refresh"
        const val BOOTSTRAP_WORK_NAME = "iptv_epg_startup_bootstrap"
        const val KEY_BOOTSTRAP_IF_STALE = "bootstrap_if_stale"
        const val REFRESH_INTERVAL_HOURS = 4L
        private const val BOOTSTRAP_STALE_AFTER_MS = 2L * 60L * 60L * 1000L
    }
}