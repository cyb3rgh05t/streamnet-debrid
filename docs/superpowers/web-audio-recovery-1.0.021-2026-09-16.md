# Web Audio Recovery 1.0.021

Stand: 2026-09-16
Release: StreamNet Web `1.0.021`
Code-Baseline vor diesem Release: `34dd68d6`

## Ziel und Umfang

Der Webplayer konnte bei Live-TV, IPTV-VOD und Addon-VOD ein laufendes Bild ohne Ton zeigen, insbesondere bei AC-3, E-AC-3 oder DTS. Release 1.0.021 ergänzt eine gestufte Wiederherstellung:

1. Anbieter- oder Home-Server-Transcoding, falls verfügbar.
2. Live-TV: serverseitige AAC-Stereo-Konvertierung durch FFmpeg.
3. Datei-VOD: Browser-Remux mit AAC-Konvertierung.
4. Nächste Quelle oder verständliche Fehlermeldung.

Der Chromium-Watchdog reagiert nach acht Sekunden laufendem Video ohne Zuwachs von `webkitAudioDecodedByteCount`. Stummgeschaltete, pausierte, suchende oder im Hintergrund laufende Videos lösen ihn nicht aus. Browser ohne diesen Zähler behalten das bisherige Verhalten.

Der serverseitige FFmpeg-Relay wird automatisch nur für Live-TV gewählt. Datei-VOD aus Addons oder IPTV verwendet den Browser-Remux, weil ein allgemeiner Server-Relay mit unverändertem Video nicht jedes VOD-Container- oder Videoformat browserkompatibel machen kann. Dafür muss die Quelle Browser-CORS und Byte-Range-Anfragen unterstützen. Fehlt eines davon, wechselt der Player zur nächsten Quelle beziehungsweise zum externen Player.

## Sicherheits- und Lastgrenzen

- FFmpeg erhält die Quelle ausschließlich über `stdin`; es öffnet selbst keine Remote-URL.
- `safeProxyFetch` prüft Protokoll, DNS-Auflösung, öffentliche IP-Adresse und jeden Redirect.
- Erlaubte Ursprünge stehen in `STREAMNET_AUDIO_TRANSCODE_HOSTS`. Standardmäßig enthalten sind die bekannten StreamNet-IPTV-Hosts und `usenetstreamer.mystreamnet.club`.
- `STREAMNET_MAX_AUDIO_TRANSCODES` begrenzt parallele FFmpeg-Prozesse pro Webcontainer. Gültig sind 1 bis 16, Standard ist 4.
- Ein fünfter Stream erhält bei Standardkonfiguration HTTP 503 mit `Retry-After: 10`.

## Lokale Verifikation

Am 2026-09-16 wurde ein erzeugter MPEG-TS-Teststream mit MPEG-2-Video und AC-3 5.1 über `/api/transcode/audio` geleitet. Ergebnis:

- HTTP 200, `Content-Type: video/mp2t`;
- Video blieb `mpeg2video`;
- Audio wurde `ac3` 5.1 zu `aac` Stereo;
- vier parallele Transcodes wurden angenommen, der fünfte mit HTTP 503 abgewiesen;
- nach Abschluss wurde wieder ein Slot angenommen;
- `npm --prefix web run build` war erfolgreich.

## Produktivtest am 2026-09-17

Vor dem Update den aktuell laufenden Image-Digest sichern:

```bash
CONTAINER_ID=$(docker compose ps -q streamnet-web)
IMAGE_ID=$(docker inspect --format '{{.Image}}' "$CONTAINER_ID")
docker image inspect --format '{{index .RepoDigests 0}}' "$IMAGE_ID" > streamnet-web-image-before-1.0.021.txt
docker compose pull streamnet-web
docker compose up -d --force-recreate streamnet-web
docker compose logs --since=10m streamnet-web
```

Für jede Kategorie mindestens eine bekannte problematische Quelle und eine bisher funktionierende AAC-Quelle testen:

| Bereich            | Erwartung bei problematischem Audio                                                   | Regressionstest                                 |
| ------------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Live-TV            | Nach etwa 8 Sekunden Hinweis zur AAC-Konvertierung, danach Bild und Ton               | Senderwechsel, Stoppen und erneutes Öffnen      |
| IPTV-VOD           | Direkter Ton oder AAC-Wiederherstellung ohne Positionsverlust                         | Suche, Pause, Fortsetzen und Spulen             |
| Addon-VOD          | Direkter Ton oder Browser-AAC-Remux, sofern der Ursprung CORS und Byte-Ranges liefert | Mehrere Quellen testen; Netzwerkfehler notieren |
| Normales AAC/H.264 | Kein Transcode-Hinweis, sofortige direkte Wiedergabe                                  | Live-TV und VOD jeweils mindestens einmal       |

Zusätzlich prüfen:

- vier parallele problematische Streams funktionieren bei `STREAMNET_MAX_AUDIO_TRANSCODES=4`;
- der Container bleibt bei CPU, RAM und Netzwerk innerhalb der Serverkapazität;
- nach Schließen eines Players bleibt kein FFmpeg-Prozess dauerhaft aktiv;
- Browser-Konsole und Containerlogs zeigen keine wiederholte Transcode-Schleife;
- bei einem Fehler keine vollständigen, möglicherweise zugangsgeschützten Stream-URLs veröffentlichen.

## Schnelle Konfigurationskorrekturen

Bei zu hoher Last zunächst in `web/.env` reduzieren und den Container neu erstellen:

```dotenv
STREAMNET_MAX_AUDIO_TRANSCODES=2
```

Wenn eine legitime Quelle mit `Blocked proxy target` scheitert, nur deren exakten Host ergänzen. Keine Wildcards und nicht pauschal `mystreamnet.club` freigeben.

## Rollback

### Nur Produktion auf das vorherige Image zurücksetzen

Den vor dem Update gespeicherten Digest verwenden:

```bash
PREVIOUS_IMAGE=$(cat streamnet-web-image-before-1.0.021.txt)
docker pull "$PREVIOUS_IMAGE"
STREAMNET_WEB_IMAGE="$PREVIOUS_IMAGE" docker compose up -d --force-recreate streamnet-web
```

Danach Bild/Ton mit einer zuvor funktionierenden Quelle prüfen. Die Datenbank ist nicht betroffen; Release 1.0.021 enthält keine Migration.

### Release vollständig im Repository revertieren

Der Release wird mit dem Tag `web-1.0.021` markiert. Nach dem Push kann der gesamte Web-Audio-Stand mit einem einzelnen Revert rückgängig gemacht werden:

```bash
git switch main
git pull --ff-only origin main
git revert web-1.0.021
git push origin main
```

Der Revert löst den Web-Publish-Workflow erneut aus. Danach das neu veröffentlichte Image wie oben deployen. Keine Android-Dateien oder Datenbankschemata gehören zu diesem Release.

## Relevante Dateien

- `web/components/player/PlayerOverlay.tsx`: Eskalationsreihenfolge und Live-Relay-Umschaltung.
- `web/lib/playerRecovery.ts`: Chromium-Watchdog für stummes Audio.
- `web/lib/remux.ts`: AAC-Konvertierung statt AC-3/E-AC-3-Passthrough.
- `web/app/api/transcode/audio/route.ts`: abgesicherter FFmpeg-Audio-Relay und Kapazitätslimit.
- `web/Dockerfile`: FFmpeg im Produktionsimage.
- `web/.env.example` und `web/compose.yaml`: Allowlist und Parallelitätskonfiguration.
