# Changelog

Alle erwähnenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

## [Unveröffentlicht]

## [2.5.005] - 2026-09-11

### Home und Profile

- Die Home-Rails „Zuletzt gesehene Filme“ und „Zuletzt gesehene Serien“ zeigen keine Watched-Häkchen mehr.
- Watched-Häkchen in allen übrigen Home-Rails sitzen nun oben rechts und verwenden eine neutrale weiße Darstellung statt Grün.
- In der Profilauswahl befindet sich der StreamNet-Cloud-Button jetzt direkt unter „Profile verwalten“.

### Einstellungen

- Telegram wurde aus den Touch- und TV-Einstellungen entfernt; die Discord-Navigation behält eine lückenlose D-Pad-Fokusreihenfolge.

## [2.5.004] - 2026-09-10

### Home-Kataloge und IPTV-only

- Neue preinstalled MDBList-Rail `upcoming_series` ergänzt: „Kommende Serien“ / „Upcoming Series“ nutzt `https://mdblist.com/lists/snoak/latest-tv-shows` und wird direkt unter der kommenden Filme-Rail einsortiert.
- Die bestehende `coming_soon`-Rail bleibt aus Kompatibilitätsgründen als ID erhalten, wird aber sichtbar als „Kommende Filme“ / „Upcoming Movies“ benannt.
- IPTV-only bleibt als Fresh-Install-Vertrag dokumentiert: neue Profile starten IPTV-only und schalten erst beim ersten installierten und aktivierten VOD-Streaming-Addon einmalig automatisch auf normale VOD-Discovery um.
- Ein Regressionstest stellt sicher, dass IPTV-only auch die neuen Recently-Watched-Film- und Serienrails auf IPTV-/Xtream-Verfügbarkeit filtert.

### Admin-Backend

- Der Admin-Button „Konto löschen“ und „Alle Sitzungen abmelden“ sichern ihr Button-Element jetzt vor asynchronen Bestätigungsdialogen, damit `setButtonBusy()` nicht mehr mit einem verlorenen `event.currentTarget` auf `null` läuft.

## [2.5.003] - 2026-09-10

### VOD-Requests und Quellen

- Neue VOD-Request-Funktion für Filme und Serien direkt aus dem Quellen-Empty-State: Wenn keine Quellen gefunden werden, kann das Medium mit seiner TMDB-ID beim eigenen VOD-Server angefragt werden.
- Serien werden aktuell mit allen Staffeln angefragt; Filme und Serien senden den korrekten Medientyp und nutzen einen Schutz gegen doppelte Anfragen.
- HTTP-Ergebnisse des Request-Portals werden als lokalisierte Erfolgs-, Bereits-angefragt-, Berechtigungs- und Fehlerzustände angezeigt.
- Quellen-Refresh und VOD-Request bleiben getrennte Aktionen; der Quellen-Refresh verändert den Request-Status nicht.
- Der Quellen-Empty-State nutzt den aktiven StreamNet-Akzent, responsive Buttons und funktionierende TV-D-pad-Navigation zwischen Aktualisieren und Anfragen.

### Secrets und Build-Konfiguration

- VODWisharr und VOD-Requests verwenden gemeinsam `VODWISHARR_API_KEY`; das Secret wird nicht doppelt als `VOD_REQUEST_API_KEY` geführt.
- Die VOD-Portal-URL kommt ausschließlich aus `VOD_REQUEST_BASE_URL` und ist in der App nicht mehr fest codiert.
- Lokale `secrets.properties`, `secrets.defaults.properties` und der GitHub-Workflow verwenden denselben Secret-Vertrag; der Workflow nutzt fuer die nicht sensible VOD-Portal-URL einen Default, wenn kein Repository-Secret gesetzt ist.

### Home, Continue Watching und Recently Watched

- Continue-Watching-Progress, Resume-Position und Laufzeit werden bei Start und Rückkehr aus dem lokalen Cache-/History-Fluss zuverlässig zusammengeführt.
- Die Continue-Watching-Karte blendet ihre Watched-Checkmark aus, während andere Home-Rails den Watched-Status weiterhin anzeigen.
- Neue profilbezogene Rails „Zuletzt gesehene Filme“ und „Zuletzt gesehene Serien“ sind als Preinstalled-Kataloge integriert, übersetzt, sortier-/versteckbar und werden bei bestehenden Installationen migriert.
- Recently-Watched-Rails laden cache-first, hydratisieren fehlende TMDB-Details im Hintergrund und aktualisieren sich bei Watched-Events debouncebar ohne vollständigen Home-Neuaufbau.
- Recently-Watched-Rails sind auf maximal 20 Filme beziehungsweise 20 Serien begrenzt.

### UI und Toasts

- Quellen- und Toast-Oberflächen verwenden responsive Größen, zentrierte Inhalte und aktive Akzentrahmen.
- Serienkarten in Continue Watching und „Zuletzt gesehene Serien“ zeigen Staffel-/Episodeninformationen direkt auf dem Cover.
- Der Playlist-Refresh-Button wurde aus Live-TV entfernt; Hintergrundaktualisierung und Refresh in den Einstellungen bleiben erhalten.

## [2.4.008] - 2026-09-09

### Player und Live-TV

- VOD- und Live-TV-Player bieten konsistente Bildformat-Modi: Automatisch, Einpassen, Strecken und Zuschneiden.
- Picture-in-Picture ist im VOD- und Live-TV-Player für Touch-Geräte und TV-D-Pad verfügbar.
- Die Player-Bedienung kann auf Touch-Geräten gesperrt werden; das mittige Entsperr-Icon nutzt den aktiven Akzent und blendet sich automatisch aus.
- Das Live-TV-HUD wurde an die VOD-Steuerungsleiste angeglichen: ohne sichtbare Seek-Kreisbuttons, mit sauber ausgerichteten Sender-/Programm-Aktionen und Streamdetails im Settings-Dialog.
- Live-TV-Qualitätsbadges zeigen kompakt UHD, FHD, HD oder SD; die detaillierte Auflösung bleibt in den Streaminformationen.

### Touch-UI und Theming

- Mobile Untertitel-/Audio-Popups, Settings-Dialoge und Texteingabe-Dialoge verwenden nun den aktiven StreamNet-Akzent für Rahmen, Tabs und Auswahlzustände.
- Live-TV-Kategorie-Pills behalten auch ohne Fokus einen dezenten Akzent-Rahmen; der Fokus bleibt für Touch und D-Pad deutlich hervorgehoben.

## [2.4.007] - 2026-09-09

### Metadaten und Details

- Filme laden fehlende deutsche Beschreibungen, Poster und Hintergründe automatisch aus dem englischen TMDB-Eintrag nach.
- Episoden ergänzen fehlende Namen, Beschreibungen und Vorschaubilder aus den englischen Staffelmetadaten.
- Die Detailansicht ersetzt leere oder unvollständige Beschreibungen durch die beste verfügbare Fassung und zeigt andernfalls einen lokalisierten Hinweis statt eines leeren Feldes.

### Mobile Player

- Das Bildformat kann zwischen Automatisch, Einpassen, Strecken und Zuschneiden gewechselt werden.
- Touch-Geräte können die Player-Bedienung sperren; im gesperrten Zustand blendet ein Tap nur die dezente Entsperraktion ein.
- Vertikales Wischen regelt links die Bildschirmhelligkeit und rechts die Lautstärke. Bei null Prozent Helligkeit folgt das Playerfenster wieder der Systemeinstellung.

### Bibliothek und Lokalisierung

- Die Provider- und Filterleiste der Bibliothek scrollt auf TV automatisch zum fokussierten Eintrag, damit D-Pad-Fokus sichtbar bleibt.
- Verbleibende Collection-Fehlertexte und EPG-Beispielwerte verwenden deutsche beziehungsweise englische Ressourcen statt fest codierter Texte.

## [2.4.006] - 2026-09-08

### TV UI und Kartenlayout

- Das globale Kartenlayout setzt beim Wechsel zwischen Landscape und Poster die individuellen Row-Overrides des aktiven Profils zurück; konfigurierbare Kataloge folgen dadurch direkt der neuen globalen Auswahl und können anschließend wieder einzeln angepasst werden.
- Favorite-TV und Recently-Watched-TV bleiben auch auf TV bei globalem Poster-Modus feste Landscape-Rails.
- Deaktivierte Katalog-Layout-Icons zeigen unabhängig vom gespeicherten Modus korrekt die feste Landscape-Ausrichtung; sichtbare Kataloge zeigen ein normales Auge statt eines durchgestrichenen Auges.
- Live-TV-Netflix aktualisiert Programm-Logo und Programmartwork zuverlässig gemeinsam bei wechselndem Titel, Ende oder Startzeitpunkt; Sendergruppe, Danach-Zeiten und Focusrings wurden visuell abgestimmt.

## [2.4.005] - 2026-09-08

### Live TV und Home

