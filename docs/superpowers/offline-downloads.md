# Offline-Downloads

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

## Prioritaet

Offline-Downloads. Sie eignet sich als naechster direkter Implementierungsslice.
Offline-Downloads sollten danach als eigenes groesseres Feature mit Media3-
Downloadservice, Speicherverwaltung und Quellenvalidierung umgesetzt werden.
