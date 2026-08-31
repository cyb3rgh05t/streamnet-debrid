# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

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
- Made automatic update checks open newly available, non-ignored releases while manual checks can still reopen an ignored release.
- Added regression coverage for Cloud startup sessions, localized artwork ordering, ambiguous movie/TV IPTV titles, Live TV restoration, and update-dialog behavior.
- Validated the official `2.1.105` Android build with the full opt-in Sideload Debug unit-test task and APK assembly.

### Media3 1.10.1 evaluation

- Added the isolated `test/media3-1.10.1` branch with version name `2.1.105-media3-test`; the official `main` branch remains on Media3 `1.9.0`.
- Updated the Media3 ExoPlayer, HLS, DASH, OkHttp datasource, UI, session, and common modules to `1.10.1` on the test branch.
- Kept Jellyfin's FFmpeg extension at `1.9.0+1` because no matching `1.10.1` artifact is available, and kept the custom Dolby Vision Matroska extractor based on Media3 `1.9.0` pending device playback validation.
- Confirmed that the Media3 test branch passes Sideload Debug unit tests and builds an APK. Real-device Dolby Vision, DTS/TrueHD/Atmos, HLS, DASH, seeking, subtitles, and fallback behavior remain the promotion gate.
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
