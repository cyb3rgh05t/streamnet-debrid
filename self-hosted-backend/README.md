# StreamNet Self-Hosted Backend

This is the self-hosted StreamNet backend. The production Android build uses it at `https://auth.mystreamnet.club`.

## Included now

- PostgreSQL schema and repeatable migration runner.
- StreamNet `scrypt` password hashing and verification.
- `auth-login`, `auth-refresh`, `cloud-auth-email`, TV QR pairing, `account-sync-pull`, and `account-sync-push`.
- Self-hosted app usage analytics and Discord device pairing with the existing StreamNet callback pages.
- Revision-based snapshot compare-and-set compatible with the Android conflict retry.
- Traefik-compatible Docker Compose configuration with domain, certificate resolver, and published container image from `.env`.

Password reset and media proxies are intentionally not included yet. Password reset will be added after SMTP delivery is configured.

## Local or Server Setup

1. Copy `.env.example` to `.env` and set your real domain, passwords, JWT secret, and Google Web Client ID if Google sign-in is required.
2. This Compose file is preconfigured for the existing Traefik network `proxy`, entrypoint `https`, and certificate resolver `dns-cloudflare`. Change those values only if your server uses different names.
3. Pull the published backend image and start PostgreSQL and the API with `docker compose pull && docker compose up -d`.
4. Run migrations with `docker compose exec streamnet-backend npm run migrate`.
5. Check `https://your-domain/health` through Traefik.

The production APK uses this service as its account and synchronization backend.

## Admin Dashboard

The protected dashboard is served at `PUBLIC_BASE_URL/admin`. It shows database
health, accounts, profile and snapshot metrics, a redacted payload view, and the
admin audit log. It can add or replace an account-wide add-on, add or replace a
profile playlist, and set an allowed profile setting. Every mutation requires
the current snapshot revision and a reason, then creates a new revision and an
audit entry in the same PostgreSQL transaction.

Run migration `009_admin_dashboard.sql`, then create the first administrator
from the server shell. The password is not stored in `.env` and must contain at
least 14 characters:

```sh
read -rp "Admin email: " STREAMNET_ADMIN_EMAIL
read -rsp "Admin password: " STREAMNET_ADMIN_PASSWORD; echo
export STREAMNET_ADMIN_EMAIL STREAMNET_ADMIN_PASSWORD
docker compose exec -e STREAMNET_ADMIN_EMAIL -e STREAMNET_ADMIN_PASSWORD streamnet-backend npm run create:admin
unset STREAMNET_ADMIN_EMAIL STREAMNET_ADMIN_PASSWORD
```

To intentionally replace an existing administrator password, additionally pass
`-e STREAMNET_ADMIN_REPLACE_PASSWORD=1`. Admin access uses a separate 30-minute
JWT purpose and never accepts a normal StreamNet account token. The dashboard
masks tokens, passwords, API keys, playlist URLs, portal URLs, and MAC addresses.
Place an IP allowlist or an interactive access proxy in front of `/admin` and
`/admin-api` when exposing the production host; do not apply that middleware to
the Android API routes.

## Upgrade Existing Production Server

The account-deletion and StreamNet Club branding update requires both a new
backend image and database migration `008_account_deletion_cascades.sql`.
Container startup does not apply migrations automatically.

From the server directory containing `compose.yaml` and `.env`:

```sh
# 1. Back up PostgreSQL outside the container.
docker compose exec -T postgres sh -lc \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
  > "streamnet-before-2.1.019-$(date +%Y%m%d-%H%M%S).dump"

# 2. Pull the image produced by the main-branch workflow and restart the API.
docker compose pull streamnet-backend
docker compose up -d streamnet-backend

# 3. Apply all pending repeatable migrations, including migration 008.
docker compose exec streamnet-backend npm run migrate

# 4. Verify service health and inspect startup/migration logs.
curl -fsS https://auth.mystreamnet.club/health
docker compose ps
docker compose logs --tail=100 streamnet-backend
```

For deterministic rollout and rollback, set `STREAMNET_BACKEND_IMAGE` in `.env`
to the workflow-produced `sha-<commit>` GHCR tag instead of `latest`, then run
the pull and restart commands above. The web account pages and
`streamnet-club-logo.svg` are included in that same image; no separate Netlify
deployment is required.

After deployment, verify the account page, email/password login, TV pairing,
snapshot pull/push, and account deletion with a disposable test account. Do not
test deletion with a production account. Migration 008 adds `ON DELETE CASCADE`
to TV pairing and usage-event account references and is compatible with rolling
the application container back if necessary.

## Logging

Backend requests are printed as colored, human-readable one-line summaries with
the HTTP method, route, status, duration, and action. Query values, bearer tokens,
and request bodies are not included.

