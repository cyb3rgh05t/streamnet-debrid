# StreamNet Self-Hosted Backend

This is the self-hosted StreamNet backend. The production Android build uses it at `https://auth.mystreamnet.club`.

## Included now

- PostgreSQL schema and repeatable migration runner.
- Netlify-compatible `scrypt` password verification for imported Netlify accounts.
- `auth-login`, `auth-refresh`, `cloud-auth-email`, TV QR pairing, `account-sync-pull`, and `account-sync-push`.
- Self-hosted app usage analytics and Discord device pairing with the existing StreamNet callback pages.
- Revision-based snapshot compare-and-set compatible with the Android conflict retry.
- Supabase NDJSON account-snapshot importer.
- Traefik-compatible Docker Compose configuration with domain, certificate resolver, and published container image from `.env`.

Password reset and media proxies are intentionally not included yet. Password reset will be added after SMTP delivery is configured.

## Local or Server Setup

1. Copy `.env.example` to `.env` and set your real domain, passwords, JWT secret, and Google Web Client ID if Google sign-in is required.
2. This Compose file is preconfigured for the existing Traefik network `proxy`, entrypoint `https`, and certificate resolver `dns-cloudflare`. Change those values only if your server uses different names.
3. Pull the published backend image and start PostgreSQL and the API with `docker compose pull && docker compose up -d`.
4. Run migrations with `docker compose exec streamnet-backend npm run migrate`.
5. Check `https://your-domain/health` through Traefik.

The production APK may use this service after the migration checks documented below have passed. Keep the old Netlify service available as a rollback reference until the rollout is fully verified.

The API router deliberately has no Authelia middleware. Android TV and mobile calls authenticate with bearer tokens and cannot complete an interactive browser login. Keep Authelia on human-facing admin services, not on this API.

## Self-Hosted Account Page

`PUBLIC_BASE_URL` now serves the existing StreamNet gold account page and StreamNet logo assets directly from this container. It supports self-hosted sign-in, account creation, and QR TV-pairing approval without Netlify. Use `https://auth.mystreamnet.club/` to inspect it; QR codes open the same page with a one-time `?code=...` pairing parameter.

The active static web assets live in `self-hosted-backend/public/` and are copied into the Docker image from that directory. `legacy/netlify-auth-site/` is no longer a runtime dependency for the self-hosted container.

Password reset remains unavailable on the self-hosted page until its server-side replacement is complete. Account deletion is available at `https://auth.mystreamnet.club/delete-account`; it requires a fresh sign-in and an exact `DELETE` confirmation, revokes the account sessions, removes the cloud snapshot, and removes pending TV pairing sessions. It does not fall back to Netlify.

## First API Test

Create a new staging-only account. This command never imports, changes, or overwrites existing account data.

```sh
read -rp "Test email: " TEST_ACCOUNT_EMAIL
read -rsp "Test password: " TEST_ACCOUNT_PASSWORD; echo
export TEST_ACCOUNT_EMAIL TEST_ACCOUNT_PASSWORD
docker compose exec -e TEST_ACCOUNT_EMAIL -e TEST_ACCOUNT_PASSWORD streamnet-backend npm run create:test-account
unset TEST_ACCOUNT_EMAIL TEST_ACCOUNT_PASSWORD
```

Then sign in from the server, replacing the placeholders:

```sh
curl -sS https://auth.mystreamnet.club/auth-login \
  -H 'content-type: application/json' \
  --data '{"email":"TEST_EMAIL","password":"TEST_PASSWORD"}'
```

The result contains `access_token`. Use it to confirm the empty snapshot state:

```sh
curl -sS https://auth.mystreamnet.club/account-sync-pull \
  -H "authorization: Bearer ACCESS_TOKEN"
```

Expected first response: `{"payload":null,"revision":0,...}`. Do not import Supabase or Netlify data until this login and pull test works.

## Account Registration Test

