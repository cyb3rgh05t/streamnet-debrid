# StreamNet Debrid

StreamNet Debrid is a StreamNet-focused Android TV APK with its own cloud/auth backend.

This repository intentionally keeps only the surfaces that are needed for the app runtime and account sync:

- `app/` - Android TV/mobile APK source
- `netlify-auth-site/` - StreamNet auth, cloud sync, Discord, premium/entitlement and account functions
- `supabase/` - Supabase project config, migrations and edge functions still used by the backend

Removed/omitted surfaces include the upstream marketing site, browser web app, resolver worker, benchmark module, screenshots and release artifact folders.

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

## Netlify Auth Site

`netlify-auth-site/` contains the app-facing account backend and static auth pages.

Useful commands:

```bash
npm --prefix netlify-auth-site test
netlify deploy --dir netlify-auth-site --prod
```

The linked production site should be the StreamNet auth/sync project, not upstream ARVIO infrastructure.

## Supabase

`supabase/` contains local Supabase configuration, migrations and functions that remain part of the StreamNet cloud backend.

Database migrations should be applied deliberately, not blindly on every Android change.

## CI Secrets

The signed Android release workflow creates a temporary `secrets.properties` file from GitHub Actions encrypted secrets. Values are available only during the build and are not committed. The normal release APK continues to use the production `NETLIFY_BACKEND_URL`; `SELF_HOSTED_BACKEND_URL` is only used by the separate `selfHosted` test APK.

The workflow expects these repository secrets as needed:

- `APP_ANON_KEY`
- `NETLIFY_BACKEND_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
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
