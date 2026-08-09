package com.arflix.tv.data.repository

import com.arflix.tv.data.api.TraktIds
import com.arflix.tv.data.api.TraktWatchedMovie
import com.arflix.tv.data.api.TraktWatchedShow

/**
 * Appends a Trakt page while protecting callers from overlapping or repeated pages.
 * Trakt may return fewer items than requested, so page size is not an end condition.
 */
internal fun <T> appendUniqueTraktPage(
    target: MutableList<T>,
    seen: MutableSet<String>,
    pageItems: List<T>,
    identity: (T) -> String
): Int {
    var added = 0
    pageItems.forEach { item ->
        if (seen.add(identity(item))) {
            target.add(item)
            added += 1
        }
    }
    return added
}

internal fun watchedMovieIdentity(item: TraktWatchedMovie): String =
    traktMediaIdentity(
        type = "movie",
        ids = item.movie.ids,
        fallback = "${item.movie.title}:${item.movie.year.orEmptyYear()}"
    )

internal fun watchedShowIdentity(item: TraktWatchedShow): String =
    traktMediaIdentity(
        type = "show",
        ids = item.show.ids,
        fallback = "${item.show.title}:${item.show.year.orEmptyYear()}"
    )

private fun traktMediaIdentity(type: String, ids: TraktIds, fallback: String): String = when {
    ids.trakt != null -> "$type:trakt:${ids.trakt}"
    ids.tmdb != null -> "$type:tmdb:${ids.tmdb}"
    ids.tvdb != null -> "$type:tvdb:${ids.tvdb}"
    !ids.imdb.isNullOrBlank() -> "$type:imdb:${ids.imdb}"
    !ids.slug.isNullOrBlank() -> "$type:slug:${ids.slug}"
    else -> "$type:fallback:$fallback"
}

private fun Int?.orEmptyYear(): String = this?.toString().orEmpty()
