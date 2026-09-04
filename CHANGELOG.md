# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

## [2.3.001] - 2026-09-04

### Cloud and account reliability

- Protected Trakt, Simkl, and MDBList provider choices and credentials with per-profile timestamps so older devices and legacy cloud payloads cannot overwrite newer selections or credential removals.
- Preserved the preferred tracking provider when another provider is connected and repaired read modes only when their selected provider is unavailable.
- Debounced rapid Settings cloud updates and contained unexpected push, restore, and authentication errors at the Settings boundary.
- Prevented failed HTTP responses from being cached and initialized shared networking early enough for startup consumers.

### Home Server and Home

- Limited Plex, Jellyfin, and Emby Home catalogs to real movie and series libraries, excluding collections, box sets, music, photos, and mixed views.
- Added profile-synced per-server library visibility controls for TV and touch Settings, with stale or disabled catalogs removed from Home.
- Reorganized Home Server Settings into add, connected-server, library, and server-action sections and corrected the connected-server status badge.
- Preserved usable cached Home rows during refreshes and added a six-hour stale refresh instead of repeatedly replacing loaded content.

### IPTV and Live TV

- Added profile-synced StreamNet movie and series category visibility while keeping search, playback sources, and other Xtream playlists unaffected.
- Reorganized IPTV Settings into a Playlists section with a subsection for every playlist and separate Live and VOD category controls.
- Preserved the selected Live TV group and channel across playlist refreshes and Settings navigation.
- Fixed green preview artifacts after leaving fullscreen by enforcing exclusive ExoPlayer surface ownership.

### Interface and updates

- Unified toast height and bottom placement above navigation controls and reused the themed notification surface for IPTV progress.
- Applied the selected accent theme to Plugin dialogs and localized Plugin status messages and tracker list labels.
- Kept GitHub release notes visible throughout download, retry, and installation-ready states in the update dialog.
- Updated the Android release workflow to generate release notes and backfill empty descriptions on existing releases.
- Improved Home navigation fallback and English trailer fallback without overriding explicitly requested video languages.

### Validation

- Added regression coverage for Home Server library filtering, IPTV VOD category visibility, legacy catalog compatibility, and timestamp-aware sync-provider state.
- Validated the Sideload Kotlin build, enabled Sideload unit-test suite, Debug APK assembly, IDE diagnostics, and whitespace checks.

### Settings visual consistency

- Added semantic leading icons throughout TV Settings, including toggles, actions, account integrations, custom playlists, catalogs, and plugin scraper controls.
- Standardized TV Settings icon sizing, spacing, neutral tint, and selected-theme accent treatment across shared and custom rows.
- Unified in-app toast styling with the active profile accent, OLED-aware background, and bottom-center placement; Player match results and Telegram/update events now use the same presentation while the app is visible.
- Removed the redundant inner focus border from Addon switches while preserving the full-row focus indicator and D-pad actions.
- Applied the selected theme accent to Addon refresh/install actions and the AI model selection dialog.
- Localized StreamNet credential placeholders and the default Settings input placeholder in English and German.
- Bumped the Android application to `2.2.005` (`versionCode` 380).
- Documented implementation behavior and validation in `docs/superpowers/settings-visual-consistency-2026-09-03.md`.

### Playback, IPTV, Search, and portal polish

- Automatically selects an embedded forced subtitle matching the active audio language even when normal subtitles are set to Off, while preserving explicit manual subtitle choices.
- Invalidates Home logo caches when the content language changes so Home and Details prefer the same localized artwork.
- Added a profile-scoped, cloud-synced IPTV VOD search toggle that controls Xtream movie/series source lookup and cache warmup without affecting Live TV or configured playlists.
- Improved IPTV-only Home matching with TMDB ID, IMDb ID, and release-year checks before falling back to normalized titles.
- Kept loaded Home cards visible during pagination and prevented focus restoration from landing on paging placeholders.
- Improved Xtream catalog reliability by using the long-running IPTV HTTP client and removing short nested lookup timeouts from full-catalog fallbacks.
- Fixed TV Search filter activation, persistent selection, Anime filtering, and active-accent styling across common remote Enter key variants.
- Reorganized TV playlist settings with a dedicated section heading, consistent icons and focus styling, and the destructive playlist deletion action last.
- Made loading feedback immediate during IPTV setup and positioned toast notifications above system navigation insets.
- Corrected mobile content ordering on the self-hosted Privacy and Cloud account pages while leaving account deletion flow unchanged.
- Bumped the Android application to `2.2.004` (`versionCode` 379).
- Documented implementation behavior and validation in `docs/superpowers/playback-iptv-search-polish-2026-09-03.md`.