- Favorite-TV- und Recently-Watched-TV-Home-Rails nutzen für Programmartwork wieder denselben frischeren Guide-Window-Pfad wie das Live-TV-Netflix-Layout, damit Home und Live-TV nicht unterschiedliche Fanart-Hintergründe für dieselbe laufende Sendung wählen.
- IPTV-Homekarten dunkeln Programmartwork auf TV stärker ab, behalten Senderlogos aber voll deckend und zeigen Sendername sowie „Danach“ akzentbetont.
- Live-TV-Netflix-Karten übernehmen den Home-Look für Senderlogos und Favoritenstern, nutzen akzentbetonte Sendernamen und Danach-Labels sowie dünnere Focusrings.
- Im Live-TV-Netflix-Hero ist die Sendergruppe wieder neutral gefärbt; Danach-Zeilen zeigen das Label und relative Zeiten im Akzent, Startzeiten in normaler Textfarbe.

## [2.4.004] - 2026-09-08

### Mobile UI und Home

- Mobile-Bottom-Navigation zeigt nur noch Icons ohne Textlabels; Fokusfläche, Fokusrahmen und Auswahlpunkt verwenden den aktiven Theme-Akzent, während die Icons ihre normalen Farben behalten.
- Favorite-TV- und Recently-Watched-TV-Home-Rails bleiben immer im Landscape-Layout und der Layout-Umschalter ist in den Katalog-Einstellungen für diese festen Rails deaktiviert.
- IPTV-Homekarten zeigen Programm-Fanart deutlicher und behandeln das Senderlogo nur noch als kompakten Hinweis, damit Favorite-/Recent-TV-Rails visuell näher am korrekten Live-TV-Netflix-Layout liegen.

## [2.4.003] - 2026-09-08

### Live TV und Bibliothek

- Bibliotheks- und Offline-Empty-States verwenden nun dieselbe ungerahmte, accent-gethemte Center-Komponente.
- Live-TV-Layoutmodus sowie Netflix-/Classic-Infotextgrößen schreiben beim Ändern explizite profilbezogene Cloud-Feldzeitstempel, damit die Einstellungen zuverlässig zwischen Geräten und Profilen synchronisiert werden.
- Mobile-/Tablet-Live-TV rendert wieder den vollständigen Touch-Pfad mit MiniPlayer, Kategorien, Channels und EPG; die ClassicView-Auswahl ist ausschließlich für TV-Geräte aktiv.
- Der mobile MiniPlayer beansprucht nicht mehr die gesamte Parent-Höhe, sodass Kategorie-, Channel- und EPG-Bereich wieder sichtbar bleiben.
- Watchlist- und Library-Empty-States verwenden lokalisierte deutsche/englische Texte und den aktiven Accent für das gemeinsame Empty-State-Icon.

## [2.4.002] - 2026-09-07

### Offline-Downloads

- Erster VOD-/Serien-Download-Slice: Die Quellen-Auswahl bietet eine Download-Aktion, die die konkret aufgelöste Stream-Quelle an einen Media3-`DownloadService` übergibt.
- Im TV-Modus ist die Download-Aktion in der Quellenzeile per D-Pad erreichbar: Rechts wählt den Download-Button, OK startet den Download.
- Ein neues `OfflineDownloadRepository` verwaltet Media3-`DownloadManager`, `SimpleCache`, Download-IDs und MIME-Erkennung für MP4/HLS/DASH-nahe Quellen.
- Unter „Quellen“ gibt es eine eigene Rubrik „Offline-Downloads“ mit Status, Fortschritt, geladener Größe und Entfernen einzelner Downloads.
- Offline-Downloads haben nun zusätzlich eine eigene Hauptseite in TV-Topbar und Mobile-Bottom-Navigation, aufgebaut als nutzerfreundliche Download-Bibliothek.
- Die Offline-Hauptseite zeigt Downloads jetzt als bibliotheksartige Kacheln im Grid statt als breite Listenzeilen.
- Der Downloads-Screen startet auf TV kompakter unter der Topbar und nutzt wie die Bibliothek eine akzentgerahmte Titel-Pill statt eines freistehenden großen Headers.
- TV-Download-Kacheln verwenden nun ein 16:9-Landscape-Fanart-Layout mit seitlichem Fokus-Puffer, damit der Fokusrahmen nicht abgeschnitten wird.
- Neue Offline-Downloads speichern Poster- und Backdrop-URLs in den Download-Metadaten; die Offline-Hauptseite nutzt bevorzugt Backdrops als Fanart.
- Die Offline-Hauptseite repariert fehlende Fanart für ältere Downloads nachträglich über TMDB-Details, sofern MediaType und TMDB-ID in den Download-Metadaten vorhanden sind.
- Offline-Download-Kacheln und Download-Einstellungen zeigen nun neben Abspielen/Pause/Fortsetzen wieder eine sichtbare Löschen-Aktion.
- Auf der Offline-Hauptseite sind die Kachel-Aktionen per TV-D-Pad auswählbar: Links/Rechts wechselt zwischen Primäraktion und Löschen, OK führt die markierte Aktion aus.
- Die Links/Rechts-Navigation der Offline-Kachel-Aktionen folgt nun der sichtbaren Position der Chips: links zu Löschen, rechts zurück zur Primäraktion.
- In den Download-Einstellungen ist die Löschen-Aktion pro Download-Zeile nun ebenfalls per TV-D-Pad anwählbar.
- Offline-Download-Karten zeigen eine akzentfarbene Fortschrittsleiste und stärker akzentgebundene Aktionsflächen; das Progress-/Statuslabel nutzt normale Textfarben, damit die Kachel nicht überakzentuiert wirkt.
- Die Offline-Seite nutzt nun eine eigene TV-D-Pad-Fokuslogik mit sauberem Listenfokus, Scroll-Nachführung und ohne versehentlichen Sprung zur Profilauswahl beim Abspielen.
- Die Offline-Seite verwendet nun die gemeinsamen App-Typografie-Tokens statt eigener Fontgrößen, damit Header, Statuszeilen und Aktionen optisch zu den anderen Screens passen.
- Die Download-Einstellungen zeigen pro Offline-Download jetzt ebenfalls eine akzentfarbene Fortschrittsleiste.
- Download-Status wird zusätzlich aus Media3s DownloadIndex aktualisiert, damit Fortschritt und Fertig-/Fehlerzustände in der App weiterlaufen.
- Wenn ein Offline-Download fertig wird, zeigt die App nun screenübergreifend einen globalen Toast an.
- Fertige Offline-Downloads können aus der neuen Rubrik direkt abgespielt werden; der Player nutzt dafür den Media3-Downloadcache mit dem gespeicherten Download-Key.
- Offline-Playback prüft vor dem Player-Start, ob der gewählte Download noch existiert und wirklich abspielbereit ist; fehlende oder unvollständige Downloads landen nun im bestehenden Player-Fehlerdialog statt in einem kaputten Playback-Start.
- Offline-Playback-Fehler während des Player-Starts lösen keinen Online-Source-Failover mehr aus, sondern werden als Offline-Cache-/Download-Problem gemeldet.
- Aktive Offline-Downloads lassen sich in der Offline-Rubrik pausieren und pausierte Downloads wieder fortsetzen.
- Android-Manifest, Foreground-Service-Permission und Benachrichtigungskanal für Offline-Downloads wurden vorbereitet.
- Der leere Downloads-Screen nutzt nun wie die Bibliothek eine freie Center-Message ohne gerahmte Box.

### Cloud-Synchronisation

- Erzwungenes Cloud-Herunterladen überschreibt nun auch den lokalen Addon-Zeitstempel-Schutz, damit remote vorhandene Addons wie NZB Treasure auf TV-Geräten wieder übernommen werden.
- Automatisches Cloud-Sync ergänzt remote-only Addons nun auch dann, wenn der lokale Addon-Zeitstempel neuer ist; vorhandene lokale Addons behalten dabei ihre lokalen Aktivierungswerte.

## [2.4.001] - 2026-09-07

### Offline-Downloads

