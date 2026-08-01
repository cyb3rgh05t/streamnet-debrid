# Branding Session Notes (2026-08-01)

## Goal
Preserve StreamNet branding while syncing with upstream code and applying UI fixes.

## Changes Applied

### 1) Startup loading screen branding
- File: app/src/main/kotlin/com/arflix/tv/MainActivity.kt
- Replaced loading logo drawable from `arvio_loading_logo` to `streamnet_tv_logo_full`.
- Updated content description from `ARVIO` to `StreamNet TV`.
- Updated splash progress line colors to StreamNet accent:
  - Base line: `#E5A209` (alpha-adjusted)
  - Sweep line: `#E5A209` (alpha-adjusted)

### 2) Reusable loading component branding
- File: app/src/main/kotlin/com/arflix/tv/ui/components/ArvioLoadingScreen.kt
- Replaced loading logo drawable from `arvio_loading_logo` to `streamnet_tv_logo_full`.
- Updated content description from `ARVIO` to `StreamNet TV`.
- Switched background usage to theme token `BackgroundDark`.
- Updated component header comment text to StreamNet wording.

### 3) Live TV accent colors (remove blue styling)
- File: app/src/main/kotlin/com/arflix/tv/ui/screens/tv/live/LiveTokens.kt
- Updated Live TV accent tokens:
  - `Accent`: `#4F7FB0` -> `#E5A209`
  - `AccentDim`: `#355578` -> `#9C7A2E`
  - `FocusBg`: `#264F7FB0` -> `#26E5A209`
- This cascades to NOW pill, active indicators, progress elements, and focused row tint in Live TV.

## Safety / Scope
- Only branding-relevant UI files were changed.
- No upstream core logic was reverted.
- Build verification was run after changes.

## Verification
- Compile check: `./gradlew :app:compilePlayDebugKotlin` -> BUILD SUCCESSFUL
- APK builds produced:
  - `app/build/outputs/apk/sideload/release/app-sideload-release.apk`
