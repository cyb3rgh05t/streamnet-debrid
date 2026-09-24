# StreamNet Katalogquellen und Self-Hosting

Stand: 2026-09-24

Dieses Dokument beschreibt, woher StreamNet die Kataloge, Service-/Franchise-Inhalte,
Metadaten, Bilder, Videos und Addon-Kataloge bezieht. Danach folgt ein Konzept, wie die
Abhaengigkeit von fremden Katalog- und Asset-Quellen reduziert oder durch eigene Quellen
ersetzt werden kann.

## 1. Kurzuebersicht

StreamNet hat nicht eine einzige Inhaltsquelle. Ein Service oder Franchise besteht aus:

1. einer statischen Collection-Definition im Android-/Web-Code,
2. einem Cover oder Hero-Video,
3. einer oder mehreren Katalogquellen,
4. TMDB-Metadaten zur Anreicherung,
5. optionalen Stremio-Addon-Katalogen,
6. optionalen Debrid-/Playback-Quellen fuer die eigentliche Wiedergabe.

Die Katalogquellen liefern normalerweise nur IDs und Titel. Poster, Backdrops, Logos,
Release-Daten und weitere Details werden anschliessend ueber TMDB oder andere Metadaten-
dienste aufgeloest.

## 2. Direkte MDBList-Quellen

Direkte oeffentliche MDBList-Quellen werden mit `/json` geladen:

```text
https://mdblist.com/lists/{user}/{slug}/json
```

### Allgemeine Kataloge

```text
https://mdblist.com/lists/snoak/trending-movies/json
https://mdblist.com/lists/snoak/trending-anime-shows/json
https://mdblist.com/lists/snoak/latest-movies-digital-release/json
https://mdblist.com/lists/snoak/latest-tv-shows/json
https://mdblist.com/lists/snoak/latest-kdrama-shows/json
https://mdblist.com/lists/snoak/upcoming-movies/json
https://mdblist.com/lists/snoak/most-popular-movies-on-rotten-tomatoes/json
https://mdblist.com/lists/snoak/most-popular-shows-on-rotten-tomatoes/json
https://mdblist.com/lists/linaspurinis/top-watched-movies-of-the-week/json
```

### Genres

```text
https://mdblist.com/lists/snoak/action-movies/json
https://mdblist.com/lists/snoak/action-shows/json
https://mdblist.com/lists/snoak/comedy-movies/json
https://mdblist.com/lists/snoak/comedy-shows/json
https://mdblist.com/lists/snoak/science-fiction-movies/json
https://mdblist.com/lists/snoak/science-fiction-shows/json
https://mdblist.com/lists/snoak/thriller-movies/json
https://mdblist.com/lists/snoak/thriller-shows/json
https://mdblist.com/lists/snoak/drama-movies/json
https://mdblist.com/lists/snoak/drama-shows/json
https://mdblist.com/lists/snoak/horror-movies/json
https://mdblist.com/lists/snoak/horror-shows/json
https://mdblist.com/lists/snoak/popular-documentary-movies/json
https://mdblist.com/lists/snoak/popular-documentary-shows/json
https://mdblist.com/lists/snoak/popular-romance-movies/json
https://mdblist.com/lists/snoak/popular-romance-shows/json
https://mdblist.com/lists/snoak/animationanime-movies/json
https://mdblist.com/lists/snoak/animationanime-shows/json
```

### Zeitraeume und Familien

```text
https://mdblist.com/lists/familytv133/family-kids-english-movies-rated-g-pg/json
https://mdblist.com/lists/familytv133/family-kids-english-tv-showsrated-g-pg/json
https://mdblist.com/lists/snoak/top-2020s-movies/json
https://mdblist.com/lists/snoak/top-2010s-movies/json
https://mdblist.com/lists/snoak/top-2000s-movies/json
https://mdblist.com/lists/snoak/top-1990s-movies/json
https://mdblist.com/lists/snoak/top-1980s-movies/json
https://mdblist.com/lists/snoak/top-1970s-movies/json
https://mdblist.com/lists/snoak/popular-1960s-movies/json
```

## 3. Service-Quellen

Die Service-Collection nutzt mehrere Quellen parallel. Eine Quelle kann ausfallen, ohne
dass der komplette Service leer bleiben muss.