- Erster VOD-/Serien-Download-Slice: Die Quellen-Auswahl bietet eine Download-Aktion, die die konkret aufgelöste Stream-Quelle an einen Media3-`DownloadService` übergibt.
- Im TV-Modus ist die Download-Aktion in der Quellenzeile per D-Pad erreichbar: Rechts wählt den Download-Button, OK startet den Download.
- Ein neues `OfflineDownloadRepository` verwaltet Media3-`DownloadManager`, `SimpleCache`, Download-IDs und MIME-Erkennung für MP4/HLS/DASH-nahe Quellen.
- Unter „Quellen“ gibt es eine eigene Rubrik „Offline-Downloads“ mit Status, Fortschritt, geladener Größe und Entfernen einzelner Downloads.
- Offline-Downloads haben nun zusätzlich eine eigene Hauptseite in TV-Topbar und Mobile-Bottom-Navigation, aufgebaut als nutzerfreundliche Download-Bibliothek.
- Die Offline-Hauptseite zeigt Downloads jetzt als bibliotheksartige Kacheln im Grid statt als breite Listenzeilen.
- Der Downloads-Screen startet auf TV kompakter unter der Topbar und nutzt wie die Bibliothek eine akzentgerahmte Titel-Pill statt eines freistehenden großen Headers.
- TV-Download-Kacheln verwenden nun ein 16:9-Landscape-Fanart-Layout mit seitlichem Fokus-Puffer, damit der Fokusrahmen nicht abgeschnitten wird.
- Neue Offline-Downloads speichern Poster- und Backdrop-URLs in den Download-Metadaten; die Offline-Hauptseite nutzt bevorzugt Backdrops als Fanart.
- Die Offline-Hauptseite repariert fehlende Fanart für ältere Downloads nachträglich über TMDB-Details, sofern MediaType und TMDB-ID in den Download-Metadaten vorhanden sind.
- Offline-Download-Kacheln und Download-Einstellungen zeigen nun neben Abspielen/Pause/Fortsetzen wieder eine sichtbare Löschen-Aktion.
- Auf der Offline-Hauptseite sind die Kachel-Aktionen per TV-D-Pad auswählbar: Links/Rechts wechselt zwischen Primäraktion und Löschen, OK führt die markierte Aktion aus.
- Die Links/Rechts-Navigation der Offline-Kachel-Aktionen folgt nun der sichtbaren Position der Chips: links zu Löschen, rechts zurück zur Primäraktion.
- In den Download-Einstellungen ist die Löschen-Aktion pro Download-Zeile nun ebenfalls per TV-D-Pad anwählbar.
- Offline-Download-Karten zeigen eine akzentfarbene Fortschrittsleiste und stärker akzentgebundene Aktionsflächen; das Progress-/Statuslabel nutzt normale Textfarben, damit die Kachel nicht überakzentuiert wirkt.
- Die Offline-Seite nutzt nun eine eigene TV-D-Pad-Fokuslogik mit sauberem Listenfokus, Scroll-Nachführung und ohne versehentlichen Sprung zur Profilauswahl beim Abspielen.
- Die Offline-Seite verwendet nun die gemeinsamen App-Typografie-Tokens statt eigener Fontgrößen, damit Header, Statuszeilen und Aktionen optisch zu den anderen Screens passen.
- Die Download-Einstellungen zeigen pro Offline-Download jetzt ebenfalls eine akzentfarbene Fortschrittsleiste.
- Download-Status wird zusätzlich aus Media3s DownloadIndex aktualisiert, damit Fortschritt und Fertig-/Fehlerzustände in der App weiterlaufen.
- Wenn ein Offline-Download fertig wird, zeigt die App nun screenübergreifend einen globalen Toast an.
- Fertige Offline-Downloads können aus der neuen Rubrik direkt abgespielt werden; der Player nutzt dafür den Media3-Downloadcache mit dem gespeicherten Download-Key.
- Offline-Playback prüft vor dem Player-Start, ob der gewählte Download noch existiert und wirklich abspielbereit ist; fehlende oder unvollständige Downloads landen nun im bestehenden Player-Fehlerdialog statt in einem kaputten Playback-Start.
- Offline-Playback-Fehler während des Player-Starts lösen keinen Online-Source-Failover mehr aus, sondern werden als Offline-Cache-/Download-Problem gemeldet.
- Aktive Offline-Downloads lassen sich in der Offline-Rubrik pausieren und pausierte Downloads wieder fortsetzen.
- Android-Manifest, Foreground-Service-Permission und Benachrichtigungskanal für Offline-Downloads wurden vorbereitet.

### Cloud-Synchronisation

- Erzwungenes Cloud-Herunterladen überschreibt nun auch den lokalen Addon-Zeitstempel-Schutz, damit remote vorhandene Addons wie NZB Treasure auf TV-Geräten wieder übernommen werden.
- Automatisches Cloud-Sync ergänzt remote-only Addons nun auch dann, wenn der lokale Addon-Zeitstempel neuer ist; vorhandene lokale Addons behalten dabei ihre lokalen Aktivierungswerte.

## [2.3.013] - 2026-09-07

### IPTV

- Playlist-Karten in den Einstellungen zeigen fuer Xtream-Listen das Ablaufdatum aus `player_api.php` an; fehlende oder unbegrenzte Angaben erscheinen als „Unbegrenzt“.
- Das Playlist-Ablaufdatum steht nun als eigene akzentfarbene Zeile unter der Beschreibung statt inline im Beschreibungstext.

### Live TV

- Lange EPG-Balken zeigen den Sendungstitel im sichtbaren Teil ihres eigenen Balkens; wenn nur noch wenig Platz bleibt, wird der Titel sauber mit Ellipsis gekürzt.
- TV-Geräte können unter Oberfläche zwischen dem StreamNet-Live-TV-Layout und einem klassischen Layout mit Kategorie-Sidebar, Hero und EPG-Raster wechseln; die Auswahl sowie getrennte Schriftgrößen für Netflix- und Klassik-Infopanels werden profilbezogen über StreamNet Cloud synchronisiert.
- Das klassische Layout verwendet die TV-fähige Kategorie-Sidebar statt Touch-Pills, unterstützt stufige Zurück-Navigation bis zur Topbar und stabilisiert D-Pad-Fokus für Kategorien, Senderliste, EPG und Suche.
- Der klassische Hero wurde kompakter gestaltet, zeigt Programmartwork im gesamten Infopanel, verzichtet auf sichtbare Rahmen und lässt mehr Platz für das EPG-Raster.
- EPG-Programmbalken wurden beruhigt und zeigen nur noch den Programmtitel ohne Live-/Archiv-/Neu-Badges, Zeiten, Dauer oder Beschreibung.
- Das klassische Live-TV-Layout ist in eine eigene `LiveTvClassicLayout`-Komponente ausgelagert, damit Klassik- und StreamNet-/Netflix-Layout getrennt weiterentwickelt werden können.

### Merkliste und Details

- Long-Press auf Episoden öffnet auf Mobile/Tablet das vorhandene Episoden-Aktionsmenü; auf TV entscheidet OK-Halten zuverlässig zwischen Popup und Streamstart.
- Long-Press in der Merkliste und in Bibliotheken öffnet ein Kontextmenü statt sofort zu löschen; lokale Merkliste bietet zusätzlich „Von der Merkliste entfernen“.
- Kontextmenü-Aktionen sind deutsch und englisch lokalisiert.
- Das Episoden-Kontextmenü nutzt nun denselben dunklen, akzentgerahmten Popup-Stil wie die Home-Kontextmenüs.

### Admin-Backend

- Der Snapshot-Editor stempelt geänderte Add-ons, Profil- und IPTV-Felder mit den passenden Sync-Zeitstempeln; App-Pushes führen Add-ons und profilbezogene Felder serverseitig mit dem aktuellen DB-Snapshot zusammen, damit ein Gerät direkt nach einer Admin-Änderung nicht wieder alte lokale Werte speichern kann.
- Top-Level-Addon-Änderungen aus dem Snapshot-Editor werden in die profilbezogenen Addon-Snapshots gespiegelt, damit Geräte den geänderten Addon-Status beim nächsten Pull übernehmen.
- Das Admin-Dashboard kann große Cloud-Snapshots wieder mit kleinen Delta-Änderungen bearbeiten, ohne an zu niedrigen Snapshot-Größenlimits zu scheitern.
- Das neue Admin-Logo `streamnetapp-logo.svg` wird über die Self-hosted-Backend-Asset-Route ausgeliefert.
- Admin-Änderungen an profilbezogenen Feldern schreiben nun denselben `fieldUpdatedAt`-Zeitstempelvertrag wie die App, damit Geräte diese Änderungen nicht beim nächsten Push als stale überschreiben.

## [2.3.012] - 2026-09-07

### Live TV

- TV-Geräte können unter Oberfläche zwischen dem StreamNet-Live-TV-Layout und einem klassischen Layout mit Kategorie-Sidebar, Hero und EPG-Raster wechseln; die Auswahl sowie getrennte Schriftgrößen für Netflix- und Klassik-Infopanels werden profilbezogen über StreamNet Cloud synchronisiert.
- Das klassische Layout verwendet die TV-fähige Kategorie-Sidebar statt Touch-Pills, unterstützt stufige Zurück-Navigation bis zur Topbar und stabilisiert D-Pad-Fokus für Kategorien, Senderliste, EPG und Suche.
- Der klassische Hero wurde kompakter gestaltet, zeigt Programmartwork im gesamten Infopanel, verzichtet auf sichtbare Rahmen und lässt mehr Platz für das EPG-Raster.
- EPG-Programmbalken wurden beruhigt und zeigen nur noch den Programmtitel ohne Live-/Archiv-/Neu-Badges, Zeiten, Dauer oder Beschreibung.
- Das klassische Live-TV-Layout ist in eine eigene `LiveTvClassicLayout`-Komponente ausgelagert, damit Klassik- und StreamNet-/Netflix-Layout getrennt weiterentwickelt werden können.

### Merkliste und Details

- Long-Press auf Episoden öffnet auf Mobile/Tablet das vorhandene Episoden-Aktionsmenü; auf TV entscheidet OK-Halten zuverlässig zwischen Popup und Streamstart.
- Long-Press in der Merkliste und in Bibliotheken öffnet ein Kontextmenü statt sofort zu löschen; lokale Merkliste bietet zusätzlich „Von der Merkliste entfernen“.
- Kontextmenü-Aktionen sind deutsch und englisch lokalisiert.

