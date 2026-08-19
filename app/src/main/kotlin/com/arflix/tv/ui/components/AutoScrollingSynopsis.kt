package com.arflix.tv.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.tv.material3.Text
import kotlinx.coroutines.delay

/**
 * Keeps a synopsis in a fixed-height viewport and only scrolls when its full
 * content overflows that viewport.
 */
@Composable
fun AutoScrollingSynopsis(
    text: String,
    style: TextStyle,
    color: Color,
    modifier: Modifier = Modifier,
) {
    val scrollState = rememberScrollState()
    val scrollDownDurationMillis = remember(scrollState.maxValue) {
        (scrollState.maxValue * 250).coerceIn(22_000, 55_000)
    }
    val scrollUpDurationMillis = remember(scrollState.maxValue) {
        (scrollState.maxValue * 55).coerceIn(4_000, 12_000)
    }

    LaunchedEffect(text) {
        scrollState.scrollTo(0)
        delay(4_000)
        while (true) {
            val maxScroll = scrollState.maxValue
            if (maxScroll == 0) {
                delay(300)
                continue
            }
            scrollState.animateScrollTo(
                maxScroll,
                tween(durationMillis = scrollDownDurationMillis, easing = LinearEasing)
            )
            delay(2_000)
            scrollState.animateScrollTo(0, tween(scrollUpDurationMillis))
            delay(2_500)
        }
    }

    Text(
        text = text,
        style = style,
        color = color,
        modifier = modifier
            .clipToBounds()
            .verticalScroll(scrollState, enabled = false),
    )
}