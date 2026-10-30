# StreamNet Backend Cloud

This is the self-hosted StreamNet backend. The production Android build uses it at `https://auth.mystreamnet.club`.

## Included now

- PostgreSQL schema and repeatable migration runner.
- StreamNet `scrypt` password hashing and verification.
- `auth-login`, `auth-refresh`, `cloud-auth-email`, password reset through Resend, TV QR pairing, `account-sync-pull`, and `account-sync-push`.
- Self-hosted app usage analytics and Discord device pairing with the existing StreamNet callback pages.
- Revision-based snapshot compare-and-set compatible with the Android conflict retry.
- Traefik-compatible Docker Compose configuration with domain, certificate resolver, and published container image from `.env`.

Password reset uses the Resend HTTP API. Configure `RESEND_API_KEY`, a verified `EMAIL_FROM` identity, and optionally `PASSWORD_RESET_TTL_MINUTES` in the server `.env`. Reset tokens are stored only as hashes, expire automatically, are single-use, and revoke existing account sessions after a successful password change.

## Local or Server Setup

1. Copy `.env.example` to `.env` and set your real domain, passwords, JWT secret, and Google Web Client ID if Google sign-in is required.
2. Keep or adjust `STREAMNET_POSTGRES_DATA_DIR=/opt/appdata/streamnet-backend/postgres` and `STREAMNET_BACKEND_LOG_DIR=/opt/appdata/streamnet-backend/logs`. These host folders are bind-mounted into the containers so database files and rotated backend logs are visible without entering the containers.
3. Create the local mount folders before first start: `sudo mkdir -p /opt/appdata/streamnet-backend/postgres /opt/appdata/streamnet-backend/logs`.
4. This Compose file is preconfigured for the existing Traefik network `proxy`, entrypoint `https`, and certificate resolver `dns-cloudflare`. Change those values only if your server uses different names.
5. Pull the published backend image and start PostgreSQL and the API with `docker compose pull && docker compose up -d`.
6. Run migrations with `docker compose exec streamnet-backend npm run migrate`.
7. Check `https://your-domain/health` through Traefik.

The `/opt/appdata/streamnet-backend/` directory contains live server state. Back
it up intentionally, protect it like credentials, and do not copy it into public
artifacts.

The production APK uses this service as its account and synchronization backend.

## Admin Dashboard

At widths up to 720px, a themed hamburger button expands the navigation and
logout controls below the logo. Navigation, Escape and breakpoint changes close
the menu; desktop navigation remains permanently visible.

The "Aktive Geräte pro Tag" bar chart defaults to 30 days and supports 7/30 UTC calendar days, including
the incomplete current day. Migration `013_device_activity_daily.sql` must run
before deploying the updated heartbeat handler. Each authenticated heartbeat
atomically upserts presence and records one account/installation/day identity;
repeated heartbeats and profile switches do not increase that day's count.
The chart counts daily activity, not concurrent online devices. It starts at
deployment with no reconstructed historical data. Account deletion cascades to
daily records; removing presence/history does not erase the daily statistic.
Daily records retain installation IDs until account deletion (no automatic
retention cutoff). The local preview explicitly labels simulated chart values.

The admin panel opens on the Dashboard page. Overview metrics live there rather
than above the Accounts table; the online-devices card opens the filtered account
list. The dashboard also shows profile/playback counts, newly registered accounts,
recent admin changes, process uptime, database query time, process memory/CPU,
and host memory. CPU is the process average since startup (100% = one core);
host memory is not a container memory limit. Database status reflects the
successful overview query, not an independent continuous health check.

The online-devices shortcut always enables the online-only account filter;
only the explicit filter-removal button clears it. Account-list responses are
applied only for the latest request with unchanged search, pagination, filter
and admin session, so older unfiltered requests cannot overwrite filtered rows.

"Gesehen-Markierungen" counts watched movies and individual watched episodes
across both cloud snapshot fields (`localWatchedMoviesByProfile` and
`localWatchedEpisodesByProfile`) and the separate `watch_state` table. The same
account/profile/title/episode is counted once across both sources; different
profiles and accounts count separately. Sync metadata and explicitly unwatched
table records are excluded. This does not require Trakt and does not count plays
or playback positions. Missing or malformed snapshot lists contribute no marks.
The API field remains `watch_state_items` for compatibility.

