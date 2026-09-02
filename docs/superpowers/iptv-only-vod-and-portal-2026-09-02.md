# IPTV-only, Xtream VOD, and account portal update

Date: 2026-09-02

Release: Android `2.2.003` (`versionCode` 378)

## Scope

This update connects four related StreamNet surfaces:

- IPTV-only Home behavior and profile settings.
- Browsable Xtream movie and series catalogs, including entries without TMDB IDs.
- Continue Watching and self-hosted watch-history synchronization for Xtream VOD.
- Touch/Live TV polish and the self-hosted StreamNet account website.

The production cloud remains the self-hosted service at `https://auth.mystreamnet.club` with PostgreSQL. Netlify and Supabase are not runtime dependencies.

## IPTV-only Home

IPTV-only mode is stored per profile in the IPTV configuration and travels inside the existing cloud snapshot. Enabling it changes only the Home presentation. It must not remove or rewrite catalog configuration, collection state, or disk caches.

The projected Home keeps IPTV Live TV rails, Xtream VOD rails, and Continue Watching. Other recommendation and collection rails are hidden until the mode is disabled. Continue Watching is retained before Xtream availability finishes loading so startup cannot temporarily remove the row.

Adding a configured non-IPTV VOD addon disables IPTV-only mode, avoiding a state where newly configured content appears to be missing.

## Xtream VOD catalogs and identity

Xtream movies and series are exposed as separate provider-category Home rails. Provider artwork is retained as the immediate card fallback. Items with a usable TMDB identity enter the existing Details and playback flow directly.

Many provider entries have no TMDB or IMDb identity. These receive deterministic negative local IDs and a dedicated unresolved VOD marker. Focus/open requests resolve only the relevant titles through TMDB, deduplicate concurrent lookups, and replace resolved cards while preserving provider artwork. TV focus prefetch includes the focused title and nearby cards so hero/backdrop imagery arrives without resolving the complete provider catalog.

Negative identity does not mean Live TV. Live classification must continue to rely on explicit live markers such as `iptv:`, `live:`, `channel:`, the zero sentinel, and known live addons. The `iptv_xtream_vod` addon ID is explicitly VOD.

## Progress and cloud synchronization

Unresolved Xtream entries can save local playback progress and appear in Continue Watching. The self-hosted watch-history endpoint accepts:

- Positive integer media IDs for normal history.
- Negative integer IDs only when `stream_addon_id` is exactly `iptv_xtream_vod`.

ID zero, incomplete identities, and negative IDs from other sources remain invalid. This keeps unresolved provider identities syncable without widening the API contract to arbitrary negative IDs.

## Live TV and Search UX

Landscape touch devices with at least 900 dp effective width use the tablet Live TV mini-player layout. Its preview is larger, and the adjacent information panel matches its height while showing current program details, progress, and up to two deduplicated upcoming programs. Categories and the EPG remain visible below it.

Phone and tablet EPG cells omit the red LIVE badge; TV retains the badge. The touch Search field, cursor, loading indicators, and selected filter chips resolve the active profile accent instead of using hardcoded pink/white focus colors.

## Self-hosted web portal

Browser pages translate known API error strings at the presentation boundary. API payloads remain stable English machine messages, and unknown external messages remain visible for diagnosis.

The following pages share the StreamNet dark/gold palette, typography, card geometry, logo treatment, and persisted `streamnet:lang` preference:

- Main account sign-in and TV pairing.
- Privacy policy.
- Permanent account deletion.
- Discord authorization start and callback.

Privacy and account deletion intentionally have no navigation bar. Like the main page, they show a standalone language switch above a rounded content shell and place the StreamNet Club logo inside that shell. Wide privacy tables scroll within their card on small viewports and must never enlarge the document width.

## Tests and validation

Relevant automated coverage includes:

- Active IPTV playlist and selective import behavior.
- Xtream VOD availability and stream-addon routing.
- IPTV-only Home projection and Continue Watching retention.
- Live TV tablet layout selection and upcoming-program ordering.
- Touch/TV LIVE badge behavior.
- Live/VOD classification for unresolved negative IDs.
- Backend watch-history identity restrictions.
- Public website localization and shared responsive styling.

Standard validation commands:

```powershell
.\gradlew.bat :app:testSideloadDebugUnitTest -PenableUnitTests :app:assembleSideloadDebug --no-daemon
npm --prefix self-hosted-backend test
git diff --check
```

The website was additionally checked at phone and desktop viewport widths. Privacy tables must remain horizontally scrollable inside their card while `documentElement.scrollWidth` stays equal to the viewport width.

## Merge preservation

When integrating upstream changes, preserve these boundaries:

- Keep IPTV-only filtering in `HomeViewModel`; never filter persisted catalogs in `CatalogRepository`.
- Keep unresolved Xtream IDs deterministic and restricted to the dedicated VOD source.
- Do not restore the old rule that classifies every negative media ID as live.
- Keep the tablet layout width-based because the tested landscape tablet reports only 576 dp as its smallest width despite a 1280 dp effective landscape width.
- Keep touch EPG badges hidden and TV badges visible.
- Keep browser localization in the presentation layer and production traffic on `auth.mystreamnet.club`.
