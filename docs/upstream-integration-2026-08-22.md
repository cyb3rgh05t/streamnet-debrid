# Upstream Integration - 2026-08-22

## Scope

Checked upstream `ProdigyV21/ARVIO` from the Android 16 KB page-size fix onward.

Relevant upstream commits reviewed:

- `cc240908` - `fix(android): support 16 KB memory pages`
- `daa32557` - `feat(site): clarify Play Store install and Simkl support`
- `664f3243` - `fix(discord): streamline mobile direct auth, polish TV QR pairing, and secure OAuth flow`
- `a9a9e23a` - `fix(discord): separate mobile and TV OAuth callbacks`
- `316b0da4` - merge commit for the Discord mobile/TV flow fix

The full upstream branch was not merged directly because this fork has intentionally removed or replaced upstream web/release/branding surfaces. The relevant APK and Netlify auth logic was ported manually to preserve StreamNet-specific behavior.

## Integrated

- Android 16 KB page-size support is present in `app/build.gradle.kts`:
  - `ndkVersion = "28.2.13676358"`
  - `-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON`
- StreamNet update metadata remains preserved:
  - `GITHUB_OWNER = "cyb3rgh05t"`
  - `GITHUB_REPO = "streamnet-debrid"`
  - version currently `2.0.041` / code `344`
- Discord OAuth callback split is ported to Netlify auth:
  - Mobile callbacks use `mobile_` state and return to the app deeplink.
  - TV callbacks use `tv_` state and notify `/.netlify/functions/discord-auth-callback` with the unprefixed device code.
  - Unmarked states are rejected instead of guessing the flow.
- Shared callback logic was later migrated to `self-hosted-backend/public/discord/callback.js`; the former Netlify copy has been removed.
- Duplicate Android Discord string resources were removed from `app/src/main/res/values/strings.xml` to fix resource merging.

## Deployment Notes

- Netlify production deploy completed for project `streamnet-sync` / site ID `7fd089d5-0105-460e-9372-6ea2e101aa7a`.
  - Deploy ID: `6a89379760b367649ab5cf48`
  - Production URL reported by Netlify: `https://mystreamnet.club`
  - Auth-domain verification: `https://auth.mystreamnet.club/discord/callback.js` returned HTTP 200 and contained the new `mobile_` / `tv_` callback flow markers.
- Supabase deploy is not required for this integration. No Supabase migrations, Edge Functions, database policies, or Supabase config files were changed.
- APK rebuild/release is required for the Android 16 KB page-size change and the current version bump to be included in an installed APK.
  - Debug APK built successfully: `app/build/outputs/apk/sideload/debug/app-sideload-debug.apk`
  - Debug APK SHA-256: `93C5DD8231F415CA837138F0EF8DC86816EFE9594658AA0A937774C49E70F464`

## Validation

- The former Netlify test suite passed 35 tests before the legacy implementation was retired.
- `./gradlew.bat :app:test :app:compileSideloadDebugKotlin --no-daemon --stacktrace` passed.
- `./gradlew.bat :app:assembleSideloadDebug --no-daemon --stacktrace` passed.
- `git diff --check` passed.

## Preserved Fork Anchors

- StreamNet branding and auth domain remain in place.
- Update checks still point to `cyb3rgh05t/streamnet-debrid`.
- StreamNet User-Agent remains `Mozilla/5.0 (Android TV; StreamNet TV)`.
- Orange/Gold accent defaults and CloudSync/IPTV fork behavior were not overwritten.

## Follow-up Fixes

- XMLTV timeout no longer crashes the application: background visible-guide enrichment catches ordinary EPG errors while preserving coroutine cancellation.
- Home collection hero previews use a bounded Media3 cache, compatible H.264/1080p assets, and reveal video/audio only after the first rendered frame. Touch devices do not start hidden preview playback.
- Details screen has a conditional `Play from beginning` action. It resets only the selected movie or episode in local/cloud watch history and starts playback at `0 ms`.
- Details action focus indices are continuous with or without the restart action, so Sources, Trailer, Watched, Watchlist, and Collection remain reachable.
- Recently watched IPTV Home cards no longer display the channel number.
- Source selection and in-player audio/subtitle menus use the active StreamNet accent for focused and selected states.
- Embedded forced subtitles in the preferred language are automatically preferred when available.
- Exact subtitle release-name matches skip the timing scan. Media3-rewritten PGS, VobSub, and DVB tracks are excluded from AI text translation, with runtime fallback to another text source.
- Collection videos and migrated collection images are pinned to StreamNet asset commit `5ff8719c1aa82c403b7f4abe9425a9c4347fe97c`. The immutable URL is intentional so Media3 and Coil caches refresh when the revision changes.
- Continue Watching time/resume labels are localized through Android resources on every Home conversion path.

## Watched and Continue Watching Synchronization

- Playback completion at 90% or `STATE_ENDED` writes watched state to the active profile and Supabase/account snapshot before optional Trakt, Simkl, or MDBList scrobbling.
- Manual watched actions remove the matching Continue Watching entry and persist a timestamped removal marker:
  - Movies use `movie:<tmdbId>`.
  - Episodes use `tv:<showTmdbId>:<season>:<episode>` so a newer next episode remains visible.
- Account snapshot merges preserve the highest timestamp for each removal marker and union watched movie/episode sets across devices.
- A Continue Watching progress record is accepted only when its `updatedAtMs` is newer than the matching removal marker. Older local, remote, cached, or stale-device progress cannot resurrect the item.
- Empty profile snapshots remain explicit empty arrays, and Home deletes its disk snapshot on a real remove event.
- No Supabase migration or Netlify deployment is required. The synchronization data remains inside the existing account snapshot payload.

Latest debug APK:

- `app/build/outputs/apk/sideload/debug/app-sideload-debug.apk`
- Version: `2.0.044` / code `347`
- SHA-256: `8C97A9ED6C7AE2BBA57447550B352675A1071A1F6A3A8ABD4E394C2D43009BEF`
- `:app:compileSideloadDebugKotlin`, `:app:test`, and `:app:assembleSideloadDebug` passed.
