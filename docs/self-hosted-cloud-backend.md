# Self-Hosted Cloud Backend

## Goal

Replace Netlify and Supabase with services operated on the StreamNet server. The Android application continues using the current cloud API contract, so the first migration only changes the backend base URL.

Target properties:

- Device-to-device synchronization for one account with multiple profiles.
- Concurrent updates do not silently overwrite newer state.
- Authentication, password reset, TV pairing, and account deletion are operated by StreamNet.
- Traefik provides public HTTPS and routes requests to private Docker services.
- PostgreSQL is the canonical data store.
- No dependency on Netlify Functions, Netlify Blobs, Netlify Database, Supabase Auth, or Supabase Storage.

## Architecture

```mermaid
flowchart LR
    App[Android TV and Mobile App] -->|HTTPS| Traefik
    Browser[Auth and Account Pages] -->|HTTPS| Traefik
    Traefik --> Api[streamnet-backend]
    Api --> Postgres[(PostgreSQL)]
    Api --> Smtp[SMTP Provider]
    Api --> Minio[MinIO optional]
```

Services should be deployed in one Docker Compose project or separate Compose projects joined by a private Docker network.

| Service           | Responsibility                                              | Public access        |
| ----------------- | ----------------------------------------------------------- | -------------------- |
| Traefik           | TLS certificates, routing, rate limits, request-size limits | Yes                  |
| streamnet-backend | API, authentication, sync, TV pairing, deletion workflow    | Through Traefik only |
| PostgreSQL        | Canonical application data                                  | No                   |
| MinIO             | Optional object/blob storage                                | No                   |
| SMTP provider     | Transactional email delivery                                | Outbound only        |

A public domain such as `api.streamnet.club` is required for reliable sync outside the home network. The API needs a valid HTTPS certificate. Do not expose PostgreSQL or MinIO directly to the internet.

## Existing API Contract

The Android app currently builds endpoint URLs from `NETLIFY_BACKEND_URL` in `app/src/main/kotlin/com/arflix/tv/util/Constants.kt`. The self-hosted backend should initially preserve these paths and response shapes:

| Endpoint                                                              | Purpose                                                     |
| --------------------------------------------------------------------- | ----------------------------------------------------------- |
| `auth-login`                                                          | Email/password login, issue access and refresh token        |
| `auth-refresh`                                                        | Rotate/refresh a session                                    |
| `cloud-auth-email`                                                    | Account registration and email flow                         |
| `auth-password-start`                                                 | Password-reset request                                      |
| `account-sync-pull`                                                   | Return the latest account snapshot and revision             |
| `account-sync-push`                                                   | Compare-and-set snapshot write                              |
| `account-sync-cursor`                                                 | Sync cursor compatibility endpoint                          |
| `account-sync-delta`                                                  | Delta endpoint; currently compatible with snapshot fallback |
| `tv-auth-start`, `tv-auth-status`, `tv-auth-poll`, `tv-auth-complete` | TV device-code pairing                                      |
| `account-delete-start`, `account-delete-status`                       | Account deletion workflow                                   |
| `discord-*`                                                           | Discord pairing/callback support, if retained               |
| `tmdb-proxy`, `trakt-proxy`, `simkl-proxy`                            | Optional protected API proxy endpoints                      |

Keep `account-sync-pull` and `account-sync-push` behavior compatible during migration. This allows the Android app to point at the new service by changing only `NETLIFY_BACKEND_URL` in `secrets.properties` or CI secrets.

## Authentication

Use a conventional opaque-session or JWT design.

Recommended approach:

1. Store passwords with Argon2id.
2. Store only a hash of each refresh token in PostgreSQL.
3. Issue short-lived access tokens and rotating refresh tokens.
4. Bind refresh sessions to an account and optionally a device identifier.
5. Revoke all sessions during account deletion and password reset.
6. Apply rate limits to login, signup, reset, and TV-pairing endpoints.

The Android client already sends a bearer token to cloud endpoints. The self-hosted API should validate that token and determine the account from it. Do not expose database credentials or SMTP credentials to the APK.

## Canonical Sync Data Model

The server stores one canonical snapshot per account. The snapshot payload remains JSON because the app already serializes the account state that way.

