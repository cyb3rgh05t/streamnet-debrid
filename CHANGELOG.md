# Changelog

Alle erwähnenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

## [Unreleased]

## [2.5.087] - 2026-10-30

- Android-Version: `2.5.087` / Code `488`.
- Android-Startseite: Release-Datum, Laufdauer, FSK und Budget im Hero als kompakte dunkle Badges mit dezentem Akzentrahmen; Metadaten umbrechen bei Platzmangel. Anbieterlogo, IMDb und Profil-Sichtbarkeitseinstellungen bleiben erhalten.
- Android-Detailscreens: Gleiche Metadaten-Badges auf TV, Smartphone und Tablet; auf schmalen Displays mit Zeilenumbruch statt horizontalem Scrollen. FSK und Film-Budget berücksichtigen weiterhin die Profil-Einstellungen.
- Android: Genre ebenfalls als Badge; Reihenfolge auf Home und in Details: Genre, Release-Datum, Laufdauer.
- Android-Home: Genre-IDs beim Nachladen und aus dem Detail-Cache übernehmen und bei Katalog-Aktualisierungen erhalten, damit das Genre-Badge auch bei unvollständigen Katalogeinträgen erscheint.
- Android: IMDb-Rating im Home-Hero und Detailkopf mit Badge nur um die Zahl; IMDb-Logo bleibt separat.
- Android-Home: Bereits geladene Hero-Metadaten bei Katalog- und Gesehen-Refresh erhalten; unvollständige CW-Zwischenstände und Platzhalterwerte lassen Badges nicht mehr kurz verschwinden.
- 60 gezielte Home-/CW-Regressionstests und sieben Metadaten-UI-Tests im Emulator erfolgreich; keine FPS-Messung auf einem echten Gerät.
- Backend und Web unverändert.

## [2.5.086] - 2026-10-30

- Android-Version: `2.5.086` / Code `487`.
- Android: „App schließen?“-Dialog verwendet auf Smartphone/Tablet touchfähige Material-Buttons mit 48-dp-Tippflächen; TV-Fokus und D-Pad-Bedienung bleiben erhalten.
- Android: Beim Zurückgehen aus dem Player nur noch auf die lokale Fortschritts-/Gesehen-Sicherung warten. History-, Tracking-, Cloud- und Launcher-Sync laufen geordnet außerhalb des Player-Lebenszyklus weiter; Profil-/Accountwechsel brechen alte Aufträge ab. Doppelte finale Speicherung und doppelte Cloud-Pushes vermieden; automatische Folgenwechsel behalten die vollständige Speicherbarriere.
- Fortsetzen berücksichtigt neuere lokale Zeitstempel statt einen älteren Cloud-Stand nach Zurückspulen zu bevorzugen. Verzögerte Nächste-Folge-Einträge überschreiben keine neueren lokalen Wiedergabestände.
- Debug-Build, 52 gezielte Playback-/History-/Fortsetzen-Tests und drei Touch-/D-Pad-Tests im Emulator erfolgreich. Player-Rückkehrzeit noch nicht auf einem echten Gerät gemessen.
- Backend und Web unverändert.

## [2.5.085] - 2026-10-30

- Android-Version: `2.5.085` / Code `486`.
- Android-Quellensuche: Größenparser verwechselt Bitraten wie „9.4 Mbps“ nicht mehr mit „9.4 MB“. Tatsächliche Paketgrößen wie „7.79 GB“ werden für Quellen-Badge, Sortierung und Player übernommen; Player-Fallback ebenfalls gegen Bitraten abgesichert.
- Sechs gezielte Metadaten-/Größenparser-Tests erfolgreich. Backend und Web unverändert.

## [Backend 1.0.037] - 2026-10-30

- Erneute Veröffentlichung mit aktualisierter Paket-, Sidebar- und Asset-Version; keine funktionalen Änderungen gegenüber Backend 1.0.036.
- Keine neue Datenbankmigration. Migration 013 bleibt erforderlich; Android und Web unverändert.

## [Backend 1.0.036] - 2026-10-30

- Geräteaktivitätsdiagramm startet wieder mit 7 Tagen; 30 Tage bleiben auswählbar.
- Technischen Erklärungstext unter dem Diagrammtitel entfernt. Tageszählung und UTC-Zeitzone unverändert.
- Keine neue Migration; Migration 013 aus Backend 1.0.035 bleibt erforderlich. Android und Web unverändert.

## [Backend 1.0.035] - 2026-10-30

- Backend-Admin: Balkendiagramm „Aktive Geräte pro Tag“ mit 7-/30-Tage-Auswahl, UTC-Tagesgrenzen und ausdrücklich markierter Demo-Vorschau. Migration 013 speichert pro Account, Installation und Tag einen Eintrag atomar mit dem Heartbeat; keine rückwirkend erfundenen Statistiken. Fehler- und Leerzustände sowie mobil horizontal scrollbar.
- Standardansicht des Diagramms: 30 Tage. Der heutige Tag ist noch unvollständig; die Werte zeigen täglich aktive Installationen, nicht gleichzeitig online befindliche Geräte.
- Mobile Navigation bis 720 Pixel über einen goldenen Hamburger-Button ein-/ausklappbar. Menüauswahl, Escape und Wechsel des Breakpoints schließen das Menü; Desktop-Sidebar bleibt sichtbar.
- Dashboard-Ergebnisse als abgesetzte Badges mit einheitlichen Abständen; erfolgreiche API-/Datenbankverbindung grün mit Statuspunkt. Sidebar-Versionsanzeige und Asset-Cache-Version aktualisiert.
- Deployment: Migration `013_device_activity_daily.sql` mit dem neuen Image vor dem Start des aktualisierten Backends anwenden. Android und Web unverändert.

## [2.5.084] - 2026-10-29

- Android-Version: `2.5.084` / Code `485`.
- Android Cloud-Anmeldung: QR-Hinweis auf „Scanne den QR-Code“ gekürzt. Pairing-Status wird in der aktuellen UI-Sprache aufgelöst statt vorab mit dem Anwendungskontext. QR-Größe berücksichtigt den verfügbaren Platz für Hinweis, Code und Wartestatus; bei sehr kleinen Ansichten bleibt das Panel scrollbar.
- Android-Kompilierung und vier gezielte Pairing-/Lokalisierungstests erfolgreich; noch nicht auf einem echten TV geprüft. Backend und Web unverändert.

## [2.5.083] - 2026-10-29

- Android-Version: `2.5.083` / Code `484`.
- Android-TV-/Google-TV-Launcher: Weiteransehen-Veröffentlichung synchronisiert, vorhandene Einträge anhand stabiler IDs aktualisiert und doppelte/veraltete Einträge beim Refresh bereinigt, statt bei jeder Aktualisierung alles neu anzulegen.
- Reihenfolge der systemweiten Watch-Next-Einträge durch einen gemeinsamen Zeitstempel mit absteigender Priorität korrigiert; doppelte Quelldaten werden vor dem Veröffentlichungslimit entfernt.
- Landschaftsbilder mit relativen TMDB-Pfaden korrekt aufgelöst. Fortsetzen-/Folgentexte verwenden dieselbe Aufbereitung wie die App; Fortschrittsdaten auch für die eigene Launcher-Reihe, nächste Folgen ohne falsche Abspielposition.
- Android-Kompilierung und 13 gezielte Launcher-/Weiteransehen-Tests erfolgreich. Darstellung und endgültige Sortierung bleiben launcherabhängig; noch nicht auf einer echten TV-Box geprüft.

## [Backend 1.0.034] - 2026-10-29

- Geräteübersicht zeigt nur Geräte mit Live-Heartbeat; alte App-Start-Einträge und Login-Sessions bleiben gespeichert, sind aber ausgeblendet. Geräteart, Plattform, Profil, Version und Event als vertikal ausgerichtete Badges; Installations-IDs und Aktionsspalte entfernt.
- Account-Aktionen auf „Alle Sitzungen abmelden“ und „Konto löschen“ reduziert. Bereinigungen unter „Erweitert“ mit Hinweis auf mögliche Login-Widerrufe; Aufklapp- und Gerätehistorie-Buttons im goldenen Theme.
- Dashboard: „Gesehen-Markierungen“ berücksichtigt Filme und einzelne Folgen sowohl aus Cloud-Snapshots als auch aus der separaten Watch-State-Tabelle, ohne Doppelzählung pro Account und Profil. Technische Sync-Daten zählen nicht mehr mit; funktioniert auch ohne Trakt.
- „Geräte online“ aktiviert den Account-Filter jetzt immer, statt ihn beim erneuten Aufruf auszuschalten. Veraltete Account-Antworten dürfen neuere Such-, Seiten- oder Filterergebnisse nicht mehr überschreiben.
- Keine neue Datenbankmigration erforderlich; bestehende Migration 012 für Live-Präsenz bleibt Voraussetzung. Android- und Web-Versionen unverändert.

## [2.5.082] - 2026-10-29

- Android-Version: `2.5.082` / Code `483`.
- Authentifizierter Live-Gerätestatus: Heartbeat alle 30 Sekunden, solange die App im Vordergrund und der Account angemeldet ist. Verwendet die bestehende Installations-ID unabhängig von Diagnose-Analytics; Hintergrundwechsel und Abmelden beenden laufende Meldungen.
- Android TV Live-TV-Vollbild: D-Pad Hoch/Runter schaltet bereits beim ersten Druck zum vorherigen/nächsten Sender, auch bei sichtbarer Player-Leiste. OK/Enter öffnet das ausgeblendete Overlay und bedient darin das fokussierte Element. Senderliste, EPG und Einstellungen behalten ihre Navigation.
- Voraussetzung für den Live-Gerätestatus: Backend 1.0.033 mit Datenbankmigration 012. Android-Kompilierung und gezielte Heartbeat-/TV-Steuerungstests erfolgreich; D-Pad-Verhalten noch nicht auf einem echten TV geprüft.

## [Backend 1.0.033] - 2026-10-29

- Authentifizierter Heartbeat-Endpunkt und neue Migration `012_device_presence.sql`: eine aktualisierte Präsenzzeile je Account und Installation statt fortlaufender Analytics-Events. Account-Identität stammt ausschließlich aus dem geprüften Access-Token, Zeitstempel vom Server.
- Dashboard, Account-Filter und Gerätedetails erkennen Online-Präsenz anhand der letzten 90 Sekunden. Sichtbare Admin-Seiten aktualisieren den Status alle 15 Sekunden, ohne offene Account-Editoren zurückzusetzen. Alte App-Start-Events und gültige Logins sind kein Online-Nachweis.
- Gerätehistorie zeigt zunächst den neuesten Eintrag je Plattform, Gerätetyp und Eintragsart. Ältere Einträge lassen sich über einen abgesetzten Button einblenden. Geräteübersicht oberhalb der Remote-Steuerung; verständliche Event-Namen und Audit-Profilnamen statt reiner IDs.
- Remote Config in Playlists, Add-ons und Kataloge aufgeteilt, mit getrennten Karten für Aktion, Einstellungen, Bestätigung und Geltungsbereich. Einzelne Accounts verwenden denselben Aufbau für ihre vorhandenen Playlist-/Add-on-Aktionen; der Snapshot-Editor steht separat darunter.
- Geräteentfernung und Offline-Bereinigung berücksichtigen Präsenzdaten; Account-Löschung entfernt sie per Cascade. Lokale Fake-Daten-Vorschau um Account-Details und globale Bestandsdaten erweitert.
- Deployment: Migration 012 vor den aktualisierten Clients anwenden. Ohne aktualisierte Android-/Web-Clients wird kein Live-Status gemeldet; nach Verbindungsabbruch dauert die Offline-Anzeige etwa 90–105 Sekunden.

## [Web 1.0.071] - 2026-10-29

- Authentifizierter Geräte-Heartbeat alle 30 Sekunden bei sichtbarem, angemeldetem Webplayer. Meldet die tatsächliche Web-Version und das gewählte Profil mit persistenter Browser-Installations-ID über den bestehenden Backend-Proxy.
- Versteckte Tabs, Abmelden und Unmount stoppen laufende Meldungen; Rückkehr in den sichtbaren Tab löst sofort einen neuen Heartbeat aus. Account-Wechsel, Abbruch und schnelle Sichtbarkeitswechsel sind abgesichert.
- Voraussetzung: Backend 1.0.033 mit Migration 012; Status ist unabhängig von Diagnose-Analytics und wird nach 90 Sekunden ohne Meldung offline.

## [Backend 1.0.032] - 2026-10-29

- Dashboard: Versionsübersicht an erster Stelle. Backend- und Web-Karten öffnen den passenden Changelog-Eintrag, die Android-Karte die Release-Notizen der angezeigten Version.
- Aktualisierungszeit und Refresh-Button in eine eigene Kopfzeile innerhalb der äußeren Dashboard-Karte verschoben, mit Titel und Beschreibung links sowie responsiven Bedienelementen rechts.
- Separaten Button zur Live-Versionsprüfung, Repository-Link und doppelte Versionszusammenfassung entfernt. Versionsabfragen bleiben beim Öffnen und über „Aktualisieren“ aktiv; Quellen und Fehler stehen direkt in den Karten.
- Android-Geräteversionsübersicht einschließlich ihrer Datenbankabfrage entfernt. Die veröffentlichte Android-Version bleibt erhalten.

## [Backend 1.0.031] - 2026-10-29

- Versionskarten ohne feste Web-/Android-Referenzwerte: Live-Abfrage des Webplayers unter web.streamnet.live und der zuletzt veröffentlichten Android-APK auf GitHub. Quellen werden automatisch beim Laden und manuell geprüft; Fehler werden pro Komponente angezeigt, ohne auf erfundene Versionsstände zurückzufallen.
- Android-Geräteversionen separat nach Version, Build und Verteilung mit Installationsanzahl und letzter Meldung innerhalb von 30 Tagen. Gemeldete Versionen sind kein Nachweis für aktuelle Online-Präsenz.
- Cloud-Schema-Karte entfernt; Backend, Web und Android nutzen drei Spalten. Speicherwerte mit passenden Einheiten und deutschem Dezimalkomma; Labels in den drei Dashboard-Infoboxen in Akzentfarbe.
- Verständliche deutsche Operationsnamen in Dashboard, Audit-Protokoll und Account-Details; globale Aktionen bleiben als solche gekennzeichnet.

## [Web 1.0.070] - 2026-10-29

- Neuer öffentlicher, nicht gecachter Endpunkt GET /api/version meldet die tatsächlich deployte Web-Paketversion und den optionalen öffentlichen Build-Zeitstempel. Ermöglicht die Live-Versionsanzeige im Backend-Admin-Dashboard.

## [Backend 1.0.030] - 2026-10-29

- Admin-Dashboard: Zusätzliche Systeminformationen mit Backend-Erreichbarkeit, Laufzeit, Datenbank-Abfragezeit, Node.js und Plattform; Cloud-Zähler für Profile, Wiedergabeverlauf, Wiedergabestände, neue Accounts und zuletzt aktualisierte Snapshots.
- Speicherübersicht mit Datenbankgröße, Prozess-RAM, JS-Heap, Host-RAM und durchschnittlicher Prozess-CPU seit Start. Neue Listen zeigen die letzten Registrierungen und Admin-Änderungen.
- Versionsübersicht liest die laufende Backend-Version und die angewendete Datenbankmigration aus. Web-/Android-Versionen bleiben ausdrücklich gekennzeichnete Referenzstände; Android-Referenz auf 2.5.081 / Build 482 aktualisiert.
- Authentifizierte Update-Prüfung auf Knopfdruck gegen öffentliche Versionsdateien auf GitHub main, mit Zeitlimit und Fehleranzeige pro Komponente. Die lokale Fake-Daten-Vorschau simuliert diese Prüfung.
- Farbverläufe und dekorative Eck-Bubbles außerhalb des Dashboards entfernt. Einheitliche Abstände zwischen M3U-/EPG- und Xtream-Feldern in Remote Config.

## [2.5.081] - 2026-10-29

- Android-Version: `2.5.081` / Code `482`.

- Android TV Cloud-Anmeldeseite (`CloudConnectScreen`): Auf einem als TV erkannten PC-Monitor (27 Zoll, wenige dp Höhe) wirkte die Seite gequetscht. Die Überschrift „Mit StreamNet Cloud verbinden“ hatte keine feste Zeilenhöhe, die zwei Zeilen klebten aneinander (jetzt 34 sp mit 42 sp Zeilenhöhe; Handy 26/32 sp). Der Hinweis unter dem QR-Code („Scanne den QR-Code oder öffne …“) war mit 14 sp und 70 % Weiß auf dem Hintergrundbild schlecht lesbar (jetzt 16 sp, mittelfett, 92 % Weiß). Die QR-Größe richtet sich nach der Bildschirmhöhe (34 %, zwischen 150 und 220 dp), damit QR-Code, Code und Hinweis auch auf kleinen Anzeigen vollständig sichtbar bleiben. Kompiliert und Tests grün; nicht visuell geprüft, weil der Emulator einen Touchscreen hat und deshalb nie das TV-Layout zeigt.

## [2.5.080] - 2026-10-29

- Android-Version: `2.5.080` / Code `481`.

- Android (Handy/Tablet): Der E-Mail-Dialog der Cloud-Anmeldung ist auf schmalen Bildschirmen aufgeräumt. Die drei Buttons nebeneinander wurden auf dem Handy abgeschnitten („Abb“, „Anmel“, „Erst“). Unter 460 dp Breite steht „Anmelden“ jetzt über die volle Breite, darunter „Abbrechen“ und „Erstellen“ nebeneinander; auf Tablet und TV bleibt die Zeile wie bisher. Der Dialog ist scrollbar und weicht der Bildschirmtastatur aus (`imePadding`).
- Android (Handy/Tablet): Nach der E-Mail-Eingabe springt der Fokus jetzt auf das Passwortfeld. Die Tastatur-Aktion der E-Mail war bisher Standard und tat nichts Sinnvolles; jetzt ist sie „Weiter“ (E-Mail-Tastatur) und setzt den Fokus auf Passwort, die Passwort-Aktion ist „Fertig“ und meldet an. Fokussiert man ein Feld per Antippen, folgt die Hervorhebung dem Feld (`onFocusChanged`). Im Emulator mit Hardware-Tastatur geprüft (Enter wechselt zum Passwort); die Bildschirmtastatur ließ sich dort nicht einblenden, nicht auf einem echten Handy getestet.

- Android IPTV (Cloud-Sync, Favoriten, versteckte Kategorien): Schlüssel der alten Standardliste `list_1` werden jetzt auf den StreamNet-TV-Eintrag (`streamnet_tv`) umgeschrieben. Hintergrund: Eine früher manuell eingetragene Liste auf dem StreamNet-Server wird in `streamnet_tv` zusammengeführt und ihre Id verschwindet aus den Playlists. Gespeicherte Favoriten-Kanäle (`list_1:xtream:<id>`), versteckte Kategorien und die Kategorie-Reihenfolge (`list_1|<Gruppe>`) zeigten danach ins Leere: Favoriten fehlten (im Test-Snapshot 2 von 14), und Kategorien, die der Nutzer versteckt hatte, erschienen wieder (z. B. „RTL+“). Neu: `legacyStreamNetPlaylistIds` behandelt `list_1` als veraltet, solange StreamNet TV eingerichtet ist und keine eigene Liste mehr diese Id nutzt (eine echte zweite Liste namens `list_1` bleibt unberührt). Die Umschreibung läuft beim Lesen, beim Export in den Cloud-Snapshot und beim Import (`migrateStreamNetChannelIds`, `migrateStreamNetGroupKeys`); Duplikate werden entfernt, die Cloud wird beim nächsten Abgleich bereinigt. Wirkung am Test-Snapshot (nachgerechnet): Favoriten 26 → 14, versteckte Kategorien 40 → 28. Achtung: Dadurch gelten zuvor wirkungslose Einstellungen wieder, etwa das Verstecken von „RTL+“. Tests in `StreamNetLegacyKeysTest`.

- Android Live TV (Netflix-Layout): Nach dem Wechsel in die Einstellungen und zurück zu Live TV blieben Kategorie und Sender nicht erhalten: Das Infofeld zeigte den ersten Sender der Kategorie, die Reihe stand am Anfang, nur die Vorschau spielte den richtigen Sender weiter (im Emulator nachgestellt). Ursache: Der Kategoriebaum ist bei jedem Besuch zunächst leer. Zwei Prüfungen in `LiveTvScreen` hielten das für „Kategorie bzw. Sender unbekannt“ und setzten die Auswahl zurück: (1) die Gültigkeitsprüfung der Kategorie (`LiveTvStartup.validatedCategoryId` lässt die Auswahl jetzt unberührt, solange der Baum nicht geladen ist) und (2) die Korrektur eines nicht gelisteten Fokus-Senders (läuft jetzt nur noch gegen das Fenster der gewählten Kategorie, wenn es geladen und nicht leer ist). Tests in `LiveTvStartupTest`. Nach dem Fix im Emulator geprüft: Kategorie „Magenta TV“ und Sender „RTL UHD“ bleiben nach dem Einstellungs-Besuch erhalten; nicht auf der Shield getestet.

## [Backend 1.0.029] - 2026-10-28

- Admin-Panel: Neue Dashboard-Startseite mit den bisherigen Account-Statuskarten und Versionskarten für Backend, Cloud-Schema, Web und Android. Accounts zeigt Suche und Tabelle; die Online-Karte öffnet die gefilterte Account-Liste.
- Einheitliches dunkles Admin-Theme mit schlichten äußeren Flächen, goldenen Verläufen auf inneren Karten, Akzent-Versionsnummern und überarbeiteter Sidebar mit Abmelden-Icon und Versions-Badge.
- Dashboard, Accounts und Remote Config verwenden einheitliche Refresh-Icons mit Ladeanimation und „Aktualisiere...“-Beschriftung. Größere Dashboard-Statuskarten ohne erneute Einblendanimation; kompakterer Audit-Kopfbereich.
- Lokale, datenbankfreie Admin-Vorschau mit Fake-Daten über `npm run preview:admin`; bindet ausschließlich an `127.0.0.1:4173`. Demo-Aktionen außerhalb der Übersicht, Suche und Audit-Liste sind deaktiviert.

## [Backend 1.0.028] - 2026-10-28

- Backend-Admin-Dashboard: Layout Theme Update.

## [2.5.079] - 2026-10-28

- Android-Version: `2.5.079` / Code `480`.

- Android Performance (Einstellungen, Live TV, Cloud-Sync): Drei sehr große Methoden wurden von ART gar nicht kompiliert und liefen dauerhaft interpretiert (Logcat: „Method exceeds compiler instruction limit“, Grenze 16.383 Code-Units): `SettingsScreen` (17.688), `LiveTvScreen` (24.179) und `CloudSyncRepository.applyCloudPayload` (30.864). Das erklärt das Stottern bei D-Pad und Scrollen in den Einstellungen und in Live TV auch in Release-Builds. `applyCloudPayload` ist in Teilfunktionen pro Datenbereich zerlegt (gleiche Reihenfolge und Logik). `SettingsScreen` und `LiveTvScreen` lagern große Layout- und Dialogblöcke über den neuen Helfer `SplitComposable` bzw. ein lokales Composable-Lambda in eigene Methoden aus. Gemessen im R8-Staging-Build per `dexdump`: `LiveTvScreen` 14.940, `SettingsScreen` und `applyCloudPayload` unter 8.000. Im Emulator-Logcat des Staging-Builds kommt die Meldung nicht mehr vor (vorher 41-mal), und der JIT kompiliert `SettingsScreen` und den Live-TV-Block. Nicht auf der Shield gemessen. Prüfen nach größeren Umbauten: Logcat nach „exceeds compiler instruction limit“ filtern.

- Android TV Einstellungen: Gedrückt gehaltene D-Pad-Tasten werden jetzt gedrosselt (Wiederholungen frühestens nach 80 ms horizontal bzw. 90 ms vertikal, wie schon in Home und Details). Vorher löste jede Tastenwiederholung eine komplette Neuberechnung des sehr großen Einstellungs-Bildschirms samt Scroll-Animation aus, was beim Halten von Hoch/Runter zu Stottern führen konnte. Der erste Tastendruck bleibt unverzögert.
- Android Baseline-Profil: Einstellungen (`ui/screens/settings`), `SettingsRows` und `ui/focus` sind jetzt per Wildcard-Regeln im Profil enthalten (vorher 0 Treffer, das Profil stammt von Mai). Wirkt nur in Release-/Staging-Builds; Debug-Builds nutzen kein Baseline-Profil. Nicht auf der Shield gemessen.