| Service     | TMDB Provider | Addon-/MDBList-Referenzen                                                          |
| ----------- | ------------: | ---------------------------------------------------------------------------------- |
| Netflix     |             8 | `nfx`, `netflix_movies`, `netflix_series`, `mdblist.88328`, `mdblist.86751`        |
| Prime Video |             9 | `amp`, `amazon_movies`, `amazon_series`, `mdblist.86755`, `mdblist.86753`          |
| Apple TV+   |           350 | `atp`, `apple_movies`, `apple_series`                                              |
| Disney+     |           337 | `garycrawfordgc/disney-shows`                                                      |
| HBO Max     |          1899 | `hbm`, `mdblist.89647`, `mdblist.89649`                                            |
| Hulu        |            15 | `hlu`, `hulu_movies`, `hulu_series`, `mdblist.88327`                               |
| Paramount+  |    2303, 2616 | `pmp`, `paramount_movies`, `mdblist.86762`, `mdblist.86761`                        |
| Peacock     |      386, 387 | `pcp`                                                                              |
| Starz       |            43 | `sta`                                                                              |
| Shudder     |            99 | `shudder_movies`, `shudder_series`, `sig1878/movies-shudder`, `sig1878/tv-shudder` |
| MGM+        |            34 | `mdblist.48305`, `mdblist.48306`                                                   |
| Discovery+  |           520 | `dpe`                                                                              |
| Crunchyroll |           283 | `cru_movie`, `cru_series`                                                          |
| Sky         |            29 | `mdblist.38516`, `mdblist.74627`                                                   |
| JioHotstar  |           122 | `community.bharatbinge`, `org.hilay.tv.maldivesnet`                                |
| SonyLiv     |           237 | `community.bharatbinge`                                                            |

Die vollstaendigen TMDB-URLs fuer Provider-Quellen sind:

```text
https://api.themoviedb.org/3/discover/movie?with_watch_providers={ID}&watch_region=US&sort_by=popularity.desc
https://api.themoviedb.org/3/discover/tv?with_watch_providers={ID}&watch_region=US&sort_by=popularity.desc
```

Im Web laufen TMDB-Anfragen ueber den eigenen Proxy:

```text
/api/tmdb/discover/movie?with_watch_providers={ID}&watch_region=US&sort_by=popularity.desc
/api/tmdb/discover/tv?with_watch_providers={ID}&watch_region=US&sort_by=popularity.desc
```

## 4. Franchise-Quellen

### Marvel / MCU

```text
https://addon-marvel.onrender.com/catalog/marvel-mcu/manifest.json
https://addon-marvel.onrender.com/catalog/Marvel/marvel-mcu.json
https://api.themoviedb.org/3/collection/86311
https://mdblist.com/lists/lt3dave/marvel-cinematic-universe-mcu-collection/json
https://mdblist.com/lists/at0microuton/mcu-tv-shows/json
```

### DC Universe

```text
https://addon-dc-cq85.onrender.com/catalog/dc-chronological/manifest.json
https://addon-dc-cq85.onrender.com/catalog/DC/dc-chronological.json
https://mdblist.com/lists/kingkearney/dc-universe/json
https://mdblist.com/lists/kraftynic/dc-tv-shows1/json
```

### Star Wars

```text
https://addon-star-wars-u9e3.onrender.com/catalog/sw-movies-series-chronological/manifest.json
https://addon-star-wars-u9e3.onrender.com/catalog/StarWars/sw-movies-series-chronological.json
https://mdblist.com/lists/jxduffy/star-wars-chronological-order/json
```

### Weitere Franchises

