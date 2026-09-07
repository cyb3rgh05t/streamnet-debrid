# Offline-Downloads und Live-TV-Layoutwahl

Stand: 2026-09-07

## Ziel

Mobile und Tablet sollen Filme und Serienepisoden fuer Offline-Wiedergabe
speichern koennen. Zusaetzlich soll es in den Oberflaechen-Einstellungen eine
umschaltbare Live-TV-Ansicht geben, damit TV-Nutzer zwischen dem StreamNet
Netflix-Layout und der klassischen Guide-Ansicht waehlen koennen.

## Ohne Cloudkonto

Die App speichert Merkliste, Continue Watching und Gesehen-Status weiterhin
profilbezogen lokal auf dem Geraet. Ohne StreamNet Cloudkonto findet kein
geraeteuebergreifender StreamNet-Cloud-Abgleich statt. Verbundene Tracker wie
Trakt oder Simkl koennen separat weiter genutzt werden, ersetzen aber kein
Cloudkonto fuer StreamNet-Daten.

## Feature 1: Offline-Streaming-Downloads

### Gewuenschtes Nutzerverhalten

- In Details fuer Filme und Episoden erscheint auf Mobile/Tablet eine
  Download-Aktion.
- Ein Download waehlt eine konkrete Quelle aus oder verwendet die aktuell
  gewaehlte Quelle.
- Downloads laufen im Hintergrund weiter, zeigen Fortschritt und koennen
  pausiert, fortgesetzt oder geloescht werden.
- Ein eigener Offline-Bereich zeigt heruntergeladene Filme, Serien und
  Episoden gruppiert nach Titel.
- Offline-Wiedergabe funktioniert ohne Netzwerk, solange die heruntergeladene
  Quelle noch lokal gueltig ist.

### Technische Grundlage

Die App nutzt Media3/ExoPlayer bereits fuer Wiedergabe. Fuer echte Offline-
Downloads sollte nicht ad hoc mit eigenen Dateien gearbeitet werden, sondern
mit der Media3-Download-Infrastruktur:

- `androidx.media3.exoplayer.offline.DownloadManager`
- `androidx.media3.exoplayer.offline.DownloadService`
- `androidx.media3.database.StandaloneDatabaseProvider`
- `androidx.media3.datasource.cache.SimpleCache`
- `androidx.media3.datasource.cache.CacheDataSource.Factory`
- WorkManager oder Foreground Service fuer langlebige Downloads

`work-runtime-ktx` ist bereits vorhanden. Media3-Download-Dependencies und ein
eigener Service fehlen noch.

### Grenzen und Risiken

- DRM-geschuetzte Streams koennen nicht ohne weiteres offline gespeichert
  werden.
- Kurzlebige Debrid-, Addon- oder Token-URLs koennen nach dem Download nicht
  erneut validierbar sein. Deshalb muss der Download die final aufgeloeste
  Media-URL beziehungsweise HLS/DASH-Manifest-Identitaet speichern.
- Telegram-Range-Proxy und Quellen, die nur on-demand streamen, brauchen eine
  eigene Bewertung. Nicht jede Quelle ist downloadfaehig.
- HLS/DASH-Downloads brauchen Segment- und Manifest-Unterstuetzung; einfache
  MP4-Dateien sind leichter.
- Speicherplatz, Netzwerkwahl und Akku muessen kontrollierbar sein.

### Datenmodell

Ein neues lokales Download-Modell sollte mindestens enthalten:

- interne Download-ID
- Profil-ID
- TMDB-ID, MediaType, Titel, Poster, Backdrop
- Staffel/Episode fuer Serien
- Quellenname, Addon-ID oder Home-Server-Referenz
- Manifest-/Stream-URI
- Download-Status: queued, downloading, paused, completed, failed, expired
- Fortschritt, Groesse, Fehlertext
- Erstellungszeit, letzter Validierungszeitpunkt, Ablaufzeitpunkt falls bekannt

Dieses Modell sollte lokal bleiben. StreamNet Cloud sollte hoechstens Metadaten
oder Download-Wunschlisten synchronisieren, nicht die Mediendateien.

### UI-Screens

- Details: Download-Button neben Play/Quelle waehlen auf Mobile und Tablet.
- Streamauswahl: Quelle kann direkt mit „Download“ gestartet werden.
- Offline: eigener Tab oder eigener Bereich in Bibliothek/Downloads.
- Downloadverwaltung: Pause, Fortsetzen, Loeschen, Speicherverbrauch.
- Player: Offline-Items muessen den lokalen Cache-URI bevorzugen.

### Implementierungsplan

1. Download-Faehigkeit pro Quelle erkennen: HLS, DASH, MP4, nicht unterstuetzt.
2. Media3-Download-Dependencies und `DownloadService` einrichten.
3. Zentrale `OfflineDownloadRepository` mit SimpleCache und DownloadManager
   bauen.