### Admin-Backend

- Das Admin-Dashboard kann große Cloud-Snapshots wieder mit kleinen Delta-Änderungen bearbeiten, ohne an zu niedrigen Snapshot-Größenlimits zu scheitern.
- Das neue Admin-Logo `streamnetapp-logo.svg` wird über die Self-hosted-Backend-Asset-Route ausgeliefert.
- Admin-Änderungen an profilbezogenen Feldern schreiben nun denselben `fieldUpdatedAt`-Zeitstempelvertrag wie die App, damit Geräte diese Änderungen nicht beim nächsten Push als stale überschreiben.

## [2.3.011] - 2026-09-07

### Live TV

- TV-Geräte können unter Oberfläche zwischen dem StreamNet-Live-TV-Layout und einem klassischen Layout mit Kategorie-Sidebar, Hero und EPG-Raster wechseln; die Auswahl sowie getrennte Schriftgrößen für Netflix- und Klassik-Infopanels werden profilbezogen über StreamNet Cloud synchronisiert.
- Das klassische Layout verwendet die TV-fähige Kategorie-Sidebar statt Touch-Pills, unterstützt stufige Zurück-Navigation bis zur Topbar und stabilisiert D-Pad-Fokus für Kategorien, Senderliste, EPG und Suche.
- Der klassische Hero wurde kompakter gestaltet, zeigt Programmartwork im gesamten Infopanel, verzichtet auf sichtbare Rahmen und lässt mehr Platz für das EPG-Raster.
- EPG-Programmbalken wurden beruhigt und zeigen nur noch den Programmtitel ohne Live-/Archiv-/Neu-Badges, Zeiten, Dauer oder Beschreibung.

### Merkliste und Details

- Long-Press auf Episoden öffnet auf Mobile/Tablet das vorhandene Episoden-Aktionsmenü; auf TV entscheidet OK-Halten zuverlässig zwischen Popup und Streamstart.
- Long-Press in der Merkliste und in Bibliotheken öffnet ein Kontextmenü statt sofort zu löschen; lokale Merkliste bietet zusätzlich „Von der Merkliste entfernen“.
- Kontextmenü-Aktionen sind deutsch und englisch lokalisiert.

### Admin-Backend

- Das Admin-Dashboard kann große Cloud-Snapshots wieder mit kleinen Delta-Änderungen bearbeiten, ohne an zu niedrigen Snapshot-Größenlimits zu scheitern.
- Das neue Admin-Logo `streamnetapp-logo.svg` wird über die Self-hosted-Backend-Asset-Route ausgeliefert.

## [2.3.010] - 2026-09-07

### Trakt, Merkliste und Cloud-Routing

- Die Routing-Option „Automatisch“ heißt nun „Cloud“, damit klar ist, dass die App-eigene Merkliste, Wiedergabefortschritte und Gesehen-Markierungen lokal gespeichert und über StreamNet Cloud synchronisiert werden.
- Die Merkliste bleibt im Cloud-Modus die StreamNet-Merkliste; verbundene Dienste wie Trakt ersetzen sie nicht mehr beim Öffnen der Watchlist durch einen automatischen Pull.
- Die Quellen für Merkliste, Weiter ansehen und Gesehen-Verlauf lassen sich wieder zuverlässig zwischen Cloud, Trakt, Simkl, Trakt + Simkl und MDBList umschalten, abhängig von den verbundenen Diensten.
- Trakt-, Simkl- und Library-Schaltflächen in der Merkliste verwenden nun den aktiven App-Akzent statt fester Anbieterfarben oder weißer Fokusrahmen.

## [2.3.009] - 2026-09-07

### Gesehen-Status und Cloud-Synchronisation

- Manuell als gesehen oder ungesehen markierte Filme und Episoden behalten ihren Status nach dem Verlassen und erneuten Öffnen der Detailseite.
- Profilbezogene Änderungszeitpunkte sorgen dafür, dass beim Zusammenführen mehrerer Geräte die neueste Gesehen-/Ungesehen-Aktion gewinnt, statt entfernte grüne Haken aus einem älteren Cloud-Snapshot wiederherzustellen.
- Einzelne Episoden, Filme und vollständige Staffelaktionen verwenden denselben synchronisierten Statusvertrag; ältere Cloud-Snapshots bleiben kompatibel.

### Cloud-Anmeldung

- Eine gespeicherte Cloud-Anmeldung bleibt auf der Profilauswahl bei vorübergehenden Start-, Netzwerk- oder Prüfproblemen als verbunden sichtbar.
- Nur eine tatsächlich fehlende oder vom Backend mit `401` beziehungsweise `403` abgewiesene Session zeigt wieder den Cloud-Verbinden-Button.

## [2.3.008] - 2026-09-06

### Administration und Updates

- Der App-Update-Dialog zeigt statt des vollständigen Changelogs einen anklickbaren Link zum zugehörigen GitHub-Release.
- Das Self-hosted Backend enthält ein separates Admin-Dashboard für Datenbankkennzahlen, Accounts, Profile, maskierte Cloud-Snapshots und auditierte Remote-Änderungen an Add-ons, Playlists und Profilfeldern.

### Live TV und Programmführer

- XMLTV-Anfragen werden pro Anbieter begrenzt, bei Rate-Limits beziehungsweise Authentifizierungsfehlern abgekühlt und beim Verlassen des Screens zuverlässig abgebrochen.
- Der Programmführer rendert nur das sichtbare Zeitfenster, führt laufende Sendungen anhand der aktuellen Uhrzeit fort und kann Live-Wiedergabe nach einem Behind-live-window-Fehler kontrolliert wiederherstellen.
- Unbekannte Senderqualität bleibt ohne irreführendes SD-Badge und wird für den laufenden Stream anhand der tatsächlichen Videoauflösung ergänzt.
- Der Netflix-artige Live-TV-Infobereich verwendet dieselbe Artwork-Priorität wie die Senderkarten: Programm-Fanart, Kategorie beziehungsweise Länderflagge und zuletzt Senderlogo auf dem Senderfarbverlauf.

### Home, Suche und Wiedergabe

- Das initial fokussierte erste Home-Item startet nun ebenfalls die Detailauflösung, damit vorhandenes Fanart zuverlässig im großen Hero erscheint.
- Favorite-/Recent-TV-Logos werden ohne Clearlogo-Überlagerung eingepasst; Bildanfragen und Kartenübergänge wurden für stabileres Artwork verfeinert.
- Die TV-Suche verwendet einen eindeutigen D-Pad-Fokuspfad und semantische Tabs; Touch-Ergebnisse behalten natürliche, responsive Zeilen.
- Playerfehler, Quellenwechsel sowie Audio-, Sprach- und Untertitelabgleich sind vollständig auf Deutsch und Englisch lokalisiert und unterscheiden konkrete Netzwerk-, Format-, Codec- und Quellenfehler.
- Ein bestehendes Cloud-Profil bleibt während vorübergehender Authentifizierungsfehler als verbunden sichtbar; der Profilwechsel verwendet aus allen Screens denselben stabilen Navigationspfad.

## [2.3.007] - 2026-09-05

### Update-Dialog

- Aktionsbuttons behalten auf TV-Geräten eine lesbare Mindestgröße und sichtbare Beschriftungen, auch wenn umfangreiche Versionshinweise angezeigt werden.
- Der Changelog ist auf TV, Smartphone und Tablet kompakter und separat scrollbar, während die Aktionsleiste dauerhaft sichtbar bleibt.
- Mobile Dialoge berücksichtigen die sicheren Bildschirmränder, damit Buttons nicht mehr hinter der Android-Navigationsleiste liegen.

## [2.3.006] - 2026-09-05

### Branding

- App-, Cloudportal-, Datenschutz-, Diagnose- und Integrationsbezeichnungen verwenden einheitlich „StreamNet“ beziehungsweise „StreamNet Cloud“; der geschützte IPTV-Playlistname „StreamNet TV“ bleibt aus Kompatibilitätsgründen unverändert.

### IPTV

- Titel mit Umlauten und weiteren nicht-ASCII-Buchstaben werden bei Xtream-Film- und Serienabgleichen korrekt transliteriert; ausgeschriebene deutsche Umlaute wie „ue“ werden als zusätzlicher Provider-Alias berücksichtigt.

### Lokalisierung

- TMDB-Genres in Home-Heros und Suchfiltern verwenden nun die App-Sprache statt fest eingebauter englischer Bezeichnungen.

## [2.3.005] - 2026-09-05

### Metadaten

- Deutsche FSK-Freigaben werden, sofern bei TMDB verfügbar, neben IMDb und Budget in großen Home-Heros und auf Detailseiten angezeigt.
- FSK und Filmbudget lassen sich profilbezogen in den Einstellungen ein- oder ausblenden; die Optionen werden über den eigenen Cloud-Backend-Snapshot synchronisiert.

### Update-Dialog

- Lange Versionshinweise scrollen auf Smartphones und Tablets innerhalb des Update-Dialogs, während die Aktionsbuttons sichtbar und oberhalb der Systemleiste erreichbar bleiben.

