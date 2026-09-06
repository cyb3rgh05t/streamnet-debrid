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

## Aktive Sessions

### Woher kommt die Zahl?

Die Kennzahl wird aus der PostgreSQL-Tabelle `account_sessions` berechnet. Das
Dashboard zählt alle Zeilen, für die gleichzeitig gilt:

- `revoked_at` ist leer: Die Session wurde nicht widerrufen.
- `expires_at` liegt in der Zukunft: Der Refresh-Token ist noch gültig.

In der Übersicht ist dies die Summe für alle StreamNet-Accounts. In den
Account-Details ist es die Summe für den ausgewählten Account.

### Was ist eine Session technisch?

Eine Session entspricht einer gültigen StreamNet-Refresh-Anmeldung. Bei einer
Anmeldung oder Account-Erstellung speichert das Backend einen gehashten
Refresh-Token in `account_sessions`. Der Klartext-Token wird nicht in der
Datenbank gespeichert.

Das kurzlebige Access-Token ist standardmäßig 15 Minuten gültig. Wenn die App
es mit dem Refresh-Token erneuert, widerruft das Backend die bisherige
Session-Zeile und legt eine neue gültige Zeile mit einem neuen Refresh-Token an.
Die Zahl bleibt bei einer normalen Token-Erneuerung daher üblicherweise gleich.

Die Refresh-Laufzeit beträgt standardmäßig 30 Tage. Sie kann auf dem Server mit
`REFRESH_TOKEN_TTL_DAYS` geändert werden.

### Was bedeutet die Zahl praktisch?

`1 aktive Session` bedeutet: Es existiert genau eine noch verwendbare
Refresh-Anmeldung, mit der dieser Account neue Access-Tokens erhalten kann.

Die Kennzahl bedeutet ausdrücklich nicht:

- dass die App gerade geöffnet ist;
- dass das Gerät gerade online ist;
- dass gerade ein Stream läuft;
- dass exakt so viele physische Geräte existieren;
- dass es sich um angemeldete Administratoren handelt.

Mehrere Geräte oder mehrere getrennte Anmeldungen können mehrere aktive
Sessions erzeugen. Auch ein neu installiertes oder zurückgesetztes Gerät kann
eine weitere Session erzeugen, wenn die alte Session serverseitig noch gültig
ist.

Die aktuelle App-Abmeldung löscht die Tokens auf dem Gerät, widerruft die
zugehörige Datenbank-Session aber nicht beim Backend. Auch eine Deinstallation
informiert den Server nicht. Solche nicht mehr verwendeten Sessions werden
daher weiterhin gezählt, bis sie ablaufen oder der Account gelöscht wird. Die
Zahl kann deshalb höher als die Anzahl tatsächlich verwendeter Geräte sein.

Das Admin-Dashboard bietet derzeit weder eine Liste einzelner Sessions noch
eine Schaltfläche zum Widerrufen. Die Kennzahl ist ein Anmeldeindikator, keine
zuverlässige Echtzeit-Anwesenheitsanzeige.

Nicht in „Aktive Sessions“ enthalten sind:

- die 30-minütige Admin-Sitzung im Browser;
- kurzlebige Access-JWTs;
- offene oder abgelaufene TV-Pairing-Vorgänge;
- Discord-Autorisierungssitzungen.

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

Summe aller noch gültigen und nicht widerrufenen Refresh-Anmeldungen. Details
und Einschränkungen stehen im Abschnitt „Aktive Sessions“.

### Events · 24 h

Anzahl aller Einträge in `app_usage_events`, die in den letzten 24 Stunden
angelegt wurden. Die App sendet derzeit insbesondere das Ereignis `app_open`.
Das ist eine Ereignisanzahl und keine Anzahl eindeutiger Nutzer oder Geräte.

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
- **Watch State:** Anzahl separater Zustandszeilen, zum Beispiel als gesehen
  markierte Filme, als gesehen markierte Episoden und Synchronisationsstatus.
- **Erstellt:** Erstellungszeitpunkt des Accounts.

### Profile

Für jedes Profil werden Name, interne Profil-ID und folgende Zähler angezeigt:

- **Add-ons:** Add-on-Einträge, die dem Profil im Snapshot zugeordnet sind.
- **Playlists:** IPTV-Playlists dieses Profils.
- **Kataloge:** gespeicherte Katalogkonfigurationen dieses Profils.
- **Merkliste:** Einträge der profilbezogenen Watchlist.

Die angezeigte Snapshot-Revision ist die Grundlage für sichere Änderungen. Sie
verhindert, dass das Dashboard unbemerkt einen neueren Sync eines Geräts
überschreibt.

### Maskierter Snapshot

„Snapshot“ zeigt den aktuellen JSON-Cloudzustand. Sicherheitsrelevante Felder
werden rekursiv als `[REDACTED]` maskiert. Dazu gehören insbesondere
Passwörter, Tokens, Secrets, Zugangsdaten, API-Schlüssel, Cookies,
Autorisierungswerte, Playlist-/EPG-/Portal-URLs, MAC-Adressen sowie Bild- und
Avatarfelder.

„JSON kopieren“ kopiert nur diese maskierte Darstellung. Das Dashboard zeigt
keine unmaskierten Geheimnisse an.

## Payload ändern

Änderungen sind absichtlich auf drei Operationen beschränkt. Es gibt keinen
beliebigen JSON-Editor und keine direkte SQL-Ausführung.

Jede Änderung benötigt:

1. ein vorhandenes Zielprofil;
2. gültiges JSON im Datenfeld;
3. einen Änderungsgrund mit 3 bis 500 Zeichen;
4. die beim Öffnen geladene Snapshot-Revision.

