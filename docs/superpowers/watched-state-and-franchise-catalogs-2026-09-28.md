# Watched-State und Franchise-Kataloge

Datum: 2026-09-28

Releases: Android `2.5.044` (Code 445), Web `1.0.055`

## Umfang

Dieser Stand vereinheitlicht das sichtbare Watched-/Partial-Watched-Verhalten von Android und Web auf Home-, Collection- und Franchise-Karten. Die Plattformen teilen dabei die fachliche Semantik, behalten aber ihre bestehenden internen Cacheformate. Gleichzeitig laden Marvel, DC Universe und Star Wars ihre chronologischen Kataloge direkt über die MystreamNet-Manifeste, ohne separate Addon-Karten in der Addon-Verwaltung.

## Gemeinsamer Watched-Vertrag

Die plattformübergreifenden Cloud-/Web-Schlüssel haben folgende Bedeutungen:

- Film: `movie:<tmdbId>`
- Ganze Serie: `tv:<tmdbId>`
- Episode: `tv:<tmdbId>:<season>:<episode>`
- Android speichert Episoden intern als `show_tmdb:<tmdbId>:<season>:<episode>` und aggregiert diese Schlüssel pro Serie. Ein vollständig gesehener Serienstand wird dort über die vollständige Episodenmenge abgebildet; Web akzeptiert zusätzlich den expliziten Serien-Schlüssel `tv:<tmdbId>`.

Die Daten bleiben profilbezogen. Android vereinigt seinen lokalen Snapshot, die selbst gehostete StreamNet Cloud und die für Watched-Lesen aktivierten Tracker Trakt, MDBList und Simkl im `TraktRepository`-Cache. Web vereinigt Tracker-Watched-Daten, Cloud-Watched-Schlüssel und relevante Up-Next-Daten im globalen Watched-Key-Satz.

## Statusauflösung

- Filme sind vollständig gesehen, wenn ihre TMDB-ID im Watched-Film-Satz liegt.
- Serien mit mindestens einer gesehenen Episode sind teilweise gesehen, solange die bekannte Gesamtzahl nicht erreicht ist.
- Serien sind vollständig gesehen, wenn ein Serien-Schlüssel vorliegt oder alle bekannten Nicht-Special-Episoden beziehungsweise mindestens die TMDB-Gesamtzahl eindeutiger Episoden gesehen wurden.
- Web übernimmt `number_of_seasons` und `number_of_episodes` aus TMDB-Metadaten, damit Home- und Collection-Karten auch ohne bereits geladene Staffelstruktur korrekt ausgewertet werden.
- Android nutzt zuerst die Episodenzahl am Katalogitem, danach den lokalen Detailcache und lädt nur für begonnene Serien mit unbekannter Gesamtzahl begrenzt TMDB-Details nach.

## Sichtbarkeit

Watched- und Partial-Watched-Marker erscheinen auf:

- normalen Home-Rails,
- Collection-Detailkarten,
- Franchise-Film- und Serienkarten,
- paginierten Folgeseiten dieser Ansichten.

Die Marker erscheinen bewusst nicht auf:

- `recently_watched_movies`,
- `recently_watched_series`,
- Continue Watching, wenn die Karte stattdessen Fortschritt oder Up Next darstellt.

Android blendet diese Marker über den Kategorie-Kontext aus. Web reicht dafür ein explizites `showWatched` vom Rail zur `MediaCard` durch. Collection-/Franchise-Browser verwenden keine Ausnahme und zeigen die Marker normal an.

## Android-Datenfluss

`HomeViewModel.refreshWatchedBadges()` initialisiert den gemeinsamen Watched-Cache, zählt Episodenschlüssel pro TMDB-Serie und dekoriert alle Home-Items über `resolveHomeWatchedBadgeState()`. Nach einem vollständigen Austausch der Home-Kategorien läuft dieser Refresh mit `immediate = true`, da neue Items sonst bis zum Ablauf des 90-Sekunden-Cooldowns ohne Marker blieben.

`CollectionDetailsViewModel` verwendet denselben Cache und denselben Resolver für die erste Seite sowie alle nachgeladenen Seiten. TMDB-Detailabfragen für begonnene Serien ohne bekannte Episodenzahl sind auf fünf parallele Requests begrenzt. Bereits geladene oder gecachte Episodenzahlen verursachen keinen zusätzlichen Detailabruf.

## Web-Datenfluss

`MediaCard` fragt weiterhin die globalen `isWatched`- und `isPartiallyWatched`-Callbacks ab. Dadurch teilen Home, Collections und Franchises denselben Watched-Key-Satz, ohne Itemmodelle pro Ansicht zu kopieren. `MediaRail` deaktiviert die Darstellung ausschließlich für die beiden Recently-Watched-Kategorie-IDs.

Die Serienauflösung verwendet vorhandene Staffel-/Episodendetails. Fehlen diese, zählt sie eindeutige positive Staffel-/Episoden-Schlüssel und vergleicht sie mit `numberOfEpisodes` aus TMDB.

## Direkte Franchise-Manifeste

Die primären chronologischen Quellen sind:

- Marvel: `https://marvel.mystreamnet.club/catalog/marvel-mcu/manifest.json`
- DC Universe: `https://dc.mystreamnet.club/catalog/dc-chronological/manifest.json`
- Star Wars: `https://starwars.mystreamnet.club/catalog/sw-movies-series-chronological/manifest.json`

Android und Web können diese Manifest-URLs direkt als Collection-Quelle lesen. Die zugehörigen aktuellen und historischen Manifest-IDs werden aus der allgemeinen Addon-Verwaltung entfernt beziehungsweise dort ausgeblendet. Kuratierte IDs, TMDB-Collections und MDBList-Quellen bleiben als Fallbacks erhalten.

## Betrieb und Rollback

- Android wird durch die Änderung von `app/build.gradle.kts` über `publish-streamnet-apk.yml` gebaut, signiert und als GitHub-Release `2.5.044` veröffentlicht.
- Web wird durch die Änderung von `web/package.json` über `publish-streamnet-web.yml` geprüft und als `ghcr.io/cyb3rgh05t/streamnet-web:latest` sowie SHA-Tag veröffentlicht.
- Der Web-Workflow veröffentlicht nur das Container-Image. Die Produktionsinstanz muss weiterhin auf dem Server per Compose gepullt und neu erstellt werden.
- Es ist keine Backend-Migration und kein Backend-Deploy erforderlich.
- Ein Rollback erfolgt auf den vorherigen Android-Release `2.5.043` beziehungsweise den vorherigen Web-Commit/Image-Stand `1.0.054`.

## Validierung

- Web-Test-Suite: 43 Tests erfolgreich.
- Web-Produktionsbuild inklusive Typecheck erfolgreich.
- Android `:app:compileSideloadDebugKotlin` erfolgreich.
- Android `:app:testSideloadDebugUnitTest -PenableUnitTests`: 577 Tests, 0 Fehler, 1 übersprungen.
- Android Sideload Release `2.5.044`: 100.802.479 Byte, SHA-256 `713109339B4DBAB67EBB7D469EE1F45847306D90AA24554C7BB5BD48C759C937`.
- Android Sideload Debug `2.5.044-debug`: 126.850.256 Byte, SHA-256 `4BABAC402903E986620909C02ECECE93DD0FFEAA9AEE784A74EA7501854FD276`.