## [Backend 1.0.027] - 2026-10-27

- Backend-Admin-Dashboard: Die Anmeldung nutzt jetzt einen **Benutzernamen statt einer E-Mail-Adresse** (3–64 Zeichen: `a-z`, `0-9`, `.`, `_`, `-`; Anfang und Ende Buchstabe oder Ziffer; Groß-/Kleinschreibung egal). Eine E-Mail-Adresse wird beim Admin-Login nicht mehr akzeptiert. `POST /admin-api/login` erwartet `username` statt `email` und liefert `admin.username`. Das Skript `npm run create:admin` liest `STREAMNET_ADMIN_USERNAME` statt `STREAMNET_ADMIN_EMAIL` (Passwort jetzt mindestens 8 statt 14 Zeichen, ersetzen mit `STREAMNET_ADMIN_REPLACE_PASSWORD=1`). Keine Migration nötig: die Spalten `admin_accounts.email` und `email_normalized` speichern den Benutzernamen. Bereits mit E-Mail angelegte Admins können sich nicht mehr anmelden; neuen Admin mit Benutzernamen anlegen und den alten deaktivieren (Befehl im README). Neue Prüf-Funktion `src/admin-username.js`, Tests in `admin-login.test.js`. Server muss neu deployt werden.

- Backend-Admin-Dashboard: Die Login-Box ist zentriert (Logo, „CONTROL ROOM“, Titel und Hinweistext); die Felder bleiben linksbündig.

## [Backend 1.0.026] - 2026-10-27

- Cloud-Anmeldeseite (`backend-cloud/public/index.html`): „Passwort vergessen?“ ist kein großer Button mehr, sondern ein kleiner klickbarer Text-Link rechts direkt unter dem Passwort-Feld (Muted-Farbe, Akzent und Unterstreichung bei Hover/Fokus). Der Button unter „Konto erstellen“ entfällt; `id="forgot"` und die Reset-Logik bleiben unverändert. Der Bereich „Konto löschen“ ist neu gestaltet: statt eines kleinen Buttons eine Karte mit rotem Papierkorb-Symbol, Titel „Konto löschen“, Hinweis „Konto und Cloud-Daten dauerhaft entfernen.“ (neuer Text `auth.deleteHint`, Deutsch und Englisch) und Pfeil; die ganze Karte verlinkt weiter auf `/delete-account`.

- Backend-Admin-Panel: Der Host-Override der StreamNet-TV-Playlist (`streamNetHostOverride`) lässt sich jetzt wieder entfernen, **global** (Remote Config → „StreamNet TV: Host-Override entfernen (zurück auf App-Server)“, mit Vorschau und „ALLE ACCOUNTS“-Bestätigung) und **pro Account** (Account-Detail → „StreamNet TV: Host-Override entfernen“, wahlweise für „Alle Profile“ oder ein Profil). Operation `clear_streamnet_host_override`: Es wird nur das Feld entfernt; Zugangsdaten, Aktivierung, Importoptionen und die gespeicherten M3U-/EPG-Adressen bleiben. Ohne Override setzt die App StreamNet TV beim nächsten Laden auf ihren eingebauten Server zurück (das Backend kennt diesen Host nicht und schreibt die Adressen daher nicht um). Fehlerfälle pro Account: `streamnet_tv_not_configured` und `streamnet_tv_no_override`; global werden Accounts ohne Override als unverändert gezählt. Tests in `admin-snapshots.test.js`, Doku in `backend-cloud/README.md`. Server muss neu deployt werden.

## [2.5.078] - 2026-10-26

- Android-Version: `2.5.078` / Code `479`.

- Android TV Live-TV Netflix-Layout: Direkt nach dem App-Start zeigte der Bildschirm kurz „Keine Sender in dieser Kategorie“ statt eines Ladezustands. Die Kategorie-Chips samt Zahlen kommen aus dem Snapshot, die Senderliste der gewählten Kategorie wird aber erst danach asynchron aufgebaut; in dieser Lücke galt das Laden schon als beendet. Hat die Kategorie Sender (Zähler > 0) und fehlt nur noch das Fenster, zeigt die Senderreihe jetzt die Skeleton-Karten, das Infofeld „Sender werden geladen…“ und die Vorschau einen Lade-Spinner. Nach 10 Sekunden ohne Sender fällt es auf die normale Leer-Meldung zurück, damit ein dauerhaft leeres Fenster nicht ewig lädt.

- Android IPTV: Der User-Agent für IPTV-Playlists, EPG und Live-Wiedergabe enthält jetzt App-Name und Version: `VLC/3.0.20 LibVLC/3.0.20 StreamNet/<Version>` (z. B. `…StreamNet/2.5.078`; bei Debug-Builds mit Suffix `-debug`). Die VLC-Angaben bleiben vorn, damit Panels und Anbieter, die darauf prüfen, weiter funktionieren; in der Verbindungsübersicht des Xtream-Panels ist so erkennbar, welche App und Version verbunden ist. Ein in den Einstellungen gesetzter eigener User-Agent hat weiter Vorrang. Film-/Serien-Player und Addon-Anfragen behalten ihre bisherigen Browser-User-Agents.
- Android Wiedergabe: Der User-Agent wurde bei Live-TV doppelt gesendet („VLC/3.0.20 LibVLC/3.0.20, VLC/3.0.20 LibVLC/3.0.20“, sichtbar z. B. in der Verbindungsübersicht des Xtream-Panels). `OkHttpDataSource` hängt `setUserAgent()` zusätzlich an die Standard-Request-Header an; der User-Agent stand in beiden. Er steht jetzt nur noch in den Request-Properties (Live-TV und Film-/Serien-Player), und Header werden mit `mergeRequestHeaders` ohne Beachtung der Groß-/Kleinschreibung zusammengeführt. Dadurch ersetzt ein vom Kanal (IPTV-Header) oder vom Addon (`proxyHeaders`) gelieferter User-Agent den Standard, statt zusätzlich mitgesendet zu werden. Auch das Frame-Rate-Probing nutzt jetzt denselben User-Agent wie die Wiedergabe.

- Android StreamNet TV: Ein per Remote Config/Admin-Panel gesetzter Host (`streamNetHostOverride`) wird beim erneuten Eintragen der Zugangsdaten nicht mehr auf den im APK eingebauten Server zurückgesetzt. `activateStreamNetTvPlaylist` baute den Eintrag bisher immer mit dem eingebauten Host und ohne Override neu auf und schrieb das auch in die Cloud. Jetzt gilt: gesetzter Override-Host vor eingebautem Host, und der Override bleibt am Eintrag erhalten (`streamNetLoginHost`, `configuredStreamNetTvPlaylist(hostOverride)`). Bekannt und beabsichtigt (Test `configuredPresetMovesToChangedHostWithoutLosingCredentials`): Ein StreamNet-TV-Eintrag **ohne** Override folgt bei einem App-Update weiter dem im APK eingebauten Host; nur der Override schützt einen abweichenden Host.

- Android TV Live-TV Netflix-Layout: Die Senderkarten haben jetzt dieselbe Breite wie die Karten der Home-Reihen (210 dp statt 220 dp, Abstand 14 dp statt 12 dp). Das Layout hebt die globale TV-UI-Größe auf; die Home-Werte werden deshalb mit diesem Faktor skaliert, sodass die Karten auf dem Bildschirm genauso breit sind wie in Home. Geplante Chevrons am Reihenrand wurden verworfen.
- Android Navigation (obere Leiste, untere Leiste, Seitenleiste): „Start“/„Home“ heißt jetzt „Discover“ und „TV“ heißt „Live TV“ (neue Strings `nav_discover`, `nav_live_tv` in Deutsch und Englisch; `topbar_tv` entfällt). Andere Stellen, die „Home“ als Wort nutzen, bleiben unverändert.

## [2.5.077] - 2026-10-25

- Android-Version: `2.5.077` / Code `478`.

- Android Home: „Kommende Filme“ und „Kommende Serien“ (`coming_soon`, `upcoming_series`) erscheinen auch im IPTV-only-Modus wieder. Der Modus ist nach einer Neuinstallation standardmäßig aktiv (ohne VOD-Addon gilt er als an) und filtert jede Reihe auf Titel aus der Xtream-VOD-Bibliothek des Anbieters; unveröffentlichte Titel sind dort nie vorhanden, daher wurde die Reihe leer und entfernt. Beide Reihen sind jetzt vom Verfügbarkeitsfilter ausgenommen (`IPTV_ONLY_INFORMATIONAL_CATEGORY_IDS`), auch bevor die Verfügbarkeit geladen ist.

- Android Home: Ohne „Weiter ansehen“-Daten bleibt keine Platzhalter-Reihe mehr stehen. Ursache: `preserveLiveHomeRows` übernahm die Skeleton-Reihe des Ladezustands auch nach dem Laden der echten Reihen, und der Abruf entfernte sie bei leerem Ergebnis nie (nur `refreshContinueWatchingOnly` tat das); die Reihe schimmerte dauerhaft weiter. Jetzt wird eine reine Platzhalter-Reihe nur noch behalten, solange Trakt verbunden ist und noch Daten kommen können (`keepContinueWatchingPlaceholders`), und nach einem komplett leeren Abruf entfernt (`dropPlaceholderContinueWatching`). Kommen später doch Daten, wird die Reihe oben eingefügt.
- Android Einstellungen (Handy/Tablet): Das Ablaufdatum der Playlist („Ablauf: Unbegrenzt“ bzw. Datum) steht nicht mehr lose unter der Trennlinie, sondern als Akzent-Zeile direkt unter dem Untertitel der Playlist-Zeile, wie schon im TV-Layout (`MobileSettingsRow.footnote`).

- Android (TV, Handy, Tablet): Der StreamNet-TV-Dialog erscheint nicht mehr, wenn bereits eine andere Quelle eingerichtet ist (eigene aktive Playlist, M3U oder Stalker-Portal); er kommt nur noch, solange StreamNet TV keine Zugangsdaten hat und keine andere Quelle existiert (`shouldPromptStreamNetTv`).
- Android (TV, Handy, Tablet): Untere Navigationsleiste (Handy/Tablet): In den Einstellungen war zusätzlich „TV“ aktiv markiert. Die Leiste verglich per `contains` mit der kompletten Routenvorlage, in der das neue Argument `openStreamNetTv` „tv“ enthält. Der Vergleich nutzt jetzt nur den Routen-Basisnamen (`isBottomBarItemSelected`).
- Android (TV, Handy, Tablet): Der StreamNet-TV-Dialog heißt jetzt nur noch „StreamNet TV“ (statt „StreamNet TV personalisieren“) und erscheint immer automatisch, sobald der Bereich „TV“ der Einstellungen geöffnet wird und der StreamNet-TV-Eintrag noch keine Zugangsdaten hat (nicht nur bei der Ersteinrichtung). Nach „Abbrechen“ kommt er innerhalb desselben Besuchs nicht sofort zurück, beim erneuten Öffnen des Bereichs aber wieder, solange keine Zugangsdaten gespeichert sind.
- Android (TV, Handy, Tablet): Der StreamNet-TV-Dialog („StreamNet TV personalisieren“) ist neu gestaltet (`StreamNetTvLoginModal`): StreamNet-Logo, Titel und Hinweis im Kopf, abgerundete Felder mit Person-/Schloss-Symbol und Akzent-Fokus, „Aus Zwischenablage einfügen“ sowie einheitliche Buttons „Abbrechen“ und „Verbinden“ mit 3-dp-Akzentrahmen beim Fokus; Tastatursteuerung wie im Cloud-E-Mail-Dialog. Beim ersten Start ohne Cloud (TV-Einrichtung nach der Profilwahl) öffnet er sich in den TV-Einstellungen automatisch, sobald die Playlists geladen sind (Routenargument `openStreamNetTv`). Der E-Mail-Dialog der Cloud-Anmeldung nutzt jetzt denselben Hintergrund wie die übrigen Eingabedialoge (Akzent-Verlauf auf `surfaceRaised`).
- Android (TV, Handy, Tablet): Wurde die Cloud übersprungen und für das gewählte Profil ist noch keine IPTV-Quelle eingerichtet (weder M3U/Stalker noch aktive Playlist; der leere StreamNet-TV-Systemeintrag zählt nicht), öffnet die erste Profilauswahl statt der Startseite einmalig die TV-Einstellungen (Sektion „TV“/`iptv`), damit die StreamNet-TV-Daten eingegeben werden können und sich Home aufbauen kann. Der Hinweis wird pro Profil nur einmal angezeigt (`tvSetupPromptedKey`, lokal) und entfällt bei verbundener Cloud (die Cloud stellt die Quellen wieder her). „Zurück“ und der Home-Button führen aus diesen Einstellungen zur Startseite, auch wenn sie das erste Ziel im Navigationsstapel sind. Die Entscheidung liegt in `shouldPromptTvSetup`, die Quellenprüfung in `IptvConfig.hasConfiguredSource()`.

- Android (TV, Handy, Tablet): Der E-Mail-Dialog der Cloud-Anmeldung (Cloud-Seite und Einstellungen) ist neu gestaltet: Glas-Karte mit Akzentrand-Verlauf, StreamNet-Logo und Untertitel im Kopf, abgerundete Eingabefelder mit Symbolen und Akzent-Fokus, einheitliche Buttons mit Symbol (Abbrechen, Anmelden, Erstellen) mit 3-dp-Akzentrahmen beim Fokus sowie ein dezenter Datenschutz-Button. Der doppelte Rand ist behoben: Auf Touch-Geräten (auch im TV-Modus) zeichnete `ModalScrim` zusätzlich einen eigenen Rahmen mit anderem Eckenradius; der Dialog schaltet ihn jetzt über `showFrame = false` ab. Tastatursteuerung und Logik sind unverändert.
- Android (TV, Handy, Tablet): Die Cloud-Anmeldung hat jetzt eine eigene Seite vor der Profilauswahl (`CloudConnectScreen`, Route `cloud_connect`). Sie erscheint, solange keine Cloud verbunden ist und „Überspringen“ nicht gewählt wurde: „Überspringen“ merkt sich die Wahl dauerhaft auf dem Gerät (`CLOUD_CONNECT_DISMISSED_KEY`, nicht Cloud-synchronisiert), die Cloud lässt sich danach jederzeit in den Einstellungen verbinden; ein Hinweis auf der Seite erklärt das. Die Seite ist im Akzent-Theme gestaltet, zeigt das StreamNet-Logo und die rotierenden TMDB-Trend-Hintergründe wie die Profilauswahl; die Buttons sind größer mit Symbol, Akzentverlauf und deutlichem Fokusrahmen. Auf TV startet das Pairing automatisch und zeigt QR-Code und Code direkt auf der Seite (ohne Dialog), daneben „Mit E-Mail anmelden“ und „Überspringen“; bei abgelaufenem Code gibt es „Neuen Code anfordern“. Auf Handy und Tablet: E-Mail/Passwort und „Überspringen“. Nach erfolgreicher Anmeldung und Wiederherstellung der Cloud-Daten geht es zur Profilauswahl. Behoben: „Mit Code verbinden“ öffnete den E-Mail-Dialog bzw. der QR-Code fehlte. Ursache 1: Im Pairing-Dialog war der E-Mail-Button vorfokussiert und ein weiterer Enter-Druck löste ihn aus; der Dialog entfällt auf dieser Seite. Ursache 2: Der `SettingsViewModel` entscheidet über die echte Hardware (Handy/Tablet = direkter E-Mail-Login ohne Pairing-Session); war die Oberfläche manuell auf TV gestellt, öffnete `startCloudAuth()` sofort den E-Mail-Dialog und es gab keinen Code. Die Seite startet das Pairing jetzt mit `startCloudAuth(forcePairing = true)` passend zum gewählten UI-Modus. Fokus- und Hover-Rahmen der Buttons sind im Akzent (Primärbutton als getönte Glasfläche mit Akzentrand). Die Seite nutzt den bestehenden Cloud-Ablauf des `SettingsViewModel` und den E-Mail-Dialog der Einstellungen (jetzt `internal`). Der Button „StreamNet Cloud“ ist aus der Profilauswahl entfernt (die Cloud lässt sich weiter in den Einstellungen verbinden). Das Startziel wird in `resolveStartDestination` bestimmt und beim ersten Aufbau festgehalten, damit der Anmeldestatus das Startziel eines laufenden NavHosts nicht ändert.

## [Backend 1.0.025] - 2026-10-25

- Backend-Admin-Panel: Im Account-Detail gibt es die neue Aktion **StreamNet TV: Host ändern** (`change_streamnet_host`, `PATCH /admin-api/accounts/:accountId/snapshot`). Sie ändert den Server der StreamNet-TV-Playlist (`streamnet_tv`) nur für diesen einen Account, wahlweise für „Alle Profile“ oder ein einzelnes Profil, und nutzt dieselbe Host-Logik wie die globale Aktion `change_xtream_host`: Benutzername, Passwort, Aktivierung und Importoptionen bleiben erhalten, M3U-/EPG-Adressen werden neu aufgebaut, `streamNetHostOverride` wird gesetzt und Ablaufprüfungen zurückgesetzt. Die Änderung erzeugt wie jede Account-Mutation eine neue Cloud-Revision und einen Audit-Eintrag (inklusive neuem Host). Fehlerfälle: `streamnet_tv_not_configured` (Account/Profil hat keine StreamNet-TV-Playlist) und `streamnet_tv_host_unchanged` (Host bereits gesetzt). `applyAdminGlobalMutation` hat dafür den optionalen Parameter `onlyProfileId`. Tests in `admin-snapshots.test.js`, Doku in `backend-cloud/README.md`. Hinweis: Der Server muss neu deployt werden; die Android-App braucht dafür keine Änderung (sie unterstützt `streamNetHostOverride` bereits).

## [2.5.076] - 2026-10-25

- Android-Version: `2.5.076` / Code `477`.

- Android TV Live-TV Netflix-Layout: „Hoch“ aus der Senderreihe führt wieder zuverlässig zu den Kategorie-Chips, auch wenn der aktive Chip aus dem sichtbaren Bereich gescrollt wurde. Der Fokus-Anker hing nur am aktiven Chip, der dann nicht mehr existierte; die Chip-Reihe scrollt ihn jetzt zuerst zurück und fokussiert ihn dann. Verlässt der Fokus die Chip-Reihe, springt sie wieder zum aktiven Chip zurück.
- Android TV Live-TV Netflix-Layout: Nach einem Kategoriewechsel springt der Fokus beim Zurückgehen aus den Kategorien nicht mehr auf die erste Karte. Der Fokus-Anker blieb auf einem Sender der vorher geöffneten Kategorie stehen (die Korrektur im Screen pausiert nach einem Kategoriewechsel und lief danach nicht neu), die Senderreihe fand ihn nicht und fiel auf die erste Karte zurück. Der Fokus-Anker wird jetzt je Kategorie aufgelöst: laufender Sender, sofern er in der offenen Kategorie liegt (hat Vorrang vor der Scroll-Position), sonst der dort gemerkte, sonst der zuletzt fokussierte, sonst der erste.
- Android TV Live-TV Netflix-Layout: Kategorie und Sender gehen beim Betreten nicht mehr verloren (von Home, aus dem Vollbild, nach Einstellungen oder Layoutwechsel). Ursachen: (1) Eine vom klassischen Layout gespeicherte Kategorie (Land-/Genre-Unterpunkt wie „DE-news“) hat im Netflix-Layout keinen Chip, deshalb war keine Kategorie aktiv und der Fokus landete auf „Suche“; sie wird jetzt auf die passende Playlist-Gruppe des laufenden Senders oder „Alle Sender“ abgebildet. (2) Ein veraltetes Fokus-Signal zog den Fokus beim Betreten von der Senderreihe auf den Kategorie-Chip; Chips nehmen den Fokus jetzt nur noch für ein Signal, das nach ihrem Erscheinen kam. (3) Die aktive Kategorie wird beim Betreten ins Bild gescrollt (nur wenn sie nicht sichtbar ist, damit die Reihe beim Auswählen nicht springt). (4) Das Netflix-Layout stellt den Fokus immer auf den Sender, nicht auf die Kategorien. (5) Nach dem Vollbild geht der Fokus auf den laufenden Sender, wenn er in der offenen Kategorie liegt, sonst auf den zuletzt dort fokussierten.
- Android TV Live-TV Netflix-Layout: Fallback-Bild (Länderflagge bzw. Kategorie-Grafik) richtet sich nach der gewählten Kategorie statt nach dem geratenen Land des einzelnen Senders. In „Luxembourg“ zeigen Sender ohne Programmbild die LU-Flagge, auch wenn ihr eigener Gruppenname auf ein anderes Land hindeutet. Die Logik existierte schon (samt Tests), wurde im Netflix-Layout aber nicht verwendet.
- Android TV Live-TV Netflix-Layout: Das Vorschau-Video wird in eine SurfaceView statt in eine TextureView gerendert (wie im klassischen Mini-Player). Videobilder laufen damit unabhängig vom UI-Thread und ruckeln nicht mehr, wenn die Senderreihe scrollt. Bis zum ersten gerenderten Bild verdeckt weiter das Senderlogo auf dem Verlauf das Video. Hinweis: Die TextureView war mit 2.5.070 gegen grünes Flackern beim Wechsel zwischen Vollbild und Vorschau eingeführt worden (damals nicht bestätigt); tritt es wieder auf, ist das der Ansatzpunkt.
- Android TV Live-TV Netflix-Layout: Weniger Render-Last beim Scrollen. Bilder in Karten und Infofeld nutzen den Bild-Alpha-Parameter statt einer `graphicsLayer`-Transparenz und erzeugen damit keine Offscreen-Ebene pro Bild.
- Android TV Live-TV: Im Such-Dialog (beide Layouts) erscheint die Bildschirmtastatur wieder. Das Eingabefeld hatte neben dem eigentlichen Textfeld eine zusätzliche Fokusfläche; der Fokus landete dort statt im Textfeld, und ohne fokussiertes Textfeld startet Android TV keine Tastatur. Die zusätzliche Fokusfläche entfällt, die Tastatur wird angezeigt, sobald das Feld den Fokus bekommt (beim Öffnen und beim Zurückgehen aus der Trefferliste) und beim Wechsel in die Treffer ausgeblendet.

## [2.5.075] - 2026-10-24

- Android-Version: `2.5.075` / Code `476`.

- Android Quellensuche: Für „Lupin“ (TMDB 96677) weicht die Staffelzählung der Quellen von der App ab. Die Quellensuche fragt Staffel 1, Folge 1–5 als Quell-Staffel 1, Staffel 1, Folge 6–10 als Quell-Staffel 2 (Folge 1–5), Staffel 2 als Quell-Staffel 3 und Staffel 3 als Quell-Staffel 4 an. Nur die Suche wird umgerechnet, die App zeigt weiter ihre eigenen Staffeln und Folgen; Cache-Schlüssel und Telegram-Suche verwenden die umgerechneten Werte. Weitere Serien lassen sich über `SourceSeasonRemap` ergänzen.

## [2.5.074] - 2026-10-24

- Android-Version: `2.5.074` / Code `475`.

