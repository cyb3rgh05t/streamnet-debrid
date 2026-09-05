# Changelog

Alle erwähnenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

## [Unveröffentlicht]

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
