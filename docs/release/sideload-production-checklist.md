# Sideload Production Release Checklist

Use this checklist before every production sideload release.

## 1) Signing and Secrets

- keystore.properties exists locally (never commit it).
- Release keystore file exists at configured path.
- storePassword, keyAlias, and keyPassword are valid.
- secrets.properties exists locally with production values.
- NETLIFY_BACKEND_URL points to production.
- APP_ANON_KEY / SUPABASE_ANON_KEY are production keys.

## 2) Versioning

- Increase versionCode in app/build.gradle.kts.
- Set correct versionName for release notes and support.

## 3) Build Commands

Run from repository root:

```powershell
.\gradlew.bat :app:clean :app:assembleSideloadRelease
```

Optional verification builds:

```powershell
.\gradlew.bat :app:assemblePlayRelease :app:assembleSideloadRelease
```

## 4) Install and Smoke Test

Install release APK on test device:

```powershell
adb install -r app/build/outputs/apk/sideload/release/app-sideload-release.apk
```

Validate at least:

- App launch and profile switching
- Home, search, details navigation
- Playback start/stop, subtitle and audio switching
- Live TV and EPG loading
- Cloud sign-in and sync status
- Settings persistence after restart

## 5) Sideload Distribution

- Upload APK to your sideload delivery channel.
- Publish release notes and version mapping.
- Keep previous stable APK available for rollback.

## 6) Post-Release Checks

- Fresh install test on a clean device
- Update-over-previous-version test
- Monitor crash reports and cloud auth errors
- Confirm no debug-signed artifact was distributed

## Quick Fail-Safe

If release signing fails, stop distribution and verify keystore.properties + keystore path before retrying.
