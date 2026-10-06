# StreamNet Resolver Worker

Cloudflare Worker for StreamNet Web Live TV. It exposes only `/health` and the allowlisted `/media` relay, rewrites nested HLS URLs back through HTTPS, and accepts requests only from configured StreamNet Web origins.

The web image receives this worker through `NEXT_PUBLIC_STREAMNET_MEDIA_RESOLVER_URL`. Do not set `NEXT_PUBLIC_ARVIO_RESOLVER_URL` to this worker; that variable expects the full resolver API, including `/sources`, `/subtitle`, and `/launch`.

Required GitHub Actions secrets:

- `CLOUDFLARE_API_TOKEN` with Workers Scripts Edit and the DNS permission needed for the custom domain.
- `CLOUDFLARE_ACCOUNT_ID`.

The deployment creates the `resolve.streamnet.live` Worker custom domain. Keep `ALLOWED_MEDIA_HOSTS` in `wrangler.toml` synchronized with provider redirect hosts.

The Live TV relay allows `xui.streamnet.live`, `193.200.221.81`, and
`50.7.184.250` (including extensionless `/hls/` URLs). An unlisted host returns
HTTP 400 with `Media host not allowed` before any upstream request. When adding
a provider host, update both `wrangler.toml` and the defaults in `src/index.ts`.
Redeploy the worker for host changes to take effect; a WebUI refresh alone is
not sufficient. The publish workflow deploys only on a web version change or
manual `workflow_dispatch`.

Local validation (Node.js 22.19+):

```bash
npm ci
npm test
npm run typecheck
```