| Franchise                  | Vollstaendige Quellen                                                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| James Bond                 | `https://api.themoviedb.org/3/collection/645`; `https://mdblist.com/lists/hdlists/james-bond-movies/json`                                                                                                          |
| Harry Potter               | `https://api.themoviedb.org/3/collection/1241`; `https://api.themoviedb.org/3/collection/435259`; `https://mdblist.com/lists/thebirdod/harry-potter-collection/json`                                               |
| Alien vs Predator          | `https://api.themoviedb.org/3/collection/8091`; `https://api.themoviedb.org/3/collection/399`; `https://api.themoviedb.org/3/collection/115762`; `https://mdblist.com/lists/exoduso/predator-franchise/json`       |
| Pirates of the Caribbean   | `https://api.themoviedb.org/3/collection/295`; `https://mdblist.com/lists/aaron713/pirates-of-the-caribbean-collection/json`                                                                                       |
| Terminator                 | `https://api.themoviedb.org/3/collection/528`; `https://mdblist.com/lists/andyhawks/universe-the-terminator/json`                                                                                                  |
| Mission: Impossible        | `https://api.themoviedb.org/3/collection/87359`; `https://mdblist.com/lists/nammel/mission-impossible-saga/json`                                                                                                   |
| Jurassic Park              | `https://api.themoviedb.org/3/collection/328`; `https://mdblist.com/lists/purple_smurf/jurassic-park/json`                                                                                                         |
| The Matrix                 | `https://api.themoviedb.org/3/collection/2344`; `https://mdblist.com/lists/andyhawks/universe-the-matrix/json`                                                                                                     |
| Lord of the Rings / Hobbit | `https://api.themoviedb.org/3/collection/119`; `https://api.themoviedb.org/3/collection/121938`; `https://mdblist.com/lists/spudhead15/lord-of-the-rings-and-hobbit-collection/json`                               |
| X-Men                      | `https://api.themoviedb.org/3/collection/748`; `https://api.themoviedb.org/3/collection/453993`; `https://api.themoviedb.org/3/collection/556`; `https://mdblist.com/lists/jxduffy/x-men-chronological-order/json` |
| Fast & Furious             | `https://api.themoviedb.org/3/collection/9485`                                                                                                                                                                     |
| Hunger Games               | `https://api.themoviedb.org/3/collection/131635`                                                                                                                                                                   |
| Avatar                     | `https://api.themoviedb.org/3/collection/87096`                                                                                                                                                                    |
| Dune                       | `https://api.themoviedb.org/3/collection/726871`                                                                                                                                                                   |
| Indiana Jones              | `https://api.themoviedb.org/3/collection/84`                                                                                                                                                                       |
| The Godfather              | `https://api.themoviedb.org/3/collection/230`                                                                                                                                                                      |
| John Wick                  | `https://api.themoviedb.org/3/collection/404609`                                                                                                                                                                   |
| Transformers               | `https://api.themoviedb.org/3/collection/8650`                                                                                                                                                                     |
| Scream                     | `https://api.themoviedb.org/3/collection/2602`                                                                                                                                                                     |

## 5. Addons und Manifest-Quellen

### Zentrales Streaming-Addon

Die URL wird aktuell ueber Pastebin aufgeloest:

```text
https://pastebin.com/raw/P4gfd98n
```

Aktueller aufgeloester Manifest-Inhalt:

```text
https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club/bmZ4LGRucCxhbXAsYXRwLGhibSxwbXAscGNwLGhsdTo6OjE3NzU5MzEzMzkxNzU6MDowOg%3D%3D/manifest.json
```

### Weitere fest konfigurierte Addons

```text
https://addon-marvel.onrender.com/catalog/marvel-mcu/manifest.json
https://addon-dc-cq85.onrender.com/catalog/dc-chronological/manifest.json
https://addon-star-wars-u9e3.onrender.com/catalog/sw-movies-series-chronological/manifest.json
https://opensubtitles-v3.strem.io/manifest.json
```

`aio-metadata` ist keine lokal installierte StreamNet-Komponente. Es ist eine Addon-ID,
die in Katalogdefinitionen referenziert wird. Die konkrete Manifest-URL kann je nach
installiertem Addon variieren. Ein Katalog wird dynamisch so gebildet:

```text
{manifest-base}/catalog/{catalog-type}/{catalog-id}.json
```

Beispiel:

```text
{manifest-base}/catalog/movie/mdblist.7947.json
```

## 6. Artwork und Metadaten

### Eigenes Artwork-Repository

Aktuell werden Service-, Genre-, Franchise- und Hero-Assets aus einem gepinnten GitHub-
Commit geladen:

```text
https://raw.githubusercontent.com/cyb3rgh05t/networks-video-collection/9cc3dde7f7960c9256f0d81a761aa3ccbad4b976/
https://raw.githubusercontent.com/cyb3rgh05t/networks-video-collection/d6d01a462a006203757ae0e6afa6c839b32c458e/images/Franchises/
```

Betroffene Codepfade:

- Android: `app/src/main/kotlin/com/arflix/tv/data/repository/CollectionTemplateManifest.kt`
- Android: `app/src/main/kotlin/com/arflix/tv/data/repository/MediaRepository.kt`
- Web: `web/lib/catalogs.ts`