4. Lokales Download-Statusmodell persistieren.
5. Details-/Streamauswahl-Aktionen fuer Mobile/Tablet verdrahten.
6. Offline-Bereich mit fertigen und laufenden Downloads bauen.
7. Player-Route fuer Offline-Items ergaenzen.
8. Speicherlimits, WLAN-only und Loeschdialoge in Settings ergaenzen.
9. Tests fuer Statusmodell, Quellenfaehigkeit und Player-Routing schreiben.
10. Manuelle Tests mit MP4, HLS, DASH, Debrid-Link und nicht downloadfaehiger
    Quelle durchfuehren.

### Nicht in den ersten Slice aufnehmen

- Cloud-Sync der Mediendateien
- DRM-Offlinedownloads
- Automatische Downloads ganzer Staffeln
- Provider-spezifische Umgehungen fuer kurzlebige oder nicht direkte Links

## Feature 2: Live-TV-Layoutwahl

Status: In Version `2.3.011` fuer den TV-Modus umgesetzt.

### Ist es machbar?

Ja. `LiveTvScreen` enthaelt aktuell beide Layoutpfade:

- Touch/Mobile/Tablet nutzt die klassische Struktur mit `ProviderSelector`,
  `MiniPlayerRow`, `TouchCategoryRail` und `EpgGrid`.
- TV nutzt standardmaessig `LiveTvNetflixLayout`, kann aber auf das klassische
  Layout umgeschaltet werden.

Die klassische Upstream-nahe View existiert also noch als Codepfad. Eine
Oberflaechen-Einstellung kann auf TV-Geraeten entscheiden, ob der TV-Zweig
weiterhin `LiveTvNetflixLayout` nutzt oder die klassische Guide-Ansicht rendert.

### Empfohlene Einstellung

Bereich: `Einstellungen > Oberflaeche` im TV-Modus. Mobile und Tablet zeigen
diese Einstellung nicht an und behalten immer die Touch-optimierte klassische
Ansicht.

Name: `Live-TV-Layout`

Werte:

- `StreamNet`: aktuelles StreamNet-/Netflix-artiges TV-Layout
- `Klassisch`: Kategorie-Sidebar, kompakter Hero und EPG-Raster

Default bleibt `StreamNet`, damit bestehende Installationen unveraendert
aussehen.

### Technische Umsetzung

1. Neues Enum oder String-Konstante einfuehren:
   - `streamnet`
   - `classic`
2. Profilbezogenen Settings-Key in `SettingsViewModel` speichern:
   `live_tv_layout_mode`.
3. Wert in `SettingsUiState` aufnehmen.
4. TV-Settings unter `Oberflaeche` um eine Zeile erweitern. Mobile/Tablet
   erhalten keine Zeile.
5. Einstellung ueber Cloud-Snapshot synchronisieren, damit alle TV-Geraete eines
   Profils dieselbe Layoutwahl bekommen. Touch-Geraete ignorieren den Wert.
6. `LiveTvScreen` liest den Wert und entscheidet:
   - Touch bleibt weiterhin klassische Touch-Ansicht.
   - TV + `streamnet` nutzt `LiveTvNetflixLayout`.
   - TV + `classic` nutzt den klassischen Guide-Zweig.
7. Fokus- und Startup-Restore pruefen:
   - letzter Sender
   - letzte Kategorie
   - Fullscreen Rueckkehr
   - Favoriten/Recent
   - EPG-Fokus und Senderliste

Ergaenzt in `2.3.011`:

- Getrennte Schriftgroessen fuer Netflix-Infotitel, Netflix-Infobeschreibung,
  Klassik-Infotitel und Klassik-Infobeschreibung.
- Stufige Zurueck-Navigation im klassischen TV-Layout.
- Admin-Backend-Grenzen fuer grosse Cloud-Snapshots korrigiert, damit
  profilbezogene Layout- und Textgroessenfelder auch bei grossen Snapshots per
  Admin-Panel gesetzt werden koennen.

### Wichtiger Architekturhinweis

Der klassische Pfad ist derzeit an `useTouchRail` gebunden. Fuer eine echte
TV-Umschaltung sollte er nicht einfach als Touch-Layout auf TV erzwungen werden,
sondern in eine eigene klassische Layoutfunktion extrahiert werden, z. B.
`LiveTvClassicLayout`. Dann kann dieselbe Guide-Struktur auf Touch und TV
kontrolliert genutzt werden, ohne die Touch-spezifischen Groessen und
Fullscreen-Regeln falsch auf TV anzuwenden.

### Tests

- Unit-Test fuer Layoutentscheidung: Touch immer klassisch, TV je nach Setting.
- Settings-Test: Toggle rotiert `StreamNet -> Klassisch -> StreamNet`.
- Cloud-Sync-Test: `live_tv_layout_mode` wird exportiert und importiert.
- Manuelle TV-Tests fuer D-Pad, Kategorie, EPG, Senderstart, Fullscreen.

## Prioritaet

Die Live-TV-Layoutwahl ist deutlich kleiner und risikoaermer als
Offline-Downloads. Sie eignet sich als naechster direkter Implementierungsslice.
Offline-Downloads sollten danach als eigenes groesseres Feature mit Media3-
Downloadservice, Speicherverwaltung und Quellenvalidierung umgesetzt werden.
