# Genre-Kacheln (Movies + TV) – API-Spezifikation für Android-Client

Backend ist ein Overseerr-Fork („vodwisharr"). Für die Android-App relevant sind zwei REST-Endpoints, die pro Genre eine Liste an TMDB-Backdrop-Pfaden liefern. Das Endbild („Fanart mit farbigem Overlay") wird **nicht** vom Server geliefert – der Client baut die Bild-URL selbst aus TMDB-Basis + Backdrop-Pfad + Duotone-Farb-Filter.

---

## 1. Authentifizierung

Alle Endpoints sind hinter der normalen Overseerr-Auth. Für eine Android-App am einfachsten per **API-Key im Header**:

```http
X-API-Key: <settings.main.apiKey aus der Overseerr-Konfig>
```

Alternativ Session-Cookie (Plex-Login) – aber für native Apps ist der API-Key der übliche Weg.

**Base-URL:** `https://<dein-host>/api/v1`

---

## 2. Endpoints

### 2.1 Movie-Genres

```
GET /api/v1/discover/genreslider/movie
```

Query-Parameter (optional):

- `language` – z. B. `en`, `de`, `de-DE`. Fallback: Server-Locale.

### 2.2 TV-Genres

```
GET /api/v1/discover/genreslider/tv
```

Query-Parameter (optional):

- `language` – analog.

### 2.3 Response-Format (identisch für beide)

`200 OK`, `Content-Type: application/json`, sortiert alphabetisch nach `name`.

```json
[
  {
    "id": 28,
    "name": "Action",
    "backdrops": [
      "/rulaMrPnCkzcw2NAoqnLYNGwG5u.jpg",
      "/xxx.jpg",
      "/yyy.jpg",
      "/zzz.jpg",
      "/aaa.jpg"
    ]
  },
  {
    "id": 35,
    "name": "Comedy",
    "backdrops": ["/...jpg", "..."]
  }
]
```

Feld-Erklärung:

| Feld        | Typ        | Beschreibung                                                                                                                                     |
| ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`        | `int`      | **TMDB-Genre-ID** (stabil, dokumentiert bei TMDB). Wird gebraucht, um in Discover-Views zu navigieren und für die Farbwahl.                       |
| `name`      | `string`   | Anzeigename in der angeforderten Sprache.                                                                                                        |
| `backdrops` | `string[]` | Liste von TMDB-`backdrop_path`-Strings der populärsten Filme/Serien in diesem Genre. Länge variabel (kann auch < 5 sein!). Jeder Eintrag beginnt mit `/`. |

Fehler:

- `500` mit `{ "message": "Unable to retrieve movie genre slider." }` bei TMDB-Ausfall.

---

## 3. Bild-URL bauen (Android-Client)

Die Web-App nimmt hart das **5. Backdrop** (`backdrops[4]`) und schiebt es durch den TMDB-Duotone-Filter. Auf Android machst du dasselbe (idealerweise robuster mit Fallback).

### 3.1 TMDB-Image-URL-Schema

```
https://image.tmdb.org/t/p/<size>_filter(duotone,<HEX1>,<HEX2>)<backdrop_path>
```

- `<size>`: übliche Werte `w300`, `w780`, `w1280`, `original`. Web nutzt `w1280`.
- `<HEX1>` / `<HEX2>`: 6-stellige Hex-Farben **ohne** `#`.
- `<backdrop_path>`: aus `backdrops[i]`, beginnt bereits mit `/`.

Beispiel (Action, `backdrops[4]` = `/rulaMrPnCkzcw2NAoqnLYNGwG5u.jpg`):

```
https://image.tmdb.org/t/p/w1280_filter(duotone,991B1B,FCA5A5)/rulaMrPnCkzcw2NAoqnLYNGwG5u.jpg
```

> **Wichtig:** Der `filter(...)`-Teil ist **Teil des Pfads**, nicht Query. Nicht URL-encoden. Klammern und Komma müssen roh bleiben.

### 3.2 Empfehlung für Android (Kotlin)

```kotlin
fun tmdbGenreFanartUrl(
    backdrops: List<String>,
    genreId: Int,
    size: String = "w1280"
): String? {
    if (backdrops.isEmpty()) return null
    val path = backdrops.getOrNull(4) ?: backdrops.last() // Fallback statt undefined
    val (c1, c2) = GenreColors.forGenre(genreId)
    return "https://image.tmdb.org/t/p/${size}_filter(duotone,$c1,$c2)$path"
}
```

Bei Glide/Coil: URL direkt als String übergeben; kein zusätzliches Encoding.

---

## 4. Duotone-Farbtabelle (aus Web-Frontend)

Fallback (Genre-ID nicht in Tabelle) = `black = ('1F2937', 'D1D5DB')`.

