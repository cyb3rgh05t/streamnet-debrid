package com.arflix.tv.ui.components

internal fun sourceItemHeading(title: String, releaseYear: String?): String {
    val name = title.trim()
    if (name.isEmpty()) return ""
    val year = releaseYear?.trim()?.takeIf { it.matches(Regex("""(?:18|19|20|21)\d{2}""")) }
    return if (year == null || name.endsWith("($year)")) name else "$name ($year)"
}
