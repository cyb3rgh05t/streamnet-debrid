package com.arflix.tv.ui.screens.offline

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.util.UnstableApi
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.repository.MediaRepository
import com.arflix.tv.data.repository.offline.OfflineDownloadItem
import com.arflix.tv.data.repository.offline.OfflineDownloadRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
@UnstableApi
class OfflineDownloadsViewModel @Inject constructor(
    private val offlineDownloadRepository: OfflineDownloadRepository,
    private val mediaRepository: MediaRepository
) : ViewModel() {
    private val artworkCache = mutableMapOf<String, Pair<String?, String?>>()
    private val _downloads = MutableStateFlow<List<OfflineDownloadItem>>(emptyList())
    val downloads: StateFlow<List<OfflineDownloadItem>> = _downloads.asStateFlow()

    init {
        viewModelScope.launch {
            offlineDownloadRepository.downloads.collect { items ->
                _downloads.value = items.map { item -> item.withRepairedArtwork() }
            }
        }
    }

    fun pause(id: String) {
        offlineDownloadRepository.pause(id)
    }

    fun resume(id: String) {
        offlineDownloadRepository.resume(id)
    }

    fun remove(id: String) {
        offlineDownloadRepository.remove(id)
    }

    private suspend fun OfflineDownloadItem.withRepairedArtwork(): OfflineDownloadItem {
        if (!backdropUrl.isNullOrBlank() || !posterUrl.isNullOrBlank() || mediaType == null || mediaId <= 0) {
            return this
        }
        val cacheKey = "${mediaType.name}:$mediaId"
        val artwork = artworkCache[cacheKey] ?: runCatching {
            val details = when (mediaType) {
                MediaType.MOVIE -> mediaRepository.getMovieDetails(mediaId)
                MediaType.TV -> mediaRepository.getTvDetails(mediaId)
                else -> null
            }
            details?.image to details?.backdrop
        }.getOrNull().also { resolved ->
            artworkCache[cacheKey] = resolved ?: (null to null)
        } ?: (null to null)
        return copy(posterUrl = artwork.first, backdropUrl = artwork.second)
    }
}
