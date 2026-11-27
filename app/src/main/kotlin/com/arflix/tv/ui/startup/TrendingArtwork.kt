package com.arflix.tv.ui.startup

import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalConfiguration

/**
 * Trending artwork for the startup screens. A 16:9 backdrop is cropped to a narrow centre strip on a
 * portrait phone, so portrait screens use the 2:3 posters instead. The poster list is index-aligned
 * with the backdrop list; if it is not (older state, failed load), the backdrops are used.
 */
@Composable
fun rememberTrendingArtworkUrls(backdropUrls: List<String>, posterUrls: List<String>): List<String> {
    val configuration = LocalConfiguration.current
    val portrait = configuration.screenHeightDp > configuration.screenWidthDp
    return if (portrait && posterUrls.isNotEmpty() && posterUrls.size == backdropUrls.size) {
        posterUrls
    } else {
        backdropUrls
    }
}
