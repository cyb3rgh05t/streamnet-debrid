# EPG Ingest Worker (Scaffold)

This folder contains the first scaffold for backend EPG ingestion.

Current scope:

- Query refresh candidates from table public.epg_source.
- Print candidate metadata in CI for verification.
- Fail fast when required environment variables are missing.

Required environment variables:

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

Planned next steps:

1. Add source-specific fetchers:
   - XMLTV streaming parser with bounded memory.
   - Xtream short-EPG fetch for wanted channels.
2. Slice data to now-48h .. now+48h.
3. Upsert rows into public.epg_program in batches.
4. Update public.epg_source metadata:
   - fetched_at, expires_at, etag, last_modified, status.
5. Prune old rows outside rolling window.

Run locally:

- node tools/epg-ingest/ingest.mjs
