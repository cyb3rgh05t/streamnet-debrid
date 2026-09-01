# Studio- & Network-Kacheln – API-Spezifikation für Android-Client

Backend ist ein Overseerr-Fork („vodwisharr"). Anders als die Genre-Slider sind die **Studios** (Filmstudios) und **Networks** (TV-Sender) auf dem Discover-Homescreen der Web-App **hartkodiert** – es gibt **keinen `/genreslider/studio`-artigen Endpoint**. Die Liste (Name + Logo + TMDB-ID) ist als statisches Array im Frontend eingebettet und der Server liefert nur Detail-Endpoints, wenn der Nutzer auf eine Kachel tippt.

Für die Android-App bedeutet das: du bringst **dieselbe statische Liste in die App** mit (unten komplett) und rufst nur bei Klick auf eine Kachel den Detail-Endpoint auf.

---

## 1. Authentifizierung

Alle Endpoints hinter der normalen Overseerr-Auth. Empfehlung für native App:

```http
X-API-Key: <settings.main.apiKey aus der Overseerr-Konfig>
```

**Base-URL:** `https://<dein-host>/api/v1`

---

## 2. Kein Slider-Endpoint

Wichtig zum Verständnis (Web-Verhalten):

- `src/components/Discover/StudioSlider/index.tsx` enthält ein **hartkodiertes** `studios: Studio[]`-Array.
- `src/components/Discover/NetworkSlider/index.tsx` enthält ein **hartkodiertes** `networks: Network[]`-Array.
- Beide Sliders machen **kein** SWR-Fetch. Sie mappen das statische Array direkt auf `<CompanyCard>`.

Konsequenz für Android:
- Kachel-Grid bauen aus statischer Liste (siehe unten).
- Logo-Bilder direkt von `image.tmdb.org` laden.
- Nur bei Kachel-Tap den Detail-Endpoint des Servers rufen.

---

## 3. Logo-URL-Schema (TMDB)

Die Web-App nutzt für die Kacheln:

```
https://image.tmdb.org/t/p/w780<logoPath>
```

Beispiel Disney:

```
https://image.tmdb.org/t/p/w780/wdrCwmRnLFJhEoH8GSfymY85KHT.png
```

Auf den Detail-Seiten (`DiscoverStudio`, `DiscoverNetwork`) wird zusätzlich ein Duotone-Filter angewandt, um monochrome Logos zu erzeugen:

```
https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)<logoPath>
```

Für den Kachel-Look auf dem Homescreen ist **kein** Duotone-Filter nötig – da werden Original-Logos gezeigt. Auf Detail-Header-Ebene ist der Filter optional.

Alternative Größen: `w300`, `w500`, `w780`, `original`. Web nutzt konsistent `w780`.

---

## 4. Statische Studio-Liste (Filmstudios)

Kompletter Datensatz aus [`src/components/Discover/StudioSlider/index.tsx`](../src/components/Discover/StudioSlider/index.tsx). `id` = TMDB-Company-ID.

```kotlin
data class Studio(
    val id: Int,
    val name: String,
    val logoPath: String, // beginnt mit "/"
)

val STUDIOS = listOf(
    Studio(2,     "Disney",                "/wdrCwmRnLFJhEoH8GSfymY85KHT.png"),
    Studio(127928,"20th Century Studios",  "/h0rjX5vjW5r8yEnUBStFarjcLT4.png"),
    Studio(34,    "Sony Pictures",         "/GagSvqWlyPdkFHMfQ3pNq6ix9P.png"),
    Studio(174,   "Warner Bros. Pictures", "/ky0xOc5OrhzkZ1N6KyUxacfQsCk.png"),
    Studio(33,    "Universal",             "/8lvHyhjr8oUKOOy2dKXoALWKdp0.png"),
    Studio(4,     "Paramount",             "/fycMZt242LVjagMByZOLUGbCvv3.png"),
    Studio(3,     "Pixar",                 "/1TjvGVDMYsj6JBxOAkUHpPEwLf7.png"),
    Studio(521,   "Dreamworks",            "/kP7t6RwGz2AvvTkvnI1uteEwHet.png"),
    Studio(420,   "Marvel Studios",        "/hUzeosd33nzE5MCNsZxCGEKTXaQ.png"),
    Studio(9993,  "DC",                    "/2Tc1P3Ac8M479naPp1kYT3izLS5.png"),
    Studio(41077, "A24",                   "/1ZXsGaFPgrgS6ZZGS37AqD5uU12.png"),
)
```

Kachel-Bild-URL:
```kotlin
fun studioLogoUrl(logoPath: String, size: String = "w780"): String =
    "https://image.tmdb.org/t/p/$size$logoPath"
```

Kachel-Ziel bei Tap → Detail-Endpoint für Filme des Studios (siehe §6.1).

---

## 5. Statische Network-Liste (TV-Sender)

Kompletter Datensatz aus [`src/components/Discover/NetworkSlider/index.tsx`](../src/components/Discover/NetworkSlider/index.tsx). `id` = TMDB-Network-ID.

```kotlin
data class Network(
    val id: Int,
    val name: String,
    val logoPath: String,
)

val NETWORKS = listOf(
    Network(213,  "Netflix",         "/wwemzKWzjKYJFfCeiB57q3r4Bcm.png"),
    Network(2739, "Disney+",         "/gJ8VX6JSu3ciXHuC2dDGAo2lvwM.png"),
    Network(1024, "Prime Video",     "/ifhbNuuVnlwYy5oXA5VIb2YR8AZ.png"),
    Network(2552, "Apple TV+",       "/4KAy34EHvRM25Ih8wb82AuGU7zJ.png"),
    Network(453,  "Hulu",            "/pqUTCleNUiTLAVlelGxUgWn1ELh.png"),
    Network(49,   "HBO",             "/tuomPhY2UtuPTqqFnKMVHvSb724.png"),
    Network(4353, "Discovery+",      "/1D1bS3Dyw4ScYnFWTlBOvJXC3nb.png"),
    Network(2,    "ABC",             "/ndAvF4JLsliGreX87jAc9GdjmJY.png"),
    Network(19,   "FOX",             "/1DSpHrWyOORkL9N2QHX7Adt31mQ.png"),
    Network(359,  "Cinemax",         "/6mSHSquNpfLgDdv6VnOOvC5Uz2h.png"),
    Network(174,  "AMC",             "/pmvRmATOCaDykE6JrVoeYxlFHw3.png"),
    Network(67,   "Showtime",        "/Allse9kbjiP6ExaQrnSpIhkurEi.png"),
    Network(318,  "Starz",           "/8GJjw3HHsAJYwIWKIPBPfqMxlEa.png"),
    Network(71,   "The CW",          "/ge9hzeaU7nMtQ4PjkFlc68dGAJ9.png"),
    Network(6,    "NBC",             "/o3OedEP0f9mfZr33jz2BfXOUK5.png"),
    Network(16,   "CBS",             "/nm8d7P7MJNiBLdgIzUK0gkuEA4r.png"),
    Network(4330, "Paramount+",      "/fi83B1oztoS47xxcemFdPMhIzK.png"),
    Network(4,    "BBC One",         "/mVn7xESaTNmjBUyUtGNvDQd3CT1.png"),
    Network(56,   "Cartoon Network", "/c5OC6oVCg6QP4eqzW6XIq17CQjI.png"),
    Network(80,   "Adult Swim",      "/9AKyspxVzywuaMuZ1Bvilu8sXly.png"),
    Network(13,   "Nickelodeon",     "/ikZXxg6GnwpzqiZbRPhJGaZapqB.png"),
    Network(3353, "Peacock",         "/gIAcGTjKKr0KOHL5s4O36roJ8p7.png"),
)
```

> Achtung: **AMC (Network-ID 174) und Warner Bros. Pictures (Studio-ID 174) überschneiden sich in der ID**. Das ist okay, weil sie auf **unterschiedlichen** TMDB-Endpoints laufen (`/company/174` vs. `/network/174`) und in unterschiedlichen App-Bereichen genutzt werden.

---

## 6. Detail-Endpoints (bei Kachel-Tap)

Diese Endpoints treffen intern TMDB und mischen Overseerr-Media-Status dazu. Sie sind **paginiert** (`page` Query-Param, Standard 1).

### 6.1 Filme eines Studios

```
GET /api/v1/discover/movies/studio/{studioId}?page=<n>&language=<lang>
```

Response (`200 OK`):

```json
{
  "page": 1,
  "totalPages": 12,
  "totalResults": 240,
  "studio": {
    "id": 2,
    "name": "Disney",
    "logoPath": "/wdrCwmRnLFJhEoH8GSfymY85KHT.png",
    "originCountry": "US",
    "description": "...",
    "headquarters": "...",
    "homepage": "..."
  },
  "results": [
    { "id": 12345, "mediaType": "movie", "title": "...", "posterPath": "/...", "backdropPath": "/...", ... }
  ]
}
```

`studio` folgt dem `ProductionCompany`-Interface aus [`server/models/common.ts`](../server/models/common.ts):

```ts
interface ProductionCompany {
  id: number;
  logoPath?: string;
  originCountry: string;
  name: string;
  description?: string;
  headquarters?: string;
  homepage?: string;
}
```

### 6.2 Serien eines Networks

```
GET /api/v1/discover/tv/network/{networkId}?page=<n>&language=<lang>
```

Response (`200 OK`):

```json
{
  "page": 1,
  "totalPages": 40,
  "totalResults": 800,
  "network": {
    "id": 213,
    "name": "Netflix",
    "logoPath": "/wwemzKWzjKYJFfCeiB57q3r4Bcm.png",
    "originCountry": "US",
    "headquarters": "...",
    "homepage": "..."
  },
  "results": [
    { "id": 67890, "mediaType": "tv", "name": "...", "posterPath": "/...", "backdropPath": "/...", ... }
  ]
}
```

`network` folgt dem `TvNetwork`-Interface aus [`server/models/common.ts`](../server/models/common.ts):

```ts
interface TvNetwork {
  id: number;
  logoPath?: string;
  originCountry?: string;
  name: string;
  headquarters?: string;
  homepage?: string;
}
```

`results[]` sind Standard-Overseerr-Movie- bzw. TV-Result-Objekte mit `mediaInfo` (Request-/Available-Status).

---

## 7. Beispiel-Requests (curl)

```bash
# Filme von Disney (Studio-ID 2), Seite 1
curl -H "X-API-Key: $API_KEY" \
     "https://myserver.tld/api/v1/discover/movies/studio/2?page=1&language=de"

# Serien von Netflix (Network-ID 213), Seite 1
curl -H "X-API-Key: $API_KEY" \
     "https://myserver.tld/api/v1/discover/tv/network/213?page=1&language=de"
```

---

## 8. Empfohlener Android-Flow

```
Homescreen
 ├─ Studios-Slider   → statische Liste STUDIOS  → CompanyCard(logo=w780+logoPath)
 └─ Networks-Slider  → statische Liste NETWORKS → CompanyCard(logo=w780+logoPath)

Tap auf Studio-Kachel
 → GET /api/v1/discover/movies/studio/{id}
 → Filmliste anzeigen, optional Header mit
   w780_filter(duotone,ffffff,bababa){studio.logoPath}

Tap auf Network-Kachel
 → GET /api/v1/discover/tv/network/{id}
 → Serienliste anzeigen, optional Header mit
   w780_filter(duotone,ffffff,bababa){network.logoPath}
```

### Kotlin-Helper

```kotlin
object TmdbImage {
    private const val BASE = "https://image.tmdb.org/t/p"

    fun logo(path: String, size: String = "w780") = "$BASE/$size$path"

    fun logoDuotone(
        path: String,
        c1: String = "ffffff",
        c2: String = "bababa",
        size: String = "w780",
    ) = "$BASE/${size}_filter(duotone,$c1,$c2)$path"
}
```

---

## 9. Caching-Hinweise

- Statische Listen (`STUDIOS`, `NETWORKS`): in-App fest verdrahtet – kein Fetch nötig. Bei Updates neue App-Version.
- Logo-Bilder: über Coil/Glide-Standard-Cache, PNG mit Transparenz.
- Detail-Endpoints: paginiert. Pro Seite ~20 Ergebnisse. Client-Cache 30–60 min pro `(id, page, language)` ist ein guter Kompromiss.

---

## 10. Fallstricke

1. **Kein Slider-Endpoint** – nicht versuchen, `/api/v1/discover/studios` o. Ä. zu rufen. Existiert nicht.
2. **Liste ist statisch** – neue Streaming-Dienste/Studios erscheinen nicht automatisch. Muss manuell im App-Code ergänzt werden.
3. **ID-Kollision Studio 174 (Warner Bros.) vs. Network 174 (AMC)** – separat halten, nicht in einer gemeinsamen Map.
4. **Duotone-Filter im Detail-Header** ist ein UI-Detail der Web-Version. Kann auf Android identisch übernommen werden oder komplett weggelassen werden – die Endpoints liefern `logoPath` roh.
5. **Sprache**: `language`-Param wirkt auf Filmtitel/Serien-Titel und `overview`, aber nicht auf Studio-/Network-Namen.

---

## 11. TL;DR

- **Studios & Networks** = statische Liste in der App (siehe §4 und §5).
- **Homescreen-Kacheln**: `https://image.tmdb.org/t/p/w780<logoPath>`, kein API-Call.
- **Kachel-Tap**:
  - Movies: `GET /api/v1/discover/movies/studio/{id}`
  - TV: `GET /api/v1/discover/tv/network/{id}`
- Auth per `X-API-Key`-Header.
- Paginiert via `?page=`.
- Duotone-Header-Logo optional: `w780_filter(duotone,ffffff,bababa)<logoPath>`.
