# EPG Ingest Worker (Phase 1)

This worker refreshes backend EPG cache rows in Supabase.

Current scope (implemented):

- Load refresh candidates from `public.epg_source`.
- Process `xmltv` sources with streaming parse (bounded memory guard).
- Filter programs to rolling window: now-48h .. now+48h.
- Optional channel filtering using `wanted_channels` from `epg_source`.
- Batch upsert into `public.epg_program`.
- Update `epg_source` metadata: `fetched_at`, `expires_at`, `etag`, `last_modified`, `status`.
- Skip `xtream` sources for now (planned in Phase 2).

Required environment variables:

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

Optional environment variables:

- EPG_REFRESH_LIMIT (default: 20)
- EPG_UPSERT_BATCH_SIZE (default: 400)
- EPG_SOURCE_TTL_MINUTES (default: 30)
- EPG_ENABLE_PRUNE (default: false)

Planned next steps:

1. Add Xtream short-EPG ingestion (visible/wanted channels first).
2. Add retry/backoff policy per source class.
3. Add stronger telemetry and source-level stats output.
4. Enable/validate pruning policy in production after soak period.

Run locally:

- node tools/epg-ingest/ingest.mjs
