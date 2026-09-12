# Echtzeit-Synchronisierung für Continue Watching

Status: Geplantes Feature  
Dokumentiert: 12. September 2026

## Ziel

Continue Watching soll zwischen Web und Android automatisch aktualisiert werden,
ohne Reload, App-Neustart oder manuell erzwungenen Cloud-Pull.

Das Ziel gilt als erreicht, wenn ein pausierter, fortgesetzter, entfernter oder
abgeschlossener Titel innerhalb weniger Sekunden auf allen aktuell verbundenen
Geräten desselben Kontos und Profils korrekt erscheint beziehungsweise
verschwindet.

## Heutiger Stand

Die bestehende Synchronisierung basiert auf einem vollständigen,
revisionsgeschützten Account-Snapshot:

- `POST /account-sync-pull` lädt Snapshot und Revision.
- `POST /account-sync-push` schreibt mit `expectedRevision` und Compare-and-Set.
- Web und Android verwenden `localContinueWatchingByProfile[profileId]` als
  gemeinsamen Continue-Watching-Datensatz.
- Ein Eintrag enthält unter anderem TMDB-ID, Medientyp, Fortschritt,
  Wiedergabeposition, Laufzeit, Staffel, Episode und `updatedAtMs`.
- Entfernungen verwenden profilbezogene Tombstones in
  `dismissedContinueWatchingByProfile`.
- Profile bleiben strikt voneinander getrennt.

Der Webplayer speichert Fortschritt höchstens einmal pro 60 Sekunden und
zusätzlich sofort bei Pause, Seitenwechsel, Hintergrundwechsel, Player-Ende und
Player-Abbau. Ab 90 Prozent wird ein Titel als abgeschlossen behandelt und aus
Continue Watching entfernt. Live-TV und erkannte Sports-/Live-Streams werden
nicht als VOD-Fortschritt synchronisiert.

Android importiert `localContinueWatchingByProfile` bei einem Cloud-Pull und
führt die Einträge mit dem aktiven Tracking-Anbieter und lokaler Watch-History
zusammen. Der Mindestfortschritt für Continue Watching beträgt 1 Prozent.

Damit ist der Datenvertrag bereits bidirektional, die Zustellung jedoch nicht:
Andere Geräte erfahren von einer neuen Revision erst beim nächsten Pull.

## Funktionsumfang

Folgende Änderungen müssen in Echtzeit übertragen werden:

- neuer oder aktualisierter Wiedergabefortschritt;
- Wechsel auf eine andere Episode derselben Serie;
- Entfernen aus Continue Watching;
- Abschluss ab 90 Prozent;
- erneute Wiedergabe eines zuvor gesehenen Titels;
- Änderungen aus Webplayer, Android-Player und externer Wiedergabe;
- Konfliktauflösung bei nahezu gleichzeitigen Änderungen mehrerer Geräte.

Nicht Bestandteil dieses Features sind die Synchronisierung laufender
Videoframes, gemeinsames Watch-Party-Playback oder die Übertragung von
Mediendateien.

## Zielarchitektur

### 1. Snapshot bleibt autoritativ

Der bestehende Snapshot und seine Revision bleiben die einzige autoritative
Datenquelle. Echtzeit-Ereignisse transportieren keine vollständigen
Continue-Watching-Daten. Sie melden nur, dass eine neuere Revision verfügbar
ist. Der empfangende Client lädt anschließend den Snapshot über
`account-sync-pull` und verwendet die vorhandene Merge- und Tombstone-Logik.

Das vermeidet einen zweiten Datenvertrag und verhindert, dass sensible
Snapshot-Inhalte über einen Benachrichtigungskanal verteilt werden.

### 2. Backend-Ereignis nach erfolgreichem Push

Nach dem Commit eines erfolgreichen `account-sync-push` veröffentlicht das
Self-hosted Backend ein kontobezogenes Ereignis:

```json
{
  "type": "account_sync_revision",
  "revision": 3213,
  "sourceDeviceId": "opaque-installation-id",
  "changedAreas": ["continue_watching"],
  "occurredAt": "2026-09-12T10:30:00.000Z"
}
```

