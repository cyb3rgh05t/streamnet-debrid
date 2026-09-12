# StreamNet Webplayer

This folder contains the self-hosted StreamNet webplayer. It is deployed separately from `self-hosted-backend` and reaches the backend over HTTPS.

## Purpose

- keep the UI/UX patterns from the upstream web app
- isolate branding
- map to the StreamNet backend contract
- keep CloudSync as the canonical state layer

## Structure

- `app/` - Next.js routes, global styles, and server API routes
- `components/` - StreamNet user interface
- `lib/` - CloudSync, providers, playback, and application state

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
