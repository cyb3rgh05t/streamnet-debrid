# StreamNet Webplayer

This folder contains the self-hosted StreamNet webplayer. It is deployed separately from `backend-cloud` and reaches the backend over HTTPS.

## Purpose

- keep the UI/UX patterns from the upstream web app
- isolate branding
- map to the StreamNet backend contract
- keep CloudSync as the canonical state layer

## Playback maintenance notes

Movie/episode progress is shared through StreamNet account sync independently
of Trakt/MDBList. Web and confirmed external-player progress writes include an
item-level `updated_at`, mirrored to Android's `updatedAtMs` for conflict
resolution. Android must not treat a missing dismissal timestamp as an actual
dismissal of older progress records. Account and profile must match on both
devices; VLC progress requires confirmation in the web return prompt because
the browser cannot read VLC's playback clock.
An account-sync failure in the external-player return prompt shows an error and
restores the pending progress confirmation for retry instead of claiming success.

Watch-history query parameters (including `profile_id` and exact episode
identity) are forwarded unchanged by the WebUI proxy. History reads also reject
rows belonging to a different profile. Android accepts older WebUI history
records without a payload `user_id`: ownership comes from the authenticated
account, not that optional payload field.

Continue Watching selects an active resume before an empty/completed candidate,
then the most recently updated record, with one card per movie/show. Resume
eligibility uses the existing web thresholds: below 90% completed, and at least
1% rounded progress or 10 seconds of saved position. Android uses the same
rounding and eligibility for cached and refreshed Home rows. A real saved
episode resume is not hidden just because metadata marks its air date as future;
the air-date check remains for Up Next suggestions.

## NZB source ordering

StreamNet NZB (`com.usenet.streamer`) supplies its own release priority.
Android and Web manual source menus retain that order after filtering, with
Smart Play first. Original source ordinals survive merging and generic ranking.
Android automatic selection excludes Smart Play and uses the first remaining
concrete NZB release within that provider's existing priority slots. Other
providers retain their ranking; IPTV VOD precedence is unchanged.
Smart Play remains explicitly selectable. If it is the only Android result,
automatic selection displays a message requesting manual source selection.
The Web browser recovery ranking and compatibility warnings remain unchanged.
IPTV fallback normalizes existing same-origin `/api/proxy` URLs back to their
upstream source before constructing relay attempts or audio conversion URLs.
Converted audio endpoints are played directly rather than sent through the
provider relay ladder. The explicit MPEG-TS test remains TS-only.

Android NZB source cards additionally display the addon's formatted title and
description as wrapping detail labels below the existing badges/filename.
All supplied media lines (including audio, group, bitrate, indexer, file count,
date and health) are retained, except the filename already shown above and
lines containing playback URLs or authorization data. Missing metadata is not
inferred and cached status is not presented as a passed health check.
This presentation is isolated in `NzbSourceDetails.kt` and its composable;
it can be reverted independently of source ordering and cloud sync.
Android TV source rows show the catalog item title above the left-hand badges,
with a recognized release year in parentheses when available, in both the
details and player selectors. The loading counter measures completed addon
queries, not individual releases; startup preparation uses an indeterminate
state until source-search results arrive.
In the Android player, remote Back and Escape dismiss the source selector
without leaving playback, including when the key reaches the player container.
The existing Back behavior outside the source selector is unchanged.

## Structure

- `app/` - Next.js routes, global styles, and server API routes
- `components/` - StreamNet user interface
- `lib/` - CloudSync, providers, playback, and application state

## Franchise metadata

The Marvel, DC Universe, and Star Wars collections load their chronology from
direct MystreamNet catalog manifests without installing separate addons. These
catalogs return IMDb IDs (`tt...`), portrait posters, and sometimes English or
placeholder descriptions; they do not provide TMDB IDs or wide backdrops for
every entry. `lib/tmdb.ts` resolves those IMDb IDs through TMDB's external-ID
lookup and fetches movie/show details in the selected app language. The TMDB
backdrop is used on landscape cards and the overview in the Home hero. Curated,
TMDB, and MDBList collection sources remain available as fallbacks.

