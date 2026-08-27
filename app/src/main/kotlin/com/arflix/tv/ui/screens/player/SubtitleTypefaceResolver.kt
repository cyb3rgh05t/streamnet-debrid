package com.arflix.tv.ui.screens.player

import android.content.Context
import android.graphics.Typeface
import androidx.annotation.FontRes
import androidx.core.content.res.ResourcesCompat
import com.arflix.tv.R

internal fun resolveSubtitleTypeface(
    context: Context,
    preference: String?,
    bold: Boolean,
): Typeface {
    val option = SubtitleFontOption.fromPreference(preference)
    @FontRes val fontRes = when (option) {
        SubtitleFontOption.SYSTEM -> null
        SubtitleFontOption.NOTO_SANS -> R.font.noto_sans_variable
        SubtitleFontOption.ATKINSON_HYPERLEGIBLE -> R.font.atkinson_hyperlegible
        SubtitleFontOption.LEXEND -> R.font.lexend_variable
        SubtitleFontOption.ROBOTO_CONDENSED -> R.font.roboto_condensed_variable
        SubtitleFontOption.NUNITO_SANS -> R.font.nunito_sans_variable
        SubtitleFontOption.QUICKSAND -> R.font.quicksand_variable
        SubtitleFontOption.RUBIK -> R.font.rubik_variable
        SubtitleFontOption.VARELA_ROUND -> R.font.varela_round_regular
    }
    val base = fontRes?.let { ResourcesCompat.getFont(context, it) } ?: Typeface.DEFAULT
    return Typeface.create(base, if (bold) Typeface.BOLD else Typeface.NORMAL)
}