Bei Erfolg wird die Revision um eins erhöht, `source` auf `admin` gesetzt und
ein Audit-Eintrag geschrieben. Alle Schritte laufen in einer gemeinsamen
PostgreSQL-Transaktion.

### Add-on hinzufügen / ersetzen

Die Operation `upsert_addon` sucht anhand von `id` nach einem vorhandenen
Add-on. Bei gleicher ID wird es vollständig ersetzt, andernfalls hinzugefügt.

Obwohl im Formular ein Profil gewählt wird, sind Add-ons im Android-Vertrag
accountweit geteilt. Das Dashboard schreibt das Add-on deshalb in alle
vorhandenen Profile.

Wichtige Felder:

- `id`: stabile eindeutige Kennung, maximal 200 Zeichen;
- `name`: sichtbarer Name, maximal 200 Zeichen;
- `version`: Versionsangabe, standardmäßig `1.0.0`;
- `description`: optionale Beschreibung;
- `isEnabled`: `false` deaktiviert das Add-on, sonst wird es aktiviert;
- `type`: standardmäßig `CUSTOM`;
- `runtimeKind`: standardmäßig `STREMIO`;
- `installSource`: standardmäßig `DIRECT_URL`;
- `url`: Manifest- oder Installationsadresse, sofern der Add-on-Typ sie nutzt.

`isInstalled` wird vom Backend immer auf `true` gesetzt. Vorhandene Einträge
mit derselben ID werden nicht feldweise zusammengeführt, sondern durch das
übermittelte Objekt ersetzt.

### Playlist hinzufügen / ersetzen

Die Operation `upsert_playlist` gilt nur für das ausgewählte Profil. Eine
vorhandene Playlist mit derselben `id` wird ersetzt, andernfalls wird sie
angehängt.

Wichtige Felder:

- `id`: stabile eindeutige Kennung, maximal 200 Zeichen;
- `name`: sichtbarer Name, maximal 200 Zeichen;
- `m3uUrl`: Pflichtfeld mit der Playlist-Adresse;
- `epgUrl`: optionale primäre EPG-Adresse;
- `epgUrls`: optionale Liste mehrerer EPG-Adressen;
- `enabled`: `false` deaktiviert die Playlist;
- `importLiveTv`: `false` deaktiviert Live-TV-Import;
- `importVod`: `false` deaktiviert Filmimport;
- `importSeries`: `false` deaktiviert Serienimport.

Fehlt `epgUrls`, wird bei vorhandener `epgUrl` automatisch eine Liste mit
dieser Adresse erzeugt. Die alten Kompatibilitätsfelder `m3uUrl` und `epgUrl`
des Profilzustands werden nur gefüllt, wenn sie dort bisher leer sind.

### Profilfeld setzen

Die Operation `set_profile_field` setzt genau ein Feld für das ausgewählte
Profil. Erlaubte Bereiche sind:

- `profileSettingsById` für allgemeine Profileinstellungen;
- `iptvByProfile` für IPTV-Einstellungen.

Der Feldname muss dem tatsächlichen Android-Cloudvertrag entsprechen. Der Wert
im JSON-Feld darf ein String, eine Zahl, ein Boolean, `null`, ein Array oder ein
Objekt sein. Beispiele:

```json
"Orange"
```

```json
true
```

```json
4
```

Das Feld `playlists` ist über diese allgemeine Operation gesperrt; dafür muss
„Playlist hinzufügen / ersetzen“ verwendet werden. Gefährliche JavaScript-
Eigenschaftsnamen werden abgewiesen. Der gesamte übermittelte Datenblock ist
auf 64 KiB begrenzt.

Diese Funktion prüft nicht, ob ein frei angegebener Feldname von der aktuellen
Android-Version tatsächlich verstanden wird. Ein Tippfehler kann daher ein
wirkungsloses zusätzliches Feld erzeugen. Vor dem Schreiben sollte der genaue
Feldname aus dem Cloudvertrag geprüft werden.

### Revisionskonflikt

Hat ein Gerät oder ein anderer Admin den Snapshot seit dem Öffnen geändert,
stimmt die erwartete Revision nicht mehr. Das Backend antwortet dann mit einem
Konflikt, nimmt keine Änderung vor und das Dashboard lädt den Account neu.
Danach müssen die aktuellen Daten geprüft und die Änderung bewusst erneut
eingegeben werden.

## Audit-Protokoll

Das Audit-Protokoll zeigt standardmäßig die letzten 50 Änderungen, neueste
zuerst. Pro Eintrag werden angezeigt:

- Zeitpunkt;
- betroffener Account;
- Operation;
- Profil-ID;
- Revision vor und nach der Änderung;
- verpflichtender Änderungsgrund.

Zusätzlich speichert das Backend intern Admin-ID, ausgewählte Detailangaben,
Anfrage-IP und User-Agent. Ein Audit-Eintrag wird in derselben Transaktion wie
die Snapshot-Änderung erzeugt. Scheitert die Änderung, gibt es weder eine neue
Revision noch einen erfolgreichen Audit-Eintrag.

## Was derzeit nicht möglich ist

Das Dashboard kann derzeit nicht:

- einzelne Account-Sessions oder Geräte anzeigen;
- Sessions gezielt widerrufen oder einen Account remote abmelden;
- Accounts, Profile, Add-ons oder Playlists löschen;
- Passwörter von StreamNet-Accounts ändern;
- Watch History oder Watch State bearbeiten;
- beliebiges Snapshot-JSON ersetzen;
- beliebige SQL-Abfragen ausführen;
- unmaskierte Zugangsdaten anzeigen;
- eindeutig anzeigen, welche Nutzer gerade online sind.

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
