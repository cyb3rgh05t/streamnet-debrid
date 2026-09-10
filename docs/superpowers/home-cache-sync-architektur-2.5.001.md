# Home, Cache und Sync Architektur

## Geltungsbereich

Diese Dokumentation beschreibt den Home-Datenfluss von StreamNet `2.5.004` fuer Android TV, Mobile und Tablet.

Abgedeckt sind:

- Startup und Cache-first-Rendering
- Continue Watching
- Recently Watched Movies
- Recently Watched Series
- Watched-State
- lokale Watch-History
- StreamNet CloudSync
- Profil-Isolation
- Kataloge, Hide/Unhide und Reihenfolge
- Hintergrund-Hydration und Debounce-Verhalten

## Grundprinzip

Home arbeitet in vier Phasen:

1. Bereits lokal verfuegbare Daten werden sofort angezeigt.
2. Fehlende Daten werden im Hintergrund geladen.
3. Nur betroffene Kategorien werden ersetzt.
4. Aktualisierte Daten werden lokal gecacht und bei synchronisierbaren Bereichen ueber CloudSync verteilt.

Ein vollstaendiger Home-Neuaufbau ist fuer normale Watched-Events nicht erforderlich.

## Startup Ablauf

### 1. Startup-Preload

`StartupViewModel` kann vor dem eigentlichen Home-Aufbau folgende Daten vorbereiten:

- gespeicherte Home-Kategorien
- Continue-Watching-Snapshot
- Hero-Daten
- Logo-Cache

Diese Daten werden an `HomeViewModel` uebergeben. Dadurch kann Home bereits waehrend der Netzwerkaktualisierung sichtbar werden.

### 2. Lokale Home-Caches

Home verwendet mehrere lokale Cache-Ebenen:

- Home-Kategorien im lokalen Cache-Verzeichnis
- profilbezogener Continue-Watching-Snapshot im App-Dateispeicher
- MediaRepository-Detailscache
- Coil-Memory- und Disk-Cache fuer Poster, Logos und Backdrops

Der erste Render verwendet bevorzugt diese Daten. Sie koennen veraltet oder unvollstaendig sein, werden aber spaeter aktualisiert.

### 3. Hintergrundaktualisierung

Nach dem ersten Render werden im Hintergrund geladen oder aktualisiert:

- Home-Katalogdaten
- TMDB-Metadaten
- Watched-State
- Continue Watching
- Recently-Watched-Rails
- Logos und Backdrops

Die Bild-Preloads laufen unabhaengig vom Hauptaufbau, damit die Navigation nicht auf alle Bilder warten muss.

## Kataloge und Sichtbarkeit

### IPTV-only First-Run-Vertrag

Ein neues Profil startet bewusst mit `iptvOnlyMode = true`. Dadurch wirkt eine frische Installation zuerst IPTV-orientiert. Sobald ein installiertes und aktiviertes VOD-faehiges Streaming-Addon fuer Filme, Serien oder Anime erkannt wird, schaltet die App IPTV-only genau einmal automatisch aus. Danach gewinnt die Nutzerentscheidung: Wenn IPTV-only manuell wieder eingeschaltet wird, duerfen spaetere VOD-Addon-Aenderungen diese Wahl nicht erneut ueberschreiben.

Nicht als VOD-Addon gelten deaktivierte Addons, Metadata-Addons, Subtitle-Addons wie OpenSubtitles und reine Live-TV-/Channel-Addons. Der genaue Produktvertrag ist in `docs/superpowers/iptv-only-vod-and-portal-2026-09-02.md` dokumentiert.

Die beiden neuen Kataloge sind normale profilbezogene Preinstalled-Kataloge:

- `recently_watched_movies`
- `recently_watched_series`

Weitere relevante Preinstalled-Kataloge fuer diesen Stand:

- `coming_soon`: sichtbarer Titel „Kommende Filme“ / „Upcoming Movies“, MDBList `upcoming-movies`.
- `upcoming_series`: sichtbarer Titel „Kommende Serien“ / „Upcoming Series“, MDBList `latest-tv-shows`.

`coming_soon` behaelt seine bestehende ID, damit gespeicherte Profilreihenfolgen, Hidden-State und Cloud-Snapshots kompatibel bleiben. `upcoming_series` wird als neuer Preinstalled-Katalog automatisch in neue und bestehende Profile migriert und direkt unter `coming_soon` einsortiert.

Sie werden ueber `ensurePreinstalledDefaults()` in neue und bestehende Profile eingetragen.

Damit gelten fuer sie dieselben Regeln wie fuer andere Kataloge:

- sichtbar in den Settings
- Hide/Unhide
- Reihenfolge veraenderbar
- profilbezogen gespeichert
- CloudSync der Katalogkonfiguration
- keine neue Backend-Tabelle erforderlich