### Neues App-Branding

- Der sichtbare Appname wurde von „StreamNet TV“ auf „StreamNet“ verkürzt.
- Launcher-Icons, Adaptive- und Monochrom-Icon, Android-TV-Banner sowie die Vektorlogos für Splashscreen, Ladeansicht, Profilauswahl und Bildschirmschoner verwenden das neue StreamNet-Design in allen benötigten Auflösungen.

## [2.3.004] - 2026-09-05

### Stabilität und Leistung

- Ein leerer Home-Bildschirm beginnt ohne den bisherigen pauschalen Startaufschub von bis zu einer Sekunde zu laden; erfolgreiche Home-Metadaten bleiben fünf Minuten im Speicher und bereits sichtbare Disk-Cache-Inhalte behalten den verzögerten Hintergrund-Refresh.
- Schnelle IPTV-Änderungen in den Einstellungen brechen veraltete Gruppen-Ladevorgänge ab und fangen Repository-Fehler an der Coroutine-Grenze ab, statt die App zu beenden.
- Der Home-IPTV-Kanalindex ist bei gleichzeitigen Hintergrund- und UI-Zugriffen threadsicher.
- Parallele Startabfragen für Watch-History und Cloud-Snapshots werden kurzzeitig zusammengeführt, damit Home, Einstellungen und Watchlist nicht denselben Backend-Payload mehrfach gleichzeitig laden.
- Gleichzeitige Detail- und IMDb-Rating-Abfragen für denselben Film oder dieselbe Serie teilen sich einen laufenden Request; fehlende Ratings werden kurzzeitig negativ gecacht und die zugehörigen In-Memory-Caches sind threadsicher.
- Debug-Netzwerklogs enthalten keine Query-Parameter oder API-Schlüssel mehr.
- Lokale Absturzberichte enthalten nun einen begrenzten Stacktrace, damit auch seltene Abstürze ohne verfügbaren Remote-Bericht untersucht werden können.

### Wartung

- Die veraltete Fastify-Option `disableRequestLogging` wurde durch den für Fastify 6 vorbereiteten `LogController` ersetzt, ohne das bestehende benutzerdefinierte Request-Logging zu verändern.
- GitHub Actions wurden auf die aktuellen Node-24-basierten Versionen `checkout@v7`, `setup-java@v6` und `upload-artifact@v7` aktualisiert.

## [2.3.003] - 2026-09-05

### TV-Oberfläche

- TV-Playlist-Karten wurden in separate Informations- und Aktionszeilen erweitert, damit die StreamNet TV-Voreinstellung in TV-Layouts lesbar bleibt.
- Beschreibungen in Kopfzeilen der TV-Settings können nun zweizeilig umgebrochen werden, statt nach einer Zeile abgeschnitten zu werden.
- Beschreibungen für Optionen, Kataloge, Add-ons und Kontexthilfen in den Settings wurden auf maximal zwei Zeilen vereinheitlicht.
- Diagnosetexte und Datenschutzdokumentation wurden korrigiert, um konfigurationsabhängige Absturzberichte von der eigenen Messung der App-Starts abzugrenzen.
- Der fehlende Favoriten-Chip in der Netflix-artigen Live TV-Kategorieleiste wurde wiederhergestellt; Search und alle Kategorien bleiben dabei in einer horizontal scrollbaren Zeile.
- Anbieter von Absturzberichten, Build-Bedingungen, Self-Hosting-Optionen, die Messung der App-Starts und der aktuelle Prüfstatus wurden dokumentiert.

### Automatisierung

- GitHub Releases und der eigenständige Telegram-Workflow verwenden automatisch den passenden deutschen Versionsabschnitt aus `CHANGELOG.md`; der Release-Build sendet ihn erst nach erfolgreicher APK-Erstellung und Release-Veröffentlichung an das konfigurierte Telegram-Thema. Vorschaumodus und automatische Aufteilung langer Changelogs bleiben verfügbar.

## [2.3.002] - 2026-09-04

### Sicherheit

- Eine unabhängige, profilbezogene Settings-PIN für Smartphone, Tablet und TV wurde hinzugefügt. Der gesamte Settings-Bereich bleibt bis zur PIN-Bestätigung gesperrt, während PIN-Hashes und Sperrstatus mit zeitstempelbasierter Konfliktbehandlung synchronisiert werden.
- Steuerelemente zum Festlegen, Ändern, Aktivieren und Deaktivieren der Settings-Sperre wurden hinzugefügt, ohne die PIN im Klartext zu speichern.

### Oberfläche

- Der doppelte Aktivierungsstatus wurde aus IPTV-Playlist-Karten auf Smartphone und Tablet entfernt und die Reihenfolge der Aktionen Bearbeiten, Aktivieren, Kategorie, Neu anordnen und Löschen verdeutlicht.
- Die Seitenleiste der TV-Settings wurde neu sortiert, sodass Profile, Cloud Sync und Accounts sowie Interface, Plugins, Network und Info & Updates jeweils in dieser Reihenfolge angezeigt werden.
- Der ausgewählte Profilakzent wird nun im gesamten Settings-PIN-Dialog verwendet und das Profilstatus-Badge zeigt den tatsächlichen Status der Settings-Sperre an.
- Das Namensfeld im Profileditor und die Steuerelemente auf der linken Seite erhielten einen sichtbaren Akzentfokus; kompakte Aktionen zum Abbrechen und Löschen bleiben in einer Zeile.

## [2.3.001] - 2026-09-04

### Zuverlässigkeit von Cloud und Konten

- Die Auswahl und Zugangsdaten der Anbieter Trakt, Simkl und MDBList wurden mit profilbezogenen Zeitstempeln geschützt, damit ältere Geräte und veraltete Cloud-Nutzdaten neuere Auswahlen oder das Entfernen von Zugangsdaten nicht überschreiben können.
- Der bevorzugte Tracking-Anbieter bleibt beim Verbinden eines anderen Anbieters erhalten; Lesemodi werden nur repariert, wenn ihr ausgewählter Anbieter nicht verfügbar ist.
- Schnell aufeinanderfolgende Cloud-Aktualisierungen in den Settings wurden entprellt und unerwartete Fehler beim Übertragen, Wiederherstellen und Authentifizieren an der Settings-Grenze abgefangen.
- Fehlgeschlagene HTTP-Antworten werden nicht mehr zwischengespeichert und das gemeinsame Netzwerk wird früh genug für Komponenten beim App-Start initialisiert.

### Home Server und Home

- Home-Kataloge von Plex, Jellyfin und Emby wurden auf echte Film- und Serienbibliotheken beschränkt; Sammlungen, Boxsets, Musik, Fotos und gemischte Ansichten werden ausgeschlossen.
- Profilsynchronisierte Steuerelemente für die Bibliothekssichtbarkeit je Server wurden zu den TV- und Touch-Settings hinzugefügt; veraltete oder deaktivierte Kataloge werden aus Home entfernt.
- Die Home Server-Settings wurden in Bereiche zum Hinzufügen, für verbundene Server, Bibliotheken und Serveraktionen neu gegliedert und das Status-Badge für verbundene Server korrigiert.
- Nutzbare zwischengespeicherte Home-Zeilen bleiben bei Aktualisierungen erhalten; statt geladene Inhalte wiederholt zu ersetzen, erfolgt nun nach sechs Stunden eine Aktualisierung veralteter Daten.

### IPTV und Live TV

- Die profilsynchronisierte Sichtbarkeit von StreamNet-Film- und Serienkategorien wurde hinzugefügt, ohne Search, Wiedergabequellen und andere Xtream-Playlists zu beeinflussen.
- Die IPTV-Settings wurden in einen Playlists-Bereich mit einem Unterbereich für jede Playlist sowie getrennten Steuerelementen für Live- und VOD-Kategorien neu gegliedert.
- Die ausgewählte Live TV-Gruppe und der ausgewählte Kanal bleiben bei Playlist-Aktualisierungen und der Navigation in den Settings erhalten.
- Grüne Vorschauartefakte nach dem Verlassen des Vollbildmodus wurden durch die Erzwingung exklusiver ExoPlayer-Surface-Zuständigkeit behoben.

### Oberfläche und Aktualisierungen

- Höhe und untere Platzierung von Toasts über den Navigationssteuerelementen wurden vereinheitlicht und die thematisierte Benachrichtigungsfläche für den IPTV-Fortschritt wiederverwendet.
- Das ausgewählte Akzentdesign wurde auf Plugin-Dialoge angewendet und Plugin-Statusmeldungen sowie Beschriftungen der Tracker-Liste wurden lokalisiert.
- GitHub-Versionshinweise bleiben im Aktualisierungsdialog während Download, erneutem Versuch und Installationsbereitschaft sichtbar.
- Der Android-Release-Workflow wurde aktualisiert, um Versionshinweise zu erzeugen und leere Beschreibungen bestehender Releases nachzutragen.
- Die Ausweichnavigation in Home und der englische Trailer-Fallback wurden verbessert, ohne ausdrücklich angeforderte Videosprachen zu überschreiben.