Audit operations use shared German labels in the dashboard and audit tables,
with a `Global:` prefix for global actions; unknown operation codes remain visible.
Audit profile names are resolved from that account's current snapshot. Missing
or deleted profiles retain an explicit unknown/deleted label and their ID.
Remote Config separates Playlists, Add-ons and Catalogs into three selectable
areas. Each filters the existing action list, with separate cards for action,
settings, preview/confirmation and scope. Switching areas preserves field input
but selects that area's default action; it never submits a change. The existing
preview and explicit `ALLE ACCOUNTS` confirmation remain required.
Individual account configuration uses the same action/settings/apply/scope cards
for its existing Playlists and Add-ons actions; the advanced snapshot editor is
separate below. Playlist actions retain profile scope, host actions can target all
profiles, and add-ons remain account-wide. Unlike global actions, individual
changes retain their existing direct-save flow without a global preview.
The device table shows only heartbeat-capable installations, both online and
offline. Login sessions and legacy app-open events remain stored and available
in the account API, but are hidden from this table. The latest device per platform
and device type is shown by default; older loaded devices can be expanded without
deleting events or revoking logins. This grouping is not physical-device identity.
Device types, platforms, profiles, versions, builds, distribution and events use
separate badges. Installation IDs are hidden in the UI but retained internally
for heartbeat updates and device removal; they are random IDs, not hardware IDs.
An explicit empty state appears when no heartbeat-capable devices have reported.
The account API limits remain 50 installations and 20 valid sessions per account.
Device events use readable labels: `heartbeat` is `Live-Status gemeldet`,
`app_open` is `App gestartet`, and `active_session` is `Login erstellt`.
Unknown event names remain visible unchanged.
Online means an authenticated heartbeat received within the last 90 seconds.
Updated Android clients send every 30 seconds while an activity is started;
the Webplayer sends only while its tab is visible and signed in. Backgrounding,
logout and network loss stop the signals; status expires rather than relying
on an unreliable final disconnect request. Allow approximately 90–105 seconds
for an abrupt disconnect to appear offline. Admin status polling runs every
15 seconds while the admin tab is visible, without reloading open editors.
Polling failures are reported explicitly. Valid logins and legacy analytics are
never online evidence; legacy-only installations have no live status and are hidden
from the device table.

Deploy migration `012_device_presence.sql` and the new backend before updating
Android/Web clients. `POST /device-presence` uses the account access token and
derives account identity from it, never from client-provided user IDs. Required
fields are `install_id`, `platform` (`android` or `web`) and `device_type`;
optional fields are `profile_id`, `app_version`, `app_version_code`, `distribution`.
One row per account/installation is upserted using server timestamps, without
adding analytics events. Account deletion cascades to presence rows; removing
a device removes its presence/history, not its credentials (an active device
can reappear). Offline cleanup preserves installations with recent heartbeats.
This operational status is independent of diagnostic analytics consent. Android
reuses the existing installation ID; browsers share a persistent ID across tabs.
Presence describes recent authenticated activity, not a guaranteed open socket
or unique physical hardware. An already-issued access token remains usable until
its normal expiry, including after refresh-session revocation.

The version cards show the running backend package, the deployed Web version
from `https://web.streamnet.live/api/version`, and the latest published Android
APK release from GitHub (validated to contain the matching APK asset).
The Web endpoint must be deployed with the Webplayer before it can report
the version; a missing endpoint is an explicit error, never a reference fallback.
No versions are read from GitHub `main` or hardcoded Web/Android references.
Version cards link to the matching Backend/Web changelog text or Android release
notes in the repository. Source details and errors appear directly in each card,
without a separate version-summary list.

The authenticated `GET /admin-api/versions` endpoint (also available at
`/admin-api/updates`) runs automatically on dashboard load and via the
dashboard's **Aktualisieren** button. Only fixed public URLs are fetched, without account
data or GitHub credentials, with eight-second timeouts, redirects rejected,
and per-component errors. The dashboard does not display Android device-version
statistics. The local demo explicitly simulates version sources.
Accent gradients and decorative corner bubbles are reserved for the Dashboard cards; the other admin pages
use solid element backgrounds.

For a database-free local UI preview, run `npm run preview:admin` and open
`http://127.0.0.1:4173/admin`. Sign in with `preview` / `preview1234`.
The preview uses fake data, does not load `.env`, binds only to loopback, and
disables unsupported account-detail and mutation actions. It is not the backend
server and must not be used for production.