`changedAreas` ist ein Hinweis zur Begrenzung unnötiger UI-Aktualisierungen,
keine Sicherheits- oder Konsistenzgrenze. Bei fehlender oder unbekannter Angabe
muss der Client den normalen Snapshot-Pull ausführen.

Das Ereignis darf keine Titel, Medien-IDs, E-Mail-Adressen, Tokens,
Wiedergabepositionen oder Profilnamen enthalten.

### 3. Web-Zustellung über Server-Sent Events

Die WebUI hält nach erfolgreicher Anmeldung eine authentifizierte SSE-Verbindung
zum Self-hosted Backend offen, beispielsweise:

```text
GET /account-sync-events
Accept: text/event-stream
Authorization: Bearer <access-token>
```

SSE ist für die WebUI ausreichend, weil der Client Änderungen weiterhin über
die bestehenden HTTP-Endpunkte pusht und nur Server-zu-Client-Signale benötigt.

Bei `account_sync_revision` gilt:

1. Eigene bereits bestätigte Revisionen ignorieren.
2. Mehrere Ereignisse innerhalb von 250 bis 500 ms zusammenfassen.
3. `account-sync-pull` ausführen.
4. Nur betroffene Stores neu berechnen.
5. Continue Watching ohne Seitenreload aktualisieren.
6. Bei `401` einmal Token erneuern und die Verbindung neu aufbauen.
7. Bei Verbindungsabbruch mit begrenztem exponentiellem Backoff neu verbinden.

Ein regelmäßiger Fallback-Pull bleibt bestehen, damit verlorene Ereignisse oder
Proxy-Unterbrechungen keine dauerhafte Abweichung verursachen.

### 4. Android-Zustellung

Im Vordergrund kann Android ebenfalls SSE verwenden. Das vermeidet eine
dauerhafte bidirektionale WebSocket-Verbindung und nutzt denselben
Backend-Kanal wie die WebUI.

Für Hintergrundzustellung ist ein Betriebssystem-Push notwendig. Empfohlen ist
FCM mit einem reinen Data-Event, das nur Revision und Änderungsbereich enthält.
Firebase Analytics und Crashlytics sind dafür nicht erforderlich und bleiben
deaktiviert.

Nach Empfang gilt:

1. Event gegen zuletzt angewandte Revision prüfen.
2. Einen einmaligen Cloud-Pull über WorkManager anfordern.
3. Bestehende Merge-Regeln anwenden.
4. Continue-Watching-Repository und sichtbaren Home-State aktualisieren.
5. Keine Benutzerbenachrichtigung anzeigen.

Falls FCM für eine Distribution nicht verfügbar oder nicht gewünscht ist,
bleibt periodischer WorkManager-Pull der Fallback. Vollständige Echtzeit im
Android-Hintergrund kann ohne einen vom Betriebssystem zugelassenen Push-Kanal
nicht garantiert werden.

## Konflikt- und Schleifenvermeidung

- Jeder Push verwendet weiterhin `expectedRevision`.
- Ein `409 revision_conflict` wird mit dem aktuellen Snapshot zusammengeführt
  und höchstens kontrolliert erneut versucht.
- Jeder Client speichert die zuletzt angewandte und zuletzt selbst bestätigte
  Revision.
- Ein Ereignis mit einer bereits angewandten Revision löst keinen Pull aus.
- Ein Pull ohne lokale Änderung darf keinen neuen Push erzeugen.
- Continue-Watching-Einträge werden pro Profil und Medien-/Episodenschlüssel
  über `updatedAtMs` zusammengeführt.
- Ein neuerer Tombstone entfernt einen älteren Eintrag; eine später gestartete
  Wiedergabe darf den passenden Tombstone wieder löschen.
- Tombstones oder Continue-Watching-Einträge verschiedener Profile dürfen nie
  zusammengeführt werden.

## Backend-Anforderungen

- Authentifizierter SSE-Endpunkt mit strikt kontobezogenem Fan-out.
- Ereignis erst nach erfolgreichem Datenbank-Commit veröffentlichen.
- Heartbeat-Kommentar etwa alle 20 bis 30 Sekunden für Reverse Proxies.
- Begrenzung paralleler Verbindungen pro Account und Installation.
- Sauberes Entfernen geschlossener Verbindungen.
- Keine Speicherung von Access-Tokens oder Snapshot-Inhalten im Event-Bus.
- Mehrinstanzbetrieb über PostgreSQL `LISTEN/NOTIFY`, Redis Pub/Sub oder einen
  vergleichbaren internen Kanal.
