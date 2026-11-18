package com.arflix.tv.data.repository

import com.arflix.tv.data.model.CatalogConfig
import com.arflix.tv.data.model.CollectionGroupKind
import com.arflix.tv.data.model.CollectionSourceConfig
import com.arflix.tv.data.model.CollectionSourceKind
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.api.StremioMetaPreview
import com.arflix.tv.data.api.TmdbFindResponse
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.Locale

internal fun usesFranchiseReleaseOrder(catalog: CatalogConfig): Boolean =
    catalog.collectionGroup == CollectionGroupKind.FRANCHISE &&
        catalog.collectionSources.none { it.collectionTab?.trim()?.lowercase() == "timeline" }

/**
 * Resolves every source in parallel, except `addonFallback` sources: those only run after the others
 * finished and none of the catalog's addon sources returned anything.
 */
internal suspend fun resolveSourcesWithAddonFallback(
    sources: List<CollectionSourceConfig>,
    resolve: suspend (Int) -> List<Pair<MediaType, Int>>
): List<List<Pair<MediaType, Int>>> = coroutineScope {
    val primaryJobs = sources.mapIndexed { index, source ->
        if (source.addonFallback) null else async { resolve(index) }
    }
    val primaryRefs = primaryJobs.map { it?.await() }
    val addonAnswered = sources.indices.any { index ->
        val source = sources[index]
        source.kind == CollectionSourceKind.ADDON_CATALOG && !source.addonFallback &&
            !primaryRefs[index].isNullOrEmpty()
    }
    val fallbackJobs = sources.mapIndexed { index, source ->
        if (source.addonFallback && !addonAnswered) async { resolve(index) } else null
    }
    sources.indices.map { index -> primaryRefs[index] ?: fallbackJobs[index]?.await().orEmpty() }
}

internal fun mergeAddonRefsInCatalogOrder(
    direct: List<Pair<MediaType, Int>?>,
    resolved: List<Pair<MediaType, Int>?>
): List<Pair<MediaType, Int>> {
    require(direct.size == resolved.size)
    return direct.indices.mapNotNull { direct[it] ?: resolved[it] }.distinct()
}

internal fun marvelTimelineImdbRef(response: TmdbFindResponse): Pair<MediaType, Int>? {
    val movie = response.movieResults.maxByOrNull { it.popularity }
    val series = response.tvResults.maxByOrNull { it.popularity }
    return when {
        movie != null && (series == null || movie.popularity >= series.popularity) -> MediaType.MOVIE to movie.id
        series != null -> MediaType.TV to series.id
        else -> null
    }
}

internal fun marvelAddonTimelineCard(
    meta: StremioMetaPreview,
    ref: Pair<MediaType, Int>?,
    position: Int,
    details: MediaItem? = null
): MediaItem = MediaItem(
    id = ref?.second ?: -(position + 1),
    mediaType = ref?.first ?: if (meta.type == "series") MediaType.TV else MediaType.MOVIE,
    title = requireNotNull(meta.name) { "Marvel timeline title missing: ${meta.id}" },
    overview = meta.description.orEmpty(),
    image = meta.poster.orEmpty(),
    backdrop = meta.background?.takeIf { it.isNotBlank() } ?: details?.backdrop?.takeIf { it.isNotBlank() },
    year = (meta.year ?: meta.releaseInfo.orEmpty()).ifBlank { details?.year.orEmpty() },
    releaseDate = meta.released?.takeIf { it.isNotBlank() } ?: details?.releaseDate?.takeIf { it.isNotBlank() },
    sourceOrder = position,
    timelineEntryId = "marvel-addon:$position:${meta.id}",
    timelineMetadataUnavailable = ref == null
)

internal fun sortFranchiseReleaseRefs(
    refs: List<Pair<MediaType, Int>>,
    dates: Map<Pair<MediaType, Int>, LocalDate?>
): List<Pair<MediaType, Int>> = refs.sortedWith(
    compareBy<Pair<MediaType, Int>> { dates[it] == null }.thenByDescending { dates[it] }
)

internal fun collectionReleaseDate(value: String?, year: String = ""): LocalDate? {
    val date = value?.trim().orEmpty()
    if (date.isNotEmpty()) {
        for (format in listOf(
            DateTimeFormatter.ISO_LOCAL_DATE,
            DateTimeFormatter.ofPattern("d MMM uuuu", Locale.US),
            DateTimeFormatter.ofPattern("dd.MM.uuuu", Locale.US)
        )) {
            try {
                return LocalDate.parse(date, format)
            } catch (_: DateTimeParseException) {
                // Cached items can contain either API dates or formatted display dates.
            }
        }
    }
    return year.toIntOrNull()?.takeIf { it in 1..9999 }?.let { LocalDate.of(it, 1, 1) }
}
