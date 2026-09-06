# Guide, Admin und Playback - Stand 2026-09-06

## Umfang

Dieser Stand bündelt gezielte Android-Verbesserungen für Live TV, Home, Suche und
Wiedergabe mit einem geschützten Administrationsbereich des ausschließlich
self-hosted betriebenen StreamNet-Backends. Netlify und Supabase sind an keiner
neuen Runtime-Funktion beteiligt.

## Live TV und Guide

- `IptvGuideRequestBudget` begrenzt parallele Requests je Anbieter, staffelt
  Starts und berücksichtigt Cooldowns für Authentifizierungs-, Rate-Limit- und
  temporäre Serverantworten.
- XMLTV-Verarbeitung reagiert auf Coroutine-Abbruch und arbeitet vorrangig für
  sichtbare Sender. Dadurch blockieren verlassene oder ersetzte Guide-Anfragen
  keine nachfolgenden Aktualisierungen.
- `GuideRenderWindow` beschränkt Compose-Programmzellen auf den sichtbaren
  Zeitbereich mit einem kleinen Vorlauf.
- `IptvNowNext.atTime` ordnet laufende und kommende Sendungen ohne erneuten
  Netzwerkabruf anhand der aktuellen Uhrzeit neu ein.
- `LiveWindowRecovery` begrenzt automatische Wiederherstellungen nach
  Behind-live-window-Fehlern und greift nicht in Catch-up-Wiedergabe ein.
- Senderqualität wird nicht mehr pauschal als SD angenommen. Während der
  Wiedergabe liefert Media3 die tatsächliche Auflösung für das Qualitätsbadge.

## Artwork und Oberfläche

- Der Home-Fokuspfad übergibt auch das bereits beim Start ausgewählte erste Item
  an die Hero-Detailauflösung. Geladenes TMDB-Fanart wird weiterhin direkt vom
  ViewModel nur auf den noch aktuellen Hero angewendet.
- Das Netflix-artige Live-TV-InfoPanel übernimmt die Kartenpriorität: entfernte
  Programm-Fanart, gebündeltes Kategorie-/Länder-Artwork und erst danach das
  Senderlogo auf dem Senderfarbverlauf. Fallbacks überlagern keine erfolgreiche
  Programm-Fanart.
- Favorite-/Recent-TV-Logos verwenden eine eingepasste Darstellung ohne
  zusätzliche Clearlogo-Ebene. Search besitzt einen einzigen TV-Fokuspfad und
  responsive Touch-Zeilen.

## Player und Cloud-Start

- Playerfehler und Statusmeldungen für Quellenstart, Netzwerk, HTTP, Codec,
  Format, Audio und Untertitelabgleich liegen in deutschen und englischen
  Ressourcen statt in fest eingebauten Texten.
- Die Quellensuche löscht einen bereits relevanten Fehler nicht durch später
  eintreffende ergänzende Ergebnisse. Quellenwechsel zeigen den konkreten
  Zielnamen, wenn er bekannt ist.
- Ein persistiertes Cloud-Profil hält den verbundenen UI-Zustand bei `Loading`
  oder einem vorübergehenden Authentifizierungsfehler. Nur ein expliziter
  unauthentifizierter Zustand trennt die Anzeige.
- Der Profilwechsel verwendet einen gemeinsamen Navigation-Helper und erzeugt
  keine konkurrierenden ProfileSelection-Einträge im Backstack.

## Self-hosted Admin-Dashboard

Der Administrationsbereich läuft unter `/admin` und verwendet eigene, auf 30
Minuten begrenzte Admin-JWTs. Normale StreamNet-Account-Tokens werden nicht als
Admin-Authentifizierung akzeptiert.

Schreibzugriffe sind auf `upsert_addon`, `upsert_playlist` und freigegebene
Profilfelder beschränkt. Jede Änderung benötigt die aktuelle Snapshot-Revision
und einen Grund, erhöht die Revision atomar und schreibt im selben
PostgreSQL-Transaktionskontext einen Audit-Eintrag. Geheimnisse, Tokens,
Playlist-/Portal-URLs, MAC-Adressen und vergleichbare Werte werden in der
Administrationsansicht maskiert.

Vor einem Produktiv-Rollout müssen ein PostgreSQL-Backup und anschließend die
Migration `009_admin_dashboard.sql` über den vorhandenen Migration-Runner
erfolgen. Der erste Admin wird interaktiv im Server-Terminal erstellt; das
Passwort gehört nicht in `.env`, Logs oder Repository. Für `/admin` und
`/admin-api` wird zusätzlich eine IP-Allowlist oder ein Access-Proxy empfohlen,
ohne die Android-API-Routen einzuschränken.

## Validierung

- `:app:compileSideloadDebugKotlin`: erfolgreich
- `:app:testSideloadDebugUnitTest -PenableUnitTests`: 536 Tests, 0 Fehler,
  1 übersprungen
- `:app:assembleSideloadDebug`: erfolgreich
- Debug-APK SHA-256:
  `6F6BCB7C916B775B8875C9DA6451DB3CCE27108422F166B4F03D29EADA34B94D`
- Self-hosted Backend: 32 Tests, 32 erfolgreich
- `git diff --check`: ohne Befund