### IPTV-only home and Xtream VOD

- Added a profile-scoped IPTV-only mode for TV, tablet, and phone that filters the Home presentation without deleting configured catalogs or cached data.
- Added provider-grouped Xtream movie and series rails, including stable unresolved identities for entries without TMDB IDs and lazy metadata resolution when cards are focused or opened.
- Kept Continue Watching visible while IPTV-only mode is active and while provider availability is still loading.
- Fixed unresolved Xtream VOD playback classification and progress persistence so negative local identities are not mistaken for Live TV.
- Allowed the self-hosted watch-history API to synchronize negative identities only for the dedicated `iptv_xtream_vod` source while continuing to reject zero or unrelated negative IDs.
- Hardened selective IPTV playlist imports and legacy playlist activation behavior, with focused regression coverage.

### Touch and Live TV experience

- Added a larger landscape-tablet Live TV preview and a height-matched TV-style current/upcoming-program panel while keeping categories and the EPG grid visible.
- Removed the red LIVE badge from phone and tablet EPG cells while retaining it on TV.
- Applied the selected accent theme to the touch Search field, cursor, loading indicators, and selected filter chips.
- Refined collection and Home behavior for IPTV-only projection, card focus prefetch, and provider artwork fallback.

### Self-hosted account portal

- Localized known browser-facing authentication, pairing, password, deletion, and Discord errors in German while keeping the backend API contract language-neutral.
- Unified sign-in, privacy, account deletion, and Discord pages around the StreamNet dark/gold visual system and shared language preference.
- Rebuilt privacy and account deletion pages with the same standalone language switch and in-shell logo structure as the main account page, without navigation bars.
- Made the privacy policy mobile-safe, including contained horizontal scrolling for wide data tables and overflow checks across phone and desktop viewports.
- Added public-page regression tests for German errors, responsive styling, and shared StreamNet branding.

### Release

- Bumped the Android application to `2.2.003` (`versionCode` 378).
- Documented implementation boundaries, validation, and merge-preservation guidance in `docs/superpowers/iptv-only-vod-and-portal-2026-09-02.md`.

### Cloud session reliability

- Made TV pairing token delivery atomic so overlapping status polls cannot receive the same refresh token.
- Prevented a delayed refresh rejection from clearing a newer session that another request already stored.

### Live TV category artwork and settings focus

- Added 15 bundled category backdrops and 255 SVG country flags for Live TV, with provider/category-aware mappings and country aliases.
- Applied non-flag category artwork to Home Favorite TV and Recently Watched TV cards, Home hero, and the IPTV program dialog while preserving remote program artwork as the first choice.
- Applied category artwork to the TV-mode Netflix Live TV channel cards and info panel; country flags remain card-only and are never stretched across hero/info backgrounds.
- Kept `STREAMNET RELAX` on the sender-logo fallback without category artwork or country flags.
- Improved TMDB, TVDB, and Fanart.tv matching with staged title queries, spin-off-aware scoring, `Navy CIS` canonicalization, and retryable negative artwork caching.
- Reworked TV IPTV category ordering to use the single outer settings scroller, retain focus on the moved category, reset inherited scroll state, and show an accent-colored focused-row selector without hidden rows or page jumps.
- Added focused regression coverage for category/flag resolution, Home artwork eligibility, IPTV title matching, category ordering, and focus movement.

### Cloud sessions, TV metadata, and IPTV artwork

- Kept a persisted StreamNet Cloud session during temporary token-refresh or network failures while still signing out sessions that are definitively expired, rejected, or missing a refresh token.
- Improved TV metadata localization by retaining app-language fields and filling only missing values from English TMDB details.
- Ranked TV logos by app language, English, then neutral artwork; ranked backdrops by neutral, app language, then English artwork.
- Cleaned episode suffixes and preserved diacritics during IPTV artwork matching so localized EPG titles resolve more reliably.
- Searched both TMDB movie and TV results for IPTV artwork and used EPG duration as a soft type hint. Long exact-title programs now prefer a movie result, preventing titles such as `Rambo` from resolving to a same-named TV series.
- Passed EPG start/end times through Home hero, Home IPTV cards, and Live TV cards, and separated movie-like artwork cache entries from mixed searches.

