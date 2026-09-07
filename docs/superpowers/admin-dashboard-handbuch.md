# StreamNet Admin-Dashboard: Handbuch

## Zugang und Admin-Sitzung

Das Dashboard ist unter `https://auth.mystreamnet.club/admin` erreichbar. Die
Anmeldung verwendet einen eigenen Admin-Account. Ein normaler StreamNet-Account
kann nicht als Admin verwendet werden.

Nach erfolgreicher Anmeldung erhält der Browser ein Admin-Token, das 30 Minuten
gültig ist. Es wird nur im `sessionStorage` des aktuellen Browser-Tabs
gespeichert. Beim Abmelden wird es dort entfernt. Ist es abgelaufen, führt die
nächste Dashboard-Anfrage zurück zur Anmeldung.

Nach acht fehlgeschlagenen Anmeldeversuchen von derselben IP-Adresse wird die
Anmeldung für den Rest eines 15-Minuten-Zeitfensters gesperrt.

## Oberfläche

Das Dashboard ist dunkel gehalten und nutzt durchgehend den StreamNet-Gold-Akzent
(`#e5a209`). Beim Laden von Daten läuft oben ein schmaler Fortschrittsbalken,
Buttons zeigen während einer laufenden Anfrage einen kleinen Spinner und sind
währenddessen gesperrt.

Alle Dropdown-Felder (Profil, Aktion, Bereich, Add-on-/Playlist-Auswahl) sind
als eigene, akzentfarbene Komponenten umgesetzt statt als native
Browser-Auswahlfelder — Öffnen/Schließen per Klick, Pfeiltasten, Enter und
Escape funktionieren wie gewohnt.

Zähler auf den Profilkarten (Add-ons, Playlists, Kataloge, Merkliste) werden
als kleine Badges dargestellt.

## Übersichtskennzahlen

### Accounts

Anzahl aller Datensätze in `accounts`. Ein Datensatz steht für ein
StreamNet-Cloudkonto mit E-Mail-Adresse und Passwort-Hash.

### Snapshots

Anzahl der Accounts mit einem Datensatz in `account_sync_snapshots`. Ein
Snapshot ist der zentrale Cloud-Zustand eines Accounts und enthält unter
anderem Profile, Einstellungen, Add-ons, Kataloge, Playlists und Merkliste.

Ein Account kann bereits existieren, ohne einen Snapshot zu besitzen. Deshalb
kann die Zahl kleiner als „Accounts“ sein.

### Kennzahl „Aktive Sessions“

Summe aller noch gültigen und nicht widerrufenen Refresh-Anmeldungen über alle
Accounts. Details und Einschränkungen stehen im Abschnitt „Aktive Sessions“.

### Events · 24 h

Anzahl aller Einträge in `app_usage_events`, die in den letzten 24 Stunden
angelegt wurden. Die App sendet unter anderem das Ereignis `app_open` sowie
Gerätemetadaten (`platform`, `device_type`). Das ist eine Ereignisanzahl und
keine Anzahl eindeutiger Nutzer oder Geräte.

### Verlaufseinträge

Gesamtzahl der Zeilen in `watch_history`. Ein Eintrag beschreibt den
Wiedergabeverlauf eines Films oder einer konkreten Episode innerhalb eines
Profils. Derselbe Titel wird über seinen eindeutigen Schlüssel aktualisiert und
nicht bei jedem Abspielen als neue Zeile angelegt.

### Datenbank

Von PostgreSQL gemeldete Größe der aktuell verwendeten Datenbank. Sie umfasst
nicht nur Nutzdaten des Dashboards, sondern die gesamte StreamNet-Datenbank
einschließlich Tabellen und Indizes. Die Anzeige wird in KB oder MB formatiert.

## Account-Liste

Die Liste zeigt standardmäßig bis zu 50 Accounts, neueste zuerst. Das Backend
unterstützt maximal 100 Ergebnisse pro Anfrage. Die Suchleiste filtert
E-Mail-Adressen ohne Beachtung der Groß-/Kleinschreibung.

Die Spalten bedeuten:

- **Account:** E-Mail-Adresse und interne UUID des Accounts.
- **Profile:** Anzahl der Profile im aktuellen Cloud-Snapshot.
- **Revision:** Versionsnummer des Snapshots. Jede akzeptierte Cloud- oder
  Admin-Änderung erhöht sie.
- **Letzter Sync:** Zeitpunkt, an dem der Snapshot-Datensatz zuletzt geändert
  wurde. Das ist kein Beweis dafür, dass ein Gerät gerade online ist.

Mit „Aktualisieren“ werden Übersichtskennzahlen und Account-Liste neu vom
Backend geladen. Ein Klick auf eine Tabellenzeile öffnet die Account-Details.