```kotlin
object GenreColors {
    private val TONES = mapOf(
        "red"         to ("991B1B" to "FCA5A5"),
        "darkred"     to ("1F2937" to "F87171"),
        "blue"        to ("032541" to "01b4e4"),
        "lightblue"   to ("1F2937" to "60A5FA"),
        "darkblue"    to ("1F2937" to "2864d2"),
        "orange"      to ("92400E" to "FCD34D"),
        "darkorange"  to ("552c01" to "d47c1d"),
        "green"       to ("087d29" to "21cb51"),
        "lightgreen"  to ("065F46" to "6EE7B7"),
        "purple"      to ("5B21B6" to "C4B5FD"),
        "darkpurple"  to ("480c8b" to "a96bef"),
        "yellow"      to ("777e0d" to "e4ed55"),
        "pink"        to ("9D174D" to "F9A8D4"),
        "black"       to ("1F2937" to "D1D5DB"),
    )

    private val MAP = mapOf(
        // Movie genres
        28 to "red",         // Action
        12 to "darkpurple",  // Adventure
        16 to "blue",        // Animation
        35 to "orange",      // Comedy
        80 to "darkblue",    // Crime
        99 to "lightgreen",  // Documentary
        18 to "pink",        // Drama
        10751 to "yellow",   // Family
        14 to "lightblue",   // Fantasy
        36 to "orange",      // History
        27 to "black",       // Horror
        10402 to "blue",     // Music
        9648 to "purple",    // Mystery
        10749 to "pink",     // Romance
        878 to "lightblue",  // Science Fiction
        10770 to "red",      // TV Movie
        53 to "black",       // Thriller
        10752 to "darkred",  // War
        37 to "orange",      // Western
        // TV genres
        10759 to "darkpurple", // Action & Adventure
        10762 to "blue",       // Kids
        10763 to "black",      // News
        10764 to "darkorange", // Reality
        10765 to "lightblue",  // Sci-Fi & Fantasy
        10766 to "pink",       // Soap
        10767 to "lightgreen", // Talk
        10768 to "darkred",    // War & Politics
    )

    fun forGenre(id: Int): Pair<String, String> =
        TONES[MAP[id]] ?: TONES["black"]!!
}
```

---

## 5. Beispiel-Requests (curl)

```bash
curl -H "X-API-Key: $API_KEY" \
     "https://myserver.tld/api/v1/discover/genreslider/movie?language=de"

curl -H "X-API-Key: $API_KEY" \
     "https://myserver.tld/api/v1/discover/genreslider/tv?language=de"
```

---

## 6. Caching-Hinweise für die App

- Der Server cached **nicht**. Antworten sind ~10–50 KB. Pro Aufruf triggert der Server ~1 + 19 TMDB-Requests → Antwortzeit kann 500–2000 ms sein.
- Auf dem Client daher **lokal cachen**, z. B. 6–24 h (In-Memory + Disk). Genres ändern sich fast nie, Backdrops schwanken nur mit Popularität.
- Bild-Requests direkt an `image.tmdb.org` – Standard-Bild-Cache (Coil/Glide) reicht.

---

## 7. Follow-up-Endpoints (Genre-Übersicht bei Kachel-Tap)

- Movies eines Genres:
  ```
  GET /api/v1/discover/movies?genre=<id>&page=<n>&language=<lang>
  ```
- TV eines Genres:
  ```
  GET /api/v1/discover/tv?genre=<id>&page=<n>&language=<lang>
  ```

Beide liefern paginierte TMDB-Discover-Ergebnisse mit `id`, `title`/`name`, `poster_path`, `backdrop_path`, `overview`, `mediaInfo` etc. – Standard-Overseerr-Discover-Format.

---

## 8. Fallstricke, die die Web-Version hat und die du auf Android besser lösen solltest

1. **`backdrops[4]` ist hart kodiert.** Wenn die Liste < 5 Einträge hat, ist die Web-URL kaputt. → Auf Android `getOrNull(4) ?: last()` verwenden.
2. **Kein Server-Caching.** → Client-Cache Pflicht.
3. **Wechselnde Bilder.** TMDB sortiert nach Popularität; `backdrops[4]` kann sich ändern. Wenn du „stabile" Kacheln willst, deterministisch per Hash der Genre-ID auswählen, oder zusätzlich lokal einen konkreten Backdrop-Path pinnen.

---

## 9. Zusammenfassung (TL;DR)

- 2 Endpoints: `GET /api/v1/discover/genreslider/movie` und `.../tv`.
- Auth: `X-API-Key`-Header.
- Response: Array `[{ id, name, backdrops: string[] }]`.
- Bild-URL: `https://image.tmdb.org/t/p/w1280_filter(duotone,HEX1,HEX2)<backdrop>`.
- Farben pro Genre-ID aus `GenreColors`-Tabelle (Fallback `black`).
- Backdrop-Auswahl: Index 4 mit Fallback auf letzten Eintrag.
- Client-seitig cachen (6–24 h).