```sql
create table accounts (
  id uuid primary key,
  email text not null,
  email_normalized text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table account_sessions (
  id uuid primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  refresh_token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table account_sync_snapshots (
  account_id uuid primary key references accounts(id) on delete cascade,
  payload jsonb not null,
  revision bigint not null default 0,
  payload_updated_at timestamptz,
  updated_at timestamptz not null default now()
);
```

The `account_sync_snapshots` update must run in a transaction and lock the account snapshot row. The update succeeds only when the client's `expectedRevision` equals the stored revision. A successful update increments the revision. On mismatch, return HTTP `409` with the current revision and payload.

## Multi-Device Conflict Rules

The client and server must treat a full snapshot as a mergeable document, not as an unconditional replacement.

Current rules in the Android code:

- A cloud push loads the remote revision first.
- A stale write receives HTTP `409`, merges with the returned snapshot, then retries once.
- Profiles are merged by stable profile ID. A profile existing only in the remote snapshot is retained.
- A deleted profile records `profileDeletedAtById[profileId]`. A tombstone removes an older profile from a stale device payload and prevents accidental resurrection.
- Continue Watching uses per-item `updatedAtMs` and removal tombstones.
- Watched movie and episode IDs are union-merged.
- Catalogs and watchlists use per-profile timestamps.

A deletion must always emit a tombstone. An absent ID alone is not enough to prove a deletion: it may come from an old device or a partial payload.

## Required Backend Behavior for `account-sync-push`

1. Authenticate the bearer token.
2. Parse `payload` and optional non-negative integer `expectedRevision`.
3. Load and lock the account's snapshot.
4. If `expectedRevision` is present and differs from the stored revision, rollback and return `409`:

```json
{
  "accepted": false,
  "reason": "revision_conflict",
  "revision": 12,
  "current": { "payload": {}, "revision": 12 }
}
```

1. Otherwise write the payload, increment revision, and commit.
2. Return:

```json
{
  "accepted": true,
  "revision": 13
}
```

The server can apply defensive payload validation and size limits. It should not try to infer a profile deletion from a smaller profile array; the client payload carries explicit tombstones for that purpose.

## Traefik Deployment Shape

The exact labels depend on the existing Traefik network and certificate resolver. The backend should be the only service with a Traefik router.

```yaml
services:
  streamnet-backend:
    image: ghcr.io/cyb3rgh05t/streamnet-backend:latest
    environment:
      DATABASE_URL: postgresql://streamnet:${POSTGRES_PASSWORD}@postgres:5432/streamnet
      APP_BASE_URL: https://api.streamnet.club
      JWT_SECRET: ${JWT_SECRET}
      SMTP_URL: ${SMTP_URL}
    networks:
      - internal
      - traefik_proxy
    labels:
      - traefik.enable=true
      - traefik.http.routers.streamnet-api.rule=Host(`api.streamnet.club`)
      - traefik.http.routers.streamnet-api.entrypoints=websecure
      - traefik.http.routers.streamnet-api.tls.certresolver=letsencrypt
      - traefik.http.services.streamnet-api.loadbalancer.server.port=3000

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: streamnet
      POSTGRES_USER: streamnet
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - internal

networks:
  internal:
    internal: true
  traefik_proxy:
    external: true

volumes:
  postgres_data:
```

Keep secrets in an untracked `.env` file or a server-side secret manager. Never commit `JWT_SECRET`, database passwords, SMTP credentials, OAuth client secrets, or API keys.

## Migration Plan

## Existing Data Migration and Rollback

Existing cloud data can be preserved. The account snapshot already contains the profiles, profile settings, addons, catalogs, IPTV configuration, watchlist, Continue Watching state, watched state, and deletion tombstones needed for normal restore.

The repository already contains `netlify-auth-site/scripts/import-supabase-export.mjs`. It reads a Supabase export in NDJSON format and selects the strongest snapshot per account from these sources:

- `public.account_sync_state.ndjson`
- `public.user_settings.ndjson`
- `public.profiles.ndjson` account-sync mirror

The selection prefers the richer snapshot, then profile count, scoped profile coverage, and finally the newest payload timestamp. Optional legacy rows can also be retained from `watch_history`, `watchlist`, `sync_state`, `watched_movies`, and `watched_episodes` as an audit/archive import. Netlify has the same canonical snapshot in its PostgreSQL `account_sync_snapshots` table and an additional Blob mirror.

Migration rules:

