package com.arflix.tv.data.repository

import com.arflix.tv.data.api.TraktPublicListItem
import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType

internal const val TRAKT_PERSONAL_LIST_ITEM_TYPES = "movie,show"

internal fun mapTraktPersonalListItems(
    rows: List<TraktPublicListItem>,
    limit: Int
): List<MediaItem> = rows
    .sortedBy { it.rank ?: Int.MAX_VALUE }
    .mapIndexedNotNull { index, item ->
        when (item.type) {
            "movie" -> item.movie?.let { movie ->
                movie.ids.tmdb?.takeIf { it > 0 }?.let { tmdbId ->
                    MediaItem(
                        id = tmdbId,
                        title = movie.title,
                        year = movie.year?.toString().orEmpty(),
                        mediaType = MediaType.MOVIE,
                        sourceOrder = index
                    )
                }
            }
            "show" -> item.show?.let { show ->
                show.ids.tmdb?.takeIf { it > 0 }?.let { tmdbId ->
                    MediaItem(
                        id = tmdbId,
                        title = show.title,
                        year = show.year?.toString().orEmpty(),
                        mediaType = MediaType.TV,
                        sourceOrder = index
                    )
                }
            }
            else -> null
        }
    }
    .distinctBy { it.mediaType to it.id }
    .take(limit)