## Account-Details

### Account-Kennzahlen

- **Aktive Sessions:** Gültige Refresh-Anmeldungen dieses Accounts.
- **Watch History:** Anzahl seiner Wiedergabeverlaufseinträge.
- **Snapshot aktualisiert:** Zeitpunkt der letzten Cloud-Snapshot-Änderung.
- **Erstellt:** Erstellungszeitpunkt des Accounts.

Es gibt bewusst keine Kennzahl „Watch State“: Die App schreibt den
Gesehen-Status ausschließlich in den Cloud-Snapshot (siehe Profilzähler und
Payload). Die separate `watch_state`-Tabelle wird nur von einem inzwischen
deaktivierten Legacy-Sync-Pfad befüllt (`TraktSyncService.executeSupabaseCall`
wirft sofort, solange `CLOUD_SYNC_ENABLED` in der App aktiv ist) und bleibt
deshalb strukturell immer bei 0 — eine Anzeige wäre irreführend.

### Geräte

Direkt unter dem Account-Namen zeigt eine Reihe von Badges, von welchen
Gerätetypen (Mobile, Tablet, TV, Web) zuletzt App-Nutzungsereignisse für
diesen Account eingegangen sind, inklusive Zeitpunkt des letzten Ereignisses.
Grundlage ist die Tabelle `app_usage_events` (Feld `device_type`), die die App
bei Ereignissen wie `app_open` mitschickt. Das ist ein Nutzungsindikator, kein
Beweis für eine aktuell laufende Sitzung auf diesem Gerät. Hat ein Account
keine solchen Ereignisse, wird die Zeile ausgeblendet.

### Sitzungen und Konto (Danger Zone)

- **Alle Sitzungen abmelden:** Widerruft sofort alle noch gültigen
  Refresh-Sessions dieses Accounts. Betroffene Geräte müssen sich beim
  nächsten Zugriff erneut anmelden. Erfordert einen Änderungsgrund (Eingabe
  per Dialog). Einzelne Sitzungen/Geräte bleiben weiterhin nicht einzeln
  sichtbar oder gezielt widerrufbar — nur „alle“ ist möglich.
- **Konto löschen:** Entfernt den Account unwiderruflich inklusive Snapshot,
  Sessions, Watch History/State und Nutzungsereignissen (derselbe Codepfad wie
  die Selbstlöschung in der App, siehe `deleteAccountData`). Zur Bestätigung
  muss die exakte E-Mail-Adresse des Accounts eingegeben werden, danach ein
  Änderungsgrund. Nicht rückgängig zu machen.

Beide Aktionen schreiben einen Audit-Eintrag (`revoke_sessions` bzw.
`delete_account`), auch ohne begleitende Snapshot-Revisionsänderung.

### Profile

Für jedes Profil werden Name, interne Profil-ID und folgende Zähler als Badges
angezeigt:

- **Add-ons:** Add-on-Einträge, die dem Profil im Snapshot zugeordnet sind.
- **Playlists:** IPTV-Playlists dieses Profils.
- **Kataloge:** gespeicherte Katalogkonfigurationen dieses Profils.
- **Merkliste:** Einträge der profilbezogenen Watchlist.

Jede Profilkarte hat einen Button „Profil löschen“ (siehe unten). Die
angezeigte Snapshot-Revision ist die Grundlage für sichere Änderungen. Sie
verhindert, dass das Dashboard unbemerkt einen neueren Sync eines Geräts
überschreibt.

**Profil löschen:** Entfernt das Profil sowie sämtliche profilgebundenen Daten
(Einstellungen, IPTV-Konfiguration, Kataloge, Add-on-Zuordnung, Merkliste) aus
dem Snapshot. Erfordert Bestätigung per Dialog und einen Änderungsgrund. Das
letzte verbleibende Profil eines Accounts kann nicht gelöscht werden (Button
ist dann deaktiviert).

### Maskierter Snapshot

„Snapshot“ zeigt den aktuellen JSON-Cloudzustand. Sicherheitsrelevante Felder
werden rekursiv als `[REDACTED]` maskiert. Dazu gehören insbesondere
Passwörter, Tokens, Secrets, Zugangsdaten, API-Schlüssel, Cookies,
Autorisierungswerte, Playlist-/EPG-/Portal-URLs, MAC-Adressen sowie Bild- und
Avatarfelder.

„JSON kopieren“ kopiert nur diese maskierte Darstellung. Das Dashboard zeigt
keine unmaskierten Geheimnisse an.

## Payload ändern

