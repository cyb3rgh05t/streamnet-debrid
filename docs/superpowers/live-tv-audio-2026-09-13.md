# Live-TV-Audio-Fix

Status: Umgesetzt
Version: 2.5.013
Datum: 13. September 2026

## Befund

Betroffene IPTV-TS-Streams blieben auf Android TV, NVIDIA Shield und dem
Emulator stumm. Der Log zeigte keinen normalen ExoPlayer-Audiofehler:

- Media3 erkannte die Audiospur als `audio/mp4a-latm`.
- Android startete `c2.android.aac.decoder`.
- Ein AudioTrack mit 48 kHz und zwei Kanaelen wurde geoeffnet.
- Danach wurden die Decoder-Puffer verworfen und der AudioTrack ging in
  `out_standby`.

Die Senderwechsel im Log waren manuell ausgeloest, weil der vorherige Sender
stumm blieb. `out_standby` war daher eine Folge des Senderwechsels und nicht
die eigentliche Ursache.

## Loesung

`FfmpegFirstRenderersFactory` registriert im Live-TV-Player den mitgelieferten
Media3-FFmpeg-Audio-Renderer explizit vor den Plattform-Renderern. Damit kann
ein fehlerhaft als AAC gemeldeter IPTV-Audiopfad nicht mehr zuerst vom
Android-AAC-Decoder beansprucht werden.

Die Factory wird ausschliesslich in `LiveTvScreen` verwendet. Der normale
VOD-Player bleibt unveraendert: Plattformdecoder und Passthrough haben Vorrang,
FFmpeg bleibt dort ein Fallback.

## Validierung

- `:app:compileSideloadDebugKotlin` erfolgreich
- `:app:assembleSideloadDebug` erfolgreich
- Manueller Emulator-Test bestaetigt wieder hoerbaren Ton bei den zuvor
  stummen Live-TV-Streams

## Einschraenkung

Der Sideload-Live-TV-Pfad gibt Audio dekodiert als PCM aus. AVR-/HDMI-
Bitstream-Passthrough ist fuer diesen Live-TV-Fix nicht der primaere Pfad.
