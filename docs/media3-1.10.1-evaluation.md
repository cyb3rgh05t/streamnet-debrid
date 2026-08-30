# Media3 1.10.1 Evaluation - 2026-08-30

## Purpose

Media3 `1.10.1` is being evaluated without changing the official StreamNet release. The
upgrade is isolated on `test/media3-1.10.1` so playback compatibility can be tested before
promotion to `main`.

## Branch and Version Matrix

| Branch | App version | Version code | Media3 | Jellyfin FFmpeg | Status |
| --- | ---: | ---: | ---: | ---: | --- |
| `main` | `2.1.105` | `370` | `1.9.0` | `1.9.0+1` | Official StreamNet build |
| `test/media3-1.10.1` | `2.1.105-media3-test` | `370` | `1.10.1` | `1.9.0+1` | Isolated playback test |

The test branch updates these AndroidX modules together:

- `media3-exoplayer`
- `media3-exoplayer-hls`
- `media3-exoplayer-dash`
- `media3-datasource-okhttp`
- `media3-ui`
- `media3-session`
- `media3-common`

## Expected Benefits

Compared with Media3 `1.9.0`, the `1.10.1` test includes upstream fixes and capabilities
that are relevant to StreamNet playback:

- Fewer crashes while recovering from decoder errors or using renderer prewarming.
- A fix for the tunneling/audio-session race that could throw `IllegalStateException`.
- Better codec reuse during frame-rate changes on devices below API 30.
- Improved HDR and codec fallback decisions during video track selection.
- Dolby Vision Profile 10 support.
- A fix for video artifacts caused by AV1-based Dolby Vision initialization data.
- More robust HLS stream fallback and initialization-segment handling.
- A DASH fix for seeking into a chunk while its cancellation is in progress.
- Improved `AudioTrack` initialization retry behavior.
- MP4 support for VVC/H.266 tracks and large `uuid` boxes.
- More accurate VobSub cue durations.

These changes primarily improve compatibility and resilience. They do not guarantee higher
image quality, faster startup, or lower buffering for every source; those outcomes still
depend on the device decoder, source, server, and network.

## Compatibility Boundaries

### FFmpeg extension

The Sideload flavor still uses `org.jellyfin.media3:media3-ffmpeg-decoder:1.9.0+1` because a
matching `1.10.1` build is not available. A successful compile proves dependency linkage,
not runtime ABI compatibility. DTS, DTS-HD, TrueHD, Atmos, and software-decoder fallback
must therefore be tested on real target devices.

The FFmpeg extension remains excluded from the Play flavor because its current native
library is the likely source of the Google Play 16 KB page-size warning.

### Custom Dolby Vision Matroska extractor

`app/src/main/dvmkv-java` remains a vendored Media3 `1.9.0` Matroska extractor with the
StreamNet Dolby Vision Profile-7 hooks. The surrounding player libraries are `1.10.1` on
the test branch, but this extractor has not been re-vendored from `1.10.1`.

Before promotion, verify both paths:

- Native Dolby Vision playback on a compatible TV/device.
- Profile-7 to HDR10 base-layer fallback on a device without a compatible DV7 decoder.

See `docs/dolby-vision-compat.md` for the extractor architecture and log workflow.

## Build Feature Flags

The four disabled flags in `app/build.gradle.kts` are intentional and do not disable the
normal StreamNet Cloud implementation.

| Flag | Value | Effective behavior |
| --- | ---: | --- |
| `ENABLE_TMDB_EDGE_PROXY` | `false` | TMDB calls use the app's direct API path and OkHttp cache instead of a billable backend proxy. |
| `ENABLE_TRAKT_EDGE_PROXY` | `false` | Trakt remains direct. The current interceptor always keeps Trakt OAuth/user endpoints direct, so this field has no active routing effect. |
| `ENABLE_REALTIME_CLOUD_SYNC` | `false` | The app does not start the legacy persistent realtime socket. Startup/login pulls and normal Cloud pushes still run. |
| `ENABLE_REALTIME_WATCH_SYNC` | `false` | Realtime watch-history/status channel joins are disabled. This is currently subordinate to the disabled realtime Cloud socket. |
| `ENABLE_PERIODIC_CLOUD_PULL` | `true` | Normal Sideload/Play builds periodically pull Cloud changes. |
| `ENABLE_CLOUD_SYNC` | `true` | The self-hosted StreamNet account backend and snapshot synchronization are enabled. |

