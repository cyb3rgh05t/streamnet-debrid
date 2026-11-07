package com.arflix.tv.data.repository

import java.text.Normalizer
import java.util.Locale

private val COMBINING_MARKS = Regex("\\p{M}+")
private val NON_ALPHANUMERIC = Regex("[^\\p{L}\\p{N}]+")

internal fun normalizeSearchText(text: String): String =
    Normalizer.normalize(text, Normalizer.Form.NFD)
        .replace(COMBINING_MARKS, "")
        .lowercase(Locale.ROOT)
        .replace("&", " and ")
        .replace(NON_ALPHANUMERIC, " ")
        .trim()

/** True if every query word starts a distinct title word, in order ("rea" -> "Jack Reacher"). */
internal fun titleMatchesSearchPrefix(title: String, query: String): Boolean {
    val queryTokens = normalizeSearchText(query).split(' ').filter { it.isNotEmpty() }
    if (queryTokens.isEmpty() || queryTokens.sumOf { it.length } < 2) return false
    val titleTokens = normalizeSearchText(title).split(' ').filter { it.isNotEmpty() }
    var from = 0
    for (token in queryTokens) {
        val index = (from until titleTokens.size).firstOrNull { titleTokens[it].startsWith(token) }
            ?: return false
        from = index + 1
    }
    return true
}
