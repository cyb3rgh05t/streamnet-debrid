package com.arflix.tv.data.repository

import java.util.Locale

/** Stored value meaning "derive the region from the content language". */
const val STREAMING_REGION_AUTO = "auto"

/** Regions offered in the settings picker (ISO 3166-1 alpha-2, as TMDB's `watch_region` expects). */
val STREAMING_REGION_CODES = listOf(
    "DE", "AT", "CH", "US", "GB", "FR", "NL", "BE", "ES", "IT", "PT", "PL", "SE", "NO", "DK", "FI",
    "IE", "CA", "AU", "BR", "MX", "TR"
)

fun normalizeStreamingRegionSetting(raw: String?): String {
    val value = raw?.trim()?.uppercase(Locale.ROOT).orEmpty()
    return if (value in STREAMING_REGION_CODES) value else STREAMING_REGION_AUTO
}

/** The region TMDB is queried with: the user's choice, else the country of the content language. */
fun effectiveStreamingRegion(setting: String?, contentLanguage: String): String {
    val chosen = normalizeStreamingRegionSetting(setting)
    if (chosen != STREAMING_REGION_AUTO) return chosen
    val country = contentLanguage.substringAfter('-', "").uppercase(Locale.ROOT)
    return if (country.length == 2) country else "US"
}

fun streamingRegionDisplayName(code: String, displayLocale: Locale): String =
    Locale("", code).getDisplayCountry(displayLocale).ifBlank { code }
