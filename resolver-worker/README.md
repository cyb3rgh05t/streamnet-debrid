# StreamNet Resolver Worker

Cloudflare Worker for StreamNet Web Live TV. It exposes only `/health` and the allowlisted `/media` relay, rewrites nested HLS URLs back through HTTPS, and accepts requests only from configured StreamNet Web origins.

The web image receives this worker through `NEXT_PUBLIC_STREAMNET_MEDIA_RESOLVER_URL`. Do not set `NEXT_PUBLIC_ARVIO_RESOLVER_URL` to this worker; that variable expects the full resolver API, including `/sources`, `/subtitle`, and `/launch`.

Required GitHub Actions secrets:

- `CLOUDFLARE_API_TOKEN` with Workers Scripts Edit and the DNS permission needed for the custom domain.
- `CLOUDFLARE_ACCOUNT_ID`.

The deployment creates the `resolve.streamnet.live` Worker custom domain. Keep `ALLOWED_MEDIA_HOSTS` in `wrangler.toml` synchronized with provider redirect hosts.

Local validation:

```bash
npm ci
npm run typecheck
```
