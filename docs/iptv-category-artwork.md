# IPTV Category Artwork

## Scope

StreamNet bundles local Live TV fallback artwork for cases where TMDB, TVDB, or Fanart.tv does not provide a program backdrop. The same resolver serves the TV-mode Live TV layout and the IPTV rails on Home.

Assets are stored in:

- `app/src/main/assets/iptv_category_art/`: 15 category backdrops
- `app/src/main/assets/iptv_flags/`: 255 SVG country flags

## Resolution Priority

Live TV channel cards use this order:

1. Remote current-program backdrop
2. Bundled category artwork or country flag
3. Sender logo and generated gradient

Home cards and large background surfaces use this order:

1. Remote current-program backdrop
2. Bundled category artwork
3. Sender logo for cards or the generic Live TV background for large surfaces

Country flags are deliberately excluded from the Home hero, program dialog, and Netflix Live TV info panel because they are not suitable as full-screen backdrops.

`STREAMNET RELAX` is a logo-only exception. It must never receive category artwork or a country flag, including when the selected category has country metadata.

## Category Mappings

The resolver in `LiveCategory.kt` normalizes spaces and `_`, `|`, and `:` separators before matching these groups:

| Group                                | Asset                 |
| ------------------------------------ | --------------------- |
| StreamNet 24/7                       | `streamnet_24_7.webp` |
| Magenta TV                           | `magenta_tv.webp`     |
| Sky Premium / Sky Cinema             | `sky_premium.webp`    |
| Sky F1                               | `sky_f1.webp`         |
| Sony Bad Boys                        | `sony_bad_boys.webp`  |
| UFC                                  | `ufc.webp`            |
| NFL                                  | `nfl.webp`            |
| RTL+                                 | `rtl_plus.webp`       |
| Amazon Prime / Events                | `amazon_prime.webp`   |
| DYN Sports                           | `dyn_sports.webp`     |
| Musik                                | `musik.webp`          |
| Ex-Yu                                | `ex_yu.webp`          |
| Fussball / Fußball                   | `fussball.webp`       |
| DAZN wildcard                        | `dazn.webp`           |
| Sport / Sports / Bundesliga wildcard | `sports.webp`         |

Country category names are converted to ISO codes, including provider aliases such as UK, Schweiz, Portugal, and Netherlands. UK uses `gb.svg`; Ex-Yu can use `eu.svg` where a flag is appropriate.

## Artwork Quality

Do not resize category artwork to card dimensions. The same assets can be displayed across a full-screen Home hero, so retain native resolution up to Full HD. Current Sky Premium and Musik artwork is 1920x1080; DYN Sports is 2048x1152.

Use a real high-resolution source rather than upscaling a thumbnail. WebP conversion should retain the original dimensions and use high quality. Small source images remain limited by their original detail.

## Program Artwork Matching

IPTV program titles are searched progressively, removing episode subtitles only after trying the full title. Matching normalizes localized aliases such as `Navy CIS` to `NCIS` while preserving spin-off qualifiers, so `NCIS: Origins` and `NCIS: New Orleans` outrank the base show.

The best TMDB candidate is evaluated before weaker candidates. TVDB and Fanart.tv are attempted for that candidate when TMDB lacks a usable backdrop. Negative Live TV artwork results expire after ten minutes so temporary provider failures can recover.

## TV Category Ordering

The TV settings category-order page uses the main settings scroll container. Do not add a nested fixed-height `LazyColumn`: its viewport can report focused rows as visible while the outer settings viewport hides them, causing delayed selector movement and page jumps.

Each category row registers a `settingsFocusSlot`, uses a stable playlist/group key, and draws the active accent color as a 2dp focus border with a subtle tinted background. Moving a category updates the numeric focus index so focus follows the same category identity.

## Validation

Run the focused tests with unit-test variants explicitly enabled:

```powershell
.\gradlew.bat :app:testSideloadDebugUnitTest -PenableUnitTests --tests "com.arflix.tv.ui.screens.tv.live.LiveCategoryIndexTest" --tests "com.arflix.tv.data.repository.IptvArtworkTitleTest" --tests "com.arflix.tv.ui.screens.home.HomeRowStateTest" --tests "com.arflix.tv.ui.screens.settings.SettingsIptvGroupOrderTest"
.\gradlew.bat :app:assembleSideloadDebug
```