The protected dashboard is served at `PUBLIC_BASE_URL/admin`. It shows database
health, accounts, profile and snapshot metrics, a redacted payload view, and the
admin audit log. It can add or replace an account-wide add-on, add or replace a
profile playlist, remove add-ons or playlists, and delete profiles. Every
mutation requires the current snapshot revision and a reason, then creates a new
revision and an audit entry in the same PostgreSQL transaction.

The account detail page can also revoke all active sessions and permanently
delete an account. Both actions require an admin reason. Account deletion keeps
an audit entry with the deleted account id and email in the audit details while
avoiding a live foreign-key reference to the deleted account, so the audit trail
does not block the deletion itself.

These two account actions remain directly visible. Offline-history reset and
device/session cleanup are tucked into the collapsed "Erweitert" section, with a
warning that cleanup can revoke older valid logins. The live-device table has no
action column; removing history is not a device logout. Individual removal API
endpoints remain available.

For remote Stremio add-ons, paste either a `stremio://...` install link, a bare
host/path, or a full `https://.../manifest.json` URL. The server fetches the
manifest and builds the same account-wide add-on snapshot shape used by the
Android settings install path, including manifest metadata, resources, catalogs,
logo, transport URL, and stable instance ID. Account and audit tables are
paginated, and account details show the latest known device per install ID with
profile, app version, online status, and account-scoped audit history. Manual
redacted JSON editing remains available as an advanced snapshot editor.

Run migration `009_admin_dashboard.sql`, then create the first administrator
from the server shell. The administrator signs in with a username (3-64
characters: `a-z`, `0-9`, `.`, `_`, `-`; it must start and end with a letter or
digit; case is ignored; an e-mail address is not accepted). The password is not
stored in `.env` and must contain at least 8 characters:

```sh
read -rp "Admin username: " STREAMNET_ADMIN_USERNAME
read -rsp "Admin password: " STREAMNET_ADMIN_PASSWORD; echo
export STREAMNET_ADMIN_USERNAME STREAMNET_ADMIN_PASSWORD
docker compose exec -e STREAMNET_ADMIN_USERNAME -e STREAMNET_ADMIN_PASSWORD streamnet-backend npm run create:admin
unset STREAMNET_ADMIN_USERNAME STREAMNET_ADMIN_PASSWORD
```

To intentionally replace an existing administrator password, additionally pass
`-e STREAMNET_ADMIN_REPLACE_PASSWORD=1`. Administrators that were created
earlier with an e-mail address can no longer sign in; create a new one with a
username and disable the old entry:

```sh
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "update admin_accounts set disabled_at = now() where email_normalized like '"'"'%@%'"'"'"'
```

Admin access uses a separate 30-minute
JWT purpose and never accepts a normal StreamNet account token. The dashboard
masks tokens, passwords, API keys, playlist URLs, portal URLs, and MAC addresses.
Place an IP allowlist or an interactive access proxy in front of `/admin` and
`/admin-api` when exposing the production host; do not apply that middleware to
the Android API routes.

### Remote Config: global playlists, add-ons and catalogs

The **Remote Config** navigation section adds, edits, removes selected entries, or
clears all playlists/add-ons across registered accounts, regardless of search,
pagination, or online filters.

Catalog operations are `add_catalog`, `rename_catalog`, `set_catalog_enabled`,
and `delete_catalog`:

- Add Trakt or MDBList lists with `data.sourceType` (`TRAKT` / `MDBLIST`),
  `data.sourceUrl`, `data.title`, and an optional boolean `data.enabled`.
  Supported URLs are Trakt user lists / numeric list URLs and MDBList user lists.
  Reusing the normalized source URL updates its deterministic catalog ID.
  Newly added catalogs are prepended to each profile's saved catalog order, so
  Android and Web show them directly below Continue Watching (or first when it
  is absent). Updating an existing catalog preserves its position and the
  relative order of all other catalogs; previously added catalogs are not moved.
- Add existing built-in or add-on templates with `data.sourceType`
  (`PREINSTALLED` / `ADDON`), `data.templateId`, an optional replacement
  `data.title`, and `data.enabled`. Templates come from existing snapshots or
  installed add-on manifests, not a new central catalog registry. Add-on
  catalogs require the matching installed add-on instance on the target account;
  this operation does not install add-ons.
- Rename, toggle or remove the selected `targetId` wherever it exists. Rename
  takes `data.title`; toggling takes a boolean `data.enabled`. These operations
  preserve source URLs and collection metadata. Catalog URLs are not exposed
  by the inventory.
