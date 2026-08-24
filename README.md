# StreamNet Debrid

StreamNet Debrid is a StreamNet-focused Android TV APK with its own cloud/auth backend.

This repository intentionally keeps only the surfaces that are needed for the app runtime and account sync:

- `app/` - Android TV/mobile APK source
- `self-hosted-backend/` - StreamNet account, sync, pairing, deletion, analytics, and hosted auth/privacy pages
- `legacy/netlify-auth-site/` - legacy Netlify reference implementation and migration source; not used by the self-hosted container runtime
- `legacy/supabase/` - legacy Supabase schema/functions retained for rollback and migration reference

Removed/omitted surfaces include the upstream marketing site, browser web app, resolver worker, benchmark module, screenshots and release artifact folders.

## Cloud Migration Status

The production Android release now uses the self-hosted backend at `https://auth.mystreamnet.club`. Netlify remains available as a rollback reference, but new production builds are blocked unless the GitHub Actions `NETLIFY_BACKEND_URL` secret also equals `https://auth.mystreamnet.club`.

The verified migration imported 10 Netlify accounts and 5 total self-hosted snapshots, including multi-profile data. A consistency check found 5 snapshots with 0 orphaned account references. Login, cloud sync, TV pairing, and the bilingual success page were tested before the production endpoint change.

The migration export contains sensitive account records and must remain outside Git. Existing access and refresh sessions were intentionally not migrated; users sign in again after installing the production build. Keep the original Netlify service available until the first production rollout has been verified on the required devices.

## Android Build

Copy local secrets and fill real values:

```bash
cp secrets.defaults.properties secrets.properties
```

Build a sideload debug APK:

```bash
./gradlew :app:assembleSideloadDebug
```

Useful validation:

```bash
./gradlew :app:compileSideloadDebugKotlin
```

The debug APK is written to:

```text
app/build/outputs/apk/sideload/debug/app-sideload-debug.apk
```

## Discord Partner SDK

Discord Rich Presence is optional and requires Discord's separately licensed Android Partner SDK.
For local builds, place the approved AAR at:

```text
app/libs/discord_partner_sdk.aar
```

Then set this in `secrets.properties`:

```properties
DISCORD_CLIENT_ID=<your Discord application id>
```

Do not commit or redistribute the AAR unless your Discord SDK agreement explicitly permits it.
Signed GitHub Actions builds download the AAR from `DISCORD_PARTNER_SDK_URL`. For private GitHub release assets, also set `DISCORD_PARTNER_SDK_BEARER_TOKEN`. `DISCORD_PARTNER_SDK_AAR_SHA256` is optional but recommended.

## Legacy Netlify Auth Site

`legacy/netlify-auth-site/` contains the previous app-facing account backend and static auth pages. Active self-hosted pages are copied into `self-hosted-backend/public/` and packaged from there.

Useful commands:

```bash
npm --prefix legacy/netlify-auth-site test
netlify deploy --dir legacy/netlify-auth-site --prod
```

The linked production site should be the StreamNet auth/sync project, not upstream ARVIO infrastructure.

## Legacy Supabase

`legacy/supabase/` contains the old Supabase configuration, migrations and functions. It is no longer part of the active StreamNet runtime.

Database migrations should be applied deliberately, not blindly on every Android change.

## CI Secrets

The signed Android release workflow creates a temporary `secrets.properties` file from GitHub Actions encrypted secrets. Values are available only during the build and are not committed. The normal release APK now uses `NETLIFY_BACKEND_URL` with the production value `https://auth.mystreamnet.club`. The secret name is retained for Android compatibility; `SELF_HOSTED_BACKEND_URL` remains available for the separate test APK.

The workflow expects these repository secrets as needed:

- `APP_ANON_KEY`
- `NETLIFY_BACKEND_URL`
- `TMDB_API_KEY`
- `TRAKT_CLIENT_ID`
- `TRAKT_CLIENT_SECRET`
- `KEYSTORE_BASE64`
- `KEYSTORE_PASSWORD`
- `KEY_ALIAS`
- `KEY_PASSWORD`
- `DISCORD_CLIENT_ID`
- `DISCORD_PARTNER_SDK_URL`
- `DISCORD_PARTNER_SDK_BEARER_TOKEN` (if the SDK URL is private)
- `DISCORD_PARTNER_SDK_AAR_SHA256` (optional integrity check)

The local `secrets.properties` file is ignored by Git and should be used for local builds only. Do not upload it or put private API credentials into source code. Values that must be embedded in an APK should be treated as public, because APK users can extract them; keep signing passwords, SDK download tokens, and server-side secrets only in GitHub Actions secrets or the backend environment.
