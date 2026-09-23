# Externe Fetch-Quellen (Franchises, Studios, Genres, Streaming-Services & mehr)

Übersicht aller externen URLs/Hosts, die Android und Web für Franchise-, Studio-, Genre- und
Collection-Rails sowie für Artwork/Metadaten nutzen. Stand: 2026-09-23.

## 1. Franchise-/Studio-/Genre-/Streaming-Artwork (GitHub `networks-video-collection`)

Alle Cover-Bilder und Hero-Videos werden per gepinntem Commit-Hash von
`raw.githubusercontent.com/cyb3rgh05t/networks-video-collection/{commit}/...` geladen. Ein neuer
Commit im Repo ändert nichts an bestehenden URLs — erst wenn die Konstante hier auf den neuen Hash
aktualisiert wird, ziehen beide Plattformen die neuen Bilder.

| Zweck                                                                          | Konstante (Android)                                                                                                                           | Konstante (Web)                                               | Aktueller Commit                           | Vollständige Basis-URL                                                                                                               |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Franchise-Cover (Marvel, DC, Star Wars, Scream, …)                             | `FRANCHISE_IMAGE_BASE` in [CollectionTemplateManifest.kt](../../app/src/main/kotlin/com/arflix/tv/data/repository/CollectionTemplateManifest.kt) | `franchiseAssetBase` in [catalogs.ts](../../web/lib/catalogs.ts) | `d6d01a462a006203757ae0e6afa6c839b32c458e` | `https://raw.githubusercontent.com/cyb3rgh05t/networks-video-collection/d6d01a462a006203757ae0e6afa6c839b32c458e/images/Franchises/` |
| Allgemeine Assets (Streaming-Service-Cover, Netzwerk-Videos, Templates)        | `ASSET_BASE` / `IMAGE_BASE` in `CollectionTemplateManifest.kt`                                                                                | `androidAssetBase` in `catalogs.ts`                           | `9cc3dde7f7960c9256f0d81a761aa3ccbad4b976` | `https://raw.githubusercontent.com/cyb3rgh05t/networks-video-collection/9cc3dde7f7960c9256f0d81a761aa3ccbad4b976/`                   |
| Streaming-Service-Cover (Netflix, Disney+, …)                                  | `STREAMING_SERVICE_IMAGE_BASE`                                                                                                                | `streamingImageBase`                                          | (folgt `androidAssetBase`)                 | `{androidAssetBase}images/Landscape%20Streaming%20Services/`                                                                         |
| Netzwerk-/Service-Hero-Videos                                                  | `VIDEO_BASE`                                                                                                                                  | `videoBase`                                                   | (folgt `androidAssetBase`)                 | `{androidAssetBase}networks%20videos/`                                                                                               |
| Genre-Cover                                                                    | `GENRE_IMAGE_BASE`                                                                                                                            | — (nur Android)                                               | (folgt `androidAssetBase`)                 | `{androidAssetBase}images/Landscape%20Genres/`                                                                                       |
| Studio-Hero-Videos                                                             | `STUDIO_VIDEO_BASE`                                                                                                                           | — (nur Android)                                               | (folgt `androidAssetBase`)                 | `{androidAssetBase}studios%20videos/`                                                                                                |
| Ältere Service-Cover (Netflix/Prime/Apple TV+/Disney+/HBO Max/Hulu/Paramount+) | Fallback in [MediaRepository.kt](../../app/src/main/kotlin/com/arflix/tv/data/repository/MediaRepository.kt)                                     | —                                                             | `3486fc9a3d0efe59d1929e75f66021dc4e15bcb7` | `https://raw.githubusercontent.com/cyb3rgh05t/networks-video-collection/3486fc9a3d0efe59d1929e75f66021dc4e15bcb7/`                   |

**Neues Franchise-/Studio-/Genre-Bild hinzufügen:**

1. Bild im Repo `cyb3rgh05t/networks-video-collection` unter `images/Franchises/<Name>.jpg` (bzw.
   passendem Unterordner) hochladen/committen.