### Startup, updates, and validation

- Restored the currently playing Live TV channel rather than a merely browsed channel and retained the remembered channel while asynchronous playlists are still loading.
- Refreshed the series play target on the first real return from the player, so completing episode 9 updates the Details button to episode 10 instead of leaving the stale episode 9 label visible.
- Kept a newly selected, unstarted Up Next episode in the Home Continue Watching rail when a stale remote entry for the previous episode still exists.
- Limited automatic signed Android builds to pushes that change `versionCode` or `versionName`; manual workflow runs remain available.
- Made automatic update checks open newly available, non-ignored releases while manual checks can still reopen an ignored release.
- Added regression coverage for Cloud startup sessions, localized artwork ordering, ambiguous movie/TV IPTV titles, Live TV restoration, and update-dialog behavior.
- Validated the official `2.1.105` Android build with the full opt-in Sideload Debug unit-test task and APK assembly.

### Media3 1.10.1 evaluation

- Promoted the tested Media3 `1.10.1` dependency set to the official `2.1.107` build after evaluation on `test/media3-1.10.1`.
- Updated the Media3 ExoPlayer, HLS, DASH, OkHttp datasource, UI, session, and common modules to `1.10.1`.
- Kept Jellyfin's FFmpeg extension at `1.9.0+1` because no matching `1.10.1` artifact is available, and kept the custom Dolby Vision Matroska extractor based on Media3 `1.9.0` pending device playback validation.
- Confirmed that the Media3 test branch passes Sideload Debug unit tests and builds an APK. The real-device Dolby Vision, DTS/TrueHD/Atmos, HLS, DASH, seeking, subtitles, and fallback checklist remains documented for compatibility tracking.
- Documented the branch matrix, Cloud/proxy feature flags, expected Media3 benefits, compatibility boundaries, and test checklist in `docs/media3-1.10.1-evaluation.md`.

### APK size and build compatibility

- Reduced the default universal APK from 206.58 MB to 115.25 MB by packaging 32-bit and 64-bit ARM libraries while retaining optional x86/x86_64 emulator builds through `-PincludeX86Abis=true`.
- Converted 109 unchanged avatar, ranking, and sports images to WebP while preserving both custom StreamNet launcher banners byte-for-byte.
- Enabled release resource shrinking; the validated ARM sideload release is 90.73 MB and retains the StreamNet banners and referenced avatar, ranking, and sports resources.

### Settings, updates, and feedback

- Split TV settings into dedicated `Profile > Cloud Sync` and `System > Info & Updates` sections while keeping tracking providers under Accounts.
- Made update indicators reflect the actual GitHub release check instead of merely showing that self-updates are supported.
- Added visible Home Server code-pairing phases for approval, server discovery, connection, library loading, and final setup.
- Moved app toast notifications into a non-interactive overlay window so status and error messages remain visible above open dialogs without blocking touch or D-pad input.
- Removed the unreliable launch-after-device-start setting, receiver, permission, persisted preference, and cloud-sync field.

### StreamNet Cloud, profiles, and account safety

- Added rotating mixed movie and series artwork to the startup loading screen and profile selection, changing every five seconds from one shared preload pool.
- Simplified profile selection by removing the heading and outer profile container, and added a compact, D-pad-focused `myStreamNet Cloud` action beneath the StreamNet TV logo.
- Rebranded visible cloud-service references as StreamNet Cloud and introduced the StreamNet Club logo across the self-hosted sign-in, privacy, deletion, and success pages.
- Improved sign-in and expired-session handling so invalid StreamNet Cloud credentials and revoked sessions produce clearer errors and stale local authentication is removed.
- Hardened permanent account deletion so account sessions, snapshots, pairing sessions, usage events, watch history, and watch state are removed transactionally; added PostgreSQL cascade constraints and regression tests.

### Home and IPTV interaction

- Added a themed, D-pad-isolated IPTV program information dialog with backdrop, logo, metadata, current-program details, playback, and favorite actions.
- Added IPTV program details and favorite toggling to media context menus and kept Home row state stable when guide data changes.
- Refined mobile error presentation and updated Home startup selection to prefer the first visible configured rail.

### Cloud migration and localization

- Switched production Android release builds to the self-hosted StreamNet backend at `auth.mystreamnet.club`.
- Documented the verified migration of 10 Netlify accounts and 5 self-hosted snapshots, including multi-profile data and zero orphaned snapshots.
- Localized hardcoded Android toast notifications through English and German resource variants.