`POST /cloud-auth-email` now creates a new self-hosted account and returns a session immediately. The isolated Android test build can use its normal Sign Up action for this endpoint. It rejects malformed addresses, `.local`/`.test` domains, short passwords, duplicate accounts, and repeated registration attempts for the same email within five minutes.

## TV Pairing Test

The self-hosted API now serves the pairing page at `PUBLIC_BASE_URL/?code=...`. A TV starts `tv-auth-start`, displays its QR code, and polls `tv-auth-status`. Scan the QR code with a phone browser, sign in on the displayed page, and the TV receives the approved session. This page is intentionally hosted on the API domain so the QR code works without Netlify.

Discord TV pairing is also served locally at `PUBLIC_BASE_URL/discord/`. The Discord Developer Portal must contain the exact redirect URI `https://auth.mystreamnet.club/discord/callback`. The Android client uses that same URI when exchanging the authorization code; mismatched redirect URIs cause Discord error `invalid_grant`.

## Android Test APK

The `selfHosted` build type is a separate debug-signed APK with package suffix `.selfhosted`. It does not change the existing debug, staging, or release app. It keeps snapshot sync enabled while disabling the Supabase mirror and Supabase Realtime connection.

Set an optional custom test domain in the untracked `secrets.properties` file:

```properties
SELF_HOSTED_BACKEND_URL=https://auth.mystreamnet.club
```

Build the APK with:

```sh
./gradlew :app:assembleSideloadSelfHosted
```

Install `app/build/outputs/apk/sideload/selfHosted/app-sideload-selfHosted.apk` alongside the production app. Sign in with a migrated account, validate Cloud Sync, profile restoration, TV pairing, Discord pairing, and account deletion. The production release uses the same backend endpoint. Password reset remains unavailable.

## Container Publishing

The `Publish Self-Hosted Backend` GitHub Actions workflow runs for changes under `self-hosted-backend/` on `main`. It tests the service and publishes these GHCR tags:

- `ghcr.io/cyb3rgh05t/streamnet-self-hosted-backend:latest`
- `ghcr.io/cyb3rgh05t/streamnet-self-hosted-backend:sha-<commit>`

Use the `sha-<commit>` tag in `STREAMNET_BACKEND_IMAGE` when testing or rolling back a server deployment. The container package must be public, or the server must use a GitHub personal access token with `read:packages` before `docker compose pull`.

## Import Existing Supabase Snapshots

Export the Supabase tables into an offline NDJSON directory. The importer reads `auth.users.ndjson`, `public.account_sync_state.ndjson`, and `public.user_settings.ndjson`.

```sh
docker compose exec streamnet-backend npm run import:snapshots -- /imports/supabase-export
```

Mount the export directory into the container only for the import. Run this on staging first, compare account and snapshot counts, and restore test accounts on a TV and phone before any APK change.

## Import Netlify Blob Snapshots

The production StreamNet account data is currently in the Netlify Blob stores `account-sync` and `arvio-auth`, not in the empty Supabase sync tables. Export those stores to one directory with an `auth/` subdirectory, then run the idempotent importer against the self-hosted PostgreSQL database:

```sh
docker compose exec streamnet-backend npm run import:netlify-blobs -- /imports/streamnet-migration-export --dry-run
docker compose exec streamnet-backend npm run import:netlify-blobs -- /imports/streamnet-migration-export
```

The importer preserves Netlify-scrypt password hashes, imports accounts without snapshots, and imports the strongest snapshot once per account. Existing access and refresh sessions are not imported.

## Netlify Account Passwords

The migrated Netlify account records use `scrypt`. The API verifies that format when an imported account has `password_hash_scheme = 'netlify_scrypt'`. Active access and refresh tokens are never imported.

## Safety

- Keep Netlify and Supabase live while testing.
- Keep encrypted source exports and PostgreSQL backups outside the server.
- Treat the first APK pointed at this API as a test build only.