If TMDB fails, cards retain the manifest poster without cropping it to fill a
landscape frame; German UI does not use English manifest copy as an overview.
Basic TMDB details are cached per language. The catalog row cache key was
advanced to v4 so previously cached poster-only rows are reloaded. To roll
back Web `1.0.059`, deploy the previous Web image; no backend migration is
needed.

Each franchise browser exposes three tabs in this order:

- Timeline: direct chronological MystreamNet manifest, preserving manifest order.
- Movies: separate movie catalog plus curated/TMDB/MDBList movie fallbacks,
  sorted by TMDB popularity.
- Series: separate series catalog plus curated/MDBList series fallbacks,
  sorted by TMDB popularity.

Runtime/minute labels are intentionally hidden in the Series and Timeline tabs.

## Deployment

The production compose file pulls the image published by GitHub Actions and expects an existing external Docker network named `proxy`, shared with Traefik:

```bash
cp .env.example .env
docker network create proxy
docker login ghcr.io
docker compose pull
docker compose up -d
```

Traefik routes `${STREAMNET_WEB_HOST}` to the web container on its internal port `3000`. The host does not publish a port directly, so this stack can run on a different server from the backend.

The backend URL in `.env` must point to the backend server, normally `https://auth.mystreamnet.club`.

`VODWISHARR_API_KEY` is optional and remains server-side. When configured, the
movie- and series-genre tiles use the same VODWisharr fanart and duotone mapping
as Android; otherwise the synchronized/static catalog covers remain in use.

`NEXT_PUBLIC_STREAMNET_TV_XTREAM_URL` configures the host for the predefined
STREAMNET TV Xtream login in TV settings. It defaults to
`https://xui.streamnet.live` and is embedded when the web image is built.

For images published by GitHub Actions, the public repository variables
`STREAMNET_BACKEND_URL` and `STREAMNET_TV_XTREAM_URL` override these defaults.
After changing either variable, run the `Publish StreamNet Web Player` workflow
and pull/restart the newly published image on the web server. These URLs are
public browser configuration and must not be stored as secrets.

## STREAMNET IPTV relay and fallback

STREAMNET Live TV, Catch-up, and Xtream-VOD use the restricted app relay first:
`/api/proxy?rewrite=streamnet`. HLS child playlists, segments, initialization
maps, and keys all remain on the app relay. Xtream `.ts` live URLs first try
their `.m3u8` variant. VLC defaults and source-specific request headers are
preserved; binary responses stream without buffering the complete video.
Manifest reads are limited to 2 MiB. Video traffic consumes web server bandwidth.

If startup fails, the player tries the remaining app variants, then
`/api/proxy?rewrite=resolver`: manifests still come through the app, but segments
and keys go to the configured media worker, with no app-relay exceptions. Direct
worker requests are the final network fallback. Network failures after playback
starts and persistent stalls can also advance this bounded ladder. VOD retains
its position; live playback rejoins the live window. Codec failures keep the
existing decoder/transcode handling rather than retrying identical bytes.