- Traefik-/Proxy-Konfiguration ohne Response-Buffering für SSE.
- FCM-Gerätetokens verschlüsselt oder angemessen geschützt speichern,
  kontobezogen widerrufen und bei Logout löschen.
- Ereignisse und FCM-Payloads dürfen ausschließlich Metadaten enthalten.

Netlify und Supabase sind keine Laufzeitabhängigkeiten dieses Features. Alle
Cloud-Operationen verwenden `https://auth.mystreamnet.club` und PostgreSQL.

## Web-Anforderungen

- Genau eine Event-Verbindung pro aktiver Session/Browser-Instanz.
- Verbindung bei Login öffnen und bei Logout vollständig schließen.
- Fortschritt weiter sofort bei Pause, Ende, Hintergrund und Seitenwechsel
  speichern.
- Optionales kürzeres Checkpoint-Intervall nur nach Lasttest; 60 Sekunden
  bleiben zunächst bestehen, weil Echtzeit-Zustellung nicht häufigere
  Snapshot-Schreibvorgänge erfordert.
- Empfangene Revisionen dürfen laufende lokale Player-Fortschritte nicht mit
  einem älteren Snapshot überschreiben.
- Sichtbare Continue-Watching-Karten nach Pull und Provider-Reconcile ohne
  Flackern oder temporäres Verschwinden aktualisieren.

## Android-Anforderungen

- SSE nur im Vordergrund aktiv halten.
- Hintergrundereignisse über FCM und WorkManager verarbeiten.
- Mehrere Push-Ereignisse zu einem Pull zusammenfassen.
- Netzwerk-, Akku- und Doze-Beschränkungen respektieren.
- Nach App-Start weiterhin einen normalen Pull durchführen; Push ersetzt keine
  Startkonsistenzprüfung.
- Importierte Web-Fortschritte auch bei verbundenem Trakt, Simkl oder MDBList in
  den finalen Continue-Watching-Resolver aufnehmen.
- UI-Aktualisierung auf das aktive Profil begrenzen.

## Sicherheit und Datenschutz

- Event-Endpunkt ausschließlich über HTTPS.
- Derselbe Access-Token- und Refresh-Mechanismus wie bei den Sync-Endpunkten.
- Keine Credentials in Query-Parametern.
- Kein Cross-Account- oder Cross-Profile-Fan-out.
- Logs enthalten höchstens Revision, Änderungsbereich, Ergebnis, Latenz und
  anonymisierte Installationskennung.
- Titel, TMDB-IDs, Positionen, Profilnamen, E-Mail-Adressen und vollständige
  Payloads gehören nicht in normale Produktionslogs.
- Rate Limits und maximale Verbindungsdauer gegen Missbrauch vorsehen.

## Beobachtbarkeit

Privacy-sichere Metriken:

- aktive SSE-Verbindungen;
- erfolgreiche und abgebrochene Event-Zustellungen;
- Zeit von Snapshot-Commit bis Client-Pull;
- Pull-Erfolg, Revision und Konfliktrate;
- zusammengefasste beziehungsweise ignorierte Duplicate-Events;
- FCM-Zustellversuche und ungültig gewordene Gerätetokens;
- Zeit von Player-Pause bis sichtbarer Aktualisierung auf einem zweiten Gerät.

Diagnose-Logs sollen pro Stufe nur Zähler und Revisionen ausgeben:

```text
sync_event received revision=3213 area=continue_watching
sync_pull applied revision=3213 cw_count=14 profile_count=1
home_cw resolved input=14 output=14
```

## Umsetzung in Phasen

### Phase 1: Backend und Web

1. Event-Schema und `sourceDeviceId` definieren.
2. SSE-Endpunkt implementieren und authentifizieren.
3. Nach erfolgreichem Push ein Revisionsevent veröffentlichen.
4. Web-Client mit Reconnect, Deduplizierung und Pull anbinden.
5. Continue-Watching-State nach Pull gezielt aktualisieren.
6. Produktion hinter Traefik auf deaktiviertes Buffering prüfen.