### Added

- Added an IPTV setting to show or hide the Live TV special categories (All Channels and Recently Watched), including TV and mobile settings UI and persisted per-profile behavior.
- Added a protected StreamNet TV playlist preset that is ready on fresh profiles, keeps its configured host out of the settings UI, and connects with each user's personal username and password.
- Migrated existing manual StreamNet TV logins to the preset and corrected the playlist capacity badge to count only configured sources out of the three available slots.

### Live TV, IPTV, and focus

- Reduced Live TV selector border thickness to 1dp across category sidebar, channel list, search results, and EPG program cells for TV mode.
- Restored and hardened Live TV startup focus so it lands on the selected/remembered category instead of falling into Search.
- Enforced explicit-only Search focus in the category sidebar so Search only takes focus when intentionally opened.
- Restored the Live TV Netflix category and channel rails to the currently playing sender after switching screens or restarting the app.
- Preserved playlist category ordering and hidden-category preferences across the StreamNet TV preset migration, profiles, and cloud-synced devices.
- Prevented the mobile Live TV guide from reusing a smaller previous category window while a newly selected category is loading.
- Updated mini-player side EPG info to follow the currently focused channel while scrolling the channel list up/down.
- Improved Xtream EPG mapping, description retention, visible-channel retries, and authenticated XMLTV fallback so Home and Live TV show consistent rich guide data.
- Made manual playlist refresh publish channel changes immediately and force a complete EPG refresh while preserving existing data during transient failures.
- Refined the TV-mode Live TV hero and channel cards with larger sender logos, TMDB-aware logo backdrops, compact upcoming-program rows, and clearer refresh status.

### Home and watchlist

- Restored automatic update dialogs for newly available, non-ignored app releases after the update setting move.
- Restyled Library provider and action controls, including My Watchlist, as accent-themed pill buttons with focused and selected states.
- Disabled Live TV hero autoplay for Favorites and Recently Watched TV rails while preserving artwork, guide information, and manual playback.
- Matched Home IPTV cards to the Live TV artwork treatment and restored MGM+ service artwork with a valid landscape source.
- Fixed removing the final watchlist item leaving a stale card visible until navigating away.
- Synchronized watchlist additions and removals from Home, Details, and Watchlist as authoritative local cloud snapshots, with retryable failure reporting.
- Marked movies and episodes watched automatically at 90% playback or completion while preserving local, Supabase, Trakt, Simkl, and MDBList synchronization.
- Prevented manually watched movies and episodes from returning to Continue Watching with stale progress. Exact timestamped removal markers now merge across devices, while the next episode remains eligible for Up Next.
- Improved Home startup with profile-scoped catalog placeholders, removed trailing skeletons from static collection rails, and kept the mobile profile/search header visible without Continue Watching.
- Disabled hidden IPTV and collection-preview playback on touch devices and delayed TV preview audio/video reveal until the first rendered frame.
- Moved bundled collection artwork and converted H.264 intro videos to an immutable StreamNet-owned asset revision for reliable cache invalidation.
- Localized Continue Watching episode/resume and remaining-time badges in German.

### Player and subtitles

- Skipped subtitle timing scans for exact release-name matches and improved detection and fallback for embedded PGS, VobSub, and DVB bitmap subtitles used with AI translation.
- Persisted movie and episode watched state locally and to the account snapshot before optional external-provider scrobbling.

### Localization

- Added new IPTV sort/special-category labels to string resources and added German translations for the new settings text.
- Added German Continue Watching remaining-time and episode resume labels.

### Device startup, playback, and launcher integration

- Prevented automatic next-episode playback when the next episode is unaired or its TMDB air-date metadata is unavailable; manual episode navigation remains available.
- Added original-title matching to Telegram movie and series searches so foreign-language filenames and captions resolve reliably alongside English and localized titles.
- Added compact landscape layouts for small touch phones: the bottom navigation and Live TV mini-player now use fixed responsive dimensions while portrait, tablet, and TV layouts remain unchanged.
- Aligned Google TV Continue Watching subtitles with the in-app card, including the localized S1E1 start label; launcher artwork, progress, ordering, and deep links remain profile-scoped.
- Kept Media3/ExoPlayer pinned to `1.9.0`; updates require a new APK build because the vendored Dolby Vision Matroska extractor must be reviewed with every Media3 bump.
