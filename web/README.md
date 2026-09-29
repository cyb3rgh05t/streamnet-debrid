# StreamNet Webplayer

This folder contains the self-hosted StreamNet webplayer. It is deployed separately from `backend-cloud` and reaches the backend over HTTPS.

## Purpose

- keep the UI/UX patterns from the upstream web app
- isolate branding
- map to the StreamNet backend contract
- keep CloudSync as the canonical state layer

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