Änderungen laufen entweder über einzelne, formularbasierte Operationen
(Add-on, Playlist, Profilfeld) oder über den erweiterten JSON-Editor für die
gesamte Payload. Es gibt weiterhin keine direkte SQL-Ausführung.

Jede Änderung benötigt:

1. ein vorhandenes Zielprofil (außer beim erweiterten Payload-Editor);
2. die entsprechenden Formularfelder bzw. gültiges JSON;
3. einen Änderungsgrund mit 3 bis 500 Zeichen;
4. die beim Öffnen geladene Snapshot-Revision.

Bei Erfolg wird die Revision um eins erhöht, `source` auf `admin` gesetzt und
ein Audit-Eintrag geschrieben. Alle Schritte laufen in einer gemeinsamen
PostgreSQL-Transaktion. Hat ein Gerät oder ein anderer Admin den Snapshot seit
dem Öffnen geändert, stimmt die erwartete Revision nicht mehr. Das Backend
antwortet dann mit einem Konflikt, nimmt keine Änderung vor und das Dashboard
lädt den Account neu.

### Add-on hinzufügen / ersetzen

Formularfelder statt JSON: Add-on-ID, Name, Manifest-URL, Version (Standard
`1.0.0`), optionale Beschreibung, Aktiviert-Kästchen. Andere technische Felder
(`type`, `runtimeKind`, `installSource`, `isInstalled`) werden vom Backend mit
sinnvollen Standardwerten belegt (`CUSTOM` / `STREMIO` / `DIRECT_URL` /
`true`).

Obwohl im Formular ein Profil gewählt wird, sind Add-ons im Android-Vertrag
**accountweit geteilt**. Das Dashboard schreibt das Add-on deshalb in alle
vorhandenen Profile dieses Accounts. Eine vorhandene ID wird komplett ersetzt,
nicht feldweise zusammengeführt.

### Add-on entfernen

Wählt ein vorhandenes Add-on aus einer Auswahlliste (keine manuelle
ID-Eingabe). Entfernt es aus allen Profilen, in denen es installiert ist —
konsistent mit dem geteilten Add-on-Status oben.

### Playlist hinzufügen / ersetzen

Formularfelder: Playlist-ID, Name, M3U-URL (Pflichtfeld), optionale EPG-URL,
Kästchen für Aktiviert / Live-TV importieren / Filme importieren / Serien
importieren. Gilt **nur für das ausgewählte Profil**. Eine vorhandene
Playlist mit derselben ID wird ersetzt, andernfalls angehängt. Die alten
Kompatibilitätsfelder `m3uUrl`/`epgUrl` des Profilzustands werden nur gefüllt,
wenn sie dort bisher leer sind.

### Playlist entfernen

Wählt eine vorhandene Playlist des ausgewählten Profils aus einer
Auswahlliste. Zeigen die Kompatibilitätsfelder `m3uUrl`/`epgUrl` des Profils
auf die gelöschte Playlist, werden sie geleert.

### Profilfeld setzen (erweitert)

Setzt genau ein Feld für das ausgewählte Profil. Erlaubte Bereiche sind:

- `profileSettingsById` für allgemeine Profileinstellungen;
- `iptvByProfile` für IPTV-Einstellungen.

Der Feldname muss dem tatsächlichen Android-Cloudvertrag entsprechen. Der Wert
im JSON-Feld darf ein String, eine Zahl, ein Boolean, `null`, ein Array oder ein
Objekt sein, zum Beispiel `"Orange"`, `true` oder `4`.

Das Feld `playlists` ist über diese Operation gesperrt; dafür muss „Playlist
hinzufügen / ersetzen“ verwendet werden. Gefährliche JavaScript-
Eigenschaftsnamen (`__proto__`, `constructor`, `prototype`) werden abgewiesen.
Der gesamte übermittelte Datenblock ist auf 64 KiB begrenzt.

Diese Funktion prüft nicht, ob ein frei angegebener Feldname von der aktuellen
Android-Version tatsächlich verstanden wird. Ein Tippfehler kann daher ein
wirkungsloses zusätzliches Feld erzeugen. Vor dem Schreiben sollte der genaue
Feldname aus dem Cloudvertrag geprüft werden.

### Gesamte Payload bearbeiten (erweitert)

Über „Bearbeiten“ im Snapshot-Panel lässt sich die komplette, maskierte
Payload als JSON öffnen und verändern. Beim Speichern gilt eine wichtige
Sicherheitsregel: Jeder Wert, der im JSON weiterhin als `"[REDACTED]"`
angezeigt wird, bleibt unverändert auf dem tatsächlich gespeicherten Wert
(Passwort, Token, Playlist-URL usw.) — das Dashboard überschreibt echte
Geheimnisse also nie mit dem Platzhaltertext. Um einen maskierten Wert
wirklich zu ändern, müssen die dedizierten Add-on-/Playlist-Formulare oder
„Profilfeld setzen“ verwendet werden.

