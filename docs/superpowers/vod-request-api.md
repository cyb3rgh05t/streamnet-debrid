# Medienanfragen aus der StreamNet-VOD-APK

## Ziel

Filme und Serien sollen direkt über ihr Poster in der StreamNet APK angefragt werden können. Der Benutzer muss dafür nicht die Weboberfläche des Request-Portals öffnen.

## Vorhandene API

https://github.com/cyb3rgh05t/vodwisharr/tree/streamnetvod

Das Portal besitzt bereits den benötigten Endpunkt:

```http
POST https://streamnetvod.mystreamnet.club/api/v1/request
Content-Type: application/json
```

### Film anfragen

```json
{
  "mediaId": 550,
  "mediaType": "movie",
  "is4k": false
}
```

### Serie anfragen

Alle Staffeln:

```json
{
  "mediaId": 1399,
  "mediaType": "tv",
  "seasons": "all",
  "is4k": false
}
```

Ausgewählte Staffeln:

```json
{
  "mediaId": 1399,
  "mediaType": "tv",
  "seasons": [1, 2],
  "is4k": false
}
```

`mediaId` muss die TMDB-ID des Films oder der Serie sein. Eine Xtream-, IPTV- oder interne Stream-ID funktioniert hier nicht.

## Authentifizierung

### Aktuelle APK-Authentifizierung: eingeschränkter API-Key

Die aktuelle APK verwendet für den Request-Endpunkt einen eingeschränkten, widerrufbaren `X-API-Key`:

```http
POST https://streamnetvod.mystreamnet.club/api/v1/request
Content-Type: application/json
X-API-Key: <VODWISHARR_API_KEY>
```

```json
{
  "mediaId": 550,
  "mediaType": "movie",
  "is4k": false
}
```

Der Wert wird nicht im Kotlin-Quellcode hinterlegt. Er kommt lokal aus `secrets.properties` und in CI aus dem GitHub-Secret `VODWISHARR_API_KEY`. Der Schlüssel muss auf dem Portal auf Request-Rechte beschränkt und widerrufbar sein. Ein Admin-Key darf niemals in die APK gelangen.

Die Basis-URL kommt aus `VOD_REQUEST_BASE_URL`; beide Werte werden über BuildConfig an die APK übergeben.

## TMDB-ID ermitteln

Wenn die IPTV-Daten bereits eine TMDB-ID enthalten, sollte diese direkt verwendet werden.

Andernfalls kann die APK das Portal durchsuchen:

```http
GET https://streamnetvod.mystreamnet.club/api/v1/search?query=FILMTITEL
```

Die Antwort enthält unter anderem:

```json
{
  "results": [
    {
      "id": 550,
      "mediaType": "movie",
      "title": "Fight Club",
      "releaseDate": "1999-10-15",
      "posterPath": "/poster.jpg",
      "mediaInfo": null
    }
  ]
}
```

Dabei ist `id` die benötigte TMDB-ID. Für eine verlässliche Zuordnung sollten mindestens Titel, Medientyp und Erscheinungsjahr verglichen werden. Bei mehreren Treffern sollte die APK den Benutzer auswählen lassen, statt automatisch den ersten Treffer anzufragen.

## Implementierter Ablauf in der APK

1. Die Detailansicht lädt Quellen über den vorhandenen Stream-Flow.
2. Wenn die Suche fertig ist und keine Quellen vorhanden sind, zeigt der Quellen-Empty-State `Bei meinem Server anfragen`.
3. Der Button verwendet ausschließlich eine positive TMDB-ID und den Medientyp `movie` oder `tv`.
4. Serien werden aktuell mit `seasons: "all"` angefragt; der Wert kann später um eine Staffelauswahl erweitert werden.
5. Während des Requests ist die Aktion gegen Doppelklicks geschützt.
6. Die Antwort wird als lokalisierter Toast angezeigt.
7. Der Quellen-Refresh bleibt separat verfügbar und verändert den Request-Status nicht.

## Wichtige HTTP-Statuscodes

| Status | Bedeutung                              | Anzeige in der APK                        |
| ------ | -------------------------------------- | ----------------------------------------- |
| `201`  | Anfrage erstellt                       | `Erfolgreich angefragt`                   |
| `202`  | Keine weitere Staffel anfragbar        | `Bereits angefragt oder verfügbar`        |
| `401`  | Nicht angemeldet                       | Erneut anmelden                           |
| `403`  | Keine Berechtigung oder Quote erreicht | Servermeldung anzeigen                    |
| `409`  | Film wurde bereits angefragt           | `Bereits angefragt`                       |
| `500`  | Server- oder ungültiger Medienfehler   | Fehler anzeigen und Wiederholung anbieten |

## UI-Vorschlag

In der Poster- oder Detailansicht sollte der Button seinen Zustand anzeigen:

- `Anfragen`: Medium kann angefragt werden.
- `Wird gesendet`: Anfrage läuft; Button ist deaktiviert.
- `Angefragt`: Anfrage ist ausstehend.
- `In Bearbeitung`: Anfrage wurde genehmigt.
- `Verfügbar`: Medium liegt bereits vor.
- `Erneut versuchen`: Netzwerk- oder Serverfehler.

Mehrfache schnelle Klicks müssen verhindert werden. Nach einer erfolgreichen Anfrage sollte die APK den Status erneut vom Portal laden.

## Relevante Stellen im Portal-Code

https://github.com/cyb3rgh05t/vodwisharr/tree/streamnetvod

- Request-Endpunkt: `server/routes/request.ts`
- Request-Felder: `server/interfaces/api/requestInterfaces.ts`
- Authentifizierung: `server/middleware/auth.ts`
- Lokaler Login: `server/routes/auth.ts`
- Mediensuche: `server/routes/search.ts`
- API-Spezifikation: `overseerr-api.yml`

## Android-Implementierung

- Retrofit-Schnittstelle: `app/src/main/kotlin/com/arflix/tv/data/api/VodRequestApi.kt`
- DI-/Base-URL-Konfiguration: `app/src/main/kotlin/com/arflix/tv/di/AppModule.kt`
- Secret- und URL-Zugriff: `app/src/main/kotlin/com/arflix/tv/util/Constants.kt`
- Request-State und HTTP-Mapping: `app/src/main/kotlin/com/arflix/tv/ui/screens/details/DetailsViewModel.kt`
- Empty-State und Aktion: `app/src/main/kotlin/com/arflix/tv/ui/components/StreamSelector.kt`
- Aufruf aus Details: `app/src/main/kotlin/com/arflix/tv/ui/screens/details/DetailsScreen.kt`

Die aktuelle Integration nutzt einen gemeinsamen Secret-Key `VODWISHARR_API_KEY` für VODWisharr- und Request-Aufrufe. `VOD_REQUEST_API_KEY` wird nicht mehr als separates Secret geführt.

Die Portal url wird in der apk schon irgendwo benutzt. es wäre besser wenn wir daraus ein secrets machen, auch in github workflow