The `selfHosted` build type overrides `ENABLE_PERIODIC_CLOUD_PULL` to `false`; that variant
still enables Cloud sync but does not run the periodic pull loop.

Do not enable the proxy or realtime flags without deploying and verifying the matching
backend routes/channels. Doing so can introduce failed requests, duplicate sync traffic,
extra network/battery use, or unstable session behavior.

## Adjacent Fixes Included in Both Branches

The Media3 test branch also contains the current `main` playback-adjacent fixes:

- Persisted Cloud sessions survive temporary refresh/network failure, while definitively
  invalid sessions are removed.
- Localized TMDB TV details are preserved and only missing fields are filled from English.
- Logo priority is app language, English, neutral; backdrop priority is neutral, app
  language, English.
- IPTV artwork searches both movie and TV results.
- EPG duration acts as a soft type hint, so a long exact-title entry such as `Rambo`
  resolves to the movie rather than the old animated TV series.
- EPG timing reaches the Home hero, Home IPTV cards, and Live TV cards.
- Artwork caches distinguish movie-like and mixed searches.
- Automatic update prompts respect ignored versions; manual checks can reopen them.
- Live TV restores the playing channel and waits for asynchronous category/channel data.

## Commit Map

| Commit | Branch | Purpose |
| --- | --- | --- |
| `59b383f9` | `main` | Cloud session persistence, TV metadata/artwork fallbacks, IPTV/settings/startup/updater fixes (`2.1.104`) |
| `f57ead64` | `main` | Ambiguous IPTV movie/TV artwork resolution |
| `1a7bd51b` | `main` | Official version bump to `2.1.105` |
| `4e2439e1` | test branch | Media3 `1.10.1` dependency test and test-version suffix |
| `711efd61` | test branch | IPTV artwork fix carried onto the Media3 branch |

## Automated Validation

The updated test branch passed the following combined validation on Windows:

```powershell
.\gradlew.bat -PenableUnitTests :app:testSideloadDebugUnitTest :app:assembleSideloadDebug --no-daemon
```

Result: `BUILD SUCCESSFUL` with 60 actionable tasks. The remaining output consisted of
non-fatal warnings about the local Android SDK XML/tool version and a duplicate Android 34
platform directory.

The focused IPTV artwork regression verifies that a 99-minute exact-title movie result
outranks an exact-title TV result. The broader suite also covers Cloud startup session
retention, artwork language ordering, updater behavior, and Live TV startup restoration.

## Real-Device Promotion Checklist

Do not merge the Media3 test branch into `main` until these checks pass on representative
Android TV/Google TV/Fire TV hardware:

- [ ] Ordinary H.264 and HEVC VOD playback starts, seeks, pauses, and resumes.
- [ ] HLS live channels start, switch quality, recover from fallback, and keep A/V sync.
- [ ] DASH sources seek and recover from interrupted/cancelled chunks.
- [ ] Native Dolby Vision plays on a compatible device without artifacts.
- [ ] Dolby Vision Profile-7 fallback renders HDR10 video on a non-DV7 device.
- [ ] DTS/DTS-HD playback works through passthrough or Jellyfin FFmpeg fallback.
- [ ] TrueHD/Atmos playback works through passthrough or Jellyfin FFmpeg fallback.
- [ ] Embedded and external text subtitles render and seek correctly.
- [ ] PGS, VobSub, and DVB bitmap subtitle fallback/AI exclusion still works.
- [ ] Audio and subtitle track switching does not stall playback.
- [ ] Repeated source fallback and decoder recovery do not crash the app.
- [ ] Background/resume and media-session controls remain correct.

## Promotion Decision

Current status: automated validation passed, but promotion is intentionally pending real-device
codec and Dolby Vision testing. Until then, `main` remains on Media3 `1.9.0` and the test APK
must be identified by its `2.1.105-media3-test` version name.
