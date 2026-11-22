interface Env {
  ALLOWED_ORIGINS?: string;
  ALLOWED_MEDIA_HOSTS?: string;
  // Same key as PROXY_SIGNING_KEY of the web app (wrangler secret). Without it nothing is signed.
  PROXY_SIGNING_KEY?: string;
}

const SIGNATURE_LENGTH = 32;

const DEFAULT_ALLOWED_ORIGINS = ["https://web.streamnet.live"];
const DEFAULT_ALLOWED_MEDIA_HOSTS = [
  "xui.streamnet.live",
  "193.200.221.81",
  "50.7.184.250",
  "85.209.176.85",
  "193.108.118.53",
  "216.152.154.146",
  "50.7.28.82",
];
const FORWARDED_HEADERS =
  /^(accept|authorization|cookie|icy-metadata|origin|referer|user-agent)$/i;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return preflight(request, env);

    const input = new URL(request.url);
    if (input.pathname === "/health") {
      return json({ ok: true, service: "streamnet-resolver" }, request, env);
    }
    if (
      input.pathname === "/media" &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      return media(request, input, env);
    }
    return json({ error: "Not found" }, request, env, 404);
  },
};

async function media(request: Request, input: URL, env: Env) {
  if (!isAllowedCaller(request, env)) {
    return json({ error: "Origin not allowed" }, request, env, 403);
  }

  const raw = input.searchParams.get("url");
  if (!raw) return json({ error: "Missing url" }, request, env, 400);

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return json({ error: "Invalid url" }, request, env, 400);
  }
  if (
    !["http:", "https:"].includes(target.protocol) ||
    !(
      isAllowedMediaHost(allowedMediaHosts(env), target.hostname) ||
      (await hasValidSignature(
        env,
        target.toString(),
        input.searchParams.get("s"),
      ))
    )
  ) {
    return json({ error: "Media host not allowed" }, request, env, 400);
  }

  const forwarded = new Headers({ accept: "*/*" });
  for (const [key, value] of Object.entries(
    decodeHeaders(input.searchParams.get("h")),
  )) {
    if (FORWARDED_HEADERS.test(key)) forwarded.set(key, value);
  }
  const range = request.headers.get("range");
  if (range) forwarded.set("range", range);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers: forwarded,
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return json({ error: "Media upstream unavailable" }, request, env, 502);
  }

  // The start URL was validated above; its redirects may lead to any other host (Workers cannot reach private networks).
  const finalUrl = safeUrl(upstream.url) ?? target;
  if (!["http:", "https:"].includes(finalUrl.protocol)) {
    await upstream.body?.cancel();
    return json(
      { error: "Media redirect host not allowed" },
      request,
      env,
      502,
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  const playlist =
    request.method === "GET" &&
    (contentType.toLowerCase().includes("mpegurl") ||
      /\.m3u8?(?:$|[?#])/i.test(finalUrl.pathname));
  if (playlist) {
    const text = await upstream.text();
    if (text.length > 2 * 1024 * 1024) {
      return json({ error: "Playlist exceeds size limit" }, request, env, 502);
    }
    return new Response(await rewritePlaylist(text, finalUrl, input, env), {
      status: upstream.status,
      headers: {
        ...corsHeaders(request, env),
        "cache-control": "no-store",
        "content-type": "application/vnd.apple.mpegurl",
      },
    });
  }

  const headers = new Headers(corsHeaders(request, env));
  headers.set("cache-control", "no-store");
  headers.set("content-type", contentType || "application/octet-stream");
  headers.set(
    "accept-ranges",
    upstream.headers.get("accept-ranges") ?? "bytes",
  );
  headers.set(
    "access-control-expose-headers",
    "accept-ranges,content-length,content-range,etag,last-modified",
  );
  for (const name of [
    "content-length",
    "content-range",
    "etag",
    "last-modified",
  ]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}

async function hmacHex(key: string, value: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(
    await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(value)),
  );
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, SIGNATURE_LENGTH);
}

// URLs the relay wrote into a playlist are signed (see web/lib/server/relaySignature.ts) and may sit on any host.
async function hasValidSignature(
  env: Env,
  url: string,
  signature: string | null,
) {
  if (!env.PROXY_SIGNING_KEY || signature?.length !== SIGNATURE_LENGTH)
    return false;
  const expected = await hmacHex(env.PROXY_SIGNING_KEY, url);
  let difference = 0;
  for (let index = 0; index < SIGNATURE_LENGTH; index++)
    difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  return difference === 0;
}

async function rewritePlaylist(
  text: string,
  baseUrl: URL,
  requestUrl: URL,
  env: Env,
) {
  const headers = requestUrl.searchParams.get("h");
  const proxied = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:"))
      return raw;
    try {
      const absolute = new URL(trimmed, baseUrl);
      const target = new URL("/media", requestUrl.origin);
      target.searchParams.set("url", absolute.toString());
      if (env.PROXY_SIGNING_KEY)
        target.searchParams.set(
          "s",
          await hmacHex(env.PROXY_SIGNING_KEY, absolute.toString()),
        );
      if (headers) target.searchParams.set("h", headers);
      return target.toString();
    } catch {
      return raw;
    }
  };

  const lines = await Promise.all(
    text.split(/\r?\n/).map(async (line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (!trimmed.startsWith("#")) return proxied(line);
      const uris = Array.from(line.matchAll(/URI="([^"]+)"/g));
      const replacements = await Promise.all(uris.map((m) => proxied(m[1])));
      let index = 0;
      return line.replace(/URI="([^"]+)"/g, () => `URI="${replacements[index++]}"`);
    }),
  );
  return lines.join("\n");
}

function decodeHeaders(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const value = JSON.parse(
      atob(raw.replace(/-/g, "+").replace(/_/g, "/")),
    ) as unknown;
    return value && typeof value === "object"
      ? (value as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

function configuredValues(raw: string | undefined, defaults: string[]) {
  const values = raw
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return values?.length ? values : defaults;
}

// Panel- und Load-Balancer-Hosts wechseln; Gegenstück zu isStreamNetRelayHost in web/lib/iptvPlayback.ts.
function isAllowedMediaHost(hosts: Set<string>, hostname: string) {
  const host = hostname.toLowerCase();
  if (hosts.has(host)) return true;
  const suffix = ".streamnet.live";
  if (!host.endsWith(suffix)) return false;
  const label = host.slice(0, -suffix.length);
  return (
    /^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/.test(label) &&
    !["web", "resolve", "www"].includes(label)
  );
}

function allowedMediaHosts(env: Env) {
  return new Set(
    configuredValues(env.ALLOWED_MEDIA_HOSTS, DEFAULT_ALLOWED_MEDIA_HOSTS).map(
      (host) => host.toLowerCase(),
    ),
  );
}

function requestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  const referer = request.headers.get("referer");
  if (!referer) return "";
  try {
    return new URL(referer).origin;
  } catch {
    return "";
  }
}

function isAllowedCaller(request: Request, env: Env) {
  return configuredValues(
    env.ALLOWED_ORIGINS,
    DEFAULT_ALLOWED_ORIGINS,
  ).includes(requestOrigin(request));
}

function corsHeaders(request: Request, env: Env) {
  const origin = requestOrigin(request);
  const allowed = configuredValues(
    env.ALLOWED_ORIGINS,
    DEFAULT_ALLOWED_ORIGINS,
  );
  return {
    "access-control-allow-origin": allowed.includes(origin)
      ? origin
      : allowed[0],
    "access-control-allow-methods": "GET,HEAD,OPTIONS",
    "access-control-allow-headers": "content-type,range",
    vary: "origin",
  };
}

function preflight(request: Request, env: Env) {
  return new Response(null, {
    status: isAllowedCaller(request, env) ? 204 : 403,
    headers: corsHeaders(request, env),
  });
}

function json(value: unknown, request: Request, env: Env, status = 200) {
  return Response.json(value, {
    status,
    headers: { ...corsHeaders(request, env), "cache-control": "no-store" },
  });
}

function safeUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