- Android TV Live-TV: Im Such-Dialog zeigt jeder Treffer statt der Senderkategorie („General“ ist das Genre aus der Playlist) das laufende Programm mit Zeitfenster und rechts das nächste Programm; die Programmdaten werden für die angezeigten Treffer aus dem Programmindex nachgeladen, ohne Daten bleibt das Genre stehen. Der Dialog ist am Bildschirm ausgerichtet: unter der oberen Leiste, mit Rand unten, nie breiter als 92 % und in der Höhe vom Platz begrenzt, die Trefferliste füllt den restlichen Platz.
- Android TV Live-TV (klassisches Layout): Aus der Senderliste kommt man zuverlässig mit einem Druck nach rechts in den Programmführer. Die Programmzellen sind erst fokussierbar, wenn die Zone gewechselt hat; der erste Versuch ging deshalb ins Leere, und ein zusätzlicher Rückfall auf die Senderzeile kollidierte mit dem Wiederholungsversuch. Der Rückfall entfällt, der Wiederholungsversuch läuft länger.
- Android TV Live-TV (klassisches Layout): Die Kachel hinter den Senderlogos und die aktiven Markierungsbalken links in Senderliste und Kategorieliste entfallen; aktive Einträge bleiben über Tönung und Akzentfarbe erkennbar.
- Android TV Live-TV (klassisches Layout): Die Senderliste wirkt weniger eckig: jede Zeile ist eine abgerundete Karte mit Abstand, fokussiert mit Akzentverlauf und Akzentring, aktiv mit Akzent-Tönung. Senderlogos haben stärker abgerundete Ecken, der Fortschrittsbalken ist rund und etwas dicker.
- Android TV Live-TV: Nach einem Abstecher in die Einstellungen (oder einem Layoutwechsel) bleiben Kategorie und Sender zwar erhalten, der D-Pad-Fokus ging aber verloren, weil die Startup-Markierungen als „bereits angewendet“ wiederhergestellt wurden, der Plattform-Fokus aber mit der alten Ansicht verschwand. Der Fokus wird jetzt einmal pro Besuch wieder auf die zuletzt aktive Zone (Kategorie oder Senderliste) gesetzt.
- Android TV Live-TV (klassisches Layout): Das Fanart im Infofeld ist ganz oben verankert statt mittig zugeschnitten; im flachen Infofeld sind jetzt Köpfe und Gesichter statt nur Oberkörper zu sehen.
- Android TV Live-TV Programmführer: Das „Jetzt hh:mm“-Badge beginnt jetzt an der „Jetzt“-Linie und läuft nach rechts. Vorher ragte es nach links über die Linie und wurde am Rand der Senderspalte abgeschnitten.
- Android TV Live-TV (klassisches Layout): Das LIVE-Badge im Mini-Player entfällt; „DANACH“ im Infofeld nutzt die Akzentfarbe des Themes.
- Android TV Live-TV (klassisches Layout): Von der Suche per D-Pad hoch in die obere Navigation und wieder runter kehrt der Fokus jetzt auf die Suche zurück, statt sofort zur nächsten Kategorie zu springen.
- Android TV Live-TV: Der Such-Dialog nutzt das Akzent-Theme (Akzentrahmen am Dialog, Eingabefeld mit Akzentrahmen und Akzent-Lupe, Akzent-Trennlinie, getönte Fokusfläche für Treffer).
- Android TV Live-TV Programmführer: Die vertikale „Jetzt“-Linie hat keinen Glow-Streifen mehr, und das laufende Programm zeigt keinen zusätzlichen Verlauf-Balken im Inneren mehr; Füllung und Akzentrahmen der Zelle bleiben.
- Android TV Live-TV (klassisches Layout): Das „/“ im Suchen-Button entfällt (es war nur ein Platzhalter-Hinweis ohne Funktion). Springt der Fokus mit D-Pad hoch in die obere Navigation, wird die Suche nicht mehr als fokussiert gezeichnet.
- Android TV Live-TV (klassisches Layout): Der Suchen-Button wirkte dauerhaft fokussiert, weil der Fokus-Fallback der Plattform ihn als ersten fokussierbaren Eintrag auswählte. Die Suche nimmt den Fokus jetzt nur noch an, wenn der Fokus bereits in der Seitenleiste liegt (D-Pad hoch von der ersten Kategorie) oder die Suche ausdrücklich angefordert wird. Der Button hat zudem denselben Stil wie die Kategoriezeilen (Höhe, Radius, transparent im Ruhezustand, erhöhte Fläche mit Akzentring nur bei Fokus).
- Android TV Live-TV: Das Theater-Fanart-Hintergrundbild entfällt in beiden Layouts (Netflix und klassisch); Live-TV nutzt den einfarbigen Live-TV-Hintergrund.
- Android TV Merkliste: Der Titel nimmt nur noch eine Zeile; ist er zu lang, wird er mit „…“ gekürzt und läuft beim fokussierten Titel automatisch horizontal durch (Marquee). Dadurch haben alle Karten die gleiche Höhe.
- Android TV Merkliste: Das Scrollen der Reihen verhält sich wie auf Home: der fokussierte Titel steht im ersten Slot und die Reihe läuft darunter durch; bei aktiviertem „Flüssiges Scrollen“ mit Federanimation, sonst ohne Animation (Standard „Aus“). Die Einstellung gilt pro Profil wie auf Home.
- Android TV Merkliste: D-Pad links/rechts ruckelt nicht mehr. Die Reihe wurde bei jedem Schritt neu ausgerichtet (nach rechts animiert, nach links als Sprung); jetzt scrollt sie nur noch, wenn die fokussierte Karte nicht vollständig sichtbar ist, und nur um die fehlende Strecke. Gleiches gilt für das Raster der Bibliotheken. Das Fanart-Hintergrundbild wechselt erst, wenn der Fokus kurz ruht.
- Android TV Merkliste: Ohne OLED-Schwarz-Hintergrund erscheint hinter der Merkliste das Fanart des fokussierten Titels (weich überblendet, abgedunkelt für gute Lesbarkeit). Gilt für „Meine Merkliste“ sowie Trakt-/Simkl-/Server-Bibliotheken; auf Touch-Geräten und mit OLED-Schwarz bleibt der Hintergrund unverändert.
- Android Merkliste: Auf Karten steht statt des Erscheinungsdatums nicht mehr „Film“ bzw. „TV-Serie“, wenn die Anreicherung noch nicht durch ist oder fehlschlägt. Das Erscheinungsdatum wird lokal mit dem Eintrag gespeichert und beim Neuaufbau des Caches (Cloud-Sync, Kaltstart) wiederverwendet; bereits angereicherte Details bleiben beim Cache-Neuladen erhalten.
- Android Merkliste: Ein angewendeter Cloud-Sync leert den Cache nicht mehr (der Leerzustand erschien nach der Rückkehr aus den Details); der Cache wird neu aus dem Speicher geladen. Leere Cache-Meldungen werden zusätzlich gegen den Speicher geprüft, sodass nur eine wirklich leere Merkliste den Leerzustand zeigt.
- Android Home: Der Fokus-Anker (Titel je Reihe) überlebt den Besuch der Detailseite. Nach dem Anspielen eines Titels in „Weiterschauen“ liegt der Fokus nach der Rückkehr wieder auf demselben Titel, auch wenn die Reihe neu sortiert wurde oder die Folge gewechselt hat.

## [2.5.073] - 2026-10-24

- Android Home: „Favorite TV“ und „Recently Watched TV“ werden ausschließlich aus lokalen IPTV-Caches gebaut und warten nicht mehr auf die Initialisierung des Watched-Status (Trakt/Cloud-Netzwerkaufrufe). Die „Recently Watched“-Reihen werden parallel dazu geladen; das minütliche EPG-Update überschreibt sie nicht mehr.
- Android IPTV: Cache-Lesezugriffe (`getCachedSnapshotOrNull`, `warmupFromCacheOnly`) warten nicht mehr hinter einem laufenden Playlist-/EPG-Download (`loadSnapshot`), sondern nutzen den bereits geladenen Speicher-Cache. Betrifft Home-TV-Reihen und das Öffnen von Live-TV direkt nach dem App-Start.
- Android Live-TV Netflix-Layout: Die lokale TV-UI-Größe (90/85/80 %) wirkt hier nicht mehr; das Layout behält seine Proportionen wie bei 100 % und lässt keine großen Leerflächen mehr. Übrige Bildschirme bleiben skaliert.
- Android Live-TV Netflix-Layout: Solange die Senderliste noch nicht geladen ist, zeigt die Senderreihe animierte, nicht fokussierbare Skeleton-Karten, und das Infofeld meldet „Sender werden geladen…“ statt „Keine Sender in dieser Kategorie“.

- Android-Version: `2.5.073` / Code `474`.

## [Web 1.0.069] - 2026-10-24

- Web Startseite: Hero-Backdrop ausgewogen aufgehellt, überlagerte schwarze Verläufe reduziert und den zusätzlichen inneren Schatten entfernt. Textschutz links und der weiche Übergang zu den Rails bleiben auf Desktop und Mobilgeräten erhalten.

## [Backend 1.0.024] - 2026-10-19

- Backend Remote Config: Global neu hinzugefügte Kataloge werden pro Profil vorne in die gespeicherte Reihenfolge eingefügt und erscheinen nach dem Sync direkt unter „Weiterschauen“ (ohne CW ganz oben). Aktualisierungen bereits vorhandener Kataloge behalten deren Position; die Reihenfolge der übrigen Kataloge bleibt erhalten.

## [2.5.072] - 2026-10-19

- Neue Katalog-Rails stehen direkt unter „Weiterschauen“ (CW), vor bestehenden TV-Rails. Neu entdeckte Add-on-/Server-Rails werden in Android und neue Server-Rails im Web ebenfalls vorne in die gespeicherte Katalogreihenfolge eingefügt; bestehende Rails behalten ihre relative Reihenfolge.
- Android Home-Rails: Beim seitenweisen Nachladen erscheinen drei animierte, nicht fokussierbare Skeleton-Karten am Rail-Ende sowie ein Akzent-Ladeindikator mit „Weitere Titel werden geladen…“, im TV- und Touch-UI. Vorhandene Karten und der Fokus bleiben erhalten. „URL hinzufügen“ übernimmt bei ausgefülltem Feld denselben Akzentstil wie „Suche“.
- Katalog-Sync Web → Android: Web exportiert Android-kompatible Titel und Quelltypen; Android importiert auch ältere Web-Einträge mit `name` und kleingeschriebenen Typen. Trakt- und MDBList-URLs werden im Web anhand ihrer Quelle erkannt, statt alle hinzugefügten Listen als MDBList zu speichern.
- Web Trakt-URL-Kataloge: Öffentliche Listen nutzen wie die Trakt-Anbindung direkte Browser-Anfragen mit Server-Proxy-Fallback statt ausschließlich des Proxys; Filme und Serien werden mit explizitem 100er-API-Limit angefragt. Home-Rails unterscheiden Ladefehler mit Wiederholen-Aktion von tatsächlich leeren Listen.
- Android TV Katalogverwaltung: Ausgeblendete URL-Kataloge bleiben samt URL und Reihenfolge gespeichert und können über das Augen-Symbol wieder aktiviert werden. Das Lesen der Startseiten-Kataloge entfernt keine ausgeblendeten Einträge mehr aus der Speicherung oder dem Cloud-Sync. Eigene einzelne URL-Kataloge erhalten einen separaten Löschbutton mit Bestätigung. Web-Sync überträgt Ausblenden, Wiedereinblenden und Löschen getrennt; im Web gelöschte URL-Kataloge werden nicht durch die Android-Legacy-Wiederherstellung zurückgeholt.
- Android Schließen-Dialog: „Abbrechen“ und „Schließen“ verwenden denselben neutralen Button-Stil mit Akzentrahmen und erhalten bei Fokus eine solide Akzentfläche mit kontrastreicher Beschriftung.
- Android Katalogsuche: Such- und URL-Eingabe verwenden den gemeinsamen App-Eingabedialog mit Theme-Oberfläche, Akzentrahmen und TV-/Touch-Bedienung. Die URL-Eingabe bietet „In Katalog-URL einfügen“ für die Zwischenablage; die bisherigen Bestätigungstexte und die Sperre leerer Eingaben bleiben erhalten. Bei fokussierten Suchtreffern erhält „Hinzufügen“ eine solide Akzentfläche mit kontrastreicher Beschriftung, sowohl im kompakten als auch im breiten Layout.

## [Web 1.0.068] - 2026-10-19

- Neue Katalog-Rails stehen direkt unter „Weiterschauen“ (CW), vor bestehenden TV-Rails. Neu entdeckte Add-on-/Server-Rails werden in Android und neue Server-Rails im Web ebenfalls vorne in die gespeicherte Katalogreihenfolge eingefügt; bestehende Rails behalten ihre relative Reihenfolge.
- Android Home-Rails: Beim seitenweisen Nachladen erscheinen drei animierte, nicht fokussierbare Skeleton-Karten am Rail-Ende sowie ein Akzent-Ladeindikator mit „Weitere Titel werden geladen…“, im TV- und Touch-UI. Vorhandene Karten und der Fokus bleiben erhalten. „URL hinzufügen“ übernimmt bei ausgefülltem Feld denselben Akzentstil wie „Suche“.
- Katalog-Sync Web → Android: Web exportiert Android-kompatible Titel und Quelltypen; Android importiert auch ältere Web-Einträge mit `name` und kleingeschriebenen Typen. Trakt- und MDBList-URLs werden im Web anhand ihrer Quelle erkannt, statt alle hinzugefügten Listen als MDBList zu speichern.
- Web Trakt-URL-Kataloge: Öffentliche Listen nutzen wie die Trakt-Anbindung direkte Browser-Anfragen mit Server-Proxy-Fallback statt ausschließlich des Proxys; Filme und Serien werden mit explizitem 100er-API-Limit angefragt. Home-Rails unterscheiden Ladefehler mit Wiederholen-Aktion von tatsächlich leeren Listen.

## [2.5.071] - 2026-10-19

- Android IPTV Artwork Nachkorrektur: Der Screenshot-Fall „The Blacklist“ wurde mit echten TMDB-Treffern und dem Bild der gleichnamigen arabischen Serie reproduziert. Originaltitel und Relevanz der Originaltitel-Familie haben jetzt Vorrang vor dem Jahr; „neueste Fassung“ gilt innerhalb derselben Familie. Bloße Wortüberschneidungen oder Teilwörter reichen nicht mehr für ein Sendungsbild. Diagnose-Logs enthalten ausgewählten Titel, Originaltitel, ID und Jahr.
- Android IPTV Artwork: Gleichnamige Serien innerhalb derselben Originaltitel-Familie bevorzugen ohne Jahresangabe die neueste Fassung, etwa „The Equalizer“ von 2021 statt 1985. Explizite Jahresangaben bleiben bei Suche und Caching erhalten. Fehlende Bilder oder Logos führen nicht mehr zum Wechsel auf eine andere TMDB-Fassung.
- Android IPTV-only: Suche und VOD-Wiedergabe verwenden dieselbe Titel- und Jahresprüfung. Bekannte IDs haben Vorrang vor lokalisierten Titeln; widersprüchliche IDs werden beim Titel-Fallback ausgeschlossen. Serien-Bindings sind nach Identität statt zusätzlich nach gemeinsamem Titel getrennt; Serienjahre werden von Details und Player bis zum Resolver weitergegeben. Alte Auflösungs-Caches werden nicht weiterverwendet.

- Android-Version: `2.5.071` / Code `472`.

## [2.5.070] - 2026-10-18

- Android Home Scrollen: „Flüssiges Scrollen“ verwendet in Home und Settings einheitlich „Aus“ als Standard, solange kein Profilwert gespeichert ist. Bei „Aus“ erfolgen horizontale und vertikale Home-Positionswechsel ohne Scrollanimation; „Ein“ behält die bestehenden Animationen. Gespeicherte Profilwerte und Cloud-Sync bleiben unverändert; Regressionstests prüfen Standardwerte, Profiltrennung und laufende Einstellungsänderungen.
- Android Live-TV Netflix-Layout: Videoausgabe beim Wechsel zwischen Vollbild und Vorschau entkoppelt. Die Vollbild-PlayerView gibt den Player beim Verlassen sofort frei und wird beim Entfernen explizit getrennt; die Vorschau übernimmt erst nach Ende der Ausblendanimation statt nach festen 120 ms. Media3 verwaltet den TextureView-Lebenszyklus, und die Vorschau bleibt bis zur ersten gerenderten Frame-Meldung verdeckt. Regressionstests prüfen die Freigabe während Ein-/Ausblendung und schnellen Richtungswechseln; die Bestätigung gegen grünes Flackern auf Shield-Hardware steht noch aus.
- Android TV Darstellung: Lokale UI-Größe mit 100 % (Standard), 90 %, 85 % und 80 % unter Darstellung ergänzt. Die Auswahl durchläuft alle vier Stufen und kehrt danach auf 100 % zurück. Dichte und logische Bildschirmmaße werden gemeinsam angepasst, ohne die Video-Bildfläche zu verkleinern oder die Android-Schriftvergrößerung zurückzusetzen. Die Auswahl liegt in einem separaten Geräte-Display-Speicher ohne Profil-/Cloud-Sync; Mobile bleibt unverändert. Umschalten ist direkt wirksam und jederzeit rückstellbar.
- Android TV Hero-Skalierung: Home-Hero und Beginn der Home-Reihen richten sich bei kleineren UI-Größen gemeinsam nach der ursprünglichen Komposition, statt nach unten zu rutschen. Der zusätzliche Platz wird für weitere sichtbare Reihen verwendet. TV-Details folgt weiterhin derselben tatsächlich gemessenen Home-Hero-Referenz. Die bisherige Darstellung bei 100 % bleibt erhalten; Regressionstests prüfen alle vier Größen und den Abstand zwischen Hero und erster Reihe.
- Android Skip-Segmente: TheIntroDB auf `/v4/media` umgestellt, bevor v2/v3 am 18. Januar 2027 abgeschaltet werden. Anfragen behalten TMDB-ID sowie TMDB-Staffel-/Episodennummern bei; die TVDB-Identität der v4-Antwort erfordert keinen ID-Umbau. Tests prüfen den konfigurierten v4-Endpunkt, die erzeugte Anfrage und die Segmentlisten der v4-Antwort. Andere Skip-Anbieter bleiben unverändert.
- Android IPTV Artwork: Bei bekannter EPG-Sendedauer unter 75 Minuten werden gleichnamige Serien gegenüber Filmen bevorzugt, ab 75 Minuten bleibt der Film-Vorrang bestehen. Unbekannte oder ungültige Laufzeiten erzwingen keinen Medientyp. Backdrop-, Logo- und Kandidaten-Caches unterscheiden diese drei Suchkontexte, damit ein ohne Laufzeit ausgewählter Film nicht als Artwork einer später erkannten Serienfolge wiederverwendet wird. Das gemeinsame Lade-Limit bleibt erhalten.
- Android IPTV Diagnose: TMDB-Backdrop- und Logo-Treffer protokollieren Kandidaten-ID, Medientyp und verwendete EPG-Dauer; primäre Treffer zusätzlich die Laufzeit-Präferenz. Regressionstests decken gleichnamige Filme/Serien, unbekannte Laufzeiten und Cache-Trennung ab. Die Sendedauer ist eine Heuristik, keine sichere Film-/Serienkennung.
- Android TV Details: Staffelbuttons übernehmen Fokusrahmen, Hintergrund- und Aktivzustände der Live-TV-Kategorien, behalten aber ihre abgerundete Rechteckform mit 8-dp-Eckenradius. Die Staffelreihe scrollt anhand der tatsächlichen Buttonbreiten nur bei Bedarf ins Sichtfeld statt jede Staffel am Kartenanker auszurichten. Auswahl per OK, Gesehen-Markierung und vertikale Fokusreihenfolge bleiben erhalten; Mobile, Home und Live-TV bleiben unverändert.

- Android-Version: `2.5.070` / Code `471`.

## [2.5.069] - 2026-10-17

- Android TV Home: Die bewährte Bottom-Verankerung und natürliche Metadatenhöhe des Home-/Continue-Watching-Heros sind wiederhergestellt. Die mit 2.5.068 eingeführte feste Logo-Oberkante entfällt; Performance-, Metadaten- und Profilfoto-Sync-Fixes bleiben erhalten.
- Android TV Details: Nur Details richtet seine Logo-Oberkante an einer tatsächlich gemessenen Home-Hero-Referenz aus, ohne zusätzliche Bildabrufe oder Synopsis-Animationen. Die Details-Metadaten erhalten ihre natürliche Höhe; lange Beschreibungen und Aktionen bleiben im separaten Scrollbereich. Mobile, Live-TV und die D-pad-Fokusreihenfolge bleiben unverändert.
- Android-Version: `2.5.069` / Code `470`.

## [2.5.068] - 2026-10-17

- Android IPTV: Backdrop- und Logo-Lookups teilen sich ein gemeinsames Limit von zwei gleichzeitigen Artwork-Ladevorgängen. Das Limit umfasst sichtbare Karten, Hero und vorsorgliche Vorladung; Cache-Treffer und die bestehende Request-Zusammenführung bleiben erhalten.
- Android TV Home: Vorsorgliche IPTV-Rail-Artwork-Vorladung beginnt erst nach der Start-Ruhephase und einer Sekunde ohne Fokusnavigation. Weitere Navigation verschiebt nachfolgende Warmup-Aufträge; sichtbare Karten und der fokussierte Hero behalten ihren direkten Ladepfad.
- Android TV: Film-/Serien-Heros in Home und Details verwenden denselben Logo-Anker und eine reservierte Metadatenhöhe. Die lange Details-Beschreibung und Aktionen scrollen unterhalb des Headers, ohne dessen Logohöhe zu verschieben. Beim Fokuswechsel zu den Rails steht wieder der größere Scrollbereich zur Verfügung; mobile Darstellung sowie IPTV-/Collection-Heros bleiben unverändert.
- Android Profile: Hochgeladene Fotos werden unabhängig vom Zeitpunkt der letzten Profilnutzung nach ihrem Avatar-Änderungsstand zusammengeführt. Inline-Bilddaten werden nur mit passender Bildversion übernommen; direkter Profil-Push und vollständiger Account-Sync verwenden dieselbe Merge-Regel.
- Android Profile: Avataränderungen und bewusstes Entfernen erhalten einen eigenen Zeitstempel. Ältere Snapshots ohne Avatarfelder löschen kein neueres Foto; ein neuerer Entfernen-Stand wird nicht durch ein altes Foto wieder aufgehoben. Beim Restore werden neuere lokale Avatarstände vor dem Schreiben/Bereinigen von Bilddateien berücksichtigt.
- Android Profile: Ein nachträglich aus der Cloud restauriertes Foto aktualisiert die betroffene Profilansicht und ihren Bildcache auch bei unveränderter Bildversion. Regressionstests decken stale-device Pushs, Entfernen, Legacy-Snapshots, Bildversionszuordnung und lokale Restore-Benachrichtigungen ab; keine Produktionsprofile im Test verändert.
- Profilfoto-Sync: Für einen verlässlichen Handy-/TV-Abgleich beide Geräte auf den korrigierten Stand aktualisieren. Kein neues Backend-Schema erforderlich; ein echter Zwei-Geräte-Abgleich mit Produktionsprofilen wurde lokal nicht durchgeführt.
- Android-Version: `2.5.068` / Code `469`.

## [2.5.067] - 2026-10-15

- Android TV Home: Die Layout-Einstellungen aller Katalogzeilen werden gemeinsam als profilbezogener Snapshot gelesen statt mit separaten DataStore-Collectorn pro Zeile. Individuelle Poster-/Landscape-Overrides und globale Fallbacks bleiben erhalten.
- Android Home: Fokus-Prefetching startet nur noch über den gemeinsamen Idle-Beobachter. Neue Navigation oder Sidebar-Fokus bricht den aktiven Fokus-Prefetch ab; Hero-Wechsel starten keinen zweiten Fokus-Prefetch mehr.
- Android TV Home: Bei deaktiviertem Smooth Scrolling erfolgt der vertikale Zeilenwechsel ohne Scrollanimation.
- Android Home: Das Ersetzen von Start-Platzhaltern und die Rückkehr aus der Sidebar lösen die Anreicherung der fokussierten Karte auch bei unverändertem Itemindex aus. Während der Startphase zurückgestellter Detail-Prefetch wird verzögert statt verworfen.
- Android Home: Ein gemeinsamer Hintergrund-Loader cached bis zu 64 Trailer-Ergebnisse pro Sprach-/Medienidentität, übernimmt keine Ergebnisse für einen inzwischen anderen Hero und versucht leere Abrufe einmal verzögert erneut. Weitere leere Abrufe erhalten eine Retry-Pause statt einer dauerhaften Sperre bis zum Neustart.
- Android Home: Die Bildvorladung markiert nur tatsächlich in den begrenzten Batch aufgenommene URLs als gestartet, damit weitere Bilder später noch geladen werden können.
- Android: Der fokussierte Abbrechen-Button im App-schließen-Dialog erhält einen Rahmen im aktiven Theme-Akzent; seine neutrale Füllung bleibt erhalten.
- Android Home: Inkrementelle Katalogergebnisse werden nach dem ersten echten Inhalt in 120-ms-Fenstern gemeinsam veröffentlicht. Pro Rail gilt das neueste Ergebnis; Load-Abbruch verwirft offene Updates, der finale Katalogzustand übernimmt sie vorher vollständig.
- Android IPTV: Artwork-Beobachtung und direkte Logo-/Backdrop-Lookups führen die Suche und Kandidatenaufbereitung auf dem IO-Dispatcher statt im aufrufenden UI-Kontext aus. Cache-, Retry- und Abbruchverhalten bleiben erhalten.
- Android Diagnose: Feste Perfetto-Marker kennzeichnen Home-/Rail-/IPTV-Karten-Komposition, gebündelte Rail-Veröffentlichung und Artwork-Kandidatenbewertung ohne Titel oder Zugangsdaten. Eine messbare Verbesserung wird erst anhand einer Vergleichsaufnahme bewertet.
- Android TV Details: Interner Startfokus und sichtbare Play-Markierung liegen beide auf den Aktionen. Die Beschreibung ist kein eigener D-Pad-Fokus-Stopp mehr; oberhalb der Aktionen liegt die obere Navigation. D-Pad-Abwärts wechselt bei Filmen direkt zur nächsten vorhandenen Rail. Auf TV zeigen Serien auch bei nur einer Staffel den Staffelbutton und verwenden konsistent Aktionen, Staffelzeile und Episoden als Fokus-Stops; die mobile Staffelanzeige bleibt unverändert. Der Rückweg zu den Aktionen setzt eine unterbrochene Scrollanimation zurück und positioniert den Hero neu, auch wenn er vorher noch teilweise sichtbar war.
- Android Home: Ein bereits sichtbarer Continue-Watching-Hero bleibt beim Eintreffen vorab geladener Katalogdaten erhalten, auch wenn sein Logo noch fehlt. Teilantworten für denselben Titel bewahren vorhandene Metadaten und übernehmen neue Fortschrittswerte ohne erneuten Titelwechsel. Die Hero-Hydration ergänzt jetzt auch Jahr und Artwork; der Titel bleibt sichtbar, bis das Clearlogo tatsächlich geladen ist.
- Android TV Home: Passende gespeicherte Metadaten werden sofort in den sichtbaren CW-Hero übernommen. Nur das erste CW-Item erhält einen priorisierten Hintergrund-Metadatenabruf vor der Wartephase für den vollständigen Listenrefresh; dessen neue Daten aktualisieren denselben Hero ohne Titelwechsel.
- Diagnose: Die gemeldete Absturzursache ist weiterhin nicht bestätigt. Einzelne Debug-/Emulator-Traces sind kein belastbarer Release-Performancebenchmark.
- Android-Version: `2.5.067` / Code `468`.