### Validierung

- Regressionstests für die Bibliotheksfilterung von Home Server, die Sichtbarkeit von IPTV-VOD-Kategorien, die Kompatibilität alter Kataloge und den zeitstempelbasierten Status des Synchronisierungsanbieters wurden hinzugefügt.
- Der Sideload-Kotlin-Build, die aktivierte Sideload-Unit-Test-Suite, die Erstellung der Debug APK, IDE-Diagnosen und Whitespace-Prüfungen wurden validiert.

### Visuelle Konsistenz der Settings

- In den gesamten TV-Settings wurden vorangestellte semantische Symbole hinzugefügt, darunter für Umschalter, Aktionen, Kontointegrationen, benutzerdefinierte Playlists, Kataloge und Steuerelemente für Plugin-Scraper.
- Symbolgröße, Abstände, neutrale Tönung und die Akzentdarstellung des ausgewählten Designs wurden in gemeinsamen und benutzerdefinierten Zeilen der TV-Settings vereinheitlicht.
- Das Styling von In-App-Toasts wurde mit dem aktiven Profilakzent, einem OLED-gerechten Hintergrund und einer Platzierung unten mittig vereinheitlicht; Treffer des Players sowie Telegram-/Aktualisierungsereignisse verwenden nun dieselbe Darstellung, solange die App sichtbar ist.
- Der überflüssige innere Fokusrahmen wurde von Addon-Umschaltern entfernt, während die Fokusmarkierung der gesamten Zeile und D-Pad-Aktionen erhalten bleiben.
- Der Akzent des ausgewählten Designs wurde auf Addon-Aktualisierungs-/Installationsaktionen und den Dialog zur Auswahl des AI-Modells angewendet.
- Platzhalter für StreamNet-Zugangsdaten und der standardmäßige Eingabeplatzhalter der Settings wurden auf Englisch und Deutsch lokalisiert.
- Die Android-Anwendung wurde auf `2.2.005` (`versionCode` 380) angehoben.
- Implementierungsverhalten und Validierung wurden in `docs/superpowers/settings-visual-consistency-2026-09-03.md` dokumentiert.

### Feinschliff für Wiedergabe, IPTV, Search und Portal

- Ein eingebetteter erzwungener Untertitel passend zur aktiven Audiosprache wird nun auch dann automatisch ausgewählt, wenn normale Untertitel auf Off stehen; ausdrückliche manuelle Untertitelauswahlen bleiben erhalten.
- Home-Logo-Caches werden bei einer Änderung der Inhaltssprache invalidiert, damit Home und Details dasselbe lokalisierte Artwork bevorzugen.
- Ein profilbezogener, cloud-synchronisierter Schalter für die IPTV-VOD-Suche wurde hinzugefügt, der die Suche nach Xtream-Film-/Serienquellen und das Vorwärmen des Caches steuert, ohne Live TV oder konfigurierte Playlists zu beeinflussen.
- Der Abgleich in IPTV-only Home wurde durch Prüfungen von TMDB ID, IMDb ID und Erscheinungsjahr verbessert, bevor auf normalisierte Titel zurückgegriffen wird.
- Geladene Home-Karten bleiben während der Seitennavigation sichtbar und die Fokuswiederherstellung landet nicht mehr auf Platzhaltern für weitere Seiten.
- Die Zuverlässigkeit des Xtream-Katalogs wurde durch Verwendung des langlebigen IPTV-HTTP-Clients und das Entfernen kurzer, verschachtelter Such-Timeouts aus vollständigen Katalog-Fallbacks verbessert.
- Aktivierung und dauerhafte Auswahl von TV-Search-Filtern, die Anime-Filterung sowie das Styling mit aktivem Akzent wurden für gängige Enter-Tastenvarianten von Fernbedienungen korrigiert.
- Die TV-Playlist-Settings wurden mit einer eigenen Bereichsüberschrift, einheitlichen Symbolen und Fokus-Styling neu gegliedert; die destruktive Aktion zum Löschen der Playlist steht nun zuletzt.
- Während der IPTV-Einrichtung wird Ladefeedback nun sofort angezeigt und Toast-Benachrichtigungen werden oberhalb der Einrückungen der Systemnavigation platziert.
- Die mobile Inhaltsreihenfolge auf den selbst gehosteten Seiten Privacy und Cloud-Konto wurde korrigiert, ohne den Ablauf der Kontolöschung zu verändern.
- Die Android-Anwendung wurde auf `2.2.004` (`versionCode` 379) angehoben.
- Implementierungsverhalten und Validierung wurden in `docs/superpowers/playback-iptv-search-polish-2026-09-03.md` dokumentiert.

### IPTV-only Home und Xtream VOD

- Ein profilbezogener IPTV-only-Modus für TV, Tablet und Smartphone wurde hinzugefügt, der die Home-Darstellung filtert, ohne konfigurierte Kataloge oder zwischengespeicherte Daten zu löschen.
- Nach Anbietern gruppierte Xtream-Film- und -Serienzeilen wurden hinzugefügt, einschließlich stabiler unaufgelöster Identitäten für Einträge ohne TMDB IDs und verzögerter Metadatenauflösung beim Fokussieren oder Öffnen von Karten.
- Continue Watching bleibt sichtbar, während der IPTV-only-Modus aktiv ist und während die Anbieterverfügbarkeit noch geladen wird.
- Die Klassifizierung der Wiedergabe und die Fortschrittsspeicherung für unaufgelöste Xtream VOD-Inhalte wurden korrigiert, damit negative lokale Identitäten nicht mit Live TV verwechselt werden.
- Die selbst gehostete Wiedergabeverlauf-API darf negative Identitäten nur für die vorgesehene Quelle `iptv_xtream_vod` synchronisieren; null und nicht zugehörige negative IDs werden weiterhin abgelehnt.
- Selektive IPTV-Playlist-Importe und das Aktivierungsverhalten älterer Playlists wurden robuster gemacht und mit gezielten Regressionstests abgedeckt.

### Touch- und Live TV-Erlebnis

- Eine größere Live TV-Vorschau für Tablets im Querformat und ein höhenangepasstes Panel im TV-Stil für das aktuelle und kommende Programm wurden hinzugefügt; Kategorien und EPG-Raster bleiben sichtbar.
- Das rote LIVE-Badge wurde aus EPG-Zellen auf Smartphone und Tablet entfernt, auf dem TV bleibt es erhalten.
- Das ausgewählte Akzentdesign wurde auf das Touch-Search-Feld, den Cursor, Ladeanzeigen und ausgewählte Filter-Chips angewendet.
- Das Verhalten von Sammlungen und Home wurde für die IPTV-only-Darstellung, das Vorladen beim Kartenfokus und den Artwork-Fallback von Anbietern verfeinert.

### Selbst gehostetes Kontoportal

- Bekannte browserseitige Fehler bei Authentifizierung, Kopplung, Passwort, Löschung und Discord wurden auf Deutsch lokalisiert, während der Vertrag der Backend-API sprachneutral bleibt.
- Die Seiten für Anmeldung, Datenschutz, Kontolöschung und Discord wurden mit dem dunkel-goldenen visuellen System von StreamNet und einer gemeinsamen Spracheinstellung vereinheitlicht.
- Die Seiten für Datenschutz und Kontolöschung wurden ohne Navigationsleisten mit demselben eigenständigen Sprachumschalter und derselben Logo-Struktur innerhalb der Oberfläche wie die Hauptkontoseite neu erstellt.
- Die Datenschutzerklärung wurde für Mobilgeräte optimiert, einschließlich begrenztem horizontalem Scrollen für breite Datentabellen und Überlaufprüfungen in Smartphone- und Desktop-Ansichten.
- Regressionstests öffentlicher Seiten für deutsche Fehler, responsives Styling und einheitliches StreamNet-Branding wurden hinzugefügt.

### Veröffentlichung

- Die Android-Anwendung wurde auf `2.2.003` (`versionCode` 378) angehoben.
- Implementierungsgrenzen, Validierung und Hinweise zur Beibehaltung bei Merges wurden in `docs/superpowers/iptv-only-vod-and-portal-2026-09-02.md` dokumentiert.

### Zuverlässigkeit von Cloud-Sitzungen

- Die Übermittlung von TV-Kopplungstokens erfolgt nun atomar, sodass sich überschneidende Statusabfragen nicht dasselbe Aktualisierungstoken erhalten können.
- Eine verzögerte Ablehnung der Aktualisierung kann keine neuere Sitzung mehr löschen, die bereits von einer anderen Anfrage gespeichert wurde.

### Live TV-Kategorie-Artwork und Settings-Fokus

