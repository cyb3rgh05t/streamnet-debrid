package com.arflix.tv.data.repository

import com.arflix.tv.data.model.CatalogConfig
import com.arflix.tv.data.model.CollectionGroupKind
import com.arflix.tv.data.model.CollectionSourceKind
import com.arflix.tv.data.model.MediaType
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.Locale

internal fun usesFranchiseReleaseOrder(catalog: CatalogConfig): Boolean =
    catalog.collectionGroup == CollectionGroupKind.FRANCHISE &&
        catalog.collectionSources.none { it.collectionTab?.trim()?.lowercase() == "timeline" }

/**
 * How many titles of one source a franchise collection resolves before it is sorted by release date. A fixed
 * title list (Marvel has 120 films) must not be cut: the cap only exists for open-ended list sources.
 */
internal fun franchiseSourceBudget(kind: CollectionSourceKind): Int = when (kind) {
    CollectionSourceKind.CURATED_IDS -> 500
    CollectionSourceKind.ADDON_CATALOG -> 120
    CollectionSourceKind.MDBLIST_PUBLIC -> 96
    else -> 72
}

internal fun mergeAddonRefsInCatalogOrder(
    direct: List<Pair<MediaType, Int>?>,
    resolved: List<Pair<MediaType, Int>?>
): List<Pair<MediaType, Int>> {
    require(direct.size == resolved.size)
    return direct.indices.mapNotNull { direct[it] ?: resolved[it] }.distinct()
}

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