Weitere externe Artwork-Quellen im aktuellen Stand sind unter anderem TMDB, Postimg,
ImgBB, Behance, Pinimg, ComicBook und einzelne direkt eingebundene GIF-/Bild-URLs.

### TMDB

```text
https://api.themoviedb.org/3/
https://image.tmdb.org/t/p/w780/{poster_path}
https://image.tmdb.org/t/p/w1280/{backdrop_path}
https://image.tmdb.org/t/p/original/{image_path}
```

Web nutzt dafuer den eigenen Route-Proxy:

```text
/api/tmdb/{path}
```

### Weitere externe Metadatenquellen

```text
https://v3-cinemeta.strem.io/meta/{movie|series}/{imdbId}.json
https://api.jikan.moe/v4/
https://api.ani.zip/mappings?{mal|anilist|kitsu}={id}
https://graphql.anilist.co
https://api4.thetvdb.com/v4/
https://webservice.fanart.tv/v3/
```

## 7. Was bedeutet Self-Hosting wirklich?

Self-Hosting kann drei verschiedene Ziele bedeuten:

### Ziel A: Keine Abhaengigkeit von MDBList fuer Katalogreihenfolge

Das ist gut machbar. Eigene Datenbank oder JSON-Dateien enthalten dann:

```text
catalog_id
media_type
provider_id / tmdb_id / imdb_id
sort_order
visible_from
visible_until
source_name
updated_at
```

MDBList wird nur einmalig importiert. Danach liefert StreamNet die eigene Liste von
einem eigenen Server.

### Ziel B: Keine Abhaengigkeit von fremden Addon-Manifesten

Ebenfalls machbar. Der eigene Server implementiert die Stremio-kompatiblen Endpunkte:

```text
https://catalog.mystreamnet.club/addons/streaming/manifest.json
https://catalog.mystreamnet.club/addons/streaming/catalog/movie/netflix.json
https://catalog.mystreamnet.club/addons/streaming/catalog/series/netflix.json
```

Android und Web werden dann auf diese eigenen URLs umgestellt. Die Antworten muessen
nur das erwartete Stremio-Format liefern, zum Beispiel:

```json
{
  "metas": [
    {
      "id": "tmdb:movie:27205",
      "type": "movie",
      "name": "Beispiel",
      "releaseInfo": "2010"
    }
  ]
}
```

### Ziel C: Keine Abhaengigkeit von TMDB, MDBList oder anderen Metadatenanbietern

Das ist deutlich groesser. Dafuer muesste StreamNet eine eigene Metadatenbank mit eigenen
IDs, Titeln, Bildern, Beschreibungen, Genres, Cast, Release-Daten und Aktualisierungsjobs
betreiben. Das ist technisch moeglich, aber dauerhaft wartungsintensiv.

## 8. Empfohlene eigene Architektur

```text
Externe Quellen / eigene Kuratierung
              |
              v
      Import- und Sync-Worker
              |
              v
 PostgreSQL: Kataloge, Items, Reihenfolge,
 Quellen, Sync-Zeit, Fehlerstatus
              |
              +--> Catalog API / Stremio API
              |       /manifest.json
              |       /catalog/movie/{id}.json
              |       /catalog/series/{id}.json
              |
              +--> TMDB-Metadaten-Cache
              |
              +--> Eigenes Asset-Hosting
                      Poster, Backdrops, Logos, Hero-Videos
```

### Empfohlene Komponenten

- Backend: bestehendes `backend-cloud` oder ein separater Node.js-Service
- Datenbank: PostgreSQL
- Worker: periodischer Node.js-Job, Cron oder Cloudflare Worker
- Cache: PostgreSQL plus optional Redis
- Bilder/Videos: eigener Object Storage oder eigenes GitHub-Asset-Repository
- API: `catalog.mystreamnet.club`
- Admin: eigene geschuetzte Seite zum Bearbeiten von Reihenfolge und Quellen
- Monitoring: letzter erfolgreicher Sync, HTTP-Status, Item-Anzahl und Fehler je Quelle

## 9. Migrationsplan

### Phase 1: Quelleninventar und Datenmodell

1. Alle aktuellen MDBList-, TMDB-, Addon- und Artwork-Quellen in einer zentralen Datei
   oder Datenbank erfassen.