1. Take read-only exports from Supabase and Netlify. Keep the original encrypted archives outside the application server.
2. Import copies into a separate staging PostgreSQL database. Never import into the production database first.
3. Generate a report for every account: email or account ID, selected source, profile count, restore rank, scoped coverage, payload timestamp, and payload checksum.
4. Compare the staging report against the exported source counts and manually restore at least one multi-profile account on a test TV and phone.
5. Keep Netlify and Supabase running unchanged while staging is tested. The APK URL is not changed in this phase.
6. Before cutover, repeat the export/import to capture changes made during testing. Keep the old services read-only or active as a rollback target until the new service is verified.
7. Change the APK backend URL only in a separate test build. Do not publish that build until login, pull, push, conflict retry, profile creation, and profile deletion have passed on multiple devices.

### Credentials and Sessions

Account data and sync snapshots can be migrated, but a login session should not be migrated: existing access and refresh tokens are deliberately revoked at cutover.

Netlify's native account records use an application-controlled `scrypt` password hash. A self-hosted backend can retain those hashes temporarily by implementing compatible verification and can rehash the password to Argon2id after a successful login.

Supabase authentication hashes and OAuth state should not be copied blindly into a new authentication system. A user who exists only in Supabase should receive a password-reset email on first login, while their already imported cloud snapshot remains intact. This is the safe path when hash formats, password policies, or identity-provider settings differ.

### Rollback Boundary

Rollback is possible only while the old service remains available and before users write new state exclusively to the new service. Therefore the first production transition should use a short, announced maintenance window:

1. Take final exports and import them into the self-hosted database.
2. Verify account and snapshot counts plus a sample of multi-profile restores.
3. Route a test APK only to the new backend.
4. If validation fails, keep the production APK pointed at the existing backend and investigate; no data needs to be deleted.
5. Only after successful validation, publish an APK that uses the new URL and keep the old export archives for recovery.

### Phase 1: Build an API-compatible backend

- Implement PostgreSQL schema and migrations.
- Port authentication and the two snapshot endpoints first.
- Add tests for revision conflicts, profile creation, profile deletion tombstones, and token revocation.
- Deploy to a staging domain such as `api-staging.streamnet.club`.

### Phase 2: Validate without changing production users

- Create test accounts only on staging.
- Test TV and mobile concurrently: create a profile on device A, start device B with an old snapshot, and verify both profiles remain.
- Delete a profile on A, then push the stale B state, and verify the profile remains deleted.
- Test expired/revoked tokens, password reset, and account deletion.
- Back up and restore PostgreSQL into a disposable environment.

### Phase 3: Add secondary flows

- Port TV device pairing.
- Port account deletion and its background cleanup job.
- Port Discord callbacks only if the feature remains enabled.
- Decide whether each media proxy belongs in the self-hosted backend or should be removed.

### Phase 4: Switch the APK

- Build a separate test APK with `NETLIFY_BACKEND_URL=https://api.streamnet.club`; do not change the production APK URL yet.
- Keep the Supabase mirror enabled only during a limited rollback window.
- Install the test APK on selected devices and monitor sync failures and HTTP `409` rates.
- Change the production APK URL only after successful multi-device tests and a verified migration report.

### Phase 5: Retire external dependencies

- Disable `ENABLE_SUPABASE_SYNC_MIRROR` after a verified migration period.
- Remove Supabase credentials, migrations, and Edge Functions only after exports and backups are retained.
- Disable Netlify deployment only after the new auth/account pages and all retained callback routes work from the self-hosted domain.

Do not delete external production data before a tested export and a verified restore exist.

## Operations Checklist

- Daily PostgreSQL backups, stored outside the host.
- Regular restore test from backup.
- HTTPS certificate renewal monitored through Traefik.
- Container image and OS security updates.
- Database disk, CPU, memory, and connection monitoring.
- Structured API logs with no access tokens, passwords, email-reset tokens, or sync payload contents.
- Rate limiting for authentication and public callback endpoints.
- CORS restricted to StreamNet domains where browser access is needed.
- An incident procedure for compromised JWT secrets: rotate secret and revoke sessions.

## Non-Goals for the First Release

- Per-entity server-side delta synchronization.
- A direct migration of every historical Supabase table.
- Public database or object-storage endpoints.
- Replacing third-party OAuth providers themselves.

The first release should be a small, API-compatible service with robust snapshot synchronization. Features can then move one at a time without putting user profiles at risk.
