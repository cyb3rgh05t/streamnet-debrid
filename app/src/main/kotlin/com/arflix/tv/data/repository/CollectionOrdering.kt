package com.arflix.tv.data.repository

import com.arflix.tv.data.model.CatalogConfig
import com.arflix.tv.data.model.CollectionGroupKind
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.api.StremioMetaPreview
import com.arflix.tv.data.api.TmdbFindResponse
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.Locale

internal fun usesFranchiseReleaseOrder(catalog: CatalogConfig): Boolean =
    catalog.collectionGroup == CollectionGroupKind.FRANCHISE &&
        catalog.collectionSources.none { it.collectionTab?.trim()?.lowercase() == "timeline" }

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
    year = meta.year ?: meta.releaseInfo.orEmpty(),
    releaseDate = meta.released,
    sourceOrder = position,
    timelineEntryId = "marvel-addon:$position:${meta.id}",
    timelineMetadataUnavailable = ref == null
)

internal fun sortFranchiseReleaseRefs(
    refs: List<Pair<MediaType, Int>>,
    dates: Map<Pair<MediaType, Int>, LocalDate?>
): List<Pair<MediaType, Int>> = refs.sortedWith(
    compareBy<Pair<MediaType, Int>> { dates[it] == null }.thenBy { dates[it] }
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
