# Live TV Handover - 2026-07-23

## Sicherer Stand (bereits gepusht)

- Branch: main
- Remote: origin
- Checkpoint Commit: aa4a1436
- Commit Message: checkpoint: last working live tv state before backend epg worker
- Status: Funktionierender App-Stand ist auf GitHub gesichert.

## Was heute umgesetzt wurde (funktionierender Stand)

- Live TV EPG UX in mehreren Iterationen angepasst.
- LIVE-Badge im EPG-Balken entfernt.
- Category-Selector dünner gemacht.
- NOW-Separator ohne Glow.
- NOW-Badge sichtbarer positioniert.
- Programmtitel-Verhalten im EPG-Balken verbessert (Ellipsis/Marquee-Logik).
- Snap-to-NOW beim Channel-List-Fokus verbessert.
- EPG-Zeitfenster auf +/-48h angehoben.
- Cache-first + SWR-Verhalten im bestehenden Client-Flow verbessert.

## Bewusst noch NICHT gepusht (Backend-Scaffold, getrennt gehalten)

- supabase/functions/epg/index.ts
- supabase/migrations/202607231930_epg_cache_backend.sql
- .github/workflows/epg-ingest.yml
- tools/epg-ingest/ingest.mjs
- tools/epg-ingest/README.md

## Sicherheitsregel fuer morgen

- Nicht auf main direkt weiterentwickeln.
- Erst neuen Branch fuer Backend-EPG anlegen.
- Dann nur die Backend-Scaffold-Dateien committen.
- Danach in kleinen Schritten umsetzen und testen.

## Plan fuer morgen

1. Branch fuer Backend-EPG erstellen.
2. Untracked Backend-Dateien in diesem Branch committen.
3. Worker ausbauen:
   - XMLTV Streaming Parse.
   - Xtream short-EPG (visible-first).
   - Bulk Upsert nach epg_program.
   - Pruning ausserhalb Rolling Window.
4. epg_source Metadaten pflegen:
   - fetched_at, expires_at, etag, last_modified, status.
5. End-to-End Test mit Supabase.
6. Erst nach Verifikation merge vorbereiten.

## Ziel

- Stabilen Stand niemals riskieren.
- Neue Backend-EPG-Pipeline kontrolliert und reproduzierbar aufbauen.
