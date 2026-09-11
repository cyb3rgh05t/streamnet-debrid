interface Env {
  ALLOWED_ORIGINS?: string;
  ALLOWED_MEDIA_HOSTS?: string;
}

const DEFAULT_ALLOWED_ORIGINS = ["https://web.streamnet.live"];
const DEFAULT_ALLOWED_MEDIA_HOSTS = ["xui.streamnet.live", "193.200.221.81"];
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
    !allowedMediaHosts(env).has(target.hostname.toLowerCase())
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

  const finalUrl = safeUrl(upstream.url) ?? target;
  if (!allowedMediaHosts(env).has(finalUrl.hostname.toLowerCase())) {
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
    return new Response(rewritePlaylist(text, finalUrl, input), {
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

function rewritePlaylist(text: string, baseUrl: URL, requestUrl: URL) {
  const headers = requestUrl.searchParams.get("h");
  const proxied = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:"))
      return raw;
    try {
      const absolute = new URL(trimmed, baseUrl);
      const target = new URL("/media", requestUrl.origin);
      target.searchParams.set("url", absolute.toString());
      if (headers) target.searchParams.set("h", headers);
      return target.toString();
    } catch {
      return raw;
    }
  };

  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (!trimmed.startsWith("#")) return proxied(line);
      return line.replace(
        /URI="([^"]+)"/g,
        (_match, uri: string) => `URI="${proxied(uri)}"`,
      );
    })
    .join("\n");
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
