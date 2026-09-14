# Cloud-Synchronisierung via SSE

## Status

WebUI und Android verwenden beide die SSE-Benachrichtigung des Self-Hosted Cloud-Backends unter `/account-sync-events`.

- Die WebUI verbindet sich ueber `/api/cloud-auth/account-sync-events` und ruft bei einer neuen Revision `refreshData(..., true)` auf.
- Android startet `RealtimeSyncManager` bei authentifiziertem Cloud-Konto. Der Manager haelt die SSE-Verbindung, reconnectet mit Backoff und nutzt zusaetzlich den 60-Sekunden-Pull als Fallback.
- Android leitet einen erfolgreichen SSE-Pull an `HomeViewModel` weiter. Dadurch werden Continue Watching, Recently Watched, Watchlist und die uebrigen Home-Daten aktualisiert.

## Ueberschreibschutz

SSE uebertraegt keine Nutzdaten und schreibt selbst nichts. Es signalisiert nur, dass eine neue Cloud-Revision vorhanden ist. Jeder Client laedt danach den autoritativen Snapshot.

- Cloud-Pushes verwenden Revision/CAS, damit parallele Pushes keinen stillen Blind-Overwrite erzeugen.
- Die bestehenden Feld-Zeitstempel- und Merge-Regeln entscheiden bei gleichzeitigen Aenderungen am gleichen Datenfeld.
- Lokale Pushes werden bei einem Pull weiterhin nach den bestehenden Pending-Change-Regeln behandelt.
- SSE-Verbindungsaufbau, Reconnect oder ein Pull-Event loeschen keine Daten.

## Android-SSE-Pull

Ein SSE-Event wird als autoritativer Invalidierungs-Hinweis behandelt. Der zugehoerige Pull setzt `forceApplyRemote = true`, damit der normale 30-Sekunden-Burst-Guard einen neuen Remote-Stand nicht als bereits erledigt ausblendet.

## Grenzen

SSE arbeitet nur, solange die WebUI-Seite bzw. der Android-Prozess aktiv genug ist. Bei geschlossenem Browser oder vom Betriebssystem beendetem Android-Prozess greifen Reconnect beim nächsten Start sowie der normale Start-/Fallback-Pull.

## Validierung

- Kotlin-IDE-Diagnose fuer `RealtimeSyncManager.kt` und `app/build.gradle.kts`: keine Fehler.
- Vorheriger Sideload-Debug-Build war erfolgreich; ein erneuter Compile-Lauf kann auf Windows beim Kotlin-Task bei 95 % haengen bleiben, ohne Fehlerausgabe.