- Custom list removal deletes the profile entry. Built-in, add-on and home-server
  removal keeps a disabled record and updates the corresponding hidden-ID list,
  preventing automatic regeneration from making it visible again.
  A profile's explicit empty catalog list overrides legacy root catalogs.
- Changes stamp `catalogsUpdatedAtByProfile`, including visibility changes.
  `remoteManaged` protects intentional hiding from automatic sports restoration;
  `remoteTitle` preserves remote names during default/add-on refresh and Web
  localization. Deploy the updated APK and Web client alongside the backend
  before relying on these guarantees. Provider authentication/API keys remain
  device/account prerequisites.

- Adding applies to every existing profile of every configurable account.
  Entries with the same ID are updated rather than duplicated.
- Editing/removing targets an existing ID only where it is present. Playlist
  edits retain that ID and extra per-profile properties, but replace the name,
  M3U/EPG URLs, and displayed activation/import options. Stored URLs are not
  exposed; enter replacement URLs explicitly. An empty EPG URL clears the
  entry's EPG configuration.
- Add-on links are hydrated through the existing Stremio manifest loader.
  Changing a link replaces the old instance ID while preserving existing
  per-profile activation. The activation checkbox applies to new assignments.
- Clearing playlists also clears profile-scoped legacy M3U/EPG fields.
  Android may still display its empty, disabled StreamNet TV system entry;
  this action does not remove the application's built-in preset.

Accounts without a cloud snapshot or profiles are counted as skipped, not
initialized with invented profiles. These actions do not establish defaults
for future accounts or profiles. Existing application playlist limits remain
unchanged.

A preview reports changed, unchanged, and skipped accounts. Applying requires
typing **ALLE ACCOUNTS**. Removal is irreversible. If account membership or any
snapshot changes after preview, the server rejects the action with HTTP 409;
load a new preview rather than automatically retrying a global change.

Changes and per-account audits run in one PostgreSQL transaction. Each changed
snapshot receives a new revision, sync timestamps, and `source = 'admin'`.
Audit operations use the `global_` prefix and share a batch ID. Unchanged and
skipped accounts receive no new revision. Devices apply changes on their next
cloud pull. No additional database migration is required.

Choose **Xtream Codes** to enter server URL, username and password separately.
The backend generates encoded `get.php` and `xmltv.php` URLs. These credentials
are identical for all targeted accounts; they are not per-user provisioning.
Choose **StreamNet TV** to configure the protected `streamnet_tv` entry rather
than creating a separate custom playlist.

The **Xtream / StreamNet TV: only change host** action (`change_xtream_host`)
instead retains each existing entry's credentials, ID, name, activation and
import flags. Select its ID and enter `data.host`; M3U and EPG addresses are
rebuilt for that server. Missing/invalid credentials fail the whole transaction,
including preview, rather than silently skipping broken entries. Legacy
host/user/password triplets and credential-bearing Xtream URLs are supported.
This action also resets cached account expiry checks.

StreamNet TV remote hosts set `streamNetHostOverride`. The updated Android app
preserves that explicit configuration instead of migrating it back to the
build-time server; without this field, existing migration behavior is unchanged.
**Deploy the updated APK before relying on custom StreamNet TV hosts.** Older
apps can restore the built-in server on their next sync. The WebUI preserves
the override when normalizing and synchronizing playlists.

The admin-only endpoints are `GET /admin-api/global` (redacted inventory),
`POST /admin-api/global/preview`, and `PATCH /admin-api/global/snapshot`.
Mutation operations are `add_playlist`, `edit_playlist`, `delete_playlist`,
`clear_playlists`, `change_xtream_host`, `clear_streamnet_host_override`, `add_addon`, `edit_addon`, `delete_addon`, and `clear_addons`.

### StreamNet TV host for a single account

The account detail page has the action **StreamNet TV: Host ändern**
(`change_streamnet_host` on `PATCH /admin-api/accounts/:accountId/snapshot`). It
applies the same host-only logic as `change_xtream_host` with the fixed
`streamnet_tv` ID, but only to that account: pass `data.host` and optionally a
`profileId` to restrict it to one profile (the UI offers "Alle Profile" as the
default). Credentials, activation and import flags are kept, M3U/EPG addresses are
rebuilt and `streamNetHostOverride` is set. Like every account mutation it needs
`expectedRevision`, writes a new revision and an audit entry (the audit details
include the new host). It fails with `streamnet_tv_not_configured` when the
account (or selected profile) has no `streamnet_tv` entry, and with
`streamnet_tv_host_unchanged` when the host is already set.