## [2.5.066] - 2026-10-13

- Franchises / Studios / Collections: Die Medienkarten in der Sammlungsübersicht zeigen wieder das vollständige Veröffentlichungsdatum (`releaseDate`, z. B. im Format `dd.MM.yyyy`) statt nur das Erscheinungsjahr (`releaseYear`). Fehlt ein genaues Datum, bleibt das Jahr als Fallback erhalten.
- Live-TV-Playeroverlay: Der SENDER-Button wird in der unteren Steuerleiste vertikal zentriert und liegt jetzt auf derselben Mittellinie wie Play/Pause, PROGRAMM und die übrigen Aktionen. Zuvor war er ohne explizite Ausrichtung am oberen Rand der Leiste platziert. Größe, Fokusverhalten und Aktionen bleiben unverändert.
- Live-TV-Playeroverlay: Play/Pause zeigt die orange Akzentfüllung nur bei tatsächlichem Fokus. Ohne Fokus verwendet der Button wie die übrigen Icons einen dunklen Hintergrund mit weißem Symbol, sodass der aktive D-pad-Fokus eindeutig erkennbar bleibt. Die größere Button-/Symbolgröße und die Fokusnavigation bleiben erhalten.
- Android mobil: Sprachkontexte überschreiben nur noch die Sprache statt eine komplette Bildschirmkonfiguration festzuhalten. Der lokalisierte Compose-Kontext wird bei Konfigurationsänderungen aktualisiert, damit Home und Live-TV nach einer Drehung aktuelle Quer-/Hochformat-Abmessungen verwenden.
- Live-TV mobil: Die Touch-Senderübersicht reicht den ermittelten Tablet-Querformatmodus an den Mini-Player weiter. Nach Vollbild → Zurück kann die laufende Übertragung wieder klein neben den Programminformationen stehen, während die Senderliste sichtbar bleibt; die bestehende Android-Ausrichtungsregel bleibt unverändert.
- Home mobil: Hero-Karten berechnen ihre tatsächliche Höhe aus verfügbarer Breite, Seitenverhältnis und Höhenlimit. Die Begrenzung schneidet nicht mehr lediglich eine größere Karte ab; Titel, Metadaten und nachfolgende Katalogzeilen bleiben im Querformat erreichbar.

## [2.5.065] - 2026-10-13

- Remote Config: Katalog-Konfigurationen erhalten `remoteManaged` und `remoteTitle`, damit global vergebene Namen und absichtlich ausgeblendete Kataloge beim Cloud-Sync erhalten bleiben.
- Standardkataloge übernehmen weiterhin aktuelle App-Vorgaben, behalten aber Remote-Namen und Verwaltungsmarker auch dann, wenn der Name dem bisherigen Standard entspricht.
- Add-on-Aktualisierungen behalten globale Katalognamen statt sie durch Manifestnamen zu ersetzen. Die automatische Sport-Katalog-Wiederherstellung respektiert Remote-Ausblendungen.
- Lokales Umbenennen aktualisiert einen vorhandenen Remote-Namen mit, damit spätere Synchronisierungen keine veraltete Bezeichnung wiederherstellen.
- Eine ausdrücklich leere Profil-Katalogliste aktiviert keine Legacy-Kataloge erneut. Ausgeblendete benutzerdefinierte IDs werden nicht durch die Legacy-Wiederherstellung erneut in den Cloud-Export aufgenommen.
- Kompatibilität: Ältere Kataloge ohne die neuen Felder behalten ihr bisheriges Verhalten.
- Release: APK-Version `2.5.065`, Android-Versionscode `466`. Veröffentlichung über den bestehenden Android-Publish-Workflow nach Push auf `main`.

## [Web 1.0.067] - 2026-10-13

- Remote Config: Globale Katalognamen bleiben bei Standardkatalog-Abgleich und deutscher Lokalisierung erhalten; Verwaltungsmarker werden beim Normalisieren weitergereicht.
- Cloud-Import: Eine ausdrücklich leere Profil-Katalogliste bleibt leer und reaktiviert keine alten benutzerdefinierten Kataloge aus dem Legacy-Bestand.
- Lokales Umbenennen eines Remote-Katalogs hält Name, Android-Titel und vorhandenen Remote-Namen konsistent.
- Katalog-Sichtbarkeit übernimmt auch Android-Ausblendelisten für Add-ons und benutzerdefinierte Quellen. Erneutes Aktivieren im Web bereinigt die passenden Cloud-Ausblendelisten, statt den Katalog auf Android weiterhin verborgen zu halten.
- Release: Web-Version `1.0.067`; Paketmanifest und Lockfile einschließlich Root-Paketversion sind synchron. Veröffentlichung über den bestehenden Web-Publish-Workflow nach Push auf `main`.

## [Backend 1.0.023] - 2026-10-13

- Remote Config: Kataloge global hinzufügen/aktualisieren, umbenennen, aktivieren/deaktivieren und ausgewählt entfernen/ausblenden.
- Quellen: Trakt- und MDBList-Listen per URL; eingebaute Kataloge aus vorhandenen Cloud-Konfigurationen und Add-on-Kataloge aus gespeicherten Konfigurationen bzw. installierten Manifesten.
- Add-on-Kataloge werden nur Accounts mit derselben installierten Add-on-Instanz zugeordnet. Das Add-on wird nicht automatisch installiert; Anbieter-Verbindungen und API-Schlüssel bleiben Voraussetzung.
- Entfernen löscht benutzerdefinierte Listen. System-, Add-on- und Heimserver-Kataloge erhalten eine deaktivierte Konfiguration samt passender Ausblendeliste, statt beim nächsten automatischen Abgleich erneut sichtbar zu werden.
- Katalogänderungen setzen die profilbezogenen Katalog-Sync-Zeitstempel. Umbenennen erhält Quelladressen und Collection-Metadaten; die Bestandsübersicht zeigt keine Katalog-URLs.
- Sicherheit und Geltungsbereich bleiben unverändert: Vorschau, Bestätigung mit `ALLE ACCOUNTS`, Konfliktprüfung, atomare Snapshot-/Audit-Updates, bestehende Profile und ausdrücklich übersprungene Accounts ohne Snapshot/Profile. Keine Vorgaben für zukünftige Accounts.
- Rollout: Aktualisierte APK, WebUI und Backend gemeinsam verteilen, bevor Remote-Namen und dauerhaft ausgeblendete automatisch erzeugte Kataloge genutzt werden. Keine Datenbankmigration erforderlich.
- Release: Backend-Version `1.0.023`; Paketmanifest und Lockfile sind synchron. Veröffentlichung über den bestehenden Backend-Publish-Workflow nach Push auf `main`; tatsächlicher Build-/Deployment-Erfolg wird separat durch die Workflows bestätigt.
- Validierung: 54 gezielte Backend-Tests, 31 Web-/Cloud-/Katalog-Tests und TypeScript-Prüfung sowie 7 Android-Katalogtests erfolgreich. Lokaler Browser-Test prüft alle vier Quelltypen und Hinzufügen, Umbenennen, Deaktivieren und Entfernen samt Vorschau/Bestätigung; keine Produktionsaccounts verändert.

## [2.5.064] - 2026-10-12

- Android: MDBList verwendet echte TV-Material-Buttons wie der Exitdialog statt manuell gezeichneter Fokuszustände; eine Fokusgruppe hält die D-pad-Navigation innerhalb des Dialoginhalts.

- Android: TV-Hero für Recently Watched TV und Favorite TV zeigt Sender-/Gruppentrenner in Theme-Akzent, einschließlich eingebetteter Texttrenner.
- Android: Fokussierte Abbrechen-Buttons bei Trakt/SIMKL/Heimserver und Discord verwenden jetzt volle Akzentfüllung mit kontrastierender Schrift auch beim initialen Fokus. MDBList-Aktionen übernehmen Höhe und neutralen/primären Fokuslook des Exitdialogs.

- Android: Marvel nutzt in Filme/Serien/Timeline ausschließlich die drei offiziellen Addon-Quellen. Alte beigemischte MCU-IDs werden auch in gespeicherten Profilkatalogen ersetzt; die falsche Agatha-ID `tv:202412` erzeugte den japanischen Fremdeintrag.
- Android: Alle Collection-/Franchise-Karten zeigen Release-Jahre statt kompletter Release-Daten in Theme-Akzent, einschließlich der Marvel-Timeline. Metadaten-Trenner auf Home und Details verwenden ebenfalls Theme-Akzent.
- Android: Discord-Pairing erhält den gemeinsamen Skin-/Gradient-/Button-Stil mit echtem Button-Fokus und Akzentrahmen.
- Android: Heimserver-Trennung entfernt zugehörige Kataloge auch bei leerer Kandidatenliste. Start-/Settings-Abgleich bereinigt verwaiste Heimserver-Kataloge; eine noch nicht geladene Bibliotheksliste bleibt geschützt. Andere Katalogquellen und Profile bleiben erhalten.

- Android: Ursache der veralteten Marvel-Timeline im Emulator nachgewiesen: HTTP-Cache enthielt eine Antwort vom 10. Oktober mit 69 statt aktuell 87 Einträgen; das Addon setzt 21 Tage Cache-Gültigkeit. Die Timeline revalidiert jetzt beim Öffnen per `Cache-Control: no-cache`, hält aber beim Nachladen denselben Snapshot. Regressionstest prüft den echten HTTP-Cache-Pfad von 69 auf 87 Einträge.
- Android: Marvel-IMDb-Auflösung berücksichtigt Filme und Serien unabhängig vom fehlerhaften Addon-Typ (z. B. „The Punisher: One Last Kill“). Fehlende Landschaftsbilder werden zusätzlich über TMDB-Bilder gesucht; die Timeline verwendet keine Hochformat-Poster mehr als Landscape-Fallback.
- Android Debug: Log-Tag `MarvelTimeline` zeigt revalidierten Snapshot, rohe Addon-Positionen, aufgelöste Identität, Landschaftsbildstatus, Seitenübergänge und tatsächlich fokussierte Karten.

- Android: Marvel-Addon-Timeline erhält pro Eintrag einen eigenen Kartenschlüssel, damit mehrere Staffeln derselben Serie beim Nachladen nicht zusammenfallen. Ein nicht auflösbarer Eintrag bleibt als gekennzeichnete Karte sichtbar statt die Seite abzubrechen; Details öffnen nur mit echter aufgelöster Identität.
- Android: Marvel-Landschaftsbilder werden separat aus Metadaten ergänzt, ohne Addon-Titel oder Reihenfolge zu ersetzen. Fehlende Landschaftsbilder zeigen das Hochformat-Poster eingepasst statt zugeschnitten. Der komplette Addon-Snapshot bleibt während des Nachladens stabil; ein Regressionstest verwendet die echte Antwort mit 87 Einträgen.
- Android: Trakt-/SIMKL-/Heimserver-Abbrechen und MDBList-Buttons zeigen den Fokus mit Akzentrahmen. MDBList kann per D-Pad zwischen Eingabefeld und Aktionen wechseln; Eingabe-OK und Links/Rechts werden nicht mehr vom Dialog abgefangen.

- Android: Marvel-Timeline rendert die echten Addon-Karten direkt aus dem vollständigen Katalog statt sie über TMDB-Details neu aufzubauen und bei Metadatenfehlern zu entfernen. Titel, Poster, Beschreibung und Position stammen vom Addon; echte aufgelöste TMDB-Identitäten bleiben für Navigation erhalten. Das camelCase-Feld tmdbId wird neben tmdb_id unterstützt.

- Android: Quellen aktualisieren und Beim Host bestellen verwenden beide den ursprünglichen neutralen Aktualisieren-Stil: helle Schrift, Akzent-Icon, graue Fokusfüllung und Akzentrahmen statt voller Akzentfüllung.
- Android: Addon-Kataloge behalten die ursprüngliche Reihenfolge auch bei gemischten direkten TMDB- und aufgelösten IMDb-IDs. Timeline-Erweiterungen hängen neu aufgelöste Einträge nicht mehr hinter alte Cache-Einträge. Die MyStreamNet-Marvel-Timeline wird im IPTV-only-Modus nicht auf bereits verfügbare Titel reduziert.

- Android: StreamNet TV unterstützt ausdrücklich per Remote Config gesetzte Server über das Playlist-Feld `streamNetHostOverride`. Ein eigener Remote-Host wird nicht mehr automatisch auf den im APK eingebauten Xtream-Server zurückgesetzt.
- Android: Der Remote-Host bleibt beim Cloud-Import, bei der Playlist-Normalisierung, beim lokalen JSON-Laden und beim erneuten Cloud-Export erhalten. Ohne Remote-Vorgabe bleibt die bisherige Host-Migration unverändert.
- Android: StreamNet TV behält die feste Playlist-ID `streamnet_tv`. Das Entfernen der Konfiguration lässt weiterhin den leeren, deaktivierten Systemeintrag bestehen; vorhandene Playlist-Limits bleiben unverändert.
- Rollout: Für eigene StreamNet-TV-Hosts muss die aktualisierte APK vor Nutzung dieser Remote-Konfiguration verteilt werden. Ältere Apps können den eingebauten Host beim nächsten Sync wiederherstellen.
- Validierung: 9 gezielte Android-Playlist-Tests erfolgreich, einschließlich Remote-Host-Erhalt, JSON-Kompatibilität und unveränderter Host-Migration ohne Override.
- Status: Noch nicht veröffentlicht; Versionsnummer und Versionscode wurden durch diese Änderungen nicht erhöht.

## [Web 1.0.066] - 2026-10-12

- WebUI: Playlist-Typen, Cloud-Einlesen und Laufzeit-Normalisierung erhalten das Feld `streamNetHostOverride`, damit eine per Remote Config gesetzte StreamNet-TV-Adresse beim Web-/Android-Sync nicht verloren geht.
- WebUI: Xtream-Konfigurationen aus Remote Config verwenden reguläre M3U-/EPG-Adressen und bleiben mit der bestehenden Playlist-Verarbeitung kompatibel.
- Validierung: 13 gezielte Web-/Cloud-Tests erfolgreich; TypeScript-Prüfung bestanden. Ein Regressionstest prüft den Erhalt der Remote-Host-Vorgabe.
- Status: Noch nicht veröffentlicht; die Web-Versionsnummer wurde nicht erhöht. Der neue Admin-Bereich wird vom Backend ausgeliefert, nicht von der separaten WebUI.

## [Backend 1.0.022] - 2026-10-12