2. Neuen Commit-Hash aus dem GitHub-Commit-Log holen (`https://github.com/cyb3rgh05t/networks-video-collection/commits/main`).
3. Betroffene Konstante (`FRANCHISE_ASSET_COMMIT` in Android, `franchiseAssetBase`-Hash in Web) auf
   den neuen Hash aktualisieren — beide Plattformen müssen denselben Hash verwenden.

## 2. TMDB (The Movie Database) — primäre Metadatenquelle

|                                       | Android                                                                                                                     | Web                                                                                                                                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API-Basis                             | `https://api.themoviedb.org/3/` (`TMDB_BASE_URL` in [Constants.kt](../../app/src/main/kotlin/com/arflix/tv/util/Constants.kt)) | Proxy `/api/tmdb/{path}` → `https://api.themoviedb.org/3/{path}` ([route.ts](../../web/app/api/tmdb/%5B...path%5D/route.ts)); Legacy-Fallback `https://auth.arvio.tv/.netlify/functions/tmdb-proxy` |
| Collection-Endpoint (Franchise-Filme) | `collection/{tmdbCollectionId}`                                                                                             | `collection/{tmdbCollectionId}` in `loadCollectionSource` ([tmdb.ts](../../web/lib/tmdb.ts))                                                                                                        |
| Genre-/Keyword-/Provider-Discover     | `discover/movie`, `discover/tv` mit `with_genres`, `with_keywords`, `with_watch_providers`                                  | identisch, `loadTmdbCatalogPages` in `tmdb.ts`                                                                                                                                                   |
| Bilder                                | `https://image.tmdb.org/t/p/{w780,w1280,original}`                                                                          | `https://image.tmdb.org/t/p/{w780,w1280,original}` ([config.ts](../../web/lib/config.ts))                                                                                                           |

## 3. MDBList — kuratierte öffentliche Listen (Franchise-Fallbacks, Home-Rails)

|                          | Android                                        | Web                                                                                     |
| ------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| Öffentliche Liste (JSON) | `https://mdblist.com/lists/{slug}/json`        | `{sourceUrl}/json` via `apiProxiedUrl` in `loadMdblist` ([tmdb.ts](../../web/lib/tmdb.ts)) |
| API mit Key              | `https://api.mdblist.com/` (`MDBLIST_API_URL`) | Proxy `/api/mdblist/{path}` → `https://api.mdblist.com/{path}`                          |

Wichtig: `MDBLIST_PUBLIC`-Quellen (Web) rufen die öffentliche `mdblist.com/lists/...`-Liste direkt
ab — das ist **nicht** dasselbe wie `ADDON_CATALOG` (Stremio-Addon-Katalog). Beim Anlegen neuer
Franchise-Fallbacks immer den gleichen Quelltyp wie auf Android verwenden.

## 4. Stremio-Addon-Kataloge (Marvel/DC/Star Wars kuratierte Reihenfolge, Netflix-Katalog)

Muster: `{manifestUrl ohne /manifest.json}/catalog/{catalogType}/{catalogId}.json`

| Addon            | Manifest-URL                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| Marvel MCU       | `https://addon-marvel.onrender.com/catalog/marvel-mcu/manifest.json`                             |
| DC Chronological | `https://addon-dc-cq85.onrender.com/catalog/dc-chronological/manifest.json`                      |
| Star Wars        | `https://addon-star-wars-u9e3.onrender.com/catalog/sw-movies-series-chronological/manifest.json` |
| Netflix-Katalog  | `https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club/.../manifest.json`          |

Referenziert in `CollectionTemplateManifest.kt` (Android) sowie `loadAddonCatalog` in
[tmdb.ts](../../web/lib/tmdb.ts) (Web).

## 5. Trakt — öffentliche Listen & Sync

|                     | Android                                     | Web                                                                                             |
| ------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| API-Basis           | `https://api.trakt.tv/` (`TRAKT_API_URL`)   | Proxy `/api/trakt/{path}` → `https://api.trakt.tv/{path}`                                       |
| Öffentliche Liste   | `/users/{user}/lists/{slug}/items`          | gleiche Pfade, geparst in `parseTraktUrl`/`loadTraktPublicList` ([tmdb.ts](../../web/lib/tmdb.ts)) |
| OAuth (Device Flow) | `/oauth/device/code`, `/oauth/device/token` | `https://api.trakt.tv/oauth/device/token` ([trakt.ts](../../web/lib/trakt.ts))                     |

