package com.arflix.tv.ui.screens.tv.live

import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.arflix.tv.ui.skin.resolveAccentColor
import com.arflix.tv.ui.theme.InterFontFamily
import com.arflix.tv.ui.theme.LocalArvioColors
import com.arflix.tv.ui.theme.appBackgroundDark

// StreamNet Live TV — design tokens. OKLCH reference kept in spec.md §2.
// Mapped from handoff/tokens.kt. `InterFontFamily` ships; JetBrains Mono
// falls back to system Monospace (Inter's tabular figures are acceptable
// for the numeric/badge slots; can swap for bundled JBMono later).

object LiveColors {
    private val AccentFallback = Color(0xFFE5A209)

    // Unified near-black palette so the AppTopBar gradient blends cleanly
    // into the TV page. Each step lifts just a few lumens above the last —
    // enough for panels/cells to pop without creating a visible seam under
    // the top bar.
    val Bg: Color
        @Composable
        get() = appBackgroundDark()

    val Panel: Color
        @Composable
        get() = lerp(Bg, Color.White, 0.05f)

    val PanelDeep: Color
        @Composable
        get() = lerp(Bg, Color.Black, 0.18f)

    val PanelRaised: Color
        @Composable
        get() = lerp(Bg, Color.White, 0.10f)

    val RowStripe: Color
        @Composable
        get() = lerp(Bg, Color.White, 0.03f)

    val Divider: Color
        @Composable
        get() = LocalArvioColors.current.borderLight.copy(alpha = 0.45f)

    val DividerStrong: Color
        @Composable
        get() = LocalArvioColors.current.borderLight.copy(alpha = 0.78f)

    val Fg: Color
        @Composable
        get() = LocalArvioColors.current.textPrimary

    val FgDim: Color
        @Composable
        get() = LocalArvioColors.current.textSecondary

    val FgMute: Color
        @Composable
        get() = LocalArvioColors.current.textTertiary

    // LiveTV accent follows the user-selected Accent Color from Settings.
    // If none is selected, fall back to StreamNet brand yellow.
    val Accent: Color
        @Composable
        get() = resolveAccentColor(fallback = AccentFallback)

    // Slightly dimmed accent for less prominent accents on dark surfaces.
    val AccentDim: Color
        @Composable
        get() = lerp(Accent, Panel, 0.34f)

    // Accent-tinted row background for active/focused states.
    val FocusBg: Color
        @Composable
        get() = Accent.copy(alpha = 0.15f)

    // Focus ring color — follows the user-selected accent color.
    val FocusRing: Color
        @Composable
        get() = Accent

    val LiveRed = Color(0xFFFF3B30)
    val Online  = Color(0xFF4ADE80)

    data class Brand(val bg: Color, val fg: Color)
    val BrandNews    = Brand(Color(0xFF8A2F2F), Color(0xFFFDE7D4))
    val BrandSport   = Brand(Color(0xFF0B6131), Color(0xFFEAFFF1))
    val BrandMovies  = Brand(Color(0xFF1A1A2E), Color(0xFFF5C26B))
    val BrandSeries  = Brand(Color(0xFF3A1552), Color(0xFFE9D2FF))
    val BrandKids    = Brand(Color(0xFFF3B13A), Color(0xFF1A1308))
    val BrandMusic   = Brand(Color(0xFF2A2A6E), Color(0xFFC8D4FF))
    val BrandDocs    = Brand(Color(0xFF1D3F3A), Color(0xFFCFE9E3))
    val BrandGeneral = Brand(Color(0xFF1B2B5A), Color(0xFFE8EFFB))
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

    val MiniPlayerWidth  = 300.dp
    val MiniPlayerHeight = 168.dp

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
