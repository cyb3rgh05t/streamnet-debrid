package com.arflix.tv.ui.components

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString

internal fun metadataTextWithAccentSeparators(text: String, accent: Color): AnnotatedString =
    buildAnnotatedString {
        append(text)
        text.forEachIndexed { index, character ->
            if (character == '|') addStyle(SpanStyle(color = accent), index, index + 1)
        }
    }
