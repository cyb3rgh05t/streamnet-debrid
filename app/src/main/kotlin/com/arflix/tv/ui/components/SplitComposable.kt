package com.arflix.tv.ui.components

import androidx.compose.runtime.Composable

/**
 * Compiles [content] into its own method. ART refuses to compile methods above 16383 code
 * units, so a huge screen composable stays interpreted (slow D-pad and scrolling). Wrapping
 * large blocks here keeps each generated method small enough for the JIT.
 */
@Composable
fun SplitComposable(content: @Composable () -> Unit) {
    content()
}
