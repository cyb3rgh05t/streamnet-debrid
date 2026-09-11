# StreamNet Webplayer

This folder contains the self-hosted StreamNet webplayer. It is deployed separately from `self-hosted-backend` and reaches the backend over HTTPS.

## Purpose

- keep the UI/UX patterns from the upstream web app
- isolate branding
- map to the StreamNet backend contract
- keep CloudSync as the canonical state layer

## Structure

- `src/contracts/` - API and data contracts
- `src/theme/` - StreamNet branding tokens
- `src/adapter/` - backend bridge and state adapters

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