Die Zuordnung erfolgt bei Listen (z. B. Playlists) über den Index; wird die
Reihenfolge einer Liste beim Bearbeiten verändert, kann ein maskierter Wert
dem falschen Eintrag zugeordnet werden. Die Payload darf maximal 512 KiB groß
sein und muss mindestens ein Profil enthalten.

## Audit-Protokoll

Das Audit-Protokoll zeigt standardmäßig die letzten 50 Änderungen, neueste
zuerst. Pro Eintrag werden angezeigt:

- Zeitpunkt;
- betroffener Account;
- Operation (z. B. `upsert_addon`, `delete_playlist`, `delete_profile`,
  `edit_payload`, `revoke_sessions`, `delete_account`);
- Profil-ID (leer bei accountweiten Aktionen);
- Revision vor und nach der Änderung;
- verpflichtender Änderungsgrund.

Zusätzlich speichert das Backend intern Admin-ID, ausgewählte Detailangaben,
Anfrage-IP und User-Agent. Ein Audit-Eintrag wird in derselben Transaktion wie
die zugehörige Änderung erzeugt. Scheitert die Änderung, gibt es weder eine
neue Revision noch einen erfolgreichen Audit-Eintrag. Wird ein Account
gelöscht, verweisen seine (und alle historischen) Audit-Einträge danach ohne
Account-Bezug auf „Gelöscht“.

## Was derzeit nicht möglich ist

Das Dashboard kann derzeit nicht:

- einzelne Account-Sessions oder Geräte anzeigen oder gezielt eine einzelne
  Sitzung widerrufen (nur „alle Sitzungen abmelden“ ist möglich);
- Passwörter von StreamNet-Accounts zurücksetzen (siehe Hinweis unten, noch
  nicht im Backend implementiert);
- Watch History oder Watch State bearbeiten;
- beliebige SQL-Abfragen ausführen — bewusst nicht eingebaut, da ein
  ungefiltertes SQL-Fenster ein zu hohes Risiko für versehentlichen
  Datenverlust und Injection wäre; für Ad-hoc-Abfragen direkt per `psql` auf
  dem Server arbeiten;
- unmaskierte Zugangsdaten anzeigen — bewusst nicht eingebaut, damit eine
  kompromittierte Admin-Sitzung oder ein Screenshot keine
  Playlist-/API-Zugangsdaten offenlegt;
- eindeutig anzeigen, welche Nutzer gerade online sind (die Geräte-Badges sind
  ein Nutzungsindikator, keine Echtzeit-Anwesenheitsanzeige).

## Passwort-Reset für StreamNet-Cloud-Accounts (offener Punkt)

Die Login-Seite (`index.html`) zeigt einen „Passwort vergessen?“-Link und ruft
dafür `/cloud-auth-reset` sowie `/auth-password-complete` auf. Diese beiden
Endpunkte existieren im aktuellen Self-hosted-Backend noch nicht — ein Klick
darauf schlägt derzeit fehl. Das ist kein Bug, sondern ein dokumentierter,
offener Punkt: Laut `self-hosted-backend/README.md` wird Passwort-Reset erst
nach Einrichtung eines E-Mail-Versands (z. B. via SMTP oder einem Anbieter wie
Resend) ergänzt. Bis dahin kann ein vergessenes Passwort nur durch einen
Admin-Eingriff auf Datenbankebene behoben werden (kein Dashboard-Feature).

## Sicherer Umgang

- Vor produktiven Änderungen immer ein aktuelles PostgreSQL-Backup erstellen.
- Account und Profil-ID sorgfältig prüfen.
- Die maskierte Payload lesen und die aktuelle Revision beachten.
- Nur dokumentierte Feldnamen und für die App gültige JSON-Typen verwenden.
- Einen konkreten Änderungsgrund eintragen.
- Nach der Änderung neue Revision, Profilzähler und Audit-Protokoll prüfen.
- Danach auf einem betroffenen Gerät einen Cloud-Pull beziehungsweise normalen
  App-Sync abwarten und die Wirkung kontrollieren.
- Playlist- und Add-on-URLs trotz Maskierung als Geheimnisse behandeln.
- Beim erweiterten Payload-Editor: `[REDACTED]`-Werte niemals durch echten
  Klartext ersetzen, wenn keine echte Änderung beabsichtigt ist, und die
  Reihenfolge bestehender Listen nicht verändern.
- „Konto löschen“ und „Profil löschen“ sind endgültig — vor der Ausführung
  Account/Profil-Zugehörigkeit doppelt prüfen.