### Removing the StreamNet TV host override

The action **StreamNet TV: Host-Override entfernen** (`clear_streamnet_host_override`) removes only the
`streamNetHostOverride` field of the `streamnet_tv` entry. Credentials, activation, import flags and the
stored M3U/EPG addresses stay as they are. Without an override the Android app moves the entry back to its
built-in server on the next load (the migration in `ensureStreamNetTvPreset`), so this is how a host
set by `change_xtream_host` / `change_streamnet_host` is undone. The backend does not know the built-in
host and therefore does not rewrite the addresses itself.

- **Global:** Remote Config → operation `clear_streamnet_host_override` (no target needed; the ID is fixed).
  Same preview and `ALLE ACCOUNTS` confirmation as the other global actions; accounts without an override
  are reported as unchanged.
- **Single account:** account detail → `clear_streamnet_host_override` on
  `PATCH /admin-api/accounts/:accountId/snapshot`, optionally with a `profileId` (the UI offers "Alle Profile").
  Fails with `streamnet_tv_not_configured` when there is no `streamnet_tv` entry and with
  `streamnet_tv_no_override` when no override is set.
Edit/delete requests supply `targetId`; add/edit requests supply `data`.
Apply requests additionally supply the preview's `state` as `expectedState`
and `confirmation: "ALLE ACCOUNTS"`, with an optional audit `reason`.
Playlist data may include `sourceType: "xtream"` or `"streamnet_tv"` plus
`host`, `username`, and `password` instead of manually supplied URLs.

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

If the server was previously using Docker named volumes (`postgres_data` or
`backend_logs`), do not switch directly to the bind mounts without exporting and
restoring the database first. A fresh empty
`/opt/appdata/streamnet-backend/postgres` folder makes PostgreSQL initialize an
empty cluster. Use `pg_dump` from the old running stack, start the new
bind-mounted stack, then restore the dump into the new database. Keep the old
named volume until the restored service has passed login and sync checks.

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
- Compose also writes structured logs to `/opt/appdata/streamnet-backend/logs`
  by default.
  `LOG_FILE=/app/logs/backend.log` enables the file target, which rotates daily
  or at 10 MB and retains 14 older files. Override this with
  `LOG_FILE_FREQUENCY`, `LOG_FILE_MAX_SIZE`, and `LOG_FILE_RETAINED_COUNT`.

Inspect the current files directly on the host:

```sh
ls -lh /opt/appdata/streamnet-backend/logs
tail -n 100 "$(ls -1t /opt/appdata/streamnet-backend/logs/backend*.log | head -n 1)"
```

PostgreSQL stores its live data files in
`/opt/appdata/streamnet-backend/postgres` by default. Prefer logical backups
with `pg_dump` for migration or restore work; do not edit live database files by
hand.

The API router deliberately has no Authelia middleware. Android TV and mobile calls authenticate with bearer tokens and cannot complete an interactive browser login. Keep Authelia on human-facing admin services, not on this API.

## Self-Hosted Account Page

`PUBLIC_BASE_URL` now serves the existing StreamNet gold account page and StreamNet logo assets directly from this container. It supports self-hosted sign-in, account creation, and QR TV-pairing approval without Netlify. Use `https://auth.mystreamnet.club/` to inspect it; QR codes open the same page with a one-time `?code=...` pairing parameter.

The active static web assets live in `backend-cloud/public/` and are copied into the Docker image from that directory.

Account deletion is available at `https://auth.mystreamnet.club/delete-account`; it requires a fresh sign-in and an exact `DELETE` confirmation, revokes the account sessions, removes the cloud snapshot, and removes pending TV pairing sessions. It does not fall back to Netlify.

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

Install `app/build/outputs/apk/sideload/selfHosted/app-sideload-selfHosted.apk` alongside the production app. Sign in with a migrated account, validate Cloud Sync, profile restoration, TV pairing, Discord pairing, account deletion, and password reset. The production release uses the same backend endpoint.

## Container Publishing

The `Publish StreamNet Cloud Backend` GitHub Actions workflow runs for changes under `backend-cloud/` on `main`. It tests the service and publishes these GHCR tags:

- `ghcr.io/cyb3rgh05t/streamnet-backend:latest`
- `ghcr.io/cyb3rgh05t/streamnet-backend:sha-<commit>`

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
`backend-cloud-postgres-1`). Run them from the directory containing
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
