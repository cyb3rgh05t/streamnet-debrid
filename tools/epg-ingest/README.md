# EPG Ingest Worker (Phase 2)

This worker refreshes backend EPG cache rows in Supabase.

Current scope (implemented):

- Load refresh candidates from `public.epg_source`.
- Process `xmltv` sources with streaming parse (bounded memory guard).
- Process `xtream` sources via per-channel short-EPG calls (`player_api.php`).
- Filter programs to rolling window: now-48h .. now+48h.
- Optional channel filtering using `wanted_channels` from `epg_source`.
- Batch upsert into `public.epg_program`.
- Update `epg_source` metadata: `fetched_at`, `expires_at`, `etag`, `last_modified`, `status`.
- Local fallback for service-role key discovery via `supabase projects api-keys` when not set in env.

Required environment variables:

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

Optional environment variables:

- EPG_REFRESH_LIMIT (default: 20)
- EPG_UPSERT_BATCH_SIZE (default: 400)
- EPG_SOURCE_TTL_MINUTES (default: 30)
- EPG_ENABLE_PRUNE (default: false)
- EPG_XTREAM_MAX_CHANNELS (default: 60)
- EPG_XTREAM_SHORT_LIMIT (default: 36)

Planned next steps:

1. Add retry/backoff policy per source class.
2. Add stronger telemetry and source-level stats output.
3. Enable/validate pruning policy in production after soak period.
4. Move `xtream_ref` to encrypted storage or sealed reference model.

Run locally:

- node tools/epg-ingest/ingest.mjs