### Versteckte Kataloge

Wenn ein Recently-Watched-Katalog versteckt ist:

- wird keine Home-Rail dafuer erzeugt
- werden dafuer keine Watched-Daten speziell aufgebaut
- werden dafuer keine TMDB-Details hydratisiert
- bleiben alle anderen Home-Rails unveraendert

Die sichtbaren Katalog-IDs stammen aus dem aktiven `savedCatalogs`-Set. Die Recently-Watched-Kategorien werden danach in genau dieser gespeicherten Reihenfolge in Home eingeordnet.

## Recently Watched Movies

Der Film-Flow ist:

1. Watched-Movie-IDs werden aus dem profilbezogenen Watched-Cache gelesen.
2. Es werden maximal 20 Film-IDs fuer die Rail verwendet.
3. Bereits gecachte MediaItems werden sofort verwendet.
4. Fehlende TMDB-Filmdetails werden nach dem ersten Home-Render im Hintergrund geladen.
5. Poster, Backdrop und Metadaten werden im MediaRepository gecacht.
6. Die erzeugten Karten erhalten `isWatched = true`.
7. Die aktualisierte Rail wird im Home-State und im Home-Diskcache gespeichert.

## Recently Watched Series

Der Serien-Flow ist:

1. Watched-Episode-Keys werden aus dem profilbezogenen Watched-Cache gelesen.
2. Serien werden aus diesen Episode-Keys dedupliziert.
3. Es werden maximal 20 Serien fuer die Rail verwendet.
4. Bereits gecachte Serien-MediaItems werden sofort verwendet.
5. Fehlende TMDB-Seriendetails werden im Hintergrund geladen.
6. Serienposter und Serien-Backdrop werden verwendet; Episodenbilder werden nicht als Hauptartwork verwendet.
7. Die zuletzt bekannte Staffel-/Episode wird als `nextEpisode` an die Karte uebergeben.
8. Die Karte zeigt den S/E-Marker auf dem Cover.
9. Die Karte erhaelt `isWatched = true`.
10. Die aktualisierte Rail wird im Home-State und im Home-Diskcache gespeichert.

Die aktuelle Episode-Auswahl basiert auf dem hoechsten bekannten Staffel-/Episodenpaar. Ein vollstaendiger Provider-uebergreifender `watched_at`-Zeitstempel ist fuer diese Rail noch nicht durchgaengig verfuegbar.

## Watched-State Quellen

`TraktRepository.initializeWatchedCache()` vereinigt je nach aktivem Profil:

- lokalen Watched-Snapshot
- StreamNet-/Backend-Watched-State
- Trakt, wenn aktiv
- MDBList, wenn aktiv
- Simkl, wenn aktiv

Die Daten werden in profilbezogene Movie- und Episode-Sets geschrieben.

Diese Sets werden verwendet fuer:

- Checkmarks in normalen Home-Rails
- Recently-Watched-Film-Rail
- Recently-Watched-Serien-Rail
- Details-/Episodenstatus

Continue Watching verwendet weiterhin eigene Resume-Daten. Die Continue-Watching-Checkmark ist bewusst ausgeblendet, weil die Reihe den Resume-Kontext und nicht den allgemeinen Seen-Status repraesentiert.

## Continue Watching

Continue Watching nutzt einen separaten Datenfluss:

- lokaler Continue-Watching-Cache
- lokale Watch-History
- StreamNet-/Cloud-Watch-History
- Trakt, sofern aktiviert
- alternative Provider, sofern aktiviert

Beim Aufbau werden zusammengefuehrt:

- `progress`
- `resumePositionSeconds`
- `durationSeconds`
- Staffel und Episode
- Poster und Backdrop
- Metadaten

Wenn eine Position und eine Laufzeit vorhanden sind, wird ein fehlender Prozentwert daraus abgeleitet. So koennen auch Filmkarten einen Fortschrittsbalken und eine Restzeit anzeigen.

Beim Player-Verlassen wird der letzte lokale Stand gespeichert, bevor zurueck navigiert wird. Der Home-Startpfad merged lokale Watch-History bereits vor der ersten Continue-Watching-Veröffentlichung.

## Watched-Events und Debounce

Bei einem Watched- oder Watch-History-Event passiert Folgendes:

1. Continue Watching kann seinen schnellen Progress-Pfad aktualisieren.
2. Continue Watching startet seinen eigenen autoritativen Refresh.
3. Die Recently-Watched-Hydration wird mit etwa 450 ms Debounce geplant.
4. Weitere Events innerhalb dieses Fensters ersetzen den Job.
5. Nur die sichtbaren Recently-Watched-Rails werden neu berechnet.
6. Der Hero und andere Home-Rails bleiben unveraendert.
7. Die aktualisierten Home-Kategorien werden im Diskcache persistiert.