## 6. Sonstige externe Metadaten-/Sync-APIs

| Dienst                               | Basis-URL                                                                                                     | Zweck                                  | Plattform |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------- |
| Cinemeta                             | `https://v3-cinemeta.strem.io/meta/{movie\|series}/{imdbId}.json`                                             | IMDb-Ratings-Fallback                  | beide     |
| Agregarr                             | `https://api.agregarr.org/api/ratings?id=...` (Batch, 100er-Chunks)                                           | IMDb-Ratings für Episoden              | Android   |
| Jikan (MyAnimeList)                  | `https://api.jikan.moe/v4/`                                                                                   | Anime-Scores                           | Android   |
| AniZip                               | `https://api.ani.zip/mappings?{mal\|anilist\|kitsu}={id}`                                                     | Anime↔TMDB-Mapping                     | Web       |
| AniList                              | `https://graphql.anilist.co`                                                                                  | Anime-Metadaten (GraphQL)              | Web       |
| TheTVDB v4                           | `https://api4.thetvdb.com/v4/`                                                                                | TV-Metadaten (optionaler User-API-Key) | beide     |
| Fanart.tv                            | `https://webservice.fanart.tv/v3/`                                                                            | Studio-/Netzwerk-Artwork               | Android   |
| Genre-Fanart (VOD Request)           | `{VOD_REQUEST_BASE_URL}/api/v1/discover/genreslider/{type}` (Default `https://streamnetvod.mystreamnet.club`) | Genre-Slider-Artwork                   | Web       |
| Simkl                                | `https://api.simkl.com/` bzw. Proxy `/api/simkl/{path}`                                                       | Scrobbling/Sync                        | beide     |
| TheIntroDB / IntroDB / AniSkip / ARM | `api.theintrodb.org/v3/`, `api.introdb.app/`, `api.aniskip.com/v2/`, `arm.haglund.dev/api/v2/`                | Intro/Outro-Skip-Zeiten                | Android   |
| Real-Debrid / Premiumize / Torbox    | `api.real-debrid.com/rest/v1/`, `premiumize.me/api/`, `api.torbox.app/v1/api/`                                | Debrid-Streaming                       | Web       |
| OpenSubtitles-Addon                  | `https://opensubtitles-v3.strem.io/manifest.json`                                                             | Untertitel-Katalog                     | beide     |

## 7. Backend & Proxy-Infrastruktur

|                                       | URL                                                                         | Zweck                                               |
| ------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------- |
| StreamNet Backend                     | `https://auth.mystreamnet.club` (`CLOUD_BACKEND_URL` / `config.backendUrl`) | Auth, Account-Sync, TV-Pairing, Discord-Auth        |
| Web-Proxies                           | `/api/tmdb/`, `/api/mdblist/`, `/api/trakt/`, `/api/simkl/`, `/api/proxy`   | CORS/Key-Injection für die jeweilige Upstream-API   |
| Cloudflare Resolver Worker (optional) | `config.resolverUrl` (siehe [resolver-worker/](../../resolver-worker/))        | Edge-Caching für TMDB/MDBList-Requests, Media-Relay |

## Konventionen für neue Franchises/Studios/Genres

- **Bild-Hosting**: immer `.jpg`, Dateiname in PascalCase oder kebab-case passend zu bestehenden
  Assets (siehe Tabelle in Abschnitt 1), gehostet im gepinnten `networks-video-collection`-Commit.
- **Primäre Quelle**: `TMDB_COLLECTION` (per `tmdbCollectionId`) für reine Filmreihen ohne
  eigene kuratierte Reihenfolge.
- **Kuratierte Reihenfolge nötig** (z. B. MCU-Release-Reihenfolge): Stremio-Addon-Katalog oder
  `CURATED_IDS`-Liste, damit die chronologische Auto-Sortierung nicht greift.
- **Android und Web müssen denselben Commit-Hash und dieselbe Quelle** (TMDB-Collection-ID,
  MDBList-Slug oder Addon-Manifest) verwenden, um Paritätsprobleme zu vermeiden.
