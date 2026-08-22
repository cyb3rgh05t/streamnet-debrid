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
- Shared callback logic now lives in `netlify-auth-site/discord/callback.js` and is loaded by both callback HTML entry points.
- Duplicate Android Discord string resources were removed from `app/src/main/res/values/strings.xml` to fix resource merging.

## Deployment Notes

- Netlify production deploy completed for project `streamnet-sync` / site ID `7fd089d5-0105-460e-9372-6ea2e101aa7a`.
  - Deploy ID: `6a89379760b367649ab5cf48`
  - Production URL reported by Netlify: `https://streamnet.club`
  - Auth-domain verification: `https://auth.streamnet.club/discord/callback.js` returned HTTP 200 and contained the new `mobile_` / `tv_` callback flow markers.
- Supabase deploy is not required for this integration. No Supabase migrations, Edge Functions, database policies, or Supabase config files were changed.
- APK rebuild/release is required for the Android 16 KB page-size change and the current version bump to be included in an installed APK.
  - Debug APK built successfully: `app/build/outputs/apk/sideload/debug/app-sideload-debug.apk`
  - Debug APK SHA-256: `93C5DD8231F415CA837138F0EF8DC86816EFE9594658AA0A937774C49E70F464`

## Validation

- `npm --prefix netlify-auth-site test` passed: 35 tests.
- `./gradlew.bat :app:test :app:compileSideloadDebugKotlin --no-daemon --stacktrace` passed.
- `./gradlew.bat :app:assembleSideloadDebug --no-daemon --stacktrace` passed.
- `git diff --check` passed.

## Preserved Fork Anchors

- StreamNet branding and auth domain remain in place.
- Update checks still point to `cyb3rgh05t/streamnet-debrid`.
- StreamNet User-Agent remains `Mozilla/5.0 (Android TV; StreamNet TV)`.
- Orange/Gold accent defaults and CloudSync/IPTV fork behavior were not overwritten.