During development, `[StreamNet HLS]` and `[StreamNet playback fallback]` logs
report error codes and player state without including stream URLs or credentials.
Diagnostics are emitted as JSON strings so copied console output retains the
fields. Fatal HLS messages also expose the engine error code and HTTP status.
The error overlay also displays a copyable `Playback:` diagnostic with the path
category, failure/timeout code, ready state, and media error number, without
target URLs or headers. Pending play rejections from a previous relay handle
are ignored so they cannot mark its replacement as failed.
The diagnostic includes recognized pipeline/decoder status tokens and the
affected track category, not the raw browser message. IPTV media-element decode
errors (code 3), outside the combined STREAMNET live path below, first use HLS's two-attempt media recovery budget, shared
with fatal HLS media errors. The overlay no longer stops the stream immediately
before the HLS engine can recover. Initialization failures (code 4) retain the
existing codec/audio-conversion handling.
Duplicate HLS/media-element errors during a pending recovery consume no extra
attempt. Each attempt has a fifteen-second window to reach `playing`; failure to
recover triggers the second attempt, then an explicit exhausted-recovery error.
Disposal cancels pending recovery timers. A successful recovery does not reset
the per-handle two-attempt budget.
For failed STREAMNET Xtream live channels, the error overlay offers **Try MPEG-TS**.
This explicitly selects the continuous `.ts` source through the restricted app
relay and mpegts.js without transcoding or trying HLS first. It is a manual
transport comparison, not an automatic codec fix; Catch-up and VOD are excluded.
The temporary TS-only default has been removed. Recognized STREAMNET Xtream live
channels start with app-relayed HLS. Fatal media/decoder errors immediately try
app-relayed continuous MPEG-TS, without waiting for HLS media-recovery timers.
A TS media failure permits one return to app HLS; this budget remains bounded
even after successful playback. Network failures retain the resolver ladder.
Catch-up, VOD, transcoded streams and other providers keep their existing logic.
Live TS enables the 128 KiB input stash, retains three seconds when chasing a
buffer over twelve seconds, and does not chase while paused. This favors
stability over minimum live latency; it does not repair corrupt stream data.
MSE diagnostics include numeric engine codes and recognized exception names,
never raw messages or URLs. The audio watchdog follows the active transport
and suspends its timer on live TS.
Internal browser source replacements for an active live channel (including AAC
conversion) retain the channel and mounted player rather than entering the
general movie/VOD flow. The dock identity follows the channel ID, not the
changing playback URL, so the embedded/expanded view remains unchanged.
Recovery resumes playback on `canplay` after HLS reattaches the media source.
Startup/stall watchdogs defer to the pending decoder recovery instead of
interrupting it. The original browser decoder error is retained for diagnostics
and audio-recovery decisions even when source teardown clears `video.error`.
For Live TV, Catch-up, and Xtream-VOD, the silent-audio watchdog waits three
seconds of advancing playback without new decoded audio bytes (other sources
retain eight seconds). Pauses, buffering, seeking, mute, zero volume, and hidden
tabs reset the timer. Explicit audio-decoder initialization failures do not wait
for this timer. The watchdog requires Chromium's decoded-audio byte counter;
codec capability checks alone cannot establish whether a particular track works.
An IPTV startup audio-decoder initialization failure tries the existing AAC
conversion endpoint once. If the browser still rejects the converted track,
playback stops with a codec error instead of retrying relays. Audio conversion
uses the same built-in provider/redirect hosts as the app relay unless explicitly
overridden by `STREAMNET_AUDIO_TRANSCODE_HOSTS`.

The built-in host list in `lib/iptvPlayback.ts` and the configured
`NEXT_PUBLIC_STREAMNET_TV_XTREAM_URL` host restrict the app relay. The existing
proxy fetcher validates public addresses and every redirect hop. Unknown segment
hosts are rejected, not automatically trusted. Other IPTV providers retain their
previous direct/worker playback order. Legacy `rewrite=worker` and `rewrite=direct`
routes retain the specific app-segment exceptions in `lib/server/iptvRelay.ts`.

The resolver's allowed hosts must match the provider/segment hosts for fallback
to work. Worker fetches may still be rejected by the provider with Cloudflare
error 1003; fallback is not a guarantee of reachability. The hybrid fallback
still requires a responsive app API. Deploy both the updated web image and
resolver, then reload the channel. A worker-only deployment does not enable the
app-first behavior. Validate actual playback from the deployed web server.

Existing proxy request budgets remain unchanged: 180 requests per minute per
bucket. The route uses `x-nf-client-connection-ip` or the shared `local` bucket;
self-hosted traffic without that header shares one budget. A 10 Gbps link alone
does not remove this concurrency limit. Review trusted client identification and
rate-limit policy separately before increasing the viewer count.
