package com.arflix.tv.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.arflix.tv.ui.skin.ArvioSkin
import com.arflix.tv.ui.skin.resolveAccentColor
import com.arflix.tv.ui.theme.ArflixTypography

@Composable
internal fun HeroMetadataBadge(text: String) {
    val accent = resolveAccentColor(ArvioSkin.colors.accent)
    val shape = RoundedCornerShape(6.dp)
    Text(
        text = text,
        style = ArflixTypography.caption.copy(fontSize = 12.sp, fontWeight = FontWeight.Medium),
        color = Color.White.copy(alpha = 0.94f),
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
        modifier = Modifier
            .background(Color.Black.copy(alpha = 0.62f), shape)
            .border(1.dp, accent.copy(alpha = 0.3f), shape)
            .padding(horizontal = 8.dp, vertical = 4.dp),
    )
}

internal fun metadataTextWithAccentSeparators(text: String, accent: Color): AnnotatedString =
    buildAnnotatedString {
        append(text)
        text.forEachIndexed { index, character ->
            if (character == '|') addStyle(SpanStyle(color = accent), index, index + 1)
        }
    }
