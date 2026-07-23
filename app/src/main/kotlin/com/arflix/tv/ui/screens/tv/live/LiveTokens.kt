package com.arflix.tv.ui.screens.tv.live

import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.arflix.tv.ui.skin.resolveAccentColor
import com.arflix.tv.ui.theme.InterFontFamily

// StreamNet TV Live TV — design tokens. OKLCH reference kept in spec.md §2.
// Mapped from handoff/tokens.kt. `InterFontFamily` ships; JetBrains Mono
// falls back to system Monospace (Inter's tabular figures are acceptable
// for the numeric/badge slots; can swap for bundled JBMono later).

object LiveColors {
    // StreamNet dark palette aligned with the rest of the app.
    val Bg           = Color(0xFF141414)
    val Panel        = Color(0xFF1A1A1A)
    val PanelDeep    = Color(0xFF101010)
    val PanelRaised  = Color(0xFF1F1F1F)
    val RowStripe    = Color(0xFF171717)

    val Divider       = Color(0x99FFFFFF).copy(alpha = 0.08f)
    val DividerStrong = Color(0xFFE5A209).copy(alpha = 0.22f)

    val Fg     = Color(0xFFF5F5F8)
    val FgDim  = Color(0xFFB5B6BE)
    val FgMute = Color(0xFF7D7E86)

    // StreamNet gold/orange accent for NOW pills, progress bars and active states.
    val Accent    = Color(0xFFE5A209)
    val AccentDim = Color(0xFFCE8017)
    val FocusBg   = Color(0x26E5A209)

    // Default focus ring fallback; components should prefer liveFocusRingColor().
    val FocusRing = Color(0xFFFF8800)

    val LiveRed = Color(0xFFFF3B30)
    val Online  = Color(0xFF4ADE80)

    data class Brand(val bg: Color, val fg: Color)
    val BrandNews    = Brand(Color(0xFF5A1F1F), Color(0xFFFFE4D1))
    val BrandSport   = Brand(Color(0xFF4E3A13), Color(0xFFFFF0CF))
    val BrandMovies  = Brand(Color(0xFF2A1C08), Color(0xFFFFD27A))
    val BrandSeries  = Brand(Color(0xFF3A240A), Color(0xFFFFE0A8))
    val BrandKids    = Brand(Color(0xFFE5A209), Color(0xFF1A1308))
    val BrandMusic   = Brand(Color(0xFF5C3510), Color(0xFFFFE0B8))
    val BrandDocs    = Brand(Color(0xFF3B341D), Color(0xFFF8EBCB))
    val BrandGeneral = Brand(Color(0xFF33260F), Color(0xFFFFE7BF))
}

val LiveMono: FontFamily = InterFontFamily

object LiveType {
    // v4 — minimum readable at 10ft. 7sp is the absolute floor for the
    // tightest tags/badges; no higher than 11sp anywhere on the TV page.
    val ChannelName  = TextStyle(fontFamily = InterFontFamily, fontSize = 11.sp, fontWeight = FontWeight.W600, letterSpacing = 0.sp, lineHeight = 14.sp)
    val ProgramTitle = TextStyle(fontFamily = InterFontFamily, fontSize = 10.sp, fontWeight = FontWeight.W500, letterSpacing = 0.sp, lineHeight = 13.sp)
    val CellTitle    = TextStyle(fontFamily = InterFontFamily, fontSize = 9.sp, fontWeight = FontWeight.W500, letterSpacing = 0.sp, lineHeight = 12.sp)
    val BodySynopsis = TextStyle(fontFamily = InterFontFamily, fontSize = 8.sp, fontWeight = FontWeight.W400, letterSpacing = 0.sp, lineHeight = 11.sp)
    val CatLabel     = TextStyle(fontFamily = InterFontFamily, fontSize = 9.sp, fontWeight = FontWeight.W500, letterSpacing = 0.sp, lineHeight = 12.sp)
    val SectionTag   = TextStyle(fontFamily = InterFontFamily, fontSize = 8.sp, fontWeight = FontWeight.W600, letterSpacing = 0.sp, lineHeight = 11.sp)
    val Badge        = TextStyle(fontFamily = InterFontFamily, fontSize = 8.sp, fontWeight = FontWeight.W600, letterSpacing = 0.sp, lineHeight = 11.sp)
    val TimeMono     = TextStyle(fontFamily = InterFontFamily, fontSize = 8.sp, fontWeight = FontWeight.W500, letterSpacing = 0.sp, lineHeight = 11.sp)
    val NumberMono   = TextStyle(fontFamily = InterFontFamily, fontSize = 8.sp, fontWeight = FontWeight.W500, letterSpacing = 0.sp, lineHeight = 11.sp)
}

object LiveDims {
    // v3 — another ~30 % shrink. ~17 channel rows + mini-player fit on 1080 p.
    // 240 dp so the longest labels ("United Kingdom", "Czech Republic",
    // "South Africa") render fully without ellipsis.
    val SidebarExpanded  = 240.dp
    val SidebarCollapsed = 52.dp
    val SidebarRowHeight = 26.dp

    val MiniPlayerWidth  = 360.dp
    val MiniPlayerHeight = 202.dp

    val EpgChannelColWidth = 220.dp
    val EpgRowHeight       = 42.dp
    val EpgHeaderHeight    = 26.dp
    val EpgPxPerMinute     = 4
    val EpgHalfHourWidth   = 120.dp

    val PanelRadius     = 12.dp
    val CardRadius      = 10.dp
    val CellRadius      = 6.dp
    val VideoRadius     = 12.dp
    val FocusBorder     = 2.dp
    val ActiveIndicator = 3.dp
}

val LocalLiveColors = staticCompositionLocalOf { LiveColors }
val LocalLiveType   = staticCompositionLocalOf { LiveType }
val LocalLiveDims   = staticCompositionLocalOf { LiveDims }

@Composable
fun liveAccentColor(): Color = resolveAccentColor(fallback = LiveColors.Accent)

@Composable
fun liveFocusRingColor(): Color = resolveAccentColor(fallback = LiveColors.FocusRing)