- Adminpanel: Neuer Navigationsbereich **Remote Config** mit Regler-Icon für globale Playlist- und Add-on-Verwaltung über alle registrierten Accounts, unabhängig von Suche, Seitenaufteilung und Online-Filter.
- Remote Config: Playlists und Add-ons global hinzufügen bzw. anhand derselben ID aktualisieren, vorhandene Einträge bearbeiten, ausgewählte Einträge entfernen oder alle Playlists bzw. Add-ons leeren.
- Geltungsbereich: Hinzufügen erreicht alle bestehenden Profile konfigurierbarer Accounts. Bearbeiten und ausgewähltes Entfernen treffen nur vorhandene Einträge mit der gewählten ID. Accounts ohne Cloud-Snapshot oder Profile werden ausdrücklich als übersprungen gezählt. Keine automatischen Vorgaben für zukünftige Accounts oder Profile.
- Playlists: Bearbeiten erhält die Playlist-ID und zusätzliche profilbezogene Eigenschaften; Name, M3U-/EPG-Adressen sowie die angezeigten Aktivierungs-/Importoptionen werden ersetzt. Eine leere EPG-Adresse entfernt die EPG-Konfiguration. Entfernen bereinigt passende profilbezogene Legacy-URL-Felder; vollständiges Leeren entfernt auch die alten M3U-/EPG-Felder.
- Xtream Codes: Separate Eingabefelder für Server, Benutzername und Passwort erzeugen korrekt kodierte `get.php`- und `xmltv.php`-Adressen. Gemeinsame Zugangsdaten werden für alle Zielaccounts identisch gesetzt; dies ist keine individuelle Benutzerbereitstellung.
- StreamNet TV: Eigener Playlist-Typ konfiguriert die feste System-ID `streamnet_tv` statt einer zusätzlichen benutzerdefinierten Playlist und setzt eine ausdrückliche Remote-Host-Vorgabe.
- Xtream / StreamNet TV: Die Aktion **nur Host ändern** erhält individuelle Zugangsdaten, Playlist-ID, Name, Aktivierung und Importoptionen bestehender Einträge. Xtream-URLs und ältere Host-/Benutzer-/Passwort-Triplets werden unterstützt; vorhandene `type`-/`output`-Parameter bleiben erhalten. M3U-/EPG-Adressen werden neu aufgebaut und zwischengespeicherte Ablaufprüfungen zurückgesetzt.
- Validierung: Ungültige Serveradressen, fehlende Zugangsdaten oder ein unpassendes StreamNet-TV-Ziel werden ausdrücklich abgelehnt. Fehlende bzw. ungültige Xtream-Zugangsdaten eines betroffenen Eintrags brechen die gesamte Aktion ab, statt einzelne Fehler still zu überspringen.
- Add-ons: Manifest- bzw. Stremio-Links werden über den bestehenden Manifest-Lader verarbeitet. Eine Link-Änderung ersetzt die alte Instanz-ID und erhält bestehende profilbezogene Aktivierungswerte. Die Aktivierungsoption gilt für neue Profilzuordnungen.
- Absicherung: Eine schreibfreie Vorschau zeigt geänderte, unveränderte und übersprungene Accounts. Anwenden erfordert die genaue Bestätigung **ALLE ACCOUNTS**. Zwischenzeitliche Account-/Snapshot-Änderungen führen zu HTTP 409 und erfordern eine neue Vorschau; globale Aktionen werden nicht automatisch wiederholt.
- Speicherung: Alle Änderungen und Audit-Einträge laufen gemeinsam in einer PostgreSQL-Transaktion. Jeder tatsächlich geänderte Account erhält eine neue Cloud-Revision, aktualisierte Sync-Zeitstempel, `source = 'admin'` und einen `global_`-Audit-Eintrag mit gemeinsamer Batch-ID. Unveränderte und übersprungene Accounts erhalten keine neue Revision. Audit-/Validierungsfehler verhindern eine teilweise erfolgreiche Aktion.
- Sicherheit und Rückmeldung: Globale Endpunkte akzeptieren nur Admin-Tokens. Die Bestandsauswahl zeigt Namen, IDs und Account-Anzahlen ohne gespeicherte Playlist-URLs oder Zugangsdaten. Globale Requests erhalten eigene Log-Aktionsnamen; Formularstatus und Toast bleiben getrennt.
- API: `GET /admin-api/global`, `POST /admin-api/global/preview` und `PATCH /admin-api/global/snapshot`; zusätzliche Operation `change_xtream_host` für Host-Wechsel mit individuellen Zugangsdaten.
- Validierung: 46 gezielte Backend-/Admin-/Logging-Tests erfolgreich. Browserprüfung mit isolierten Testaccounts für Aktionswechsel, Xtream-/StreamNet-TV-Eingabe, Host-Wechsel, Vorschau, Bestätigung und Abbruch; keine echten Accounts verändert.
- Rollout: Backend und Adminoberfläche neu deployen; für den Erhalt der Host-Vorgabe auch die aktualisierte WebUI ausrollen. Eigene StreamNet-TV-Hosts benötigen zusätzlich die aktualisierte APK. Keine neue Datenbankmigration erforderlich. Geräte übernehmen Änderungen beim nächsten Cloud-Pull.
- Status: Noch nicht live deployed; die Backend-Versionsnummer wurde nicht erhöht. Bedienung und API sind zusätzlich im [Backend-Handbuch](backend-cloud/README.md#remote-config-global-playlists-and-add-ons) dokumentiert.

## [2.5.063] - 2026-10-12

- Android: Plex-, Jellyfin- und Emby-Überschriften in den Heimserver-Pairinghinweisen verwenden die aktive Akzentfarbe und eine stärkere Schrift.

- Android: Heimserver-Code-Dialog erklärt Plex-Erkennung und Netzwerkerreichbarkeit, Jellyfin Quick Connect und den separaten Emby-Anmeldeweg. Hinweise stehen vollständig im scrollbaren Formular.
- Android: Plex-Link-QR und Anmeldebutton belegen den kurzen Code über den von der Plex-Seite verwendeten token-Parameter vor; Bestätigung bleibt erforderlich. Scheitert nach der Kontofreigabe die Serververbindung, erscheint ein verständlicher Netzwerkhinweis mit erhaltener Fehlerursache.

- Android: Plex-Pairing verwendet kurze Link-Codes statt langer Auth-Codes; QR-Code und mobile Anmeldung führen zu plex.tv/link. Deutsche und englische Hinweise erklären die Code-Eingabe. Jellyfin Quick Connect bleibt unverändert.
- Android: Trakt und SIMKL zeigen während des laufenden Autorisierungs-Pollings denselben Ladeindikator wie Heimserver-Pairing.

- Android: Auch Trakt- und SIMKL-Aktivierungsdialoge verwenden den Exit-Stil: abgerundete Karte mit Akzentverlauf, Icon-Kopfzeile, hervorgehobener Aktivierungscode und neutraler Abbrechen-Button. QR-Code, Autorisierungsstatus sowie mobile Aktionen zum Öffnen der Anmeldeseite und Kopieren des Codes bleiben erhalten.

- Android: Oberfläche steht in der TV-Einstellungsnavigation an erster Stelle der Kategorie Profile. Addons aktualisieren und Addon hinzufügen stehen auf TV vor den installierten Addons; D-Pad-Fokus, Scrollziele und Aktionszuordnung folgen der neuen Reihenfolge.
- Android: MDBList-Verbindung und Katalogsuche verwenden den neuen Dialogstil mit Akzentverlauf, abgerundeter Karte, klarer Kopfzeile und neutralen bzw. akzentfarbenen Buttons. Der MDBList-Dialog bleibt auch auf TV auf eine kompakte Breite begrenzt; die Katalogsuche behält Platz für Ergebnisse und beide Eingabewege.

- Android: Gemeinsame Einstellungs-Eingabedialoge (unter anderem Addon, Heimserver, IPTV und Katalog) im neuen Exit-Dialog-Stil: kompaktere TV-Breite, weiche Ecken, dezenter Akzentverlauf, klarere Abstände und abgerundete Eingabefelder. Abbrechen und Einfügen verwenden neutrale Konturen, Bestätigen eine Akzentfüllung mit kontrastierender Fokusschrift. Tastatur-, Einfüge- und D-Pad-Verhalten bleiben unverändert.

- Android: Neuer profilbezogener Beschreibungsmodus unter Darstellung: Der TV-Home-Hero scrollt wahlweise langsam automatisch (bisheriger Standard) oder zeigt vier Zeilen mit Ellipsis. Die Einstellung wird live übernommen und per Cloud synchronisiert; ältere Backups überschreiben sie nicht.
- Android: Details zeigen den vollständigen Beschreibungstext direkt im Hero, auf TV mit breiterer Textfläche und ohne Ellipsis oder Text-Autoscrolling. Logo, Metadaten, Beschreibung und Aktionen bilden einen gemeinsamen Seitenabschnitt; bei sehr langen Texten bewegt das D-Pad die gesamte Seite. Der separate Beschreibungsblock entfällt, Home-Hero-Einstellungen bleiben unverändert.
- Android: Überarbeiteter Beenden-Dialog mit Akzentverlauf und klarer Titelhierarchie. Buttons verwenden den Stil des Discord-Dialogs: Abbrechen mit neutraler Kontur und grauer Fokusfüllung; App schließen mit dezenter Akzentfüllung und Akzentkontur, im Fokus vollflächig in Akzentfarbe mit kontrastierender Schrift. Kein Zoom; Abbrechen bleibt vorausgewählt.
- Android: Die vollständige Beschreibung im TV-Detail-Hero nutzt eine schmalere Textfläche (56 statt 68 Prozent), damit mehr vom Hintergrundmotiv sichtbar bleibt. Der volle Text und die Seitennavigation bleiben erhalten.

- Android: Beim Öffnen eines Suchergebnisses (auch KI-Suche und D-Pad-Auswahl) und beim Verlassen des aktiven Suchbildschirms werden Suchbearbeitung, Eingabefokus und Bildschirmtastatur beendet. Die Suche darf die Tastatur nur im aktiven Bildschirm öffnen, damit kein alter Eingabefokus bis in Details oder Wiedergabe erhalten bleibt.

- Android: Die JSON-Response-Absicherung gilt zentral für alle 15 Gson-basierten Retrofit-Konfigurationen, nicht nur TVDB (unter anderem TMDB, Kitsu/Stream-API, Trakt und Cloud-APIs). JSON-Parsingfehler werden mit ursprünglicher Ursache und Antwortmodell als IO-Anfragefehler weitergereicht; es werden keine leeren Erfolgsantworten erfunden. Gültige Antworten und Request-Serialisierung bleiben unverändert.

## [2.5.062] - 2026-10-10

- Android: Ungültige JSON-Antworten der TVDB-API werden bereits im Retrofit-Response-Converter in behandelbare IO-Anfragefehler umgewandelt, insbesondere ein Objekt statt einer Liste bei `data`. Die bestehende IPTV-Artwork-Fehlerbehandlung protokolliert den Fehler und kann erneut laden, statt die App zu beenden. Gültige Such-/Artwork-Listen und Login-Antworten bleiben unverändert.

- !!!! ES KANN SEIN DASS BEIM UPDATE EIN PARSING FEHLER PASSIERT. EINFACH NEU INSTALLIEREN UND CLOUD VERBINDEN !!!!!

- Android-Version `2.5.062` / Code `463`.

## [2.5.061] - 2026-10-10

- Android: Die JSON-Response-Absicherung gilt zentral für alle 15 Gson-basierten Retrofit-Konfigurationen, nicht nur TVDB (unter anderem TMDB, Kitsu/Stream-API, Trakt und Cloud-APIs). JSON-Parsingfehler werden mit ursprünglicher Ursache und Antwortmodell als IO-Anfragefehler weitergereicht; es werden keine leeren Erfolgsantworten erfunden. Gültige Antworten und Request-Serialisierung bleiben unverändert.

- Android: Marvel-Timeline-Unterrubriken verwenden die aktive Akzentfarbe. Fehlgeschlagene HTTP-/Netzwerk-Metadatenabfragen einzelner Einträge blockieren nicht mehr die ganze Seite: Die Karte bleibt mit exaktem Label, echtem Detail-Ziel und lokalisiertem Fehlerhinweis erhalten; spätere Phasen können weiter geladen werden. Fehlgeschlagene Metadaten werden nicht als erfolgreich geladen gecacht.

- Android: Marvel-Timeline-Unterrubriken verwenden deutsche bzw. englische Originaltexte der Website entsprechend der App-Sprache. Auch die Kartenbegriffe Film/Movie und Folgen/Episodes sind lokalisiert; Titel, Reihenfolge und Navigationsziele bleiben erhalten.

- Android: Die Marvel-Timeline zeigt zusätzlich alle 15 deutschen Unterrubriken der Website als thematisierte, vollbreite Abschnittsüberschriften. Die 168 Karten bleiben in derselben Reihenfolge; Pagination, sichtbare Karten und Fokuswiederherstellung berücksichtigen die zusätzlichen Überschriften. Andere Sammlungen bleiben unverändert.

- Android: Die Marvel-Timeline verwendet den geprüften Abruf der Story-Reihenfolge von marvelwatchlist.com/de/ vom 10.10.2026 mit 168 getrennten Karten und den Labels der Prüfliste, einschließlich Typ, Staffeln und Episodenblöcken. Abspannszenen führen zu den zugehörigen Film-/Seriendetails, nicht zu erfundenen eigenständigen Quellen. Diese Timeline wird auch im IPTV-only-Modus vollständig angezeigt; Quellenverfügbarkeit wird erst in den Details geprüft. Filme/Serien-Reiter und andere Timelines bleiben unverändert. Der Stand ist ein gebündelter Snapshot, kein Live-Scraping.

- Android: Nur die Franchise-Reiter Filme und Serien werden nach Veröffentlichungsdatum aufsteigend sortiert (älteste zuerst), bei Serien nach Erstausstrahlung. Die Sortierung erfolgt vor der Seiteneinteilung; fehlende Datumsangaben stehen am Ende. Timeline und andere Sammlungen behalten ihre bisherige Reihenfolge.
- Android: Die Harry-Potter-Franchise enthält zusätzlich die neue Serie über die feste TMDB-Referenz `tv:224377`. Die bisherigen Filmquellen bleiben erhalten; die Serienkarte verwendet reguläre TMDB-Metadaten und setzt keine verfügbaren Abspielquellen voraus.
- Android-Version `2.5.061` / Code `462`.

## [2.5.060] - 2026-10-10

- Android: Nur die Franchise-Reiter Filme und Serien werden nach Veröffentlichungsdatum aufsteigend sortiert (älteste zuerst), bei Serien nach Erstausstrahlung. Die Sortierung erfolgt vor der Seiteneinteilung; fehlende Datumsangaben stehen am Ende. Timeline und andere Sammlungen behalten ihre bisherige Reihenfolge.

- Android: Die Harry-Potter-Franchise enthält zusätzlich die neue Serie über die feste TMDB-Referenz `tv:224377`. Die bisherigen Filmquellen bleiben erhalten; die Serienkarte verwendet reguläre TMDB-Metadaten und setzt keine verfügbaren Abspielquellen voraus.

- Android TV: Beim Verlassen von Home erscheint eine Bestätigung zum Schließen der App. Das Popup verwendet Theme-Oberflächen, ein dezentes Schließen-Symbol und kompakte, gleich große abgerundete Buttons mit zentrierter Beschriftung und Akzentrahmen statt farbiger Fokusfüllung oder Zoom. „Abbrechen“ ist vorfokussiert und Zurück verwirft die Bestätigung.
- Android TV: In der gesamten TVUI-Navigation (auch Home, Mediathek, Suche, Details und Einstellungen) wird „Downloads“ nur angezeigt, solange die Download-Liste mindestens einen Eintrag enthält. Die Navigation aktualisiert sich live beim Hinzufügen oder Entfernen von Downloads; der fokussierte Navigationseintrag bleibt beim Ein-/Ausblenden erhalten. Die mobile Navigation bleibt unverändert.
- Android TV: IPTV-VOD-Titelsuche gibt bei Fallbacks keine Ergebnisse mehr nur wegen einzelner gemeinsamer Titelwörter aus. Titel müssen nach Normalisierung exakt übereinstimmen; bekannte Erscheinungsjahre dürfen höchstens ein Jahr abweichen. ID-Treffer bleiben bevorzugt, und derselbe strengere Titelabgleich gilt auch für Episoden-/Serien-Fallbacks.
- Android TV: Home-Skeletons verwenden jetzt die Oberflächenfarben des aktiven Themes statt einer fest codierten bläulich-violetten Palette. Der aktive Akzentton wird nur dezent zur Shimmer-Mitte gemischt; Poster- und Querformat-Rails behalten passende Kartenkonturen.
- Android TV: Beim Trakt-Abgleich der Merkliste wird der Repository-Cache nicht mehr vorübergehend geleert. Die synchronisierte Liste ersetzt den Cache direkt, damit die Merkliste beim Zurückkehren aus einer Detailansicht nicht kurzzeitig als leer erscheint.
- Android TV: Beim Öffnen des Netflix-TV-Layouts kann die Programmbild-Suche den TVDB-Such-/Artwork-Fallback aufrufen. Ungültiges JSON aus diesen IPTV-Artwork-Anfragen (unter anderem ein Objekt, wo `data` als Array erwartet wird) wird als wiederholbarer Antwortfehler behandelt statt als gültiger leerer Treffer oder ungefangene Gson-Ausnahme.
- Android-Version `2.5.060` / Code `461`.

## [2.5.059] - 2026-10-10

- Android TV: Der Quellendialog markiert fokussierte Quellen, Filter, Addon-Tabs und Aktualisieren-/Anfragen-/Download-Aktionen nur mit dem Akzentrahmen statt mit einer farbigen Fokusfüllung. Neutrale Grundflächen und Auswahlmarkierungen bleiben erhalten; Texte und Icons bleiben auf dunklem Hintergrund lesbar. Mobile Darstellung und Quellenbedienung bleiben unverändert.
- Android TV: Das Download-Symbol und sein Rahmen sind im Quellendialog ohne Fokus neutral grau; erst beim Fokus wird die Akzentfarbe verwendet. Die fokusabhängige Hintergrundfüllung bleibt entfernt.
- Android-Version `2.5.059` / Code `460`.

## [2.5.058] - 2026-10-10

- Android: Der Home-Hero zeigt beim Nachladen einer fehlenden Beschreibung keinen englischen Ersatztext mehr. Der Beschreibungsbereich bleibt stabil reserviert; vorhandene Beschreibungen werden auch bei leerem Hero-Override verwendet. Ersatztexte außerhalb des Heros verwenden die vorhandene Übersetzung.
- Android: Home veröffentlicht die erste TMDB-Seite und jeden fertigen Zusatzkatalog unabhängig von langsameren Reihen. Zusatzkataloge starten parallel zu TMDB mit begrenzter Parallelität und behalten die Profilreihenfolge; vorhandene Inhalte bleiben bedienbar.
- Android: TMDB-Reihen werden nach der ersten Seite auf bis zu 40 Einträge erweitert. Zusatzkataloge laden mit einem gleichzeitigen Kataloglauf auf Geräten mit wenig RAM und zwei auf anderen Geräten. Späte Anfangsergebnisse kürzen keine passenden Seiten, die beim Scrollen bereits nachgeladen wurden; fehlgeschlagene Zusatzkataloge behalten vorhandene Cache-Inhalte.
- Android: Lokale TV-Favoriten erscheinen bereits vor dem Addon-/Home-Server-Katalogabgleich. Der bisherige zusätzliche Startaufschub für gecachte Home-Inhalte entfällt; Artwork-Warmups bleiben verzögert.
- Android: Gleichzeitige Home-Reload-Auslöser werden zu einem Folgelauf zusammengefasst, statt laufende Kataloganfragen immer wieder abzubrechen. Profil- und Sprachwechsel verwerfen weiterhin alte Ergebnisse. Katalogänderungen außerhalb des laufenden Abgleichs starten das Laden neu, damit entfernte und umsortierte Reihen zeitnah berücksichtigt werden.
- Android: TV-Favoriten und zuletzt verwendete TV-Sender werden aus dem lokalen Snapshot vor den TMDB-/Zusatzkatalogen veröffentlicht. Späte Logo-Antworten ersetzen keine inzwischen aktualisierten Home-Reihen oder fokussierten Hero-Einträge mehr.
- Android: Sichtbare TV-Karten, der Home-Hintergrund und die Sendungsdetails beobachten gemeinsame Artwork-Ergebnisse. Später gefundene Bilder ersetzen den Fallback ohne vollständigen Home-Reload; vorübergehende Netzwerkfehler werden während der Anzeige nach einer Minute erneut versucht.
- Android: Fanart und Logo teilen die Sendungssuche. Fehlgeschlagene oder abgebrochene Suchen werden nicht als vollständige Suchergebnisse oder als zehnminütiger „kein Treffer“ gespeichert. Echte fehlende Treffer behalten ihre bisherige Cache-Dauer.
- Android: Lokale `HomePerf`-Diagnosen unterscheiden TV-Reihen, TMDB-Ergebnisse, Zusatzkataloge und die Veröffentlichung der Katalogreihen. Eine allgemeine Beschleunigung auf realen Geräten ist damit noch nicht nachgewiesen.
- Android: Bei einer noch nicht gestarteten Serie zeigt der Abspielbutton „Start S01 E01“. Das Nachladen der Episoden, die Rückkehr zur Detailseite und die Anime-Staffelzuordnung ersetzen den Start-Text nicht mehr fälschlich durch „Fortsetzen“. Vorhandene Wiedergabepositionen und spätere Episodenziele behalten die Fortsetzen-Beschriftung.
- Dokumentation: Der Android-Quellenabgleich für das NZB-Profil `cyb3rgh05t` (Profil 04) beschreibt Sortierung, Filter und Darstellung einschließlich der Grenzen des statischen Abgleichs; die aktive serverseitige Profilauswahl wurde nicht anhand einer Live-Antwort bestätigt. Die IPTV-Artwork-Dokumentation erläutert die progressive Home-Ladekette und den leeren Hero-Beschreibungsbereich beim Nachladen.
- Validierung am 10.10.2026: 67 gezielte Tests für Artwork, Sendungstitel, Home-Reihen, progressive Katalogveröffentlichung und Serien-Abspielbeschriftung bestanden. Nach der Hero-Korrektur bestanden zusätzlich die erneut ausgeführten 37 Home-Reihentests einschließlich zweier neuer Beschreibungsprüfungen. Debug-APK-Builds und Emulator-Updates waren erfolgreich; App-Daten wurden nicht gelöscht.
- Emulatorbeobachtung: Der Nutzer bestätigte nachladende Sendungsbilder sowie früh bedienbares Home mit funktionierendem Scrollen und Öffnen. Beobachtete cachegestützte Läufe veröffentlichten lokale TV-Reihen nach etwa 0,1–0,7 Sekunden und Katalogreihen nach etwa 0,4–0,94 Sekunden ab Beginn des Home-Laufs. Dies sind keine Zeiten bis zum Wiedergabestart und kein kontrollierter Vorher-/Nachher-Vergleich; Activity-Kaltstart und Frame-Messungen belegen bislang keine allgemeine Beschleunigung auf realen Geräten.
- Auslieferungsstand: Nur lokale Debug-Updates auf dem Emulator; Android-Version bleibt `2.5.058` / Code `459`. Kein Versionssprung, Commit, Push oder Produktionsrelease für diese Änderungen.

## [2.5.057] - 2026-10-07

- Android: Home („Favorite TV“ und „Recently Watched TV“) und das Netflix-Live-TV-Layout teilen den Cache für Sendungsfanarts und -logos. Gleichzeitige Anfragen für dieselbe Sendung werden zusammengefasst; Sprache und die Filmbewertung anhand der Laufzeit bleiben getrennt.
- Netflix-Live-TV verwendet dieselben senderbezogenen Ersatzbilder wie Home. Kategorie- und Länderfilter ändern die Senderauswahl, nicht mehr das Ersatzbild; Länderkennung aus Sendergruppe und -name wird auf beiden Screens gleich ausgewertet.
- Fehlende Artwork-Treffer werden gemeinsam zehn Minuten gespeichert und bei Daten-/Playlist-Refresh freigegeben. Fehlgeschlagene oder abgebrochene Anfragen werden nicht als erfolgreiche Cache-Ergebnisse gespeichert.
- Der gemeinsame Cache ist auf jeweils 256 Fanarts und Logos begrenzt. Bereits gefundene Bild-URLs werden beim Wechsel zwischen Home und Live TV wiederverwendet; eine Beschleunigung des gesamten Home-Starts wurde nicht gemessen. Unterschiedliche EPG-Aktualisierungsstände bei Sendungswechseln bleiben möglich.
- 46 Regressionstests prüfen unter anderem gemeinsame Treffer, parallele Anfragen, Sprache/Laufzeit, Ablauf fehlender Treffer, Refresh, Fehler/Abbruch, Cache-Begrenzung und senderbezogene Ersatzbilder.
- Android-Version: `2.5.057` / Code `458`.

## [2.5.056] - 2026-10-07

- Im Profilselector steht „StreamNet Cloud“ jetzt als gleich große Kachel direkt neben „Profil hinzufügen“. Die Cloud-Kachel behält ihre goldenen StreamNet-Akzente und bleibt nach erfolgreicher Verbindung ausgeblendet.
- Android-Version: `2.5.056` / Code `457`.

## [Web 1.0.065] - 2026-10-06

- IPTV-Fallback löst bereits vorhandene App-Relay-URLs derselben Origin vor dem Aufbau neuer Wiedergabeversuche zur ursprünglichen Provider-URL auf. Dadurch werden App-Proxy-Links nicht erneut als Media-Ziel an Proxy oder Resolver geschickt.
- Audio-Konvertierung erhält die Provider-URL statt eines verschachtelten App-Relay-Links. Bereits konvertierte Streams werden direkt abgespielt und nicht erneut durch die IPTV-Provider-Fallback-Kette geschickt.
- Der explizite MPEG-TS-Test bleibt TS-only; normaler STREAMNET-Live-Start behält HLS mit begrenztem TS-Fallback.
- Ungültige oder zu tief verschachtelte Relay-URLs melden einen Fehler; fremde Proxy-Origins werden nicht entpackt. Bestehende serverseitige Hostbeschränkungen bleiben unverändert.
- Regressionstests prüfen bestehende und verschachtelte App-Relay-Links, unveränderte Konvertierungs-/Fremd-URLs sowie ungültige Relay-Ziele. Die gekürzten Produktionsrequests allein belegen nicht die Ursache aller gemeldeten HTTP-502-Antworten.
- Web-Version: `1.0.065`. Android bleibt bei `2.5.055` / Code `456`.

## [2.5.055] - 2026-10-06

- Continue Watching ist zwischen Android und Web angeglichen: aktive Resume-Einträge werden vor abgeschlossenen Einträgen bevorzugt, Position und Fortschritt stammen aus demselben Datensatz. Anzeigegrenzen und Prozent-Rundung sind vereinheitlicht.
- Cloud-Verlauf ohne `user_id` wird dem authentifizierten Konto zugeordnet, statt beim Einlesen die gesamte Liste zu verwerfen. Episoden bleiben bis zur Zusammenführung erhalten; vorhandener Wiedergabefortschritt wird nicht wegen eines zukünftigen Metadaten-Ausstrahlungsdatums ausgeblendet.
- Einträge ohne Zeitstempel werden nur durch eine tatsächlich vorhandene spätere Entfernung ausgeblendet. Debug-Diagnosen für den Cloud-Verlauf enthalten nur Zähler und Fehlertypen.
- Franchise-Timelines laden über bisherige Seitengrenzen hinaus. Die Pagination berücksichtigt verbrauchte Katalogreferenzen statt nur erfolgreich aufgelöster Karten; das Quellenbudget wächst bei Bedarf.
- StreamNet-NZB-Quellen behalten die Addon-Reihenfolge. Smart Play steht in der manuellen Auswahl oben; automatisches Abspielen und dessen Vorladen verwenden konkrete Releases innerhalb der bisherigen Provider-Priorität. Ist nur Smart Play vorhanden, wird zur manuellen Auswahl aufgefordert.
- NZB-Karten zeigen mitgelieferte formatierte Angaben zu Audio, Codec, Gruppe, Bitrate, Sprache, Indexer, Dateianzahl, Datum und Health als umbrechende Detailfelder. Fehlende Angaben werden nicht erfunden; Cache-Status wird nicht als bestandener Health-Check dargestellt.
- TV-Quellenkarten zeigen links über den Badges den Katalogtitel und, sofern erkannt, das Erscheinungsjahr in Klammern. Rechts bleiben Release-Dateiname und Addon-Details erhalten.
- Der Ladezähler benennt abgeschlossene Addon-Abfragen statt einzelner Streams. Vor Beginn der Suche erscheint ein Vorbereitungsstatus ohne vorzeitige Prozentanzeige.
- Zurück und Escape schließen die im Player geöffnete Quellenauswahl, ohne die Wiedergabe zu verlassen; auch der übergeordnete Player-Keyhandler fängt diesen Fall ab. Das normale Zurück-Verhalten außerhalb der Auswahl bleibt unverändert.
- Untersucht, nicht behoben: Ein möglicherweise erst beim zweiten Zurück-Druck reagierender Detailscreen. Das Diagnose-Log belegt zwei Android-Back-Ereignisse, aber nicht den jeweils zuständigen App-Handler oder Fokuszustand.
- Android-Version: `2.5.055` / Code `456`.

## [Web 1.0.064] - 2026-10-06

- STREAMNET TV verwendet für Live TV, Catch-up und Xtream-VOD einen eingeschränkten App-Relay als primären Wiedergabepfad; der Resolver bleibt Fallback. Playlists, Segmente, Schlüssel und Redirects bleiben hostbeschränkt, mit begrenzter Playlist-Größe.
- App und Resolver erlauben die benötigten zusätzlichen Provider-Mediahosts; Audio-Konvertierung verwendet dieselben Standardhosts. Beliebige Fremdhosts werden nicht freigeschaltet.
- Live-Wiedergabe startet mit HLS. Bei geeigneten STREAMNET-Live-Mediafehlern wird MPEG-TS versucht; ein begrenzter Rückwechsel zu HLS verhindert endlose Decoder-Wechsel. Netzwerkfehler behalten die Resolver-Fallbacks.
- HLS-Media-Recovery verarbeitet doppelte Fehlerbenachrichtigungen nicht mehrfach, wartet länger auf Wiederherstellung und verhindert konkurrierende Watchdog-Wechsel. Ein manueller MPEG-TS-Test und bereinigte Wiedergabediagnosen erleichtern die Fehlersuche.
- Der Audio-Watchdog reagiert bei IPTV nach drei Sekunden tatsächlich fortschreitender Wiedergabe ohne neu dekodiertes Audio; andere Quellen behalten acht Sekunden. Audio-Initialisierungsfehler können die vorhandene AAC-Konvertierung auslösen.
- Interne Live-Quellenwechsel und Audio-Konvertierung erhalten Kanal-, Dock- und Layoutzustand, statt den Player neu einzuhängen oder die Ansicht ungewollt zu vergrößern.
- Cloud-Verlauf leitet `profile_id` unverändert an den Backend-Proxy weiter und verwirft fremde Profile auch im Client. Fortschritt erhält einen gültigen Zeitstempel; fehlende Entfernungsmarkierungen verwerfen keine alten Resume-Einträge.
- Wiedergabefortschritt wird unabhängig von einem Tracking-Dienst synchronisiert. Fehlgeschlagene externe Fortschrittsbestätigung zeigt einen Fehler und bleibt für erneute Bestätigung verfügbar; der Browser kann den VLC-Wiedergabestand nicht automatisch auslesen.
- Die manuelle NZB-Quellenauswahl erhält die Addon-Reihenfolge mit Smart Play oben. Browser-Kompatibilitätswarnungen und automatisches Fehler-Fallback behalten ihre bisherige Bewertung.
- Regressionstests für Relay, Media-Recovery, Audio-Watchdog, Cloud/Profile und NZB-Reihenfolge ergänzen die bestehenden Prüfungen.
- Web-Version: `1.0.064`.

## [2.5.054] - 2026-10-02

- IPTV-only bleibt aktiv und IPTV-VOD-Suche eingeschaltet, solange kein aktiviertes VOD-Streaming-Addon installiert ist. Der Schalter ist dann auf Touch-Geräten und TV deaktiviert; Subtitle-, Metadaten- und reine Katalog-Addons zählen nicht als Streaming-Addon.
- Das erstmalige Installieren eines Addons mit einer VOD-fähigen `stream`-Ressource kann IPTV-only wie vorgesehen ausschalten. Wird das letzte VOD-Streaming-Addon entfernt, werden IPTV-only und IPTV-VOD-Suche wieder eingeschaltet.
- Alte lokale und aus der Cloud wiederhergestellte IPTV-only-Werte werden mit den installierten Addon-Fähigkeiten abgeglichen und profilbezogen synchronisiert. Ein Cloud-Restore kann die Sperre ohne VOD-Streaming-Addon nicht mehr umgehen.
- Feste englische Status- und Toastmeldungen für Addons, IPTV, Cloud-Sync, Trakt und Profil-PIN sind in deutsche und englische Android-Ressourcen ausgelagert. Offline-Download-Systemmeldungen verwenden die vorhandenen Media3-Übersetzungen.
- Android-Version: `2.5.054` / Code `455`.

## [2.5.053] - 2026-10-01

- Das Quellenfenster zeigt den Leerzustand erst, wenn Addon-, Home-Server-, IPTV-VOD- und Plugin-Suche für dieselbe Anfrage abgeschlossen sind; bereits gefundene Quellen erscheinen weiterhin sofort. Ein alter Plugin-Job wird beim erneuten Laden abgebrochen.
- Leere Stream-Cache-Ergebnisse gelten nicht mehr als endgültiger Treffer für spätere Anfragen. Das StreamNet-NZB-Addon erhält für serverseitige Suchen die vorhandenen Aggregator-Timeouts (20 Sekunden für Filme, 25 Sekunden für Episoden), damit langsame Antworten nicht vorschnell als quellenlos gelten.
- Android übernimmt Indexernamen aus `meta.indexer` der Addon-Antwort und zeigt sie direkt neben dem Addonnamen in der Quellenliste an. Der Stream-Cache-Schlüssel ist einmalig versioniert, damit alte Einträge ohne Indexer nicht angezeigt werden.
- „Wer schaut gerade?“ ist im Profilselector auf Touch-Geräten und TV kleiner dargestellt.
- Android-Version: `2.5.053` / Code `454`.

## [2.5.052] - 2026-09-30

- Franchise-Tabs erhalten auf TV gleich große, zentrierte Schaltflächen; drei sichtbare Tabs teilen die Breite in Drittel, zwei Tabs in Hälften.
- Android-Version: `2.5.052` / Code `453`.

## [2.5.051] - 2026-09-30

- Das Quellenfenster zeigt während der Addon-Suche den Ladehinweis und einen Spinner; schnelle Antworten bleiben mindestens kurz sichtbar, bevor Treffer erscheinen.
- Der Empty-State mit Aktualisieren- und Anfrage-Aktionen erscheint erst, wenn die Suche beendet und die Ergebnisliste weiterhin leer ist.
- Quellen aktualisieren erzwingt einen neuen Addon-Abruf und verwendet nicht erneut ein frisches Stream-Cache-Ergebnis.
- Franchise-Tabs passen sich auf Touch-Geräten an die verfügbare Breite an und zentrieren ihre Beschriftungen.
- Wiedergabefehler bei fehlenden Quellen oder nicht eingerichteten Streaming-Add-ons sind auf Deutsch lokalisiert.
- Android-Version: `2.5.051` / Code `452`.

## [2.5.050] - 2026-09-29

- Kataloge bleiben in Android Settings sichtbar und lassen sich pro Zeile ein-/ausschalten; versteckte Konfigurationen bleiben fuer Reaktivierung und profilbezogenen CloudSync erhalten.
- Marvel-, DC- und Star-Wars-Collection-Addons werden auch beim Rekonstruieren der Settings-/Cloud-Katalogliste ausgefiltert; Sichtbarkeitstoggles zeigen nur das Auge.
- Franchise-Film-/Serienquellen werden bereits beim initialen Laden nach Tab gefiltert. Ein quellenuebergreifender TMDB-Popularitaets-Lookahead stabilisiert die erste Seite; Film-/Serientabs laden parallel, Timeline bleibt chronologisch. D-pad-Up aus der ersten Kartenreihe fokussiert den aktiven Tab.
- Android-Version: `2.5.050` / Code `451`.

## [Web 1.0.062] - 2026-09-29

- Decades-Rails werden nur ueber aktivierte Rail-Kataloge gerendert und koennen nicht durch Collection-Kacheln wieder erscheinen.
- Web-Version: `1.0.062`.

## [2.5.049] - 2026-09-29

- Decade-Cover verwenden jetzt die korrekten Asset-Pfade unter `artworks/decades/`.
- Die Decades-Home-Rail wird bei Neuinstallationen vorinstalliert und bei bestehenden Profilen automatisch ergänzt.
- Decade-Collections laden Filme direkt über öffentliche MDBList-JSON-Listen und benötigen dafür kein installiertes `aio-metadata`-Addon.
- Decades sind explizit als Filme typisiert; der nicht verfügbare Serien-Tab wird auf Android und Web ausgeblendet.
- Franchise-Film-/Serienquellen werden vor dem ersten Page-Slice quellenweise gemischt und ein 32-Titel-Lookahead nach TMDB-Popularität, Rating und Titel sortiert; Timeline-Reihenfolge bleibt unangetastet.
- Film- und Serientabs werden nach dem initialen Tab parallel nachgeladen. D-pad-Up aus der ersten Kartenreihe fokussiert wieder den ausgewählten Tab.
- Die Android-Katalogeinstellungen zeigen ausgeblendete Kataloge weiterhin an und schalten jeden Katalog einzeln; Aktivstatus und vollständige Katalogdefinitionen werden profilbezogen über CloudSync übertragen.
- Android-Version: `2.5.049` / Code `450`.

## [Web 1.0.061] - 2026-09-29

- Die Decades-Rail ist jetzt auch im Web vorinstalliert und steht hinter den Franchises.
- Alle sieben Jahrzehnt-Collections laden ihre Filme direkt von öffentlichen MDBList-JSON-Listen und benötigen kein `aio-metadata`-Addon.
- Web-Version: `1.0.061`.

## [2.5.048] - 2026-09-29

- Android-Collections verwenden jetzt wie Web drei Tabs in der Reihenfolge Timeline, Filme und Serien.
- Marvel-, DC- und Star-Wars-Timelines laden die direkten chronologischen MystreamNet-Manifeste und bewahren deren Reihenfolge.
- Film- und Serien-Tabs verwenden getrennte Quellen aus kombinierten Manifest-Catalogs und werden nach TMDB-Popularität, Rating und Titel sortiert.
- Collection-Artworks verwenden die neue Repository-Struktur; Franchise-Cover sind auf Asset-Commit `afacc40e5ab7202219749aaec497c5a4bdf3e27b` gepinnt und Service-/Genre-/Video-Assets auf `3b8094a6d97084a54dfbe7779f904886e801a3fb`.
- Starz verwendet jetzt das vorhandene Landscape-Cover aus dem Streaming-Service-Asset-Verzeichnis.
- Android-Version: `2.5.048` / Code `449`.

## [Web 1.0.060] - 2026-09-29

- Franchise-Cover verwenden den neuesten Asset-Commit `afacc40e5ab7202219749aaec497c5a4bdf3e27b`; allgemeine Collection-Artworks bleiben auf dem geprüften Asset-Commit `3b8094a6d97084a54dfbe7779f904886e801a3fb`.
- Web-Version: `1.0.060`.

## [Web 1.0.059] - 2026-09-29

- Marvel, DC Universe und Star Wars haben jetzt drei Collection-Tabs: Timeline, Filme und Serien. Timeline steht zuerst.
- Timeline verwendet ausschließlich die direkten chronologischen MystreamNet-Manifeste und bewahrt deren Reihenfolge. Filme und Serien verwenden getrennte Release-Order-/TMDB-/MDBList-/kuratierte Quellen.
- Film- und Serienkarten werden nach TMDB-Popularität sortiert; Timeline-Karten bleiben chronologisch. Laufzeit-/Minutenlabels werden in Serien- und Timeline-Tabs ausgeblendet.
- Der direkte Manifest-URL bleibt auch bei einem alten installierten Addon maßgeblich, damit ein veralteter Addon-Katalog die Collection nicht verkleinert.
- Web-Version: `1.0.059`.

## [Web 1.0.058] - 2026-09-28

- Marvel-, DC- und Star-Wars-Franchise-Kataloge lösen ihre IMDb-Manifest-IDs vor der Anzeige zu TMDB-IDs auf. TMDB liefert damit breite Backdrops und Beschreibungen in der eingestellten App-Sprache statt hochkantiger Addon-Poster oder englischer Platzhaltertexte.
- Der TMDB-Detailcache trennt Sprachen; alte Collection-Rail-Caches werden einmalig invalidiert. Falls TMDB nicht erreichbar ist, wird ein vorhandenes Hochkantposter vollständig statt beschnitten angezeigt und keine englische Manifest-Beschreibung als deutsche ausgegeben.
- Web-Version: `1.0.058`.

## [Web 1.0.057] - 2026-09-28

- Manuelles Auswählen einer anderen Quelle übernimmt jetzt immer die gespeicherte Fortschrittsposition des Titels, auch wenn dieser bereits als „gesehen“ markiert ist. Vorher wurde die Position bei bereits gesehenen Titeln verworfen und die neue Quelle startete bei 0.
- Web-Version: `1.0.057`.

## [2.5.046] - 2026-09-28

- Collection-only Add-ons für Marvel, DC Universe und Star Wars werden jetzt direkt an der gemeinsamen Add-on-Lese- und Persistenzschicht ausgefiltert.
- Alte Cloud-Snapshots können diese Add-ons dadurch nach dem Home-Startup-Cleanup nicht mehr erneut in die Add-on-Einstellungen eintragen.
- Die direkten MystreamNet-Manifestquellen der Franchise-Collections bleiben davon unberührt und funktionieren weiterhin ohne installierte Add-on-Karten.
- Android-Version: `2.5.046` / Code `447`.

## [2.5.045] - 2026-09-28

- Add-on-Installation, Konfiguration, Reihenfolge und Entfernung sind jetzt eindeutig accountweit; alle Profile verwenden dieselbe installierte Add-on-Bibliothek.
- Der Aktivierungsstatus eines installierten Add-ons wird getrennt pro Profil gespeichert. Ein Umschalten in einem Profil verändert die anderen Profile nicht.
- Android speichert Profilaktivierungen separat von der gemeinsamen Add-on-Konfiguration und exportiert beziehungsweise restauriert beide Ebenen über den Cloud-Snapshot.
- Android-Version: `2.5.045` / Code `446`.
- Technische Doku: `docs/superpowers/account-wide-addons-profile-activation-2026-09-28.md`.

## [Web 1.0.056] - 2026-09-28

- Im Web installierte Add-ons werden accountweit für alle bekannten Profile verfügbar; der Ein-/Aus-Schalter bleibt profilbezogen.
- Add-on-Updates bewahren die Aktivierungswerte aller anderen Profile. Entfernen löscht das Add-on ausdrücklich aus der globalen Bibliothek und allen Profilbereichen.
- Web-Version: `1.0.056`.
- Technische Doku: `docs/superpowers/account-wide-addons-profile-activation-2026-09-28.md`.

## [Backend 1.0.021] - 2026-09-28

- Add-ons können im Adminpanel ohne Profilauswahl accountweit hinzugefügt, aktualisiert und entfernt werden; Playlists bleiben profilbezogen.
- Admin-Mutationen aktualisieren den globalen Payload und alle Profilbereiche atomar, ohne unterschiedliche Profilaktivierungen bei einer Konfigurationsänderung zu überschreiben.
- Snapshot-Zeitstempel und Revision werden bei jeder Add-on-Mutation aktualisiert; Regressionstests decken Hinzufügen, Aktualisieren, Entfernen und den JSON-Payload-Editor ab.
- Backend-Version: `1.0.021`.
- Technische Doku: `docs/superpowers/account-wide-addons-profile-activation-2026-09-28.md`.

## [2.5.044] - 2026-09-28

- Marvel, DC Universe und Star Wars laden ihre chronologischen Kataloge direkt von den MystreamNet-Manifest-URLs; sie benötigen keine separaten Addon-Karten.
- Alte und aktuelle Manifest-IDs dieser Collection-only Addons werden beim Home-Start aus der Addon-Verwaltung bereinigt. Kuratierte, TMDB- und MDBList-Fallbacks bleiben verfügbar.
- Collection- und Franchise-Karten verwenden jetzt denselben profilbezogenen Watched-Cache wie die Android-Home-Rails. Filme zeigen den vollständigen Watched-Status; Serien werden anhand ihrer gesehenen Episoden und der bekannten TMDB-Episodenzahl als vollständig oder teilweise gesehen markiert.
- Nach einem vollständigen Home-Neuaufbau werden Watched-Marker sofort erneut angewendet und nicht mehr durch den 90-Sekunden-Cooldown übersprungen.
- Watched-/Partial-Watched-Marker bleiben auf normalen Home-Rails sichtbar. Die Rails „Zuletzt gesehene Filme“ und „Zuletzt gesehene Serien“ sowie Continue Watching zeigen bewusst keine zusätzlichen Watched-Marker.
- Android-Version: `2.5.044` / Code `445`.
- Technische Doku: `docs/superpowers/watched-state-and-franchise-catalogs-2026-09-28.md`.

## [Web 1.0.055] - 2026-09-28

- Marvel, DC Universe und Star Wars verwenden ihre direkten MystreamNet-Manifest-Quellen mit bestehenden kuratierten/TMDB/MDBList-Fallbacks.
- Die drei Collection-only Addons werden in der separaten Addon-Verwaltung ausgeblendet; Legacy-Manifest-IDs werden ebenfalls erkannt.
- Home-, Collection- und Franchise-Karten verwenden durchgehend den gemeinsamen profilbezogenen Watched-Key-Satz. Serien ohne geladene Staffelstruktur können über die TMDB-Gesamtzahl ihrer Episoden dennoch korrekt als vollständig oder teilweise gesehen erkannt werden.
- Watched-/Partial-Watched-Marker bleiben auf normalen Rails sichtbar und werden ausschließlich in „Zuletzt gesehene Filme“ und „Zuletzt gesehene Serien“ unterdrückt; Continue Watching behält seine Fortschrittsdarstellung.
- Web-Version: `1.0.055`.
- Technische Doku: `docs/superpowers/watched-state-and-franchise-catalogs-2026-09-28.md`.

## [Web 1.0.054] - 2026-09-27

- Marvel-, DC- und Star-Wars-Collections rufen ihre chronologischen MystreamNet-Manifeste direkt ab; diese Collection-only Add-ons werden aus der separaten Add-on-Liste ausgeblendet.
- Add-on-Schalter bleiben beim Aus- und Wiedereinschalten sowie beim Cloud-Wiederherstellen zwischen Web- und Android-Kompatibilitätsfeldern synchron.
- Quellenlisten im Detailsdialog und Playerpanel folgen der installierten Add-on-Reihenfolge; Xtream-IPTV-VOD steht bei vorhandenen Treffern immer zuerst. Die Qualitätsreihenfolge innerhalb eines Add-ons und der browserkompatible automatische Quellenwechsel bleiben erhalten.
- Web-Version: `1.0.054`.

## [Web 1.0.053] - 2026-09-26

- Poster-/Landscape-Einstellung liest Androids `Poster`/`Landscape` korrekt und schreibt die Android-Werte profilbezogen zurück.
- Watched-/Unwatched-Aktionen für Filme, Episoden, Staffeln und ganze Serien persistieren exakte Episoden-Keys samt Änderungszeitstempeln. Teilweise gesehene Staffeln markieren nicht die ganze Serie; andere Folgen behalten ihre Continue-Watching-Einträge.
- „Zuletzt gesehen“ sortiert nach Tracker-Watch-Zeit oder Android-Cloud-Änderungszeit, erhält Tracker-Metadaten und entfernt beim Leeren des Verlaufs auch die letzte alte Kategorie.
- Der Marvel-Franchise-Katalog lädt das erreichbare Marvel-Manifest direkt von `marvel.mystreamnet.club`, auch ohne separate Addon-Installation; kuratierte, TMDB- und MDBList-Fallbacks bleiben bestehen.
- Episodenkarten ohne eigenes Still zeigen jetzt das Serien-Backdrop und als letzten Fallback das Serien-Poster.
- Web-Version: `1.0.053`.

## [2.5.043] - 2026-09-26

- Marvel-, DC- und Star-Wars-Collections rufen ihre chronologischen MystreamNet-Manifeste direkt ab und behalten ihre Fallbacks; die zugehörigen Addon-Karten werden beim Home-Start bereinigt und nicht erneut installiert.
- Skip Intro/Recap/Credits/Preview folgt der gewählten App-Sprache; der Skip-Button wird wieder korrekt als Compose-Komponente kompiliert.
- „Zuletzt gesehene Filme/Serien“ nutzt vorhandene profilbezogene Watched-Änderungszeiten statt der nach ID sortierten Snapshot-Reihenfolge. Für ältere Einträge ohne Zeitstempel bleibt die bisherige Reihenfolge erhalten.
- Die Marvel-Collection verwendet jetzt die direkte Manifest-URL `https://marvel.mystreamnet.club/catalog/marvel-mcu/manifest.json` mit der neuen Manifest-ID; kuratierte MCU- und MDBList-Fallbacks bleiben erhalten, ohne Marvel als Addon zu installieren.
- Android-Version: `2.5.043` / Code `444`.

## [Web 1.0.052] - 2026-09-26

- Poster-/Landscape-Einstellung liest Androids `Poster`/`Landscape` korrekt und schreibt die Android-Werte profilbezogen zurück.
- Watched-/Unwatched-Aktionen für Filme, Episoden, Staffeln und ganze Serien persistieren exakte Episoden-Keys samt Änderungszeitstempeln. Teilweise gesehene Staffeln markieren nicht die ganze Serie; andere Folgen behalten ihre Continue-Watching-Einträge.
- „Zuletzt gesehen“ sortiert nach Tracker-Watch-Zeit oder Android-Cloud-Änderungszeit, erhält Tracker-Metadaten und entfernt beim Leeren des Verlaufs auch die letzte alte Kategorie.
- Der Marvel-Franchise-Katalog lädt das erreichbare Marvel-Manifest direkt von `marvel.mystreamnet.club`, auch ohne separate Addon-Installation; kuratierte, TMDB- und MDBList-Fallbacks bleiben bestehen.
- Episodenkarten ohne eigenes Still zeigen jetzt das Serien-Backdrop und als letzten Fallback das Serien-Poster.
- Web-Version: `1.0.052`.

## [2.5.042] - 2026-09-25

- Quellen-Dialog: IPTV-VOD wird nur dann als zusätzlich geprüfte Quelle gezählt, wenn die IPTV-VOD-Suche aktiviert ist. Deaktiviert bleibt die Anzeige bei `1/1`; aktiviert wird der VOD-Slot korrekt als `2/2` berücksichtigt.
- Die IPTV-VOD-Suche wird bei deaktivierter Einstellung nicht mehr als Hintergrundjob gestartet. Request-bezogene Abschlussmarker verhindern außerdem doppelte oder veraltete Fortschrittszählungen.
- Die bestehenden Quellen-, Continue-Watching-, Serienlabel- und UI-Akzentänderungen bleiben in diesem Android-Release enthalten.
- Android-Version: `2.5.042` / Code `443`.

## [Web 1.0.051] - 2026-09-25

- Quellenkarten zeigen bevorzugt den echten Dateinamen aus `behaviorHints.filename`; wenn dieser fehlt, wird der Quellentitel beziehungsweise der Medientitel verwendet, nicht der Addonname.
- Quellenkarten können bei echten Addon-Quellen ein Sprach-Badge mit Sprachkürzel und Flagge anzeigen. IPTV-VOD-Playlisten erhalten dieses Badge ausdrücklich nicht.
- Der Suchfeld-Fokus verwendet den aktiven Theme-Akzent über die gesamte Suchbox; der globale weiße Input-Fokusrahmen wird dort unterdrückt.
- Der Ladezustand der Suche ist im Viewport zentriert und zeigt Spinner sowie Label im aktiven Theme-Akzent.
- Web-Version: `1.0.051`.

## [2.5.041] - 2026-09-25

### Home-, Hero- und CloudSync-Performance

- Home-Rail-Metadaten und Logos laden lazy: zuerst der lokale Cache, danach das fokussierte Item nach ca. 320 ms Navigationsruhe und anschließend wenige benachbarte Karten. Trailer werden nur für den aktiven Hero geladen, wenn Trailer-Autoplay aktiviert ist.
- Details-Staffel-Tabs verwenden für den Fokus den aktiven Theme-Akzent, für inaktive Zustände einen dunkleren Hintergrund und eine dezente Akzent-Border.
- Der Profil-„+“-Button und die Profilverwaltung verwenden auch im inaktiven Zustand den aktiven Theme-Akzent für ihre Border.
- Unbegonnene Serien zeigen im Play-Button `S01 E01 starten`; Fortsetzen-Labels verwenden das Format `S01 E01 fortsetzen`.
- Nach vollständig abgespielten Episoden wird die nächste tatsächlich vorhandene Episode als Continue-Watching-Ziel gespeichert.
- Anime-/IPTV-Parsing-Experimente mit M3U- und Absolutnummern-Fallbacks wurden zurückgenommen; der bestehende Xtream-Resolver für normale Serien und Filme bleibt unverändert.
- Android-Version: `2.5.041` / Code `442`.

## [2.5.040] - 2026-09-24

### Home-, Hero- und CloudSync-Performance

- Home startet cache-first; Continue Watching bleibt im ersten Pass lokal und wird als initialer Hero bevorzugt.
- BigHero bewahrt Budget, FSK, Provider-Logo, Artwork und Trailer-Key bei Kategorie-, Watched- und Cloud-Refreshes.
- Hero-Trailer- und Watch-History-Requests werden zusammengeführt; IPTV-Favorite-/Recent-TV-Artwork wärmt die ersten sichtbaren Karten begrenzt vor.
- SSE-CloudSync-Pulls werden gebündelt; identische semantische Payloads werden nicht erneut angewendet.
- IntroDB-Post-Credits und Skip-Diagnose-Logs ergänzt.
- Android-Version: `2.5.040` / Code `441`.
- Technische Doku: `docs/superpowers/android-2.5.040-home-cloudsync-performance-2026-09-24.md`.

## [2.5.039] - 2026-09-24

### MDBList-Katalogquellen

- Der vorinstallierte Filmkatalog „Top 10 Movies Today“ verwendet jetzt die MDBList-Liste `most-popular-movies-on-rotten-tomatoes`.
- Der vorinstallierte Serienkatalog „Top 10 Shows Today“ verwendet jetzt die MDBList-Liste `most-popular-shows-on-rotten-tomatoes`.
- Android-Version: `2.5.039` / Code `440`.

## [Web 1.0.050] - 2026-09-24

### MDBList-Katalogquellen und Dokumentation

- Die Web-Defaults und die Packs `cinema-essentials.json` sowie `tv-binge.json` verwenden jetzt die neuen Rotten-Tomatoes-MDBList-Quellen für Filme und Serien.
- Die vollständige Quellenübersicht und der Self-Hosting-Plan wurden in `docs/superpowers/catalog-sources-and-self-hosting.md` dokumentiert.
- Web-Version: `1.0.050`.

## [2.5.038] - 2026-09-23

### Franchise-Serien und IPTV-Modus

- Gemischte Franchise-Quellen filtern kuratierte Film-/Serien-Refs jetzt pro Tab, sodass Marvel-, DC- und Star-Wars-Serien nicht mehr durch die vorherigen Film-Refs leer erscheinen.
- Die Marvel-TV-MDBList-Quelle ist explizit als Serienquelle markiert.
- Die Jurassic-Franchise nutzt zusätzlich die Web-kompatible MDBList-Fallbackquelle.
- Beim Start wird der IPTV-only-Modus beendet, wenn bereits ein Home Server vorhanden ist und die einmalige Umstellung bisher noch nicht erfasst wurde.
- Android-Version: `2.5.038` / Code `439`.

## [Web 1.0.049] - 2026-09-23

### Franchise-Ansichten und Artwork

- Home-Server-Continue-Watching-Sonderlogik aus dem Web entfernt; Continue Watching folgt wieder dem normalen StreamNet-/Cloud-/optionalen-Tracker-Vertrag wie Android.
- Franchise-Film-/Serien-Tabs bleiben sichtbar, wenn eine unterstützte Ansicht leer ist; die Auswahl springt nicht mehr automatisch zurück auf Filme.
- Leere Franchise-Ansichten zeigen jetzt einen gestalteten Empty State mit Franchise-Cover, Icon und erklärendem Text.
- Große Home-Hero- und Details-Backdrops laden die TMDB-Originalauflösung, während Karten weiterhin kleinere Bildvarianten verwenden.
- Web-Version: `1.0.049`.

## [Web 1.0.048] - 2026-09-23

### Home Server und Hero-Darstellung

- Home-Server-Watchlists werden im Web gelesen, mit Cloud- und optionalen Tracker-Watchlists gemerged und neue Einträge profilbezogen in StreamNet Cloud importiert.
- Plex, Jellyfin und Emby bleiben als separate browsebare Library-Quellen erhalten; die Home-Server-Library-Anzeige wird nicht als eigene Merkliste behandelt.
- Vordefinierte Franchise-Karten werden bei bestehenden Katalogzuständen wieder in die kanonische Android-Reihenfolge eingeordnet, damit neue Karten wie Fast & Furious nicht nur im Web hinten angehängt werden.
- Hero- und Details-Backdrops verwenden eine obere Bildausrichtung, damit wichtige Artwork-Bereiche am oberen Rand nicht durch das vertikale `cover`-Cropping verloren gehen.
- Web-Version: `1.0.048`.

## [2.5.037] - 2026-09-23

### Home Server, IPTV und Home-UI

- Home-Server-Watchlists werden profilbezogen in die StreamNet-Merkliste importiert und über die bestehende Cloud-Synchronisierung auf andere Geräte verteilt. Das Entfernen eines Titels auf Plex/Jellyfin/Emby löscht den bereits importierten StreamNet-Eintrag nicht automatisch.
- Home-Server-Bibliotheken bleiben als eigene Quellen verfügbar. Veraltete oder deaktivierte Home-Server-Kataloge werden beim nächsten erfolgreichen Library-Abgleich aus den Home-Katalogen entfernt.
- Das erstmalige Einbinden eines Home Servers beendet die IPTV-only-Projektion einmalig, sobald externe Home-Server-Inhalte verfügbar sind. Eine spätere manuelle IPTV-only-Auswahl bleibt erhalten.
- Plex-Code-Verbindungen bevorzugen bekannte öffentliche Server-URLs und warten nicht mehr zuerst auf unerreichbare interne Docker-`plex.direct`-Adressen. Die Plex-Suche verarbeitet zusätzlich Ergebnisse aus `MediaContainer.Hub`.
- Die Verbindung zeigt den Home Server nach erfolgreicher Authentifizierung und Erreichbarkeit sofort an; die Library-Erkennung und Katalogsynchronisierung laufen danach im Hintergrund.
- Home-Refreshes bewahren vorhandene Badge-, Artwork- und Metadaten während des asynchronen Neuaufbaus, wodurch Watched-Markierungen, Hero-Daten und Continue Watching nicht mehr kurzzeitig auf einen rohen Zwischenstand zurückfallen.
- Die Watchlist-Navigation folgt dem D-pad-Fokus jetzt automatisch in der Library-Seitenleiste.
- Watched- und Partial-Watched-Markierungen auf Media Cards verwenden die normalen Statusfarben und kleinere Marker statt des aktiven Theme-Akzents.
- Die StreamNet-TV-Einstellkarte richtet ihre Aktionsbuttons mittig am Textblock aus und reduziert doppelte Abstände zwischen den Buttons.
- Android-Version: `2.5.037` / Code `438`.

## [2.5.035] - 2026-09-23

### Scream-Franchise

- Neues Franchise „Scream“ ist verfügbar und nutzt die TMDB-Collection `2602`.
- Der gepinnte Franchise-Asset-Commit wurde auf `d6d01a462a006203757ae0e6afa6c839b32c458e` aktualisiert, damit `Scream.jpg` geladen wird.
- Android-Version: `2.5.035` / Code `436`.

## [Web 1.0.047] - 2026-09-23

### Scream-Franchise

- Neues Franchise „Scream“ ist verfügbar und nutzt die TMDB-Collection `2602`.
- Der gepinnte Franchise-Asset-Commit wurde auf `d6d01a462a006203757ae0e6afa6c839b32c458e` aktualisiert, damit `Scream.jpg` geladen wird.
- Web-Version: `1.0.047`.

## [Backend 1.0.020] - 2026-09-22

### Zentrierter Auth-Erfolgsdialog

- Überschrift, Checkmark, Nachricht und Countdown im Erfolgsdialog sind mittig ausgerichtet.
- Fehlerdialoge, Aktionsbuttons und Galerie bleiben unverändert.
- Backend-Version: `1.0.020`.

## [Backend 1.0.019] - 2026-09-22

### Auth-Portal-Erfolgsdialog

- Der Titel „Erfolgreich angemeldet“ nutzt jetzt eine neutrale Textfarbe statt der goldenen Akzentfarbe.
- Unter dem Titel erscheint im Erfolgsfall ein Checkmark-Icon.
- Vor dem automatischen Öffnen des Webplayers läuft ein sichtbarer 5-Sekunden-Countdown (DE/EN) anstelle der bisherigen festen Verzögerung.
- Die TV-Kopplung bleibt unverändert ohne Countdown, da dort keine Produktlinks angezeigt werden.
- Backend-Version: `1.0.019`.

## [Web 1.0.046] - 2026-09-22

### Franchise-Parität mit Android

- Web-Franchises verwenden jetzt die Android-kuratierten Reihenfolgen für Marvel, DC Universe und Star Wars.
- Kuratierte Quellen werden nicht mehr durch die chronologische Release-Sortierung überschrieben.
- Android-Legacy-Fallbacks für MDBList werden im Web über die öffentlichen MDBList-JSON-Listen geladen statt als Addon-Kataloge.
- Fehlende TMDB-/MDBList-Fallbacks für bestehende Franchises wurden ergänzt; leere Franchise-Rails bleiben sichtbar.
- Doppelte Home-Rail-Keys sowie der zugehörige Runtime-Fehler in `HomeScreen` wurden behoben.
- Web-Version: `1.0.046`.

## [2.5.034] - 2026-09-22

### Fast-&-Furious-Franchise und Live-TV

- Spinner bei Franchise laden, besser für User.
- Live-TV-Recovery, lokalisierte Fehlermeldungen und Surface-Shutter beim Mini-/Fullscreen-Wechsel sind enthalten.
- Android-Version: `2.5.034` / Code `435`.

## [2.5.033] - 2026-09-22

### Fast-&-Furious-Franchise und Live-TV

- Fast & Furious ist in der bestehenden Franchise-Rail verfügbar und nutzt die TMDB-Collection `9485`.
- Android und Web verwenden denselben gepinnten Franchise-Asset-Commit.
- Live-TV-Recovery, lokalisierte Fehlermeldungen und Surface-Shutter beim Mini-/Fullscreen-Wechsel sind enthalten.
- Android-Version: `2.5.033` / Code `434`.

## [Web 1.0.045] - 2026-09-22

### Chronologische Franchise-Reihenfolge

- Franchise-Collections werden nach Veröffentlichungsdatum sortiert, damit Filme in der vorgesehenen Release-Reihenfolge erscheinen.
- TMDB-Collection-Items und gemischte Franchise-Quellen werden vor dem Anzeigen chronologisch zusammengeführt.
- Web-Version: `1.0.045`.

## [Web 1.0.044] - 2026-09-22

### Fast-&-Furious-Franchise

- Fast & Furious ist in der bestehenden Franchise-Rail verfügbar.
- Die Filme werden über die TMDB-Collection `9485` geladen.
- Web verwendet dasselbe gepinnte Franchise-Cover wie Android.
- Web-Version: `1.0.044`.

## [2.5.032] - 2026-09-22

### Fast-&-Furious-Franchise und Live-TV

- Fast & Furious ist in der bestehenden Franchise-Rail verfügbar und nutzt die TMDB-Collection `9485`.
- Android und Web verwenden denselben gepinnten Franchise-Asset-Commit.
- Live-TV-Recovery, lokalisierte Fehlermeldungen und Surface-Shutter beim Mini-/Fullscreen-Wechsel sind enthalten.
- Android-Version: `2.5.032` / Code `433`.

## [Backend 1.0.018] - 2026-09-22

### Auth-Portal-Testpflege

- Backend-Version auf `1.0.018` erhöht.
- TV-Auth-Test an den aktuellen Self-Hosted-Auth-Portal-Flow angepasst.
- Backend-Version: `1.0.018`.

## [Backend 1.0.017] - 2026-09-22

### Auth-Portal-Dialoge und lokale Routen

- Auth-Portal zeigt thematisierte, vergrößerte Erfolgs- und Fehlerdialoge mit Produktlinks und App-Screenshots.
- Login-, Registrierungs-, Lösch- und TV-Kopplungsaktionen zeigen sichtbare Ladezustände.
- Veraltete Netlify-Weiterleitungen und Netlify-Function-Rewrites aus dem Self-Hosted-Backend entfernt.
- Backend-Version: `1.0.017`.

## [Web 1.0.043] - 2026-09-22

### Login- und Profilnavigation

- Authentifizierte Webplayer-Sessions wechseln zuverlässig zur Profilauswahl, auch wenn die Login-Ansicht nach einer Abmeldung noch aktiv war.
- Der Zurück-Button erscheint nicht mehr auf dem Login-Screen, wenn bereits eine gültige Session besteht.
- Login-Aktionen zeigen während der Anfrage einen Spinner und sind gegen Mehrfachklicks gesperrt.
- Web-Version: `1.0.043`.

## [Backend 1.0.016] - 2026-09-22

### Auth-Portal-Release

- Backend-Version auf `1.0.016` erhöht.
- Die Auth-Portal-Änderungen sind im separaten Web/Auth-Commit `b20b1038` enthalten.

## [Web 1.0.042] - 2026-09-22

### Cloud-Auth-Weiterleitung

- Erfolgreiche Anmeldung und Registrierung öffnen wieder direkt die Web-Profilauswahl, ohne dass die Cloud-Seite vorher geschlossen werden muss.
- Die Auth-Portal-Dialoge bleiben auf `auth.mystreamnet.club` konzentriert.
- Web-Version: `1.0.042`.

## [Android 2.5.030] - 2026-09-22

### Cloud-Login, Continue Watching und Touch-UI

- Cloud-Login-Fehler bleiben im Anmeldedialog sichtbar; erfolgreiche Anmeldungen stellen Cloud-Daten vor dem Profilwechsel wieder her.
- Während Anmeldung und Cloud-Restore zeigt der Dialog einen sichtbaren Ladezustand und verhindert versehentliche Mehrfachaktionen.
- Gemeinsame UI-Toasts verwenden einen einheitlichen Pill-Stil.
- Continue Watching berücksichtigt Wiedergabe ab einer Sekunde und zeigt auch sehr kleine Fortschritte sichtbar an.
- Continue-Watching-Labels im Touch-UI verwenden den aktiven Theme-Akzent.
- Realtime-Continue-Watching übernimmt Cloud-Zeitstempel und verhindert sichtbare Rücksprünge auf ältere Fortschrittsstände bei mehreren Geräten.
- Android-Version: `2.5.030` / Code `431`.

## [Web 1.0.041] - 2026-09-22

### Authentifizierungsdialoge im Cloud-Portal

- Die Cloud-Auth-Seite unter `auth.mystreamnet.club` zeigt für Anmeldung und Kontoerstellung eigene Erfolgs- und Fehlerdialoge statt generischer Statusmeldungen.
- Nach erfolgreicher Authentifizierung wird die StreamNet-Web-App direkt geöffnet; die Web-App navigiert anschließend wie vorgesehen zur Profilauswahl.
- Web-Version: `1.0.041`.

## [Backend 1.0.015] - 2026-09-22

### Passwort-Reset-Mail und Einmal-Token

- Passwort-Reset-E-Mails enthalten jetzt eine englische und eine deutsche Version in HTML und Plaintext.
- Reset-Tokens werden atomar als verwendet markiert und können auch bei parallelen Requests nur einmal erfolgreich eingelöst werden.
- Backend-Version: `1.0.015`.

## [Web 1.0.040] - 2026-09-22

### Android-Katalogparität und Web-UI

- Web übernimmt die 97 vorinstallierten Android-Katalogdefaults inklusive Collection-Rails, Reihenfolge, IDs, Quellen und Artwork-Metadaten.
- Featured- und Decade-Collections werden im Web-Home ausgeblendet; die sichtbaren Collection-Kinder werden im Katalogmanager nicht separat schaltbar.
- Collection-Rails können vollständig aktiviert oder deaktiviert werden.
- Recently Watched Movies und Recently Watched Series nutzen Trakt-Daten sowie Cloud-synchronisierte lokale Watched-Keys und werden auf maximal 20 Einträge je Rail begrenzt.
- IPTV-Einstellungen wurden um strukturiertes Playlist-Layout, Rail-Sortierung, responsive Navigation und verbesserte Button-/Hover-Zustände ergänzt.
- Web-Version: `1.0.040`.

## [2.5.029] - 2026-09-21

### Home-Server, Katalogreihenfolge und UI-Politur

- Android verwendet die profilbezogene, synchronisierte Katalogreihenfolge für gemischte Home-Server-, Standard- und Collection-Kataloge; fehlende Kataloge werden übersprungen, ohne vorhandene Reihenfolgen umzuschreiben.
- Home-Server-Kataloge behalten den echten Servernamen und vollständige Releasedates; Android zeigt diese als `TT.MM.JJJJ` im aktiven Theme-Akzent an.
- Home-Server-Bibliotheken sind nicht mehr an IPTV-only-VOD-Verfügbarkeit gekoppelt.
- Android-Home-Server-Karten, Bibliotheksauswahl und Fokuszustände entsprechen der lokalen Merkliste und verwenden den StreamNet-Akzent.
- Android-Loading-Spinner in Personen-, Collection-, Studio-, Franchise-, Genre- und Player-Ansichten verwenden ausschließlich den aktiven Theme-Akzent.
- Deutsche Android-Bezeichnungen verwenden für Library-Oberflächen „Mediathek“.
- Android-Version: `2.5.029` / Code `430`.

## [Web 1.0.039] - 2026-09-21

### Home-Server, Katalogreihenfolge und UI-Politur

- Web verwendet die profilbezogene, synchronisierte Katalogreihenfolge für normale Kataloge, Home-Server-Rails und Collection-Rails im Home.
- Home-Server-Kataloge werden über `sourceRef` mit gespeicherten Katalog-IDs verbunden, damit die Reihenfolge aus den Einstellungen im Home erhalten bleibt.
- Neue Home-Server-Kataloge werden in die kanonische `settings.catalogs`-Reihenfolge aufgenommen und mit der Cloud synchronisiert.
- Web lädt alle aktivierten Home-Server-Video-Bibliotheken; IPTV-only-VOD filtert Home-Server-Inhalte nicht aus.
- Home-Server-Karten, Bibliotheksauswahl, Sortiermenüs, aktive Pills, Suchfokus und Refresh-Animation verwenden den StreamNet-Akzent.
- Die manuellen Bibliotheksaktualisierungen zeigen den Ladezustand sichtbar an; Continue Watching bleibt beim gemeinsamen Home-Rail-Ordering erhalten.
- Web-Sortierdropdowns sind thematisierte Listboxen mit sichtbaren Optionen.

## [2.5.028] - 2026-09-20

### IPTV-only-Suche

- Discover-Rails, Textsuche, Smart-Suche und "Bekannt aus"-Treffer berücksichtigen im IPTV-only-Modus jetzt dieselbe Xtream-VOD-Verfügbarkeit wie der Home-Screen.
- Nicht im eigenen IPTV-VOD vorhandene Filme und Serien erscheinen dadurch auch im Suche-Screen nicht mehr.
- Android-Version: `2.5.028`.

## [Backend 1.0.014] - 2026-09-20

### Admin-Dashboard Geräte- und Session-Cleanup

- Account-Details haben einen Cleanup-Button, der Geräteevents auf den neuesten Eintrag je Gerät reduziert und ältere gültige Sessions je erkennbarem Client widerruft.
- Backend-Version: `1.0.014`.

## [Backend 1.0.013] - 2026-09-20

### Admin-Dashboard Web-Login-Widerruf

- Einzelne Web-Logins werden im Admin-Dashboard über einen expliziten Widerruf-Endpunkt abgemeldet und melden nicht gefundene Sessions klar zurück.
- Backend-Version: `1.0.013`.

## [Backend 1.0.012] - 2026-09-20

### Admin-Dashboard Geräte und Danger Zone

- Web-Login-Sessions können in Account-Details einzeln widerrufen werden.
- Die Geräteübersicht nutzt Badges für Plattform, Version, Build und Distribution und zeigt Profilnamen statt roher Profil-IDs, wenn der Snapshot sie enthält.
- Account-Details enthalten eine Danger Zone mit Sitzungen abmelden, Konto löschen und Offline-Geräteverlauf zurücksetzen; aktuell online gesehene Geräte bleiben beim Zurücksetzen erhalten.
- Backend-Version: `1.0.012`.

## [Backend 1.0.011] - 2026-09-20

### Admin-Dashboard Audit-Protokoll

- Bodylose Admin-Requests senden keinen JSON-Content-Type mehr, damit das Leeren des Audit-Protokolls nicht als `400 Bad Request` abgewiesen wird.
- Backend-Version: `1.0.011`.

## [Backend 1.0.010] - 2026-09-20

### Admin-Dashboard Account-Details

- Account-Details zeigen die Bereiche jetzt in der Reihenfolge Statuskarten, Profile, Remote-Konfiguration/Snapshot, Online-Geräte und Änderungen.
- Backend-Version: `1.0.010`.

## [Backend 1.0.009] - 2026-09-20

### Admin-Dashboard Web-Logins

- Aktive Web-Login-Sessions werden in Account-Details nicht mehr als grüne Online-Geräte angezeigt, sondern neutral als gültige Logins.
- Backend-Version: `1.0.009`.

## [Backend 1.0.008] - 2026-09-20

### Admin-Dashboard Online-Filter

- Die Statuskarte „Geräte online“ zählt nur noch account-verknüpfte Online-Geräte, damit Kartenwert und Account-Tabellenfilter übereinstimmen.
- Backend-Version: `1.0.008`.

## [Backend 1.0.007] - 2026-09-20

### Admin-Dashboard und Sitzungsmetadaten

- Admin-Accounts können per klickbarer Statuskarte auf aktuell online gesehene Geräte gefiltert werden.
- Das Admin-Dashboard listet aktive Login-Sessions als Web-/Login-Instanzen und unterstützt das Entfernen alter Gerätehistorien.
- Audit-Protokolle können im Dashboard nach Bestätigung geleert werden; Kommentare sind nur noch beim endgültigen Löschen eines Accounts verpflichtend.
- Neue Account-Sessions speichern optionale Client-, Gerätetyp-, IP- und User-Agent-Metadaten für künftige Admin-Anzeigen.
- Backend-Version: `1.0.007`.

## [Web 1.0.038] - 2026-09-20

### Admin-Sitzungsanzeige

- Web-Login, Registrierung und Token-Refresh melden künftig `client_type: web` und einen groben Gerätetyp an das Backend.
- Web-Version: `1.0.038`.

## [Backend 1.0.006] - 2026-09-20

### Continue-Watching-Synchronisation

- Profilbezogene Continue-Watching-Einträge und Lösch-Tombstones werden bei Cloud-Pushes nach Zeitstempel zusammengeführt und nicht mehr durch unvollständige Web-Payloads überschrieben.
- Backend-Version: `1.0.006`.

## [Web 1.0.037] - 2026-09-20

### Einheitliche Continue-Watching- und Cloud-Synchronisation

- Continue Watching nutzt im Web gemeinsam den profilbezogenen Cloud-Snapshot und die Backend-Watch-History; aktive Cloud-Resumes bleiben unabhängig von Trakt, Simkl oder anderen Anbietern sichtbar.
- Stale oder abgeschlossene Backend-History ersetzt keinen aktiven Snapshot-Resume mehr; aktuelle Cloud-Positionen werden nach dem Provider-Merge nochmals abgesichert.
- Cloud-Revision-Polling ergänzt SSE, damit Einstellungen und Wiedergabefortschritt auch bei einem abgebrochenen EventSource innerhalb weniger Sekunden auf anderen Geräten aktualisiert werden.
- Sehr frühe Resumes, etwa 8 Sekunden, zeigen auf Continue-Watching-Kacheln jetzt einen sichtbaren Minimal-Fortschrittsbalken.
- Web-Version: `1.0.037`.

## [2.5.027] - 2026-09-19

### TheIntroDB für Filme und Serien

- TheIntroDB ist die primäre, keyfreie Quelle für Überspring-Zeitstempel mit StreamNets nativen TMDB-IDs.
- Filme sowie Serienepisoden unterstützen Intro, Recap, Credits und Vorschau; IMDb-ID bleibt als alternative ID verfügbar.
- Offene Credits- und Vorschau-Segmente ohne Endzeit überspringen bis zum tatsächlichen Medienende.
- Das bisherige IntroDB und AniSkip bleiben für Serienepisoden als Fallback erhalten.
- Android-Version: `2.5.027`.

## [2.5.026] - 2026-09-19

### Profile und Wiedergabehinweise

- Die Profilauswahl zeigt wieder „Wer schaut gerade?“; die englische Oberfläche verwendet „Who’s watching?“.
- Continue-Watching-Karten zeigen ausschließlich Fortschritt oder „Up next“, nie ein Watched-Häkchen oder Teilstatus-Minus.
- Intro-, Recap- und Credits-Segmente werden nach einer temporär leeren Anbieterantwort erneut abgefragt, statt für die gesamte App-Sitzung auszufallen.
- Android-Version: `2.5.026`.

## [Web 1.0.036] - 2026-09-19

### Audio-Transcoder und Continue Watching

- Beim Audio-Transcoder-Neustart bleiben Staffel, Episode, Resume-Position, Fortschritt und gespeicherte Dauer erhalten.
- MPEG-TS-Transcoder-Ausgaben ohne eigene Endzeit verwenden die gespeicherte Continue-Watching-Dauer für Restzeit, Scrubber und Fortschritts-Speicherung.
- Web-Version: `1.0.036`.

## [Web 1.0.035] - 2026-09-18

### CSS- und Continue-Watching-Fix

- Einen beschädigten CSS-Block mit losgelösten Deklarationen repariert.
- Die Serienzeile `S… · E… · Titel` ist typografisch explizit an die Film-Titelzeile angeglichen; der Seriencode bleibt akzentfarben.
- Web-Version: `1.0.035`.

## [Web 1.0.034] - 2026-09-18

### Continue-Watching-Titel

- Die Serienzeile `S… · E… · Titel` verwendet jetzt exakt die responsive Schriftgröße und den normalen Schriftschnitt der Film-Titelzeile.
- Der Seriencode bleibt in der aktiven Akzentfarbe, der Episodentitel bleibt neutral.
- Web-Version: `1.0.034`.

## [Web 1.0.033] - 2026-09-18

### Continue-Watching-Titel

- Der Seriencode `S… · E…` verwendet die aktive StreamNet-Akzentfarbe.
- Schriftgröße und Schriftschnitt bleiben identisch zum Filmtitel; der Episodentitel bleibt neutral.
- Web-Version: `1.0.033`.

## [Web 1.0.032] - 2026-09-18

### Continue-Watching-Titel

- Die Serienzeile `S… · E…` verwendet jetzt denselben normalen Schriftschnitt wie Filmtitel.
- Web-Version: `1.0.032`.

## [Web 1.0.031] - 2026-09-18

### Continue-Watching-Titel

- Serienzeilen mit `S… · E…` verwenden jetzt dieselbe Schriftgröße wie Filmtitel in Continue Watching.
- Web-Version: `1.0.031`.

## [Web 1.0.030] - 2026-09-18

### IPTV-Wiedergabe und Genre-Fanart

- Xtream-VOD-HLS/MPEG-TS wird im Browser zuverlässiger direkt erkannt und abgespielt.
- IPTV-HLS nutzt Proxy- und Audio-Transcoding-Unterstützung für Manifest-, Segment- und AAC-Wiedergabe.
- Der Audio-Watchdog bleibt bei Live-MPEG-TS aus und greift gezielt bei Xtream-VOD ein; Playback blendet veraltete Fehlerzustände aus.
- Genre-Fanart liefert bei fehlender Konfiguration oder Upstream-Fehlern einen gecachten leeren Fallback statt eines 5xx-Fehlers.
- Der Standard-Resolver verwendet `https://resolve.streamnet.live`; bekannte IPTV-Playlisten werden über den eigenen Proxy umgeschrieben.
- Web-Version: `1.0.030`.

## [2.5.025] - 2026-09-18

### Continue Watching und Watched-Status

- Android erkennt bereits ab fünf Sekunden Wiedergabe eine bedeutungsvolle Continue-Watching-Position.
- Continue-Watching-Karten zeigen den partiellen Fortschrittsstatus zuverlässig; bei der ersten Episode erscheint weiterhin „Starten“ statt „Fortsetzen“.
- Die Trakt-/Cloud- und Episodenstatus-Zusammenführung wurde für diese Zustände angepasst und durch einen Regressionstest abgesichert.
- Android-Version: `2.5.025` (`versionCode` 426).

## [Web 1.0.029] - 2026-09-18

### Build-Release

- Neuer Web-Build für den aktuellen gemeinsamen Continue-Watching-Sync.
- Web-Version: `1.0.029`.

## [Backend 1.0.005] - 2026-09-18

### Build-Release

- Neuer Backend-Cloud-Build für den aktuellen gemeinsamen Continue-Watching-Sync.
- Backend-Cloud-Version: `1.0.005`.

## [Web 1.0.028] - 2026-09-18

### Gemeinsames Continue Watching

- Web und Android verwenden für Continue Watching nun dieselbe profilbezogene `watch_history` im StreamNet-Backend.
- Der Web-Snapshot bleibt nur noch Fallback bei einem echten Backend-Fehler; eine leere, erfolgreiche History-Antwort löscht veraltete Einträge korrekt.
- Web-Fortschritt wird zusätzlich in `watch_history` gespeichert und beim Entfernen dort gelöscht.
- Watch-History-Änderungen lösen über den bestehenden SSE-Kanal sofortige Aktualisierungen auf verbundenen Geräten aus.
- Web-Version: `1.0.028`.

## [Backend 1.0.004] - 2026-09-18

### Gemeinsames Continue Watching

- Watch-History-Änderungen lösen über den bestehenden SSE-Kanal sofortige Aktualisierungen auf verbundenen Geräten aus.
- Backend Cloud bleibt die gemeinsame profilbezogene Quelle für Continue Watching von Android und Web.
- Backend-Cloud-Version: `1.0.004`.

## [Web 1.0.027] - 2026-09-18

### Watched-Status und Merkliste

- Gesehene Episoden werden im Detailscreen wieder zuverlässig mit einem sichtbaren Checkmark über dem Episodenbild dargestellt.
- Trakt-Progress, StreamNet-Cloud-Watch-Keys und Tracker-History werden für den Episodenstatus zusammengeführt; vollständig gesehene Staffeln erhalten ein Checkmark in der Season-Pill.
- Das Staffel-Checkmark übernimmt die Textfarbe des jeweiligen Pills und bleibt dadurch in aktiven und inaktiven Zuständen lesbar.
- Merkliste hinzufügen und entfernen funktioniert lokal sowie über StreamNet Cloud auch ohne verbundene Trakt-, Simkl- oder MDBList-Integration; Tracker-Sync bleibt optional.
- Web-Version: `1.0.027`.

## [2.5.024] - 2026-09-17

### Watched-Status in Home-Rails

- Filme behalten ihr Gesehen-Häkchen auch nach Cloud-Push/Pull und beim Nachladen weiterer Elemente in langen Home-Rails.
- Pagination merged neue Seiten in den neuesten Home-State, sodass alte Item-Kopien bereits gesetzte Watched-Icons nicht mehr überschreiben.
- Serien zeigen auf Mobile, Tablet und TV ein Minus bei teilweise gesehenen Episoden und ein Häkchen erst bei vollständig gesehenen Serien.
- Fehlende Episodenzahlen werden im Hintergrund aufgelöst, ohne das sofortige Rendern der Home-Rails zu blockieren.
- Android-Version: `2.5.024`.

## [Web 1.0.026] - 2026-09-17

### Episodenstatus und nächste Folge

- Serienkarten zeigen ein Minus bei teilweise gesehenen Serien und ein Häkchen bei vollständigem Abschluss.
- Der Serien-Detailscreen zeigt Gesehen-Icons für die tatsächlich abgeschlossenen Episoden; Cloud-Episodenstände bleiben auch bei partiellen Tracker-Fehlern erhalten.
- Ab 90 Prozent Wiedergabefortschritt wird die laufende Episode sofort lokal und in StreamNet Cloud als gesehen markiert.
- Die nächste verfügbare und bereits ausgestrahlte Episode wird direkt als „Weiterschauen“-Eintrag gespeichert, einschließlich korrektem Wechsel in die nächste Staffel.
- Web-Version: `1.0.026`.

## [2.5.023] - 2026-09-17

### Watched-Checkmarks in Home-Rails

- Watched-Häkchen in normalen Home-Rails laden auf Mobile, Tablet und TV wieder vollständig nach, auch wenn der erste Watched-Cache-Aufbau leer oder zu früh abgeschlossen wurde.
- Die Android-App retryt leere Watched-State-Caches nach kurzer Zeit erneut, statt einen transienten leeren Zustand für die ganze Sitzung als final zu behandeln.
- Android-Version: `2.5.023` ; Backend-Cloud-Version: `1.0.003`.

## [Backend 1.0.003] - 2026-09-17

### Watched-State-Pagination

- Backend Cloud berücksichtigt bei Watched-State-Reads jetzt `offset` und `limit`, sodass Android alle Filme und Episoden über mehrere Seiten laden kann statt wiederholt denselben neuesten Block zu erhalten.
- Die Watched-State-Endpunkte liefern Seiten stabil sortiert nach letzter Änderung und ID aus.
- Backend-Cloud-Version: `1.0.003`.

## [Backend 1.0.002] - 2026-09-17

### Erstes Backend-Cloud-Image

- Der erste veröffentlichte `backend-cloud`-Build verwendet die umbenannte Ordnerstruktur und die korrigierte Versionsvergleichslogik.
- Nach erfolgreichem Container-Publish sendet der eigene Actions-Job diesen deutschen Changelog an das StreamNet-Telegram-Topic.

## [2.5.022] - 2026-09-17

### Gemeinsamer Cloud-Release

- Android-Version: `2.5.022` (`versionCode` 423). Der Release baut die aktuelle APK, Weboberfläche, den Mediaresolver und Backend Cloud erneut.
- Der Android-Publish-Workflow zeigt den Telegram-Versand künftig als eigenen, nachgelagerten Actions-Job an.

## [Web 1.0.025] - 2026-09-17

### Veröffentlichung und Navigation

- Web-Version für den gemeinsamen Cloud-Release erhöht; der versionsgesteuerte Publish-Workflow baut das Web-Image und den Mediaresolver erneut.
- Die aktuelle Desktop-Navigation und Live-TV-Infofeld-Ausrichtung sind Teil dieses Builds.

## [Backend 1.0.001] - 2026-09-17

### Backend Cloud und Veröffentlichung

- Der bisherige Ordner `self-hosted-backend/` heißt jetzt `backend-cloud/`; Docker-Build, GitHub Actions, lokale Befehle und Dokumentation verwenden den neuen Namen.
- Backend-Releases prüfen künftig die Paketversion, bauen und veröffentlichen das Container-Image nur bei einer neuen Version und senden den deutschen Changelog anschließend an das bestehende Telegram-Topic.

## [Web 1.0.024] - 2026-09-17

### Continue Watching und Live-TV-Feinschliff

- Staffel, Episode und Episodentitel in „Weiterschauen“ verwenden nun dieselbe Titeltypografie wie Filmkarten; die Staffel-/Episodenkennung behält den aktiven Akzent.
- Das Live-TV-Infofeld nutzt eine feste Grundhöhe passend zur Player-Vorschau und verdichtet Zeitangabe sowie Plot für eine ruhigere, einheitliche Kopfzeile.
- Profil, Navigation und Einstellungen wurden im festen Desktop-Header gemeinsam leicht nach oben versetzt, damit sie nicht mehr mit dem darunterliegenden Live-TV-Inhalt kollidieren.

## [Web 1.0.023] - 2026-09-17

### Home- und Live-TV-Oberfläche

- Continue-Watching-Episoden zeigen jetzt zuerst Staffel, Episode und Episodentitel; der Serienname steht darunter in derselben dezenten Meta-Schrift wie ein Film-Release-Datum.
- Das Live-TV-Info-Panel trennt Preview-Player sowie Sender- und Programminformationen klarer durch eigene Flächen.
- Live-TV-Aktionsbuttons behalten jetzt ihre natürliche Breite und umbrechen bei Bedarf sauber, statt das Info-Panel unnötig weit aufzuziehen.

## [Web 1.0.022] - 2026-09-16

### Xtream-VOD Mixed-Content-Hotfix

- Der Browser-Remux und die manuelle Audiospur-Probe laden StreamNet-Xtream-VOD jetzt über den eingeschränkten HTTPS-Relay, statt einem Anbieter-Redirect von `https://xui.streamnet.live` auf eine unverschlüsselte HTTP-IP direkt im Browser zu folgen.
- Normale Addon- und Debrid-Dateien bleiben auf ihrem bisherigen direkten Pfad; der Relay wird ausschließlich für `iptv_xtream_vod` vom konfigurierten StreamNet-Xtream-Ursprung verwendet.
- Der produktive Relay wurde mit einem MKV-Byte-Range geprüft: HTTP 206, `video/x-matroska`, `Accept-Ranges: bytes` und korrekter 1-KiB-Teilinhalt.
- Reine Web-Releases senden ihren deutschen Changelog nach erfolgreichem Container-Publish automatisch an das bestehende Telegram-Topic. Normale Web-/Resolver-Commits ohne neue Version lösen keine Nachricht aus.

## [Web 1.0.021] - 2026-09-16

### Webplayer-Audio für Live-TV und VOD

- Chromium erkennt jetzt laufendes Video ohne decodierte Audiobytes und wechselt nach acht Sekunden kontrolliert auf Anbieter-Transcoding, Browser-AAC-Remux oder die nächste Quelle.
- AC-3 und E-AC-3 werden im Browser-Remux nicht mehr aufgrund einer unzuverlässigen MSE-Passthrough-Meldung direkt durchgereicht, sondern zu AAC konvertiert.
- Live-TV kann stumme Audioformate über den neuen Self-hosted-FFmpeg-Endpunkt zu AAC Stereo konvertieren; Video wird ohne Re-Encoding übernommen.
- Der AAC-Endpunkt ist auf explizit erlaubte Hosts begrenzt; `usenetstreamer.mystreamnet.club` ist als zulässiger Ursprung eingetragen. Addon-VOD verwendet weiterhin den Browser-Remux und benötigt dafür CORS- sowie Range-Support der Quelle.
- Gleichzeitige Audio-Transcodes sind über `STREAMNET_MAX_AUDIO_TRANSCODES` von 1 bis 16 konfigurierbar; Standard ist 4. Die Slot-Reservierung erfolgt vor dem Upstream-Aufruf und verhindert paralleles Überschreiten des Limits.
- Das Produktionsimage enthält FFmpeg. Lokale End-to-End-Prüfung: AC-3 5.1 wurde zu AAC Stereo; bei fünf parallelen Anfragen ergaben sich viermal HTTP 200 und einmal HTTP 503, anschließend wurde der Slot wieder freigegeben.
- Produktivtest, Diagnose und Rollback: `docs/superpowers/web-audio-recovery-1.0.021-2026-09-16.md`.

## [2.5.021] - 2026-09-16

### Home-Rails, Hero und Live-TV-PiP

- Gesehen-Häkchen in normalen Home-Rails werden jetzt zuverlässig nach jedem vollständigen Neuaufbau der Kategorien (Katalog-/IPTV-/Cloud-Refresh) sofort wieder angezeigt, statt durch das bisherige 90-Sekunden-Cooldown des Badge-Refreshs übersprungen zu werden.
- Das Veröffentlichungsjahr im Mobile/Tablet-Hero blinkt nicht mehr unter dem Logo ein und aus: Der Hintergrund-Refresh von „Weiter ansehen“ durchläuft jetzt dieselbe Metadaten-Reparatur wie der Sofort-Pfad, bevor er veröffentlicht wird.
- Bild-in-Bild bei Live-TV pausiert den Stream nicht mehr sofort: Der Lifecycle-Handler unterscheidet jetzt zwischen echtem Pausieren und dem Wechsel in den PiP-Modus, analog zum bestehenden VOD-Player.
- Android-Version: `2.5.021` (`versionCode` 422).

## [2.5.020] - 2026-09-16

### Continue Watching bei sehr kurzen Sitzungen

- UI-Akzent-Sync wurde behoben und wird jetzt pro Profil zwischen WebUi und Android App gesynced. Der globale Wert dient nur noch
  als Fallback.
- Android-Version: `2.5.020` (`versionCode` 421); Web-Version: `1.0.020`.

## [2.5.018] - 2026-09-15

### Continue Watching bei sehr kurzen Sitzungen

- Kurz angespielte Filme/Episoden (ab ca. 10 Sekunden Position) erscheinen jetzt zuverlässig in „Weiter ansehen“ auf Android UND im Web, auch wenn die gerundete Prozentzahl bei langem Content noch 0 % anzeigt. Zuvor filterte das Web solche Einträge komplett aus der Kachelliste heraus, obwohl Android sie bereits lokal speicherte und synchronisierte.
- Ist die reale Fortschrittsprozentzahl unter 1 %, aber eine echte Wiedergabeposition vorhanden, zeigen beide Plattformen jetzt einen sichtbaren, minimalen Fortschrittsbalken (Sliver) statt eines leeren Balkens.
- Die Web-Detailansicht bietet in diesem Fall „Fortsetzen“ statt „Abspielen“ als Button-Beschriftung an.
- Sitzungen unter 10 Sekunden bleiben weiterhin als vermutlich unbeabsichtigter Tastendruck ausgeblendet.
- Doku: `docs/superpowers/continue-watching-sub-one-percent-2026-09-15.md`.
- Android-Version: `2.5.018` (`versionCode` 420); Web-Version: `1.0.018`.

## [2.5.017] - 2026-09-15

### Xtream-VOD-Quellenpriorität

- Xtream-VOD-Quellen werden in der manuellen Quellenliste auf Android und im Web vor anderen Quellen angezeigt, sobald mindestens eine solche Quelle vorhanden ist.
- Die automatische Wiedergabe priorisiert Xtream-VOD ebenfalls vor Qualität, Größe und Addon-Gesundheit der übrigen Quellen.
- Wenn kein Xtream-VOD verfügbar ist, bleibt die bisherige Sortierung unverändert. Die Reihenfolge innerhalb der Xtream-VOD-Quellen folgt weiterhin der bestehenden Qualitäts- und Größenlogik.
- Android-Version: `2.5.017` (`versionCode` 419); Web-Version: `1.0.2`.

## [2.5.016] - 2026-09-15

### Mobile Home und Weiterschauen

- Karten in „Weiter ansehen“ priorisieren jetzt ihre konkrete Fortsetzungsinformation unter dem Titel, etwa „S1E1 bei 00:21 fortsetzen“ oder „Ab 55:15 fortsetzen“, statt dort Veröffentlichungsdatum oder Jahr anzuzeigen.
- Das Badge „Neue Episode“ erscheint nur noch für ausdrücklich vom Anbieter als Up Next markierte Episoden. Der Status bleibt auch bei unmittelbaren In-App-Updates der Rail erhalten.
- Der Mobile-Hero zeigt für bereits veröffentlichte Titel nur das Jahr; kommende Titel zeigen stattdessen ein vollständiges Veröffentlichungsdatum.

## [2.5.015] - 2026-09-14

### Cloud-Synchronisierung via SSE

- Android aktiviert jetzt die bestehende SSE-Verbindung zum Self-Hosted Cloud-Backend. Änderungen an Cloud-Daten lösen dadurch auch ohne manuellen Reload einen Home-Refresh aus.
- SSE-Events aktualisieren Continue Watching, Recently Watched, Watchlist, Kataloge, Addons und Einstellungen über den bestehenden Cloud-Pull.
- Ein durch SSE ausgelöster Pull umgeht den normalen 30-Sekunden-Burst-Guard, damit ein vorheriger Startup-Pull keine echte neue Revision verschluckt.
- Die WebUI verwendet weiterhin ihren eigenen SSE-Listener. Beide Clients lesen den autoritativen Cloud-Stand; Revision/CAS sowie die bestehenden Feld-Zeitstempel- und Merge-Regeln verhindern gegenseitiges blindes Überschreiben.

## [2.5.014] - 2026-09-13

### Zuletzt gesehene Inhalte

- Die Reihenfolge der Rails „Zuletzt gesehene Filme“ und „Zuletzt gesehene Serien“ ist korrigiert. Neu als gesehen markierte Inhalte erscheinen jetzt vorne; ältere Inhalte folgen dahinter.
- Die Anzeige liest die letzten Einträge aus den profilbezogenen Watched-Caches, statt die ältesten Einträge mit `.take(20)` auszuwählen.
- Der normale VOD-Player, Continue Watching und die Wiedergabelogik bleiben unverändert.

## [2.5.013] - 2026-09-13

### Live-TV-Audio

- **Live-TV-Ton auf Android TV und Emulatoren**: Live TV verwendet jetzt den mitgelieferten FFmpeg-Audio-Renderer vor den Plattform-Decodern. Dadurch werden fehlerhafte Android-AAC-Zuordnungen bei IPTV-TS-Streams umgangen, die zuvor trotz gestarteten AudioTracks stumm blieben.
- **VOD unverändert**: Der normale Film-/Serien-Player behält Plattformdecoder zuerst, Audio-Passthrough und FFmpeg nur als Fallback. Der Live-TV-Fix verändert den VOD-Audiopfad nicht.
- Die Diagnose zeigte bei den betroffenen IPTV-Sendern `audio/mp4a-latm` und `c2.android.aac.decoder`; `out_standby` trat beim anschließenden Senderwechsel auf und war nicht selbst die Ursache.

## [2.5.012] - 2026-09-13

### StreamNet-Cloud-Portal und Echtzeit-Synchronisierung (SSE)

- **Cloud-Portal vor der WebUI**: Unangemeldete Nutzer werden beim Laden der WebUI direkt auf das StreamNet-Cloud-Portal geleitet (Login, Signup, Passwort-Reset & TV-Code-Kopplung).
- **Echtzeit-Sync via Server-Sent Events (SSE)**: Backend (`/account-sync-events`), WebUI (`subscribeCloudSyncEvents`) und Android-App (`RealtimeSyncManager`) halten authentifizierte SSE-Verbindungen. Revisionsänderungen durch Pushes lösen geräteübergreifend sofortige Hintergrund-Pulls aus.
- **Entfernung von Altlasten**: Veraltete Netlify- und Supabase-Referenzen in der WebUI wurden vollständig entfernt; alle Cloud-Funktionen laufen über das eigene Self-Hosted Backend (`https://auth.mystreamnet.club`).
- **Styling & Typografie**: Portal und Backend nutzen ein abgestimmtes warmes Farbverlaufs-Design ohne Gitterlinien und durchgehend die Inter-Schriftfamilie.
- **E-AC-3 / Audio-Fix**: `AudioCaptureProcessor` signalisiert bei komprimierten Audioformaten (E-AC-3, AC-3, DTS, TrueHD) korrekt `AudioFormat.NOT_SET`, sodass ExoPlayer `DefaultAudioSink` Passthrough- und FFmpeg-Fallback-Pfade nicht blockiert und Tonstille bei E-AC3-Streams behoben ist.

## [2.5.011] - 2026-09-12

### Geräteübergreifende Katalogreihenfolge

- Auf Android gewinnt eine ausdrücklich lokal geänderte Home-Katalogreihenfolge beim nächsten Cloud-Push auch dann, wenn ein anderes Gerät aufgrund einer abweichenden Systemuhr einen höheren Katalog-Zeitstempel gespeichert hat.
- Nach einem erfolgreichen Upload wird die lokale Änderungsmarkierung zurückgesetzt; fehlgeschlagene Uploads behalten sie für den nächsten Synchronisierungsversuch.
- Die WebUI versieht echte Katalogänderungen mit dem von Android verwendeten profilbezogenen Zeitstempel und bewahrt bei fachfremden Einstellungsänderungen einen neueren Cloud-Katalogstand.
- Web-spezifisch ausgeblendete Home-Rails wie TV-Favoriten bleiben Bestandteil der gemeinsamen Katalogreihenfolge und werden nicht allein durch die abweichende Web-Darstellung entfernt.
- Regressionstests decken Web-Katalogänderungen, unveränderte Web-Saves und Android-Pushes bei abweichenden Geräteuhren ab.

## [2.5.010] - 2026-09-12

### WebUI-Kataloge und Collections

- Die Web-Kataloge entsprechen dem aktuellen Android-Stand; veraltete Web-Kataloge sowie „Jahrzehnte“ und „Empfohlen“ werden aus bestehenden Einstellungen entfernt.
- „Kommende Filme“ und „Kommende Serien“ sind korrekt benannt und in der Android-Reihenfolge einsortiert.
- Services, Franchises sowie Film- und Seriengenres öffnen getrennte Film-/Serienansichten mit Fokus auf dem ersten Eintrag und sichtbarer Hero-Fanart.
- Collection-Rails liegen kompakter unter dem Hero, ohne dessen Breite oder Fanart zu verzerren; „Startseite“ schließt eine geöffnete Collection zuverlässig.
- Film- und Seriengenre-Karten zeigen ihre Bezeichnung wie Android zentriert direkt auf der Fanart.
- Laufzeit, Episodencode und Episodentitel auf Medienkarten verwenden die aktive Akzentfarbe; Continue-Watching-Fortschrittsbalken bleiben auch bei einem veralteten Watched-Status sichtbar.

### WebUI-Synchronisierung

- Allgemeine Cloud-Payload-Änderungen werden dauerhaft zwischengespeichert und nach Offline- oder Serverfehlern automatisch erneut synchronisiert.
- VODWisharr-Genre-Fanart wird über eine serverseitige Web-Route geladen, damit der API-Schlüssel nicht an den Browser ausgeliefert wird.

## [2.5.009] - 2026-09-12

### Geräteübergreifendes Weiterschauen

- Cloud-Wiedergabefortschritt wird auf Android auch bei verbundenem Trakt oder MDBList importiert und mit dem Tracker-Stand zusammengeführt.
- Die WebUI verwendet für Cloud- und IPTV-Fortschritt dieselbe 1-Prozent-Schwelle wie Android.

## [2.5.008] - 2026-09-12

### Continue Watching und Cloud-Sync

- Android zeigt angefangene Filme und Episoden bereits ab 1 Prozent Fortschritt in „Weiterschauen“ an.
- Die WebUI bereinigt ihren bereits sichtbaren Browser-Cache sofort anhand profilbezogener Cloud-Tombstones, damit entfernte Titel auch bei vorübergehenden Tracking-Provider-Fehlern nicht wieder erscheinen.
- Von der WebUI gespeicherte Continue-Watching-Einträge verwenden den Android-kompatiblen Medientyp `MOVIE` beziehungsweise `TV`; bestehende ältere Einträge bleiben weiterhin lesbar.
- Regressionstests sichern die 1-Prozent-Schwelle sowie Show- und Episoden-Tombstones ab.

## [2.5.007] - 2026-09-12

### Franchise-Rail

- Alle 20 Franchise-Karten laden ihr gebrandetes 16:9-Fanart aus dem eigenen, unveränderlich gepinnten Asset-Repository statt aus gemischten Legacy- und TMDB-Quellen.
- Separate Franchise-Logo-Overlays wurden entfernt, damit die bereits beschrifteten Fanarts nicht doppelt gebrandet werden.

## [2.5.006] - 2026-09-11

### Home-Karten und Watched-Status

- Watched-Häkchen in normalen Home-Rails werden nach lokalen Watch-Events und Cloud-Restores sofort aktualisiert, ohne durch den bisherigen 90-Sekunden-Cache verzögert zu werden.
- Cloud-importierte Film- und Episodenstände invalidieren den profilbezogenen Watched-Cache zuverlässig.
- Die Häkchen sind oben rechts besser sichtbar und verwenden die aktive Akzentfarbe; Continue Watching sowie die beiden „Zuletzt gesehen“-Rails bleiben weiterhin ohne Häkchen.

### Franchise-Rail

- Franchise-Karten ab „Lord of the Rings“ verwenden erreichbare, für 16:9-Karten geeignete Hintergründe statt der nicht mehr zuverlässig erreichbaren Postimg-Dateien oder stark beschnittener Poster.
- Franchises mit externem TMDB-Hintergrund zeigen ein transparentes Franchise-Logo; bereits gestaltete eigene Cover laden kein zusätzliches Logo.

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
- Die Profilauswahl wurde durch Entfernen der Überschrift und des äußeren Profilcontainers vereinfacht; unter dem StreamNet-Logo wurde eine kompakte, D-Pad-fokussierte Aktion `StreamNet Cloud` hinzugefügt.
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
