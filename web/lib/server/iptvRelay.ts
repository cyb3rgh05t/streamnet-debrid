import { config } from "../config";
import { streamNetRelayHosts } from "../iptvPlayback";

export const STREAMNET_RELAY_HOSTS = streamNetRelayHosts(
  config.streamnetTvXtreamUrl,
);

export class IptvPlaylistSizeError extends Error {
  constructor() {
    super("Playlist exceeds the size limit");
  }
}

export async function readIptvPlaylist(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      bytes += chunk.value.byteLength;
      if (bytes > 2 * 1024 * 1024) {
        await reader.cancel();
        throw new IptvPlaylistSizeError();
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

const APP_SEGMENT_RELAY_HOSTS = new Set([
  "85.209.176.85",
  "193.200.221.81",
  "50.7.184.250",
]);

export function appSegmentRelayUrl(
  target: URL,
  headersParam: string | null,
): string | null {
  if (
    !["http:", "https:"].includes(target.protocol) ||
    !APP_SEGMENT_RELAY_HOSTS.has(target.hostname.toLowerCase())
  )
    return null;

  const params = new URLSearchParams();
  params.set("url", target.toString());
  if (headersParam) params.set("headers", headersParam);
  params.set("rewrite", "streamnet");
  return `/api/proxy?${params.toString()}`;
}

export function rewriteIptvPlaylist(
  text: string,
  baseUrl: URL,
  headersParam: string | null,
  mode: "streamnet" | "resolver",
  resolverUrl = "",
) {
  if (mode === "resolver" && !/^https?:\/\//i.test(resolverUrl))
    throw new Error("Media resolver is not configured");
  const relayUrl = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:"))
      return raw;
    const absolute = new URL(trimmed, baseUrl);
    if (!["http:", "https:"].includes(absolute.protocol)) return raw;
    const playlist = /\.m3u8?(?:$|[?#])/i.test(absolute.pathname);
    const relay = new URL(
      mode === "streamnet" || playlist ? "/api/proxy" : "/media",
      mode === "streamnet" || playlist ? "https://app.invalid" : resolverUrl,
    );
    relay.searchParams.set("url", absolute.toString());
    if (headersParam)
      relay.searchParams.set(
        mode === "streamnet" || playlist ? "headers" : "h",
        headersParam,
      );
    if (mode === "streamnet" || playlist) {
      relay.searchParams.set("rewrite", mode);
      return `${relay.pathname}${relay.search}`;
    }
    return relay.toString();
  };
  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (!trimmed.startsWith("#")) return relayUrl(line);
      return line.replace(
        /URI="([^"]+)"/g,
        (_match, uri: string) => `URI="${relayUrl(uri)}"`,
      );
    })
    .join("\n");
}
