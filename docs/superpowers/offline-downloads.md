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

`work-runtime-ktx` ist bereits vorhanden. Der erste Implementierungsslice legt
Media3-`DownloadService`, `DownloadManager`, `StandaloneDatabaseProvider`,
`SimpleCache` und `OkHttpDataSource.Factory` an. Der Download startet aus der
Quellen-Auswahl, nachdem eine konkrete VOD-/Film-/Serienquelle bereits
aufgeloest wurde.

### Implementierungsstand 2026-09-07

Erster Slice umgesetzt:

- `OfflineDownloadService` registriert einen Media3-Foreground-Downloadservice
  mit eigenem Benachrichtigungskanal.
- `OfflineDownloadRepository` erstellt stabile Download-IDs aus MediaType,
  TMDB-ID, Episode und Quellen-URL.
- Die Quellen-Auswahl zeigt pro Quelle eine Download-Aktion.
- `DetailsViewModel` startet den Download fuer den ausgewaehlten Film oder die
  ausgewaehlte Episode und meldet Erfolg beziehungsweise nicht downloadfaehige
  Quellen per Toast.
- `Einstellungen > Quellen > Offline-Downloads` zeigt laufende, fertige und
  fehlgeschlagene Offline-Downloads mit Fortschritt und geladener Groesse.
  Einzelne Downloads koennen dort entfernt werden.
- Eine eigene Hauptseite `Offline-Downloads` ist in TV-Topbar und
  Mobile-Bottom-Navigation erreichbar. Sie zeigt Downloads als nutzernaehere
  Bibliothekskacheln; auf TV werden die Kacheln im 16:9-Landscape-Format mit
  Fanart, Fortschrittsleiste und Fokus-Puffer gerendert. Die Progress- und
  Statuslabels verwenden normale Textfarben, damit nur Fokus, Aktionschips und
  die Leiste selbst akzentfarben sind. Je nach Status bieten sie Abspielen,
  Pausieren, Fortsetzen oder Loeschen; Loeschen bleibt als separate sichtbare
  Aktion verfuegbar.
- Der Status wird ueber Media3-Listener und ein leichtes DownloadIndex-Polling
  aktualisiert, damit Prozent, Fertig- und Fehlerzustaende in der UI weiterlaufen.
- Der `OfflineDownloadRepository` sendet Completion-Events, wenn ein Download
  von einem unfertigen Status zu `completed` wechselt. `ArflixApp` sammelt diese
  Events am Root und zeigt einen globalen Toast, damit die Fertigmeldung auf
  jedem Screen sichtbar ist.
- Neue Downloads speichern MediaType, TMDB-ID, Episodenkoordinaten, Poster,
  Backdrop, Quellenname, Stream-URL und Download-ID als Metadaten. Fertige
  Downloads koennen aus der Offline-Downloads-Rubrik abgespielt werden; der
  Player verwendet dann den Media3-Downloadcache und den gespeicherten
  Download-Key.
- Vor dem Player-Start wird der Media3-DownloadIndex geprueft. Fehlende oder
  noch nicht fertige Downloads werden als Player-Fehler angezeigt, statt den
  Player blind vorzubereiten.
- Offline-Playback-Fehler waehrend des Player-Starts werden nicht als normaler
  Online-Quellenfehler behandelt und loesen keinen Source-Failover aus.
- Aeltere Downloads ohne gespeicherte Artwork-URLs werden in der Offline-
  Hauptseite ueber MediaRepository/TMDB-Details nachtraeglich mit Poster und
  Backdrop angereichert, sofern MediaType und TMDB-ID vorhanden sind.
- Aktive Downloads koennen pausiert werden; pausierte Downloads koennen ueber
  dieselbe Rubrik fortgesetzt werden.

Noch nicht umgesetzt:

- Seriengruppierung fuer Downloads.
- Redownload-Aktion, wenn ein fertig markierter Download im Cache nicht mehr
  vollstaendig vorhanden ist oder ein Manifest abgelaufen ist.
- Speicherlimit- und WLAN-only-Einstellungen.

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
2. Media3-Download-Dependencies und `DownloadService` einrichten. [erster Slice]
3. Zentrale `OfflineDownloadRepository` mit SimpleCache und DownloadManager
   bauen. [erster Slice]
4. Details-/Streamauswahl-Aktionen fuer Mobile/Tablet verdrahten. [erster Slice]
5. Lokales Download-Statusmodell persistieren. [teilweise: Media3-Statusliste]
6. Offline-Bereich mit fertigen und laufenden Downloads bauen. [teilweise: Einstellungen]
7. Player-Route fuer Offline-Items ergaenzen. [erster Slice]
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