- Für Live TV wurden 15 mitgelieferte Kategorie-Hintergründe und 255 SVG-Länderflaggen mit anbieter-/kategoriebezogenen Zuordnungen und Länderaliasen hinzugefügt.
- Kategorie-Artwork ohne Flaggen wurde auf Home-Karten für Favorite TV und Recently Watched TV, den Home-Hero und den IPTV-Programmdialog angewendet; externes Programm-Artwork bleibt die erste Wahl.
- Kategorie-Artwork wurde auf die Netflix-artigen Live TV-Senderkarten und das Info-Panel im TV-Modus angewendet; Länderflaggen bleiben auf Karten beschränkt und werden nie über Hero-/Info-Hintergründe gestreckt.
- `STREAMNET RELAX` bleibt beim Senderlogo-Fallback ohne Kategorie-Artwork oder Länderflaggen erhalten.
- Der Abgleich mit TMDB, TVDB und Fanart.tv wurde durch gestaffelte Titelabfragen, Spin-off-bewertete Gewichtung, die Kanonisierung von `Navy CIS` und wiederholbares negatives Artwork-Caching verbessert.
- Die Sortierung von TV-IPTV-Kategorien wurde überarbeitet, um den einzigen äußeren Settings-Scroller zu verwenden, den Fokus auf der verschobenen Kategorie zu halten, den übernommenen Scrollstatus zurückzusetzen und eine akzentfarbene Auswahlmarkierung der fokussierten Zeile ohne ausgeblendete Zeilen oder Seitensprünge anzuzeigen.
- Gezielte Regressionstests für die Auflösung von Kategorien/Flaggen, die Eignung von Home-Artwork, den IPTV-Titelabgleich, die Kategoriesortierung und die Fokusbewegung wurden hinzugefügt.

### Cloud-Sitzungen, TV-Metadaten und IPTV-Artwork

- Eine gespeicherte StreamNet Cloud-Sitzung bleibt bei vorübergehenden Fehlern der Token-Aktualisierung oder des Netzwerks bestehen; Sitzungen, die eindeutig abgelaufen oder abgelehnt sind oder kein Aktualisierungstoken besitzen, werden weiterhin abgemeldet.
- Die Lokalisierung von TV-Metadaten wurde verbessert, indem Felder in der App-Sprache beibehalten und nur fehlende Werte aus englischen TMDB-Details ergänzt werden.
- TV-Logos werden nach App-Sprache, Englisch und anschließend neutralem Artwork priorisiert; Hintergründe nach neutralem Artwork, App-Sprache und anschließend englischem Artwork.
- Episodensuffixe wurden bereinigt und diakritische Zeichen beim IPTV-Artwork-Abgleich beibehalten, damit lokalisierte EPG-Titel zuverlässiger aufgelöst werden.
- Für IPTV-Artwork werden sowohl Film- als auch TV-Ergebnisse von TMDB durchsucht und die EPG-Dauer als weicher Typhinweis verwendet. Programme mit langen, exakt übereinstimmenden Titeln bevorzugen nun ein Filmergebnis, damit Titel wie `Rambo` nicht einer gleichnamigen TV-Serie zugeordnet werden.
- EPG-Start-/Endzeiten werden an den Home-Hero, Home-IPTV-Karten und Live TV-Karten weitergegeben; filmartige Artwork-Cache-Einträge wurden von gemischten Suchen getrennt.

### App-Start, Aktualisierungen und Validierung

- Statt eines lediglich angesehenen Kanals wird wieder der aktuell wiedergegebene Live TV-Kanal hergestellt; der gemerkte Kanal bleibt erhalten, während asynchrone Playlists noch geladen werden.
- Das Wiedergabeziel einer Serie wird bei der ersten tatsächlichen Rückkehr vom Player aktualisiert, sodass nach Abschluss von Episode 9 der Details-Button auf Episode 10 aktualisiert wird, statt die veraltete Beschriftung für Episode 9 anzuzeigen.
- Eine neu ausgewählte, noch nicht gestartete Up Next-Episode bleibt in der Continue Watching-Zeile von Home, wenn noch ein veralteter entfernter Eintrag für die vorherige Episode vorhanden ist.
- Automatische signierte Android-Builds wurden auf Pushes beschränkt, die `versionCode` oder `versionName` ändern; manuelle Workflow-Ausführungen bleiben verfügbar.
- Automatische Aktualisierungsprüfungen öffnen neu verfügbare, nicht ignorierte Releases; manuelle Prüfungen können weiterhin ein ignoriertes Release erneut öffnen.
- Regressionstests für Cloud-Sitzungen beim App-Start, die Sortierung lokalisierter Artworks, mehrdeutige Film-/TV-IPTV-Titel, die Wiederherstellung von Live TV und das Verhalten des Aktualisierungsdialogs wurden hinzugefügt.
- Der offizielle Android-Build `2.1.105` wurde mit der vollständigen optionalen Sideload-Debug-Unit-Test-Aufgabe und der APK-Erstellung validiert.

### Evaluierung von Media3 1.10.1

- Der getestete Media3-Abhängigkeitssatz `1.10.1` wurde nach der Evaluierung auf `test/media3-1.10.1` in den offiziellen Build `2.1.107` übernommen.
- Die Media3-Module ExoPlayer, HLS, DASH, OkHttp-Datenquelle, UI, Sitzung und Common wurden auf `1.10.1` aktualisiert.
- Die FFmpeg-Erweiterung von Jellyfin bleibt auf `1.9.0+1`, da kein passendes Artefakt für `1.10.1` verfügbar ist; der benutzerdefinierte Dolby Vision-Matroska-Extractor auf Basis von Media3 `1.9.0` bleibt bis zur Validierung der Wiedergabe auf Geräten erhalten.
- Es wurde bestätigt, dass der Media3-Test-Branch die Sideload-Debug-Unit-Tests besteht und eine APK erstellt. Die Checkliste für Dolby Vision, DTS/TrueHD/Atmos, HLS, DASH, Spulen, Untertitel und Fallback auf echten Geräten bleibt zur Kompatibilitätsverfolgung dokumentiert.
- Branch-Matrix, Cloud-/Proxy-Feature-Flags, erwartete Vorteile von Media3, Kompatibilitätsgrenzen und Testcheckliste wurden in `docs/media3-1.10.1-evaluation.md` dokumentiert.

### APK-Größe und Build-Kompatibilität

- Die standardmäßige universelle APK wurde von 206.58 MB auf 115.25 MB verkleinert, indem 32-Bit- und 64-Bit-ARM-Bibliotheken paketiert wurden; optionale x86/x86_64-Emulator-Builds über `-PincludeX86Abis=true` bleiben verfügbar.
- 109 unveränderte Avatar-, Ranking- und Sportbilder wurden in WebP konvertiert, wobei beide benutzerdefinierten StreamNet-Launcher-Banner Byte für Byte erhalten blieben.
- Die Ressourcenverkleinerung für Releases wurde aktiviert; das validierte ARM-Sideload-Release ist 90.73 MB groß und enthält weiterhin die StreamNet-Banner sowie die referenzierten Avatar-, Ranking- und Sportressourcen.

### Settings, Aktualisierungen und Rückmeldungen

- Die TV-Settings wurden in eigene Bereiche `Profile > Cloud Sync` und `System > Info & Updates` aufgeteilt; Tracking-Anbieter bleiben unter Accounts.
- Aktualisierungsanzeigen spiegeln nun die tatsächliche GitHub-Release-Prüfung wider, statt lediglich die Unterstützung von Selbstaktualisierungen anzuzeigen.
- Sichtbare Phasen der Code-Kopplung für Home Server wurden für Genehmigung, Serversuche, Verbindung, Laden der Bibliothek und abschließende Einrichtung hinzugefügt.
- App-Toast-Benachrichtigungen wurden in ein nicht interaktives Overlay-Fenster verschoben, damit Status- und Fehlermeldungen über geöffneten Dialogen sichtbar bleiben, ohne Touch- oder D-Pad-Eingaben zu blockieren.
- Die unzuverlässige Einstellung für den Start nach dem Gerätestart sowie Receiver, Berechtigung, gespeicherte Präferenz und Cloud-Sync-Feld wurden entfernt.

### StreamNet Cloud, Profile und Kontosicherheit

- Wechselndes gemischtes Film- und Serien-Artwork wurde zum Ladebildschirm beim App-Start und zur Profilauswahl hinzugefügt und wechselt alle fünf Sekunden aus einem gemeinsamen Vorladepool.
- Die Profilauswahl wurde durch Entfernen der Überschrift und des äußeren Profilcontainers vereinfacht; unter dem StreamNet-Logo wurde eine kompakte, D-Pad-fokussierte Aktion `myStreamNet Cloud` hinzugefügt.
- Sichtbare Verweise auf den Cloud-Dienst wurden in StreamNet Cloud umbenannt und das StreamNet Club-Logo auf den selbst gehosteten Seiten für Anmeldung, Datenschutz, Löschung und Erfolg eingeführt.
- Die Behandlung von Anmeldung und abgelaufenen Sitzungen wurde verbessert, sodass ungültige StreamNet Cloud-Zugangsdaten und widerrufene Sitzungen klarere Fehler erzeugen und veraltete lokale Authentifizierungen entfernt werden.
- Die dauerhafte Kontolöschung wurde robuster gemacht, sodass Kontositzungen, Snapshots, Kopplungssitzungen, Nutzungsereignisse, Wiedergabeverlauf und Wiedergabestatus transaktional entfernt werden; PostgreSQL-Kaskadenbedingungen und Regressionstests wurden hinzugefügt.

