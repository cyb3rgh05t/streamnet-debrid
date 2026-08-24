# StreamNet Self-Hosted Backend

This is a staging backend. It does not change the Android APK, Netlify, or Supabase configuration.

## Included now

- PostgreSQL schema and repeatable migration runner.
- Netlify-compatible `scrypt` password verification for imported Netlify accounts.
- `auth-login`, `auth-refresh`, `account-sync-pull`, and `account-sync-push`.
- Revision-based snapshot compare-and-set compatible with the Android conflict retry.
- Supabase NDJSON account-snapshot importer.
- Traefik-compatible Docker Compose configuration with domain, certificate resolver, and published container image from `.env`.

TV pairing, password reset, Discord, account deletion, media proxies, and the APK switch are intentionally not included in this first staging step.

## Local or Server Setup

1. Copy `.env.example` to `.env` and set your real domain, passwords, and JWT secret.
2. This Compose file is preconfigured for the existing Traefik network `proxy`, entrypoint `https`, and certificate resolver `dns-cloudflare`. Change those values only if your server uses different names.
3. Pull the published backend image and start PostgreSQL and the API with `docker compose pull && docker compose up -d`.
4. Run migrations with `docker compose exec streamnet-backend npm run migrate`.
5. Check `https://your-domain/health` through Traefik.

Do not point the production APK to this service yet.

The API router deliberately has no Authelia middleware. Android TV and mobile calls authenticate with bearer tokens and cannot complete an interactive browser login. Keep Authelia on human-facing admin services, not on this API.

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
curl -sS https://api.mystreamnet.club/auth-login \
  -H 'content-type: application/json' \
  --data '{"email":"TEST_EMAIL","password":"TEST_PASSWORD"}'
```

The result contains `access_token`. Use it to confirm the empty snapshot state:

```sh
curl -sS https://api.mystreamnet.club/account-sync-pull \
  -H "authorization: Bearer ACCESS_TOKEN"
```

Expected first response: `{"payload":null,"revision":0,...}`. Do not import Supabase or Netlify data until this login and pull test works.

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

## Netlify Account Passwords

The current Netlify account records use `scrypt`. The API can verify that format when a migrated account has `password_hash_scheme = 'netlify_scrypt'`. Importing the Netlify Blob account records is the next migration task; it must copy only `email`, `accountId`, and `passwordHash`, never active access or refresh tokens.

## Safety

- Keep Netlify and Supabase live while testing.
- Keep encrypted source exports and PostgreSQL backups outside the server.
- Treat the first APK pointed at this API as a test build only.