Damit wird Web-zu-Web und Android-zu-Web im geöffneten Browser nahezu in
Echtzeit sichtbar.

### Phase 2: Android im Vordergrund

1. Event-Client an Cloud-Session-Lebenszyklus binden.
2. Revisionsevents in einen deduplizierten Pull übersetzen.
3. Repository- und Home-Refresh nach erfolgreichem Apply auslösen.
4. Verhalten bei Profilwechsel, Logout und Token-Refresh testen.

### Phase 3: Android im Hintergrund

1. FCM-Geräteregistrierung und Widerruf implementieren.
2. Backend-Fan-out an aktive Gerätetokens ergänzen.
3. Data-Event über WorkManager in einen Pull übersetzen.
4. Doze, Offline-Zustand, App-Kill und Token-Rotation testen.

### Phase 4: Härtung

1. Mehrinstanz-Event-Bus und Lasttest.
2. Chaos-Tests für verlorene und doppelte Events.
3. Metriken, Rate Limits und Datenschutzprüfung.
4. Stufenweiser Rollout mit Feature-Flag und schnellem Fallback auf Pull-only.

## Abnahmekriterien

- Web pausiert einen Film zwischen 1 und 89 Prozent: Android im Vordergrund
  zeigt denselben Titel und Resume-Punkt innerhalb von fünf Sekunden.
- Android pausiert: eine geöffnete WebUI aktualisiert sich innerhalb von fünf
  Sekunden ohne Reload.
- Ein Abschluss ab 90 Prozent entfernt den Titel auf dem anderen geöffneten
  Gerät innerhalb von fünf Sekunden.
- Eine Entfernung aus Continue Watching wird auf anderen Geräten übernommen und
  nicht durch einen älteren Snapshot wiederhergestellt.
- Eine spätere echte Wiedergabe kann einen älteren Watched-/Dismissal-Zustand
  korrekt überstimmen.
- Staffel und Episode bleiben exakt; ein Ereignis für eine Episode entfernt
  keine andere Episode oder das gesamte Profil.
- Gleichzeitige Änderungen erzeugen keine Endlosschleife und verlieren keine
  neuere Position.
- Offline-Geräte holen nach Wiederverbindung den neuesten Snapshot nach.
- Profil A erhält keine Continue-Watching-Daten oder Tombstones von Profil B.
- Logout schließt Event-Verbindungen und widerruft den Android-Pushkanal.
- Keine Secrets oder Medienaktivitäten erscheinen in Produktionslogs oder
  Event-Payloads.

## Tests

- Backend-Unit- und Integrationstests für Auth, Commit-Reihenfolge, Fan-out,
  Disconnect und mehrere Instanzen.
- Web-Tests für Event-Deduplizierung, Reconnect, eigene Revisionen,
  Tombstones und sichtbare Aktualisierung.
- Android-Tests für Event-Lebenszyklus, WorkManager-Deduplizierung,
  Profilisolation und Home-Resolver.
- End-to-End-Test mit zwei Browsern und einem Android-Gerät.
- Test mit Trakt-, Simkl-, MDBList- und reinem Cloud-Profil.
- Test bei Offline/Online-Wechsel, abgelaufenem Access-Token, `409`-Konflikt und
  Backend-Neustart.

## Offene Entscheidungen

- FCM nur für Play/Sideload oder zusätzlicher Push-Anbieter für vollständig
  Google-freie Builds.
- PostgreSQL `LISTEN/NOTIFY` oder Redis Pub/Sub für mehrere Backend-Instanzen.
- Exakter Fallback-Pull-Intervall im Vorder- und Hintergrund.
- Ob `changedAreas` vom Client angegeben oder serverseitig aus Snapshot-Diffs
  abgeleitet wird.
- Feature-Flag pro Account, App-Version oder globaler Backend-Konfiguration.

## Definition of Done

Das Feature ist erst abgeschlossen, wenn Backend, produktive WebUI und Android
gemeinsam ausgerollt sind. Das Veröffentlichen eines Web-Containers allein ist
kein Deployment; der Produktionsserver muss das neue Image ziehen und den
Container neu starten. Android benötigt eine veröffentlichte beziehungsweise
installierte Version mit Event-/Push-Unterstützung.
