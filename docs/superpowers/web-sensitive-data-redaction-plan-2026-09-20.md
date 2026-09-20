# Web Sensitive Data Redaction Plan - 2026-09-20

## Problem

The StreamNet web client can currently receive account sync payload fields that are sensitive when viewed in browser DevTools. This includes IPTV playlist URLs, Xtream credentials, Stalker portal/MAC values, subtitle AI API keys, home-server connection JSON, TorrServer URLs, addon transport/install URLs, and bearer tokens used for authenticated backend calls.

Important constraint: data cannot be truly hidden from DevTools if the browser must use it directly. JavaScript obfuscation, base64 encoding, or client-side encryption with a bundled key only delays inspection. Real protection requires either not sending the secret to the browser, or using a server-side proxy/opaque identifier flow.

## Current Relevant Code Paths

- Web cloud pull: `web/lib/cloud.ts` calls `/api/cloud-auth/account-sync-pull` through `backendRequest()` and parses the returned raw payload.
- Next backend proxy: `web/app/api/cloud-auth/[action]/route.ts` forwards cloud-auth requests to `STREAMNET_BACKEND_URL`, defaulting to `https://auth.mystreamnet.club`.
- Self-hosted sync route: `backend-cloud/src/server.js` returns the full `account_sync_snapshots.payload` from `/account-sync-pull`.
- Snapshot merge helpers: `backend-cloud/src/snapshots.js` owns payload metrics and server-side push merge behavior.
- Admin redaction reference: `backend-cloud/src/admin-snapshots.js` already redacts admin payload views and preserves `[REDACTED]` placeholders during admin edits. Its broad field pattern is useful as prior art, but too aggressive for normal web playback/UI use.

## Low-Risk Plan

### Phase 1: Add a Web-Safe Pull View

Add a dedicated redaction helper in `backend-cloud/src/snapshots.js`, for example `redactWebPayload(payload)`, and expose it only for web pulls.

Recommended route shape:

- Keep Android/default behavior unchanged: `GET/POST /account-sync-pull` returns the full payload.
- Add a web-safe mode: `GET /account-sync-pull?view=web` or request header `X-StreamNet-Client: web` returns the same response shape, but with `payload` redacted.
- Update `web/lib/cloud.ts` to call `account-sync-pull?view=web` for ordinary browser reads.

Fields to redact or omit in the web-safe payload:

- `subtitleAiApiKey`, `customTmdbApiKey`, `customTvdbApiKey`, `customTvdbUserPin`.
- IPTV credentials and URLs: `m3uUrl`, `epgUrl`, `epgUrls`, `xtreamUrl`, `host`, `server`, `portal`, `baseUrl`, `username`, `password`, `user`, `pass`.
- Stalker fields: `stalkerPortalUrl`, `stalkerMacAddress`, `iptvStalkerUrl`, `iptvStalkerMac`.
- Home-server and TorrServer fields: `homeServerConnectionJson`, `torrServerBaseUrl`.
- Addon transport/install URL fields where they can include tokens: `url`, `manifestUrl`, `transportUrl`.
- Any auth-like field names matching `password`, `token`, `secret`, `authorization`, `credential`, `apiKey`, `api_key`.

Preserve safe metadata so the UI can still render useful settings state:

- Profile IDs and names.
- Playlist IDs, names, enabled flags, group/favorite/hide/order settings.
- Addon IDs, names, versions, enabled flags, manifest display metadata where it does not contain credentials.
- Catalog, watchlist, continue-watching, language, theme, and playback preferences.

### Phase 2: Prevent Placeholder Writeback

Do not let redacted placeholders overwrite real secrets.

Rules:

- If web receives `[REDACTED]`, it must not push that value back as a real field value.
- Web mutations should either start from a non-redacted server snapshot inside the backend, or the backend should merge placeholder fields by preserving the current stored value.
- If this is implemented in `mergePushPayloadByFieldTimestamps()`, treat `[REDACTED]` as "keep current" for sensitive fields only.
- Add tests in `backend-cloud/test/snapshots.test.js` for placeholder preservation.

This phase is required before using a redacted raw payload as the base for any write path in `web/lib/cloud.ts`.

### Phase 3: Use Opaque IDs for Playback Secrets

Redaction protects loaded settings, but playback URLs still appear in DevTools if the browser opens the real provider URL.

For real protection, introduce server-side resolve/proxy routes:

- Browser sends an opaque identifier such as `playlistId`, `channelId`, `sourceId`, or a short-lived playback token.
- Server looks up the real provider URL from the full stored snapshot.
- Server either proxies the stream or issues a short-lived internal URL that does not expose provider credentials.

Start small with the highest-risk path first:

- IPTV/Xtream playlist/channel playback.
- Then home-server/debrid URLs if needed.

Do not attempt a full streaming proxy for everything in one pass. It can affect CORS, range requests, subtitles, remuxing, and live-TV latency.

## Explicit Non-Goals

- Do not use client-side encryption as the primary protection if the browser bundle also contains the decryption key.
- Do not remove Android's full snapshot access.
- Do not change the canonical snapshot schema only for cosmetic DevTools hiding.
- Do not break existing cloud sync, revision conflict handling, or field timestamp merges.
- Do not route legacy Netlify/Supabase paths back into production; production runtime remains the self-hosted `https://auth.mystreamnet.club` backend.

## Suggested Validation

Backend tests:

- `npm --prefix backend-cloud test`

Focused tests to add:

- Redacted web payload keeps useful profile/playlist/addon structure.
- Sensitive values are absent from the `view=web` payload.
- Android/default pull still returns the full payload.
- Pushing a payload containing `[REDACTED]` for sensitive fields preserves the stored real value.

Manual browser check:

- Sign into the web app.
- Open DevTools Network tab.
- Inspect `/api/cloud-auth/account-sync-pull`.
- Confirm sensitive provider URLs/tokens/passwords are absent from the response body.
- Confirm playback still works for paths intentionally not yet proxied, with the known limitation that direct playback URLs can still appear until Phase 3.

## Recommended First Implementation Slice

1. Implement `redactWebPayload()` in `backend-cloud/src/snapshots.js`.
2. Add `view=web` handling in `backend-cloud/src/server.js` for `/account-sync-pull`.
3. Update `web/lib/cloud.ts` to request `account-sync-pull?view=web` only for browser reads.
4. Add backend tests for redaction and placeholder preservation.
5. Run backend tests and then manually inspect DevTools.
