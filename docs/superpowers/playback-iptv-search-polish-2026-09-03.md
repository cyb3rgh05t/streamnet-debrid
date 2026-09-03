# Playback, IPTV, Search, and Portal Polish

Date: 2026-09-03

## Scope

This update preserves the StreamNet fork boundaries: the Android APK uses the self-hosted `https://auth.mystreamnet.club` backend, Media3 remains at 1.10.1, and no Netlify or Supabase runtime dependency was introduced.

## Playback and artwork

- Embedded forced subtitles matching the active Media3 audio language are selected automatically when the subtitle preference is `Off` or `Forced`.
- Manual subtitle selection remains authoritative.
- Audio language resolution accepts track metadata and common language tokens in labels.
- Home logo persistence records the content language. Legacy or mismatched entries are discarded, and in-memory Home/media caches are cleared on a language change.

## IPTV and Home

- The IPTV VOD search preference defaults to enabled and is stored locally in DataStore.
- Disabling it skips Xtream movie and episode source lookup, series prefetch, and VOD/series cache warmup. Live TV, EPG, and playlist configuration remain active.
- IPTV-only remains a non-destructive Home presentation filter, not a player-wide source restriction.
- Home availability matching compares media type and normalized title, then uses TMDB ID, IMDb ID, or release year when both provider and app metadata expose them. Title-only fallback remains for providers with incomplete metadata.
- Full Xtream catalogs use the IPTV HTTP client; point lookups retain the shorter lookup client.
- Paging placeholders are no longer appended after loaded Home cards, and restored focus clamps to real loaded items.

## Settings and Search

- TV playlist rows and playlist options are separated by a localized `Playlist settings` heading.
- IPTV VOD search appears between IPTV-only and refresh, with a neutral movie icon and normal accent focus treatment.
- `Delete TV playlists` is the final option in the section.
- Search remote handling accepts Enter, numpad Enter, and D-pad center. Select key-up is consumed in the manual filter zone to prevent the natively focused `All` chip from undoing the chosen filter.
- Selected Search chips use the active theme accent on TV and touch devices.
- Anime discovery relies on TMDB keyword 210024 when no secondary genre is selected instead of forcing generic Animation genre 16.

## Self-hosted portal

- On narrow Privacy layouts, Quick Links render before the policy article.
- On narrow Cloud account layouts, account information renders before the authentication panel.
- The account deletion page and its ordering are unchanged.

## Validation

- Focused forced-subtitle, Home logo, IPTV repository, IPTV-only availability, Home row, Settings loading, and Search filter tests.
- Full Sideload Debug unit-test suite with `-PenableUnitTests`.
- Sideload Debug APK assembly.
- Self-hosted backend test suite.
- IDE diagnostics and `git diff --check`.

## Upstream decisions

- Media3 1.9.0 seek-preview commits were not ported because this fork uses Media3 1.10.1, where the upstream FrameExtractor path is unavailable.
- Premium, trial, Netlify, and web version-marker commits were not ported.
- Tracker timestamp conflict handling was not duplicated because the fork already has equivalent field-level last-writer-wins behavior plus StreamNet-specific protections.
