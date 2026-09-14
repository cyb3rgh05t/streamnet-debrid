import { config } from "./config";
import type { InstalledAddon, MediaItem, StreamSource } from "./types";

type ResolverEvent =
  | { type: "started"; addonCount?: number }
  | {
      type: "batch";
      addonId?: string;
      addonName?: string;
      batch?: StreamSource[];
      streams?: StreamSource[];
    }
  | { type: "final"; cached?: boolean; streams?: StreamSource[] }
  | { type: "error"; error?: string };

export async function getResolverStreamsProgressive(
  addons: InstalledAddon[],
  item: MediaItem,
  season?: number,
  episode?: number,
  onUpdate?: (streams: StreamSource[], batch: StreamSource[]) => void,
) {
  const endpoint = `${config.resolverUrl.replace(/\/+$/, "")}/sources`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/x-ndjson, application/json",
    },
    body: JSON.stringify({ addons, item, season, episode }),
  });

  if (!response.ok) {
    throw new Error(`Resolver failed with ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!response.body || contentType.includes("application/json")) {
    const payload = (await response.json()) as ResolverEvent;
    if (payload.type === "error")
      throw new Error(payload.error ?? "Resolver failed");
    const streams = payload.type === "final" ? (payload.streams ?? []) : [];
    if (streams.length) onUpdate?.(streams, streams);
    return streams;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let latest: StreamSource[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const event = parseEvent(line);
      if (!event) continue;
      if (event.type === "error")
        throw new Error(event.error ?? "Resolver failed");
      if (event.type === "batch") {
        latest = event.streams ?? latest;
        onUpdate?.(latest, event.batch ?? []);
      }
      if (event.type === "final") {
        latest = event.streams ?? latest;
      }
    }
  }

  if (buffer.trim()) {
    const event = parseEvent(buffer);
    if (event?.type === "final") latest = event.streams ?? latest;
  }

  return latest;
}

export function resolverMediaUrl(
  url: string,
  headers?: Record<string, string>,
) {
  const baseUrl = config.mediaResolverUrl || config.resolverUrl;
  if (!baseUrl) return null;
  const endpoint = new URL(`${baseUrl.replace(/\/+$/, "")}/media`);
  endpoint.searchParams.set("url", url);
  if (headers && Object.keys(headers).length > 0) {
    endpoint.searchParams.set("h", btoa(JSON.stringify(headers)));
  }
  return endpoint.toString();
}

// Hosts the media resolver worker already allowlists (see
// resolver-worker/wrangler.toml ALLOWED_MEDIA_HOSTS) — safe to always proxy.
// Everything else (debrid CDNs, usenet gateways) has an unpredictable,
// per-request hostname the worker was never configured to allow, and most
// already send their own CORS headers; routing those through the worker
// would just get a 400 "Media host not allowed" instead of playing.
const REMUX_PROXY_HOSTNAMES = [config.streamnetTvXtreamUrl]
  .filter((value): value is string => !!value)
  .map((value) => {
    try {
      return new URL(value).hostname;
    } catch {
      return null;
    }
  })
  .filter((value): value is string => !!value);

// XUI.one (our IPTV panel software) rejects any request with no/empty
// User-Agent ("EMPTY_USER_AGENT — Empty user-agents are disallowed."),
// serving an HTML error page with a 200 status instead of the file. VOD
// streams normally carry no proxyHeaders at all (unlike LiveTV, which sets
// its own), so nothing was forwarded and we got this HTML back where
// mediabunny expected a media container.
const DEFAULT_REMUX_HEADERS: Record<string, string> = {
  accept: "*/*",
  "user-agent": "VLC/3.0.20 LibVLC/3.0.20",
};

/**
 * Fetch target for the in-browser remux worker.
 *
 * The remux worker downloads bytes with a real cross-origin `fetch()` inside
 * a Worker — unlike a `<video src>`, that requires the source to send CORS
 * headers our own IPTV/Xtream panel doesn't send. Worse, a valid User-Agent
 * makes the panel issue a redirect to a rotating backend streaming IP that
 * a firewall in front of it blocks for Cloudflare Workers specifically (but
 * not for our own server) — so the Cloudflare resolver worker can't reach it
 * at all. `/api/proxy` runs on our own server, needs no CORS (same-origin),
 * and isn't behind that block. Everything else (debrid CDNs, usenet
 * gateways) keeps using its direct URL/headers, which already work.
 */
function relayProxyUrl(url: string, headers?: Record<string, string>) {
  if (typeof window === "undefined") return null;
  const forwarded = { ...DEFAULT_REMUX_HEADERS, ...headers };
  const target = new URL("/api/proxy", window.location.origin);
  target.searchParams.set("url", url);
  target.searchParams.set("rewrite", "streamnet");
  target.searchParams.set("headers", btoa(JSON.stringify(forwarded)));
  return target.toString();
}

export function remuxFetchTarget(
  url: string,
  headers?: Record<string, string>,
): { url: string; headers?: Record<string, string> } {
  try {
    if (!REMUX_PROXY_HOSTNAMES.includes(new URL(url).hostname))
      return { url, headers };
  } catch {
    return { url, headers };
  }
  const relayed = relayProxyUrl(url, headers);
  return relayed ? { url: relayed, headers: undefined } : { url, headers };
}

/** Whether `/api/transcode` can act as a last-resort fallback for this source. */
export function canSelfTranscode(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

/**
 * Server-side re-encode as the final fallback tier, for sources whose audio
 * codec neither the browser nor the in-browser WebCodecs remux can play
 * (see web/app/api/transcode/route.ts). Only for hosts already routed
 * through our own `/api/proxy` relay — never an arbitrary URL.
 */
export function selfTranscodeUrl(
  url: string,
  headers?: Record<string, string>,
  startSeconds = 0,
): string | null {
  if (!canSelfTranscode(url)) return null;
  if (typeof window === "undefined") return null;
  const target = new URL("/api/transcode", window.location.origin);
  target.searchParams.set("url", url);
  const forwarded = { ...DEFAULT_REMUX_HEADERS, ...headers };
  target.searchParams.set("headers", btoa(JSON.stringify(forwarded)));
  if (startSeconds > 0)
    target.searchParams.set("t", String(Math.floor(startSeconds)));
  return target.toString();
}

export async function createServerTranscodeSession(
  url: string,
  headers?: Record<string, string>,
  startSeconds = 0,
): Promise<{ url: string; startSeconds: number } | null> {
  if (!canSelfTranscode(url) || typeof window === "undefined") return null;
  const forwarded = { ...DEFAULT_REMUX_HEADERS, ...headers };
  try {
    const response = await fetch("/api/transcode", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, headers: forwarded, startSeconds }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      url?: string;
      startSeconds?: number;
    };
    return payload.url
      ? { url: payload.url, startSeconds: payload.startSeconds ?? startSeconds }
      : null;
  } catch {
    return null;
  }
}

/**
 * The transcode output is a plain streamed response with no duration of its
 * own — `<video>.duration` never becomes finite while it plays. Ask the
 * server for the ORIGINAL file's real length up front so Continue Watching
 * progress has something to divide by (see PlayerOverlay's capturePosition).
 */
export async function probeSelfTranscodeDuration(
  url: string,
  headers?: Record<string, string>,
): Promise<number | null> {
  if (!canSelfTranscode(url) || typeof window === "undefined") return null;
  const target = new URL("/api/transcode", window.location.origin);
  target.searchParams.set("url", url);
  const forwarded = { ...DEFAULT_REMUX_HEADERS, ...headers };
  target.searchParams.set("headers", btoa(JSON.stringify(forwarded)));
  target.searchParams.set("probe", "1");
  try {
    const response = await fetch(target.toString(), { cache: "no-store" });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      durationSeconds?: number | null;
    };
    return typeof payload.durationSeconds === "number" &&
      payload.durationSeconds > 0
      ? payload.durationSeconds
      : null;
  } catch {
    return null;
  }
}

// External-player launch interstitial: iOS home-screen webapps silently drop
// custom-scheme navigations, but the Safari sheet they open for https links can
// launch app schemes (native "Open in …?" prompt). See worker /launch.
export function resolverLaunchUrl(schemeUrl: string) {
  if (!config.resolverUrl) return null;
  const endpoint = new URL(`${config.resolverUrl.replace(/\/+$/, "")}/launch`);
  endpoint.searchParams.set("to", schemeUrl);
  return endpoint.toString();
}

// Download proxy: the worker adds Content-Disposition: attachment so every
// browser (iOS Safari/Chrome preview files inline otherwise) hands the file to
// its download manager with visible progress.
export function resolverDownloadUrl(url: string, filename: string) {
  if (!config.resolverUrl) return null;
  const endpoint = new URL(`${config.resolverUrl.replace(/\/+$/, "")}/media`);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("dl", "1");
  endpoint.searchParams.set("filename", filename);
  return endpoint.toString();
}

export function resolverSubtitleUrl(url: string) {
  if (!config.resolverUrl)
    return `/api/subtitle?url=${encodeURIComponent(url)}`;
  const endpoint = new URL(
    `${config.resolverUrl.replace(/\/+$/, "")}/subtitle`,
  );
  endpoint.searchParams.set("url", url);
  return endpoint.toString();
}

function parseEvent(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as ResolverEvent;
  } catch {
    return null;
  }
}
