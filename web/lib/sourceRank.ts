import { isUncachedDebridStream, parseDebridStream } from "./debrid";
import { audioDecodableForDevice, isBrowserPlayableStream, isDirectPlayableStream, videoDecodableForDevice } from "./streamCompatibility";
import type { StreamSource } from "./types";

// Shared source ranking — the details source picker, the in-player source
// panel, and the auto-hop fallback must all agree on what "the next best
// source" means.

/**
 * Who is going to play this.
 *
 * The two audiences want opposite orderings of the same list. A 4K Dolby
 * Vision remux with TrueHD is the WORST thing to hand a browser and the BEST
 * thing to hand VLC, so a single ranking cannot serve both: ranking used to
 * ignore the user's player entirely, which is why browser users had unplayable
 * sources at the top of every list.
 *
 * "external" keeps the quality-first order that was always right for VLC and
 * Infuse; "browser" additionally sinks anything this browser cannot decode.
 */
export type PlaybackTarget = "browser" | "external";

export function sourcePickerScore(stream: StreamSource, target: PlaybackTarget = "browser") {
  const text = `${stream.quality ?? ""} ${stream.source ?? ""} ${stream.description ?? ""} ${stream.size ?? ""}`.toLowerCase();
  let score = 0;
  score += qualityScore(text);
  score += sizeScore(stream, text);
  if (text.includes("remux")) score += 180;
  if (text.includes("bluray") || text.includes("blu-ray")) score += 70;
  if (text.includes("web-dl") || text.includes("webrip")) score += 35;
  if (text.includes("hdr10+") || text.includes("dolby vision") || /\bdv\b/i.test(text)) score += 28;
  else if (text.includes("hdr")) score += 18;
  // DV-only (no HDR fallback) = Dolby Vision profile 5 → black picture in
  // browsers. Sink these well below normal HDR/SDR sources — but only when the
  // browser is doing the decoding; VLC renders Dolby Vision correctly.
  if (target === "browser"
    && (text.includes("dolby vision") || /\bdv\b/i.test(text))
    && !text.includes("hdr")
    && !text.includes("remux")) score -= 300;
  if (text.includes("atmos") || text.includes("truehd") || text.includes("dts-hd")) score += 14;
  if (stream.behaviorHints?.cached) score += 45;
  if (stream.url) score += 12;
  // Debrid CDNs (TorBox/RD) reliably allow browser range requests + CORS;
  // free file-hosts (hubcloud/R2/pixeldrain mirrors) frequently don't and die
  // at play time — prefer debrid at equal quality.
  if (parseDebridStream(stream.url)) score += 55;
  if (isDirectPlayableStream(stream)) score += 3;
  else if (isBrowserPlayableStream(stream)) score += 2;
  // Decisive, and only for in-browser playback: a source this browser cannot
  // decode never plays here regardless of quality, so it sinks below every
  // option that does — 4K still wins wherever it is genuinely decodable.
  // External players decode all of this themselves, so they keep the pure
  // quality order and none of these penalties apply.
  if (target === "browser") {
    if (!videoDecodableForDevice(stream)) score -= 1000;
    // The missing half: undecodable AUDIO was scored normally, so DDP/Atmos
    // releases (nearly every modern streaming rip) ranked top and then failed.
    if (!audioDecodableForDevice(stream)) score -= 900;
  }
  if (text.includes("cam") || text.includes("hdcam") || text.includes("telesync") || text.includes("ts ")) score -= 500;
  // Uncached debrid torrents must download server-side before playing — sink
  // them below every cached option so they're never picked by default.
  if (isUncachedDebridStream(stream)) score -= 600;
  return score;
}

function qualityScore(text: string) {
  if (text.includes("4320") || text.includes("8k")) return 900;
  if (text.includes("2160") || text.includes("4k") || text.includes("uhd")) return 700;
  if (text.includes("1440")) return 540;
  if (text.includes("1080")) return 420;
  if (text.includes("720")) return 260;
  if (text.includes("480")) return 120;
  return 180;
}

function sizeScore(stream: StreamSource, text: string) {
  const bytes = stream.sizeBytes ?? parseSizeBytes(stream.size || text);
  if (!bytes) return 0;
  return Math.min(260, bytes / 500_000_000);
}

/** Best-effort size of a stream in bytes (metadata field or parsed from text). */
export function streamSizeBytes(stream: StreamSource): number {
  const text = `${stream.quality ?? ""} ${stream.source ?? ""} ${stream.description ?? ""} ${stream.size ?? ""}`.toLowerCase();
  return stream.sizeBytes ?? parseSizeBytes(stream.size || text);
}

function parseSizeBytes(value: string) {
  const match = value.match(/\b(\d+(?:\.\d+)?)\s?(tb|gb|mb)\b/i);
  if (!match) return 0;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return 0;
  const unit = match[2].toLowerCase();
  if (unit === "tb") return amount * 1_000_000_000_000;
  if (unit === "gb") return amount * 1_000_000_000;
  return amount * 1_000_000;
}