Dadurch erzeugen mehrere schnelle Player-/Sync-Events keinen vollstaendigen Home-Neuaufbau.

## CloudSync

CloudSync synchronisiert die Quelldaten und Konfigurationen, nicht eine unveraenderliche Kopie der fertigen Recently-Watched-Karten.

Synchronisiert werden unter anderem:

- Kataloge pro Profil
- Katalogreihenfolge
- versteckte Kataloge
- Profilsettings
- Watched Movies
- Watched Episodes
- lokale Watch-History
- Continue-Watching-Daten
- Addons
- IPTV-Einstellungen
- Watchlist und weitere profilbezogene Daten

Beim Pull werden Daten vor der Anwendung zusammengefuehrt. Viele Felder verwenden eigene `fieldUpdatedAt`-Zeitstempel. Dadurch kann ein alter Client nicht einfach neuere Aenderungen eines anderen Geraets ueberschreiben.

Bei Konflikten werden Daten je nach Bereich per Feldzeitstempel, Last-Write-Wins oder dediziertem Merge zusammengefuehrt. Continue Watching, Watchlist und Watched-Daten besitzen zusaetzliche Merge-/Tombstone-Logik fuer Loeschungen und Geraetewechsel.

Nach einem erfolgreichen Cloud-Pull wird Home bei katalog- oder settingsrelevanten Aenderungen neu geladen. Watched-/Watch-History-Events werden gezielter behandelt und aktualisieren nur die betroffenen Bereiche.

## Profil-Isolation

Die wichtigen lokalen Keys sind profilbezogen:

- Kataloge
- Hidden-Kataloge
- Continue Watching
- Watched Movies
- Watched Episodes
- Watchlist
- Tracking-Tokens
- Settings

Beim Profilwechsel werden Laufzeit-Caches zurueckgesetzt oder auf das neue Profil umgeschaltet. Dadurch sollen Home, Watched-State und Continue Watching nicht zwischen Profilen auslaufen.

## Cache- und Fetch-Verhalten

### Sofort aus Cache

- vorhandene Home-Kategorien
- vorhandene Continue-Watching-Eintraege
- bereits bekannte TMDB-Details
- Poster, Logos und Backdrops aus Coil
- bereits geladene Watched-Snapshots

### Im Hintergrund

- neue TMDB-Details
- fehlende Recently-Watched-Metadaten
- Bild-Preloads
- Provider-Sync
- Cloud-Pull/Push
- Katalogaktualisierungen

### Nicht bei versteckten Rails

- keine Recently-Watched-Berechnung
- keine TMDB-Hydration
- keine Rail-Aktualisierung

## Zuverlaessigkeit und Grenzen

Die Architektur ist fuer lokale und gerateuebergreifende Synchronisierung ausgelegt. Trotzdem gibt es externe Abhaengigkeiten:

- Provider koennen langsam oder temporaer nicht erreichbar sein.
- TMDB kann einzelne IDs oder Details nicht liefern.
- Ein Cloud-Pull kann bis zum naechsten erfolgreichen Retry ausstehen.
- Watched-Zeitstempel sind je nach Provider unterschiedlich vollstaendig.
- Die Recently-Watched-Series-Auswahl nutzt aktuell das hoechste bekannte Staffel-/Episodenpaar und nicht durchgaengig `watched_at`.

Wenn ein Provider nicht erreichbar ist, bleibt der letzte lokale Snapshot erhalten. Die App sollte dann weiterhin den letzten bekannten Home-/Watched-Zustand anzeigen und spaeter erneut aktualisieren.

## Technische Hauptstellen

- Home-State und Ladefluss: `app/src/main/kotlin/com/arflix/tv/ui/screens/home/HomeViewModel.kt`
- Home-Karten: `app/src/main/kotlin/com/arflix/tv/ui/screens/home/HomeScreen.kt`
- Watched-/Continue-Watching-Cache: `app/src/main/kotlin/com/arflix/tv/data/repository/TraktRepository.kt`
- lokale Watch-History: `app/src/main/kotlin/com/arflix/tv/data/repository/WatchHistoryRepository.kt`
- Katalogmigration und Hide/Unhide: `app/src/main/kotlin/com/arflix/tv/data/repository/CatalogRepository.kt`
- CloudSync: `app/src/main/kotlin/com/arflix/tv/data/repository/CloudSyncRepository.kt`
- TMDB-/Media-Cache: `app/src/main/kotlin/com/arflix/tv/data/repository/MediaRepository.kt`