- `LOG_LEVEL=info` controls the minimum Pino log level.
- `LOG_PRETTY=true` enables readable output. Set it to `false` for JSON logs.
- `LOG_COLOR=true` enables ANSI colors. Disable it when the log viewer does not
  support colors.
- Compose also writes structured logs to the persistent `backend_logs` volume.
  `LOG_FILE=/app/logs/backend.log` enables the file target, which rotates daily
  or at 10 MB and retains 14 older files. Override this with
  `LOG_FILE_FREQUENCY`, `LOG_FILE_MAX_SIZE`, and `LOG_FILE_RETAINED_COUNT`.

Inspect or export the current file from the running container:

```sh
docker compose exec streamnet-backend sh -c 'ls -lh /app/logs && tail -n 100 "$(ls -1t /app/logs/backend*.log | head -n 1)"'
docker compose cp streamnet-backend:/app/logs ./streamnet-backend-logs
```

The API router deliberately has no Authelia middleware. Android TV and mobile calls authenticate with bearer tokens and cannot complete an interactive browser login. Keep Authelia on human-facing admin services, not on this API.

## Self-Hosted Account Page

`PUBLIC_BASE_URL` now serves the existing StreamNet gold account page and StreamNet logo assets directly from this container. It supports self-hosted sign-in, account creation, and QR TV-pairing approval without Netlify. Use `https://auth.mystreamnet.club/` to inspect it; QR codes open the same page with a one-time `?code=...` pairing parameter.

The active static web assets live in `self-hosted-backend/public/` and are copied into the Docker image from that directory.

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
CLOUD_BACKEND_URL=https://auth.mystreamnet.club
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

## Migrated Account Passwords

Existing account password hashes retain their `scrypt:` encoding. Migration `007_provider_neutral_accounts.sql` changes their scheme marker to `scrypt_v1` and removes the obsolete source-account column without rehashing passwords. Active access and refresh tokens are unaffected.

Keep encrypted migration exports and PostgreSQL backups outside the server.

## Catalog Order Migration

The Android defaults apply the preferred catalog order only to fresh profiles. Existing cloud profiles can be reordered once without changing any hidden-catalog maps or removing custom catalogs.

Create a backup first:

```sh
docker compose exec -T postgres sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > streamnet-before-catalog-order.dump
```

Apply the provider-neutral account schema migration, then preview every catalog change. The preview is read-only and prints before/after IDs per changed profile:

```sh
docker compose exec streamnet-backend npm run migrate
docker compose exec streamnet-backend npm run catalog-order:preview
```

After reviewing the preview, explicitly apply the snapshot rewrite:

```sh
docker compose exec \
  -e CATALOG_ORDER_APPLY=1 \
  -e CATALOG_ORDER_BACKUP_CONFIRMED=1 \
  streamnet-backend node scripts/reorder-catalog-snapshots.js --apply
```

The write runs in one transaction, increments each changed snapshot revision, updates only changed profiles' catalog timestamps, and leaves all hidden-catalog maps untouched.

## Reset Cloud Data

The commands below use the Compose service name `postgres` from `compose.yaml`.
They do not depend on Docker's generated container name (for example,
`self-hosted-backend-postgres-1`). Run them from the directory containing
`compose.yaml`.

Create a database backup before either reset:

```sh
docker compose exec -T postgres sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > streamnet-before-reset.dump
```

### Complete Reset

This permanently deletes all accounts, password hashes, login sessions, cloud
snapshots and profiles, watch data, pairing sessions, and analytics. The schema
and `schema_migrations` records remain. Every account must be created again
afterward.

```sh
docker compose exec -T postgres sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "BEGIN; TRUNCATE TABLE account_sync_snapshots, account_sessions, tv_device_auth_sessions, app_usage_events, discord_auth_sessions, watch_history, watch_state, accounts RESTART IDENTITY CASCADE; COMMIT;"'
```

After a complete reset, clear the StreamNet app data or reinstall the app on
every device before creating the new account. Otherwise, a device can upload
its old locally stored profiles and settings again.

### Reset Synced Data but Keep Accounts

This permanently deletes cloud snapshots and profiles, watch data, and pairing
sessions while preserving accounts, password hashes, existing login sessions,
and analytics.

```sh
docker compose exec -T postgres sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "BEGIN; TRUNCATE TABLE account_sync_snapshots, watch_history, watch_state, tv_device_auth_sessions, discord_auth_sessions RESTART IDENTITY CASCADE; COMMIT;"'
```

Clear app data on every device before using the retained account again if the
goal is a genuinely empty cloud state. A device with old local data can seed a
new account snapshot on its next push.
