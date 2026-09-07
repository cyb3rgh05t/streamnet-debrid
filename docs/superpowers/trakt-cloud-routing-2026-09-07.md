# Trakt- und Cloud-Routing - Stand 2026-09-07

## Umfang

Version `2.3.010` klaert die sichtbare Bedeutung der Tracking-Quellen und
stabilisiert den Merkliste-Sync mit verbundenen Trakt-, Simkl- und
MDBList-Diensten.

## Cloud als Standardquelle

Der bisher sichtbare Wert `Automatisch` heisst jetzt `Cloud`. Der gespeicherte
interne Wert bleibt `AUTO`, damit vorhandene Einstellungen und Cloud-Snapshots
kompatibel bleiben.

In der UI bedeutet `Cloud`:

- App-eigene Daten werden zuerst lokal gespeichert.
- Bei angemeldetem StreamNet-Konto werden diese Daten ueber StreamNet Cloud
  zwischen Profilen und Geraeten synchronisiert.
- Verbundene Tracking-Dienste ersetzen diese Cloud-Daten nicht heimlich.

## Merkliste

`Cloud` ist die StreamNet-Merkliste. Sie wird lokal und per StreamNet Cloud
persistiert. Ein verbundener Trakt-Account macht die Merkliste nicht mehr
automatisch zur Trakt-Liste. Trakt, Simkl oder MDBList koennen bewusst als
Quelle gewaehlt beziehungsweise im Watchlist-Screen als eigene Bibliothek
angezeigt werden.

Der technische Schutz liegt in `SyncProviderStore.readProviders()`: Der
gespeicherte `AUTO`-Wert wird fuer `TrackingFeature.WATCHLIST` nicht zu Trakt,
Simkl oder MDBList aufgeloest. Dadurch startet `WatchlistViewModel` im
Cloud-Modus keinen Provider-Pull, der lokale Cloud-Eintraege durch eine externe
Liste ersetzen koennte.

## Weiter ansehen und Gesehen-Verlauf

Fuer Continue Watching und Watched-State bleibt die Runtime-Aufloesung erhalten:
Wenn `Cloud` gespeichert ist und ein Tracking-Dienst verbunden ist, duerfen die
Repositorys den verbundenen Dienst als zusaetzliche Lesequelle verwenden. Die
Einstellung selbst bleibt trotzdem sichtbar `Cloud` und springt nach dem Klick
nicht mehr sofort auf `Trakt` zurueck.

Explizite Provider-Auswahl bedeutet:

- `Trakt`: Trakt ist die Lesequelle fuer das jeweilige Feature.
- `Simkl`: Simkl ist die Lesequelle fuer das jeweilige Feature.
- `Trakt + Simkl`: beide Tracker werden fuer das Feature zusammengefuehrt.
- `MDBList`: MDBList ist die Lesequelle, wenn der Dienst verbunden ist.

Die drei Features sind getrennt. Eine Trakt-Auswahl fuer den Gesehen-Verlauf
setzt die Merkliste nicht automatisch auf Trakt.

## Entkoppeln von Providern

Beim Entkoppeln eines Providers werden lokale StreamNet-Daten nicht pauschal
geloescht. Importierte Watchlist-Eintraege werden aktuell in dieselbe lokale
Cloud-Merkliste gespiegelt wie manuell hinzugefuegte Eintraege. Ohne dauerhaft
gespeicherte Provider-Herkunft pro Eintrag kann die App beim Trennen nicht
sicher unterscheiden, was geloescht werden duerfte und was echte lokale Daten
sind.

Ein spaeterer sicherer Modus sollte deshalb einen expliziten Dialog anbieten:

- Nur Verbindung trennen
- Verbindung trennen und importierte Provider-Daten entfernen

Dafuer braucht die Merkliste zuerst Provider-Herkunft pro Eintrag und eine
Migration fuer bestehende Daten.

## Oberflaeche

Die Watchlist-Provider-Pills und die linke Library-Auswahl verwenden den aktiven
StreamNet-Akzent. Feste Trakt-/Simkl-Farben und weisse Fokusrahmen wurden in
diesem Bereich entfernt.

## Validierung

- `:app:testSideloadDebugUnitTest --tests "com.arflix.tv.data.repository.sync.SyncProviderStoreStateTest" --tests "com.arflix.tv.data.repository.sync.RemoteSyncManagerTest" -PenableUnitTests`
- `:app:compileSideloadDebugKotlin`
- `:app:assembleSideloadDebug`