2. Pro Katalog eine stabile eigene ID vergeben, zum Beispiel `service.netflix.movies`.
3. Externe IDs und Quell-URLs getrennt speichern.
4. Doppelte Inhalte anhand von TMDB-ID, IMDb-ID und Typ entfernen.

### Phase 2: Eigener Katalog-Importer

1. MDBList-JSON regelmaessig abrufen.
2. Addon-Kataloge ueber deren Manifest und `/catalog/...json` abrufen.
3. TMDB-IDs aus den Ergebnissen extrahieren.
4. Ergebnisse normalisieren und in PostgreSQL speichern.
5. Eine alte Datenversion behalten, falls eine Quelle spaeter falsche Daten liefert.

### Phase 3: Eigene Katalog-API

Die API sollte mindestens anbieten:

```text
GET /manifest.json
GET /catalog/movie/{catalogId}.json
GET /catalog/series/{catalogId}.json
GET /api/catalogs
GET /api/catalogs/{catalogId}
```

Android und Web werden danach so angepasst, dass sie die eigenen Kataloge verwenden.
Die alte externe Quelle kann als manueller Fallback bestehen bleiben.

### Phase 4: Eigenes Artwork

1. Erlaubte oder selbst erstellte Bilder in ein eigenes Repository verschieben.
2. Commit-Hashes oder Objektversionen weiterhin pinnen.
3. URLs zentral konfigurieren.
4. Keine zufaelligen Postimg-/ImgBB-/GIF-URLs mehr in Collection-Definitionen verwenden.
5. Assets ueber CDN oder Object Storage ausliefern.

### Phase 5: TMDB reduzieren

Zuerst sollte TMDB nur noch als Metadaten-Cache verwendet werden:

```text
Externe Quelle -> eigene Item-ID -> eigener TMDB-Cache -> App
```

Dadurch sind kurzfristige TMDB-Ausfaelle weniger kritisch. Vollstaendige Unabhaengigkeit
von TMDB erfordert eine eigene Metadatenbank und eine rechtlich gepruefte Datenquelle.

## 10. Was weiterhin extern bleiben kann

Auch bei selbst gehosteten Katalogen bleiben normalerweise externe Dienste notwendig:

- Debrid-Anbieter wie Real-Debrid, Premiumize oder Torbox
- IPTV-Anbieter und deren Streams
- Benutzerinstallierte Stremio-Addons fuer Streams
- TMDB, solange keine eigene Metadatenbank vorhanden ist
- externe Auth-/Cloud-Dienste, sofern sie nicht ebenfalls selbst betrieben werden

Ein eigener Katalogserver hostet nur Auswahl, IDs und Metadaten. Er hostet nicht automatisch
die Filme oder Serien. Das ist sowohl technisch als auch rechtlich ein eigener Bereich.

## 11. Wichtigste Empfehlung fuer StreamNet

Der sinnvollste erste Schritt ist kein kompletter Ersatz aller Datenquellen, sondern ein
kleiner eigener `catalog-service`:

1. eigene PostgreSQL-Tabelle fuer Kataloge und Items,
2. taeglicher Import von MDBList, TMDB und Addon-Katalogen,
3. eigene stabile Stremio-kompatible Manifest-/Catalog-URLs,
4. Android und Web zeigen auf diese URLs,
5. externe Quellen bleiben nur als Import-Fallback aktiv,
6. eigene Assets werden parallel aus dem eigenen Repository geladen.

Damit waere die App nicht mehr von einer Live-Antwort eines einzelnen MDBList-, Addon-
oder Pastebin-Dienstes abhaengig, ohne dass sofort eine komplette eigene Film-Metadaten-
plattform gebaut werden muss.

## 12. Relevante Implementierungsstellen

- Android Service-/Franchise-Definitionen:
  `app/src/main/kotlin/com/arflix/tv/data/repository/MediaRepository.kt`
- Android Collection-Manifest:
  `app/src/main/kotlin/com/arflix/tv/data/repository/CollectionTemplateManifest.kt`
- Android Addon-Verwaltung:
  `app/src/main/kotlin/com/arflix/tv/data/repository/StreamRepository.kt`
- Web Katalogdefinitionen:
  `web/lib/catalogs.ts`
- Web MDBList-/Addon-/TMDB-Lader:
  `web/lib/tmdb.ts`
- Web Addon-Installation und Manifest-Normalisierung:
  `web/lib/addons.ts`
- Externe Quellen-Dokumentation:
  `docs/superpowers/external-fetch-sources.md`