### Interaktion von Home und IPTV

- Ein thematisierter, vom D-Pad isolierter IPTV-Programminformationsdialog mit Hintergrund, Logo, Metadaten, Details zum aktuellen Programm sowie Wiedergabe- und Favoritenaktionen wurde hinzugefügt.
- IPTV-Programmdetails und das Umschalten von Favoriten wurden zu Medien-Kontextmenüs hinzugefügt; der Status der Home-Zeilen bleibt bei Änderungen der Programmdaten stabil.
- Die mobile Fehlerdarstellung wurde verfeinert und die Startauswahl von Home so aktualisiert, dass die erste sichtbare konfigurierte Zeile bevorzugt wird.

### Cloud-Migration und Lokalisierung

- Produktive Android-Release-Builds wurden auf das selbst gehostete StreamNet-Backend unter `auth.mystreamnet.club` umgestellt.
- Die verifizierte Migration von 10 Netlify-Konten und 5 selbst gehosteten Snapshots einschließlich Daten mehrerer Profile und ohne verwaiste Snapshots wurde dokumentiert.
- Fest codierte Android-Toast-Benachrichtigungen wurden mithilfe englischer und deutscher Ressourcenvarianten lokalisiert.

### Hinzugefügt

- Eine IPTV-Einstellung zum Ein- oder Ausblenden der Live TV-Sonderkategorien (All Channels und Recently Watched) wurde hinzugefügt, einschließlich Settings-Oberflächen für TV und Mobilgeräte sowie dauerhaftem profilbezogenem Verhalten.
- Eine geschützte StreamNet TV-Playlist-Voreinstellung wurde hinzugefügt, die bei neuen Profilen bereitsteht, ihren konfigurierten Host nicht in der Settings-Oberfläche anzeigt und sich mit dem persönlichen Benutzernamen und Passwort des jeweiligen Benutzers verbindet.
- Bestehende manuelle StreamNet TV-Anmeldungen wurden zur Voreinstellung migriert und das Playlist-Kapazitäts-Badge so korrigiert, dass nur konfigurierte Quellen in den drei verfügbaren Plätzen gezählt werden.

### Live TV, IPTV und Fokus

- Die Rahmenstärke der Live TV-Auswahl wurde in Kategorieseitenleiste, Senderliste, Suchergebnissen und EPG-Programmzellen des TV-Modus auf 1dp reduziert.
- Der Startfokus von Live TV wurde wiederhergestellt und robuster gemacht, sodass er auf der ausgewählten/gemerkten Kategorie landet, statt auf Search zurückzufallen.
- In der Kategorieseitenleiste wurde ein ausschließlich expliziter Search-Fokus erzwungen, sodass Search nur bei absichtlichem Öffnen den Fokus erhält.
- Die Netflix-artigen Kategorie- und Senderzeilen von Live TV werden nach einem Bildschirmwechsel oder Neustart der App wieder auf den aktuell wiedergegebenen Sender gesetzt.
- Die Reihenfolge der Playlist-Kategorien und Einstellungen für ausgeblendete Kategorien bleiben bei der Migration der StreamNet TV-Voreinstellung sowie profil- und cloud-synchronisiert geräteübergreifend erhalten.
- Der mobile Live TV-Programmführer verwendet beim Laden einer neu ausgewählten Kategorie nicht mehr ein kleineres vorheriges Kategoriefenster.
- Die seitlichen EPG-Informationen des Mini-Players folgen nun dem aktuell fokussierten Sender, während in der Senderliste nach oben/unten gescrollt wird.
- Xtream-EPG-Zuordnung, Beibehaltung von Beschreibungen, erneute Versuche für sichtbare Sender und authentifizierter XMLTV-Fallback wurden verbessert, damit Home und Live TV konsistente, umfangreiche Programmdaten anzeigen.
- Eine manuelle Playlist-Aktualisierung veröffentlicht Senderänderungen nun sofort und erzwingt eine vollständige EPG-Aktualisierung, während bestehende Daten bei vorübergehenden Fehlern erhalten bleiben.
- Der Live TV-Hero und die Senderkarten im TV-Modus wurden mit größeren Senderlogos, TMDB-bewussten Logo-Hintergründen, kompakten Zeilen für kommende Programme und einem klareren Aktualisierungsstatus verfeinert.

### Home und Watchlist

- Automatische Aktualisierungsdialoge für neu verfügbare, nicht ignorierte App-Releases wurden nach dem Verschieben der Aktualisierungseinstellung wiederhergestellt.
- Anbieter- und Aktionssteuerelemente der Library, einschließlich My Watchlist, wurden als akzentgestaltete Pillen-Buttons mit fokussiertem und ausgewähltem Status neu gestaltet.
- Die automatische Wiedergabe des Live TV-Heros wurde für die Zeilen Favorites und Recently Watched TV deaktiviert; Artwork, Programminformationen und manuelle Wiedergabe bleiben erhalten.
- Home-IPTV-Karten wurden an die Artwork-Darstellung von Live TV angeglichen und das MGM+-Dienst-Artwork mit einer gültigen Quelle im Querformat wiederhergestellt.
- Es wurde behoben, dass nach dem Entfernen des letzten Watchlist-Eintrags eine veraltete Karte sichtbar blieb, bis die Ansicht verlassen wurde.
- Hinzufügungen und Entfernungen in der Watchlist aus Home, Details und Watchlist werden als maßgebliche lokale Cloud-Snapshots synchronisiert, mit wiederholbarer Fehlermeldung.
- Filme und Episoden werden bei 90% Wiedergabefortschritt oder Abschluss automatisch als angesehen markiert; die lokale Synchronisierung sowie die Synchronisierung mit Supabase, Trakt, Simkl und MDBList bleiben erhalten.
- Manuell als angesehen markierte Filme und Episoden kehren nicht mehr mit veraltetem Fortschritt zu Continue Watching zurück. Exakte zeitgestempelte Entfernungsmarkierungen werden nun geräteübergreifend zusammengeführt, während die nächste Episode weiterhin für Up Next infrage kommt.
- Der Start von Home wurde mit profilbezogenen Katalogplatzhaltern verbessert, nachlaufende Skelette wurden aus statischen Sammlungszeilen entfernt und die mobile Profil-/Search-Kopfzeile bleibt auch ohne Continue Watching sichtbar.
- Verdeckte IPTV- und Sammlungsvorschau-Wiedergabe wurde auf Touch-Geräten deaktiviert und die Audio-/Video-Anzeige der TV-Vorschau bis zum ersten gerenderten Frame verzögert.
- Mitgeliefertes Sammlungs-Artwork und konvertierte H.264-Intro-Videos wurden für eine zuverlässige Cache-Invalidierung auf eine unveränderliche, StreamNet-eigene Asset-Revision verschoben.
- Episoden-/Fortsetzungs- und Restzeit-Badges von Continue Watching wurden auf Deutsch lokalisiert.

### Player und Untertitel

- Untertitel-Zeitprüfungen werden bei exakten Übereinstimmungen des Release-Namens übersprungen; Erkennung und Fallback für eingebettete PGS-, VobSub- und DVB-Bitmap-Untertitel zur Verwendung mit AI-Übersetzung wurden verbessert.
- Der Angesehen-Status von Filmen und Episoden wird lokal und im Konto-Snapshot gespeichert, bevor optionales Scrobbling bei externen Anbietern erfolgt.

### Lokalisierung

- Neue Beschriftungen für IPTV-Sortierung/Sonderkategorien wurden zu den String-Ressourcen hinzugefügt und die neuen Settings-Texte erhielten deutsche Übersetzungen.
- Deutsche Beschriftungen für die Restzeit und Episodenfortsetzung in Continue Watching wurden hinzugefügt.

### Gerätestart, Wiedergabe und Launcher-Integration

- Die automatische Wiedergabe der nächsten Episode wurde verhindert, wenn diese noch nicht ausgestrahlt wurde oder ihre TMDB-Metadaten zum Ausstrahlungsdatum nicht verfügbar sind; die manuelle Episodennavigation bleibt verfügbar.
- Der Abgleich von Originaltiteln wurde zu Telegram-Suchen nach Filmen und Serien hinzugefügt, damit fremdsprachige Dateinamen und Beschriftungen neben englischen und lokalisierten Titeln zuverlässig aufgelöst werden.
- Kompakte Querformat-Layouts für kleine Touch-Smartphones wurden hinzugefügt: Die untere Navigation und der Live TV-Mini-Player verwenden nun feste responsive Abmessungen, während Hochformat-, Tablet- und TV-Layouts unverändert bleiben.
- Untertitel von Continue Watching auf Google TV wurden an die In-App-Karte angeglichen, einschließlich der lokalisierten S1E1-Startbeschriftung; Launcher-Artwork, Fortschritt, Reihenfolge und Deep Links bleiben profilbezogen.
- Media3/ExoPlayer bleibt auf `1.9.0` festgesetzt; Aktualisierungen erfordern einen neuen APK-Build, da der mitgelieferte Dolby Vision-Matroska-Extractor bei jeder Anhebung von Media3 überprüft werden muss.
