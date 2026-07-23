package com.arflix.tv.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * StreamNet TV Color Palette
 * Custom dark theme with warm amber accent
 */

// ============================================
// MAIN COLORS
// ============================================
val ArcticWhite = Color(0xFFF2F2F2)          // Main foreground #F2F2F2
val ArcticWhite90 = Color(0xE7F2F2F2)        // 90% opacity
val ArcticWhite70 = Color(0xB3F2F2F2)        // 70% opacity
val ArcticWhite50 = Color(0x80F2F2F2)        // 50% opacity
val ArcticWhite30 = Color(0x4DF2F2F2)        // 30% opacity
val ArcticWhite12 = Color(0x1FF2F2F2)        // 12% opacity

val ArcticBlack = Color(0xFF141414)          // Base background #141414
val ArcticBlack90 = Color(0xE7141414)        // 90% opacity
val ArcticBlack70 = Color(0xB3141414)        // 70% opacity
val ArcticBlack50 = Color(0x80141414)        // 50% opacity
val ArcticBlack30 = Color(0x4D141414)        // 30% opacity
val ArcticBlack12 = Color(0x1F141414)        // 12% opacity

val ArcticGray = Color(0xFF1F1F1F)           // Elevated neutral #1F1F1F
val ArcticGrayLight = Color(0xFFBDBDBD)      // Subtle neutral text

// ============================================
// ACCENT COLORS
// ============================================
val AccentWhite = Color(0xFFFFFFFF)          // Pure white for focus
val AccentYellow = Color(0xFFE5A209)         // Brand accent
val AccentYellowBright = Color(0xFFF2B01F)   // Hover/focus bright state
val AccentYellowSoft = Color(0x4DE5A209)     // 30% overlay/tint
val AccentYellowMuted = Color(0xFF9C7A2E)    // Disabled accent state
val AccentGreen = Color(0xFF00D588)          // Original success tone

// Legacy aliases for compatibility
val PrimeBlue = ArcticWhite
val PrimeBlueDark = ArcticGray
val PrimeBlueLight = AccentWhite
val PrimeBlueGlow = Color(0x33FFFFFF)
val PrimeGreen = AccentGreen
val RankNumberColor = ArcticWhite70

val PurplePrimary = ArcticWhite
val PurpleLight = AccentWhite
val PurpleDark = ArcticGray
val PurpleDeep = ArcticBlack
val PurpleGlow = Color(0x33FFFFFF)
val PurpleSoft = ArcticWhite70

val Cyan = ArcticWhite
val CyanDark = ArcticGray
val CyanGlow = Color(0x33FFFFFF)

val Purple = ArcticWhite
val PurpleAccent = ArcticWhite

val Pink = AccentWhite
val PinkDark = ArcticGray
val PinkGlow = Color(0x33FFFFFF)

// Gradient combinations (minimal)
val GradientStart = Color(0xFF141414)
val GradientMiddle = Color(0xFF1A1A1A)
val GradientEnd = Color(0xFF1F1F1F)

// ============================================
// BACKGROUND COLORS (App Background)
// ============================================
val BackgroundDark = Color(0xFF141414)        // #141414
val BackgroundCard = Color(0xFF1A1A1A)        // Mid surface
val BackgroundElevated = Color(0xFF1F1F1F)    // Elevated surfaces #1F1F1F
val BackgroundOverlay = BackgroundDark.copy(alpha = 0.90f)
val BackgroundGlass = BackgroundDark.copy(alpha = 0.60f)

// Gradient backgrounds
val BackgroundGradientStart = BackgroundDark
val BackgroundGradientCenter = BackgroundDark
val BackgroundGradientMiddle = BackgroundDark
val BackgroundGradientEnd = BackgroundDark

// ============================================
// SURFACE COLORS
// ============================================
val SurfaceDark = BackgroundDark
val SurfaceVariant = BackgroundElevated
val SurfaceGlass = Color(0x66141414)

// ============================================
// TEXT COLORS (Light Gray #EDEDED)
// ============================================
val TextPrimary = ArcticWhite                 // #EDEDED
val TextSecondary = ArcticWhite70             // 70% opacity
val TextTertiary = ArcticWhite50              // 50% opacity
val TextDisabled = ArcticWhite30              // 30% opacity

// ============================================
// BORDER COLORS
// ============================================
val BorderLight = ArcticWhite12               // 12% white
val BorderMedium = ArcticWhite30              // 30% white
val BorderGradient = AccentYellowSoft         // Accent-tinted border

// ============================================
// STATUS COLORS
// ============================================
val SuccessGreen = AccentGreen
val ErrorRed = Color(0xFFE74C3C)
val WarningOrange = Color(0xFFF39C12)
val InfoBlue = Color(0xFFEDEDED)
val OngoingBlue = Color(0xFFEDEDED)

// ============================================
// SPECIAL COLORS
// ============================================
val ImdbYellow = Color(0xFFFFCD3C)            // Original star ratings yellow
val AccentRed = Color(0xFFE53935)

// ============================================
// FOCUS & GLOW STATES (Kodi Inspired)
// ============================================
val KodiMagenta = Color(0xFFFC1C8E)           // Pink focus indicator
val KodiPurple = Color(0xFFB64BFF)            // Purple card border
val FocusRing = AccentYellow                  // Brand focus indicator
val FocusGlow = AccentYellow.copy(alpha = 0.28f)
val FocusShadowColor = Color(0x40000000)
val FocusGradientStart = AccentYellowBright
val FocusGradientEnd = AccentYellow

// ============================================
// PARTICLE/EFFECT COLORS
// ============================================
val ParticleCyan = ArcticWhite30
val ParticlePurple = ArcticWhite12
val ParticlePink = ArcticWhite30
val ParticlePurpleLight = ArcticWhite50
val ParticlePurpleDark = ArcticBlack50

// ============================================
// LEGACY ALIASES
// ============================================
val ArvioAccent = ArcticWhite
val ArvioPurple = ArcticBlack
val ArvioLight = ArcticWhite70

