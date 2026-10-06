export const STREAMNET_RELAY_HOSTS: ReadonlySet<string> = new Set([
  "xui.streamnet.live",
  "85.209.176.85",
  "193.200.221.81",
  "193.108.118.53",
  "50.7.184.250",
]);

export function streamNetRelayHosts(providerUrl: string): ReadonlySet<string> {
  return new Set([
    ...STREAMNET_RELAY_HOSTS,
    new URL(providerUrl).hostname.toLowerCase(),
  ]);
}

export function isStreamNetRelayTarget(url: string, providerUrl: string) {
  const target = new URL(url);
  return (
    ["http:", "https:"].includes(target.protocol) &&
    (target.origin === new URL(providerUrl).origin ||
      STREAMNET_RELAY_HOSTS.has(target.hostname.toLowerCase()))
  );
}

export function xtreamLiveHlsVariant(url: string): string | null {
  const target = new URL(url);
  if (!/^\/(?:live\/)?[^/]+\/[^/]+\/\d+\.ts$/i.test(target.pathname))
    return null;
  target.pathname = target.pathname.replace(/\.ts$/i, ".m3u8");
  return target.toString();
}

export function xtreamLiveTsVariant(url: string): string | null {
  const target = new URL(url);
  if (!/^\/(?:live\/)?[^/]+\/[^/]+\/\d+\.(?:m3u8|ts)$/i.test(target.pathname))
    return null;
  target.pathname = target.pathname.replace(/\.(?:m3u8|ts)$/i, ".ts");
  return target.toString();
}

export function createLiveTransportFallback() {
  let triedTs = false;
  let returnedToHls = false;
  return (transport: "hls" | "mpegts"): number | null => {
    if (transport === "hls" && !triedTs) {
      triedTs = true;
      return 1;
    }
    if (transport === "mpegts" && !returnedToHls) {
      triedTs = true;
      returnedToHls = true;
      return 0;
    }
    return null;
  };
}

export function mseErrorDiagnostic(info: unknown): string {
  if (typeof info !== "object" || info === null) return "unknown";
  const code = "code" in info && typeof info.code === "number" && Number.isInteger(info.code)
    ? String(info.code) : "none";
  const message = "msg" in info && typeof info.msg === "string" ? info.msg : "";
  const exception = message.match(/\b(?:InvalidStateError|NotSupportedError|QuotaExceededError|TypeError|AbortError)\b/)?.[0] ?? "unknown";
  return `code=${code}; exception=${exception}`;
}

export function iptvStartupRecovery(
  faultKind: "network" | "media" | "unsupported" | "unknown" | undefined,
  mediaErrorCode: number | undefined,
  mediaErrorMessage: string,
  transcoded: boolean,
): "relay" | "audio-transcode" | "codec-error" {
  const decodeFailure = faultKind
    ? faultKind === "media" || faultKind === "unsupported"
    : mediaErrorCode === 3 || mediaErrorCode === 4;
  if (!decodeFailure) return "relay";
  if (
    !transcoded &&
    /audio decoder initialization failed/i.test(mediaErrorMessage)
  )
    return "audio-transcode";
  return "codec-error";
}

export function playbackDiagnostic(
  url: string,
  reason: string,
  readyState: number,
  mediaErrorCode?: number,
  mediaErrorMessage = "",
): string {
  const target = new URL(url, "https://app.invalid");
  const path =
    target.pathname === "/api/transcode/audio"
      ? "audio-transcode"
      : target.pathname === "/api/proxy"
        ? target.searchParams.get("rewrite") === "streamnet"
          ? "app-relay"
          : "manifest-relay"
        : target.pathname === "/media"
          ? "resolver"
          : "direct";
  const safeReason = /^[a-zA-Z0-9_-]{1,80}$/.test(reason) ? reason : "unknown";
  const pipelineStatus = mediaErrorMessage.match(
    /\bPipelineStatus::([A-Z][A-Z0-9_]{0,79})\b/,
  )?.[1];
  const decoderStatus = mediaErrorMessage.match(
    /\bDecoderStatus::Codes::(k[A-Za-z0-9]{1,79})\b/,
  )?.[1];
  const track = /audio decoder/i.test(mediaErrorMessage)
    ? "audio"
    : /video decoder/i.test(mediaErrorMessage)
      ? "video"
      : "unknown";
  return `Playback: ${path}; reason=${safeReason}; readyState=${readyState}; mediaError=${mediaErrorCode ?? "none"}; track=${track}${pipelineStatus ? `; pipeline=${pipelineStatus}` : ""}${decoderStatus ? `; decoder=${decoderStatus}` : ""}`;
}

export function streamNetPlaybackAttempts(
  url: string,
  options: {
    appOrigin: string;
    resolverUrl: string;
    headers: Record<string, string>;
    liveTsOnly?: boolean;
    liveTransportFallback?: boolean;
  },
): string[] {
  const headers = btoa(JSON.stringify(options.headers));
  const ts = options.liveTransportFallback ? xtreamLiveTsVariant(url) : null;
  const twin = xtreamLiveHlsVariant(ts ?? url);
  const urls = ts && twin ? [twin, ts] : twin ? [twin, url] : [url];
  const relay = (source: string, mode: "streamnet" | "resolver") => {
    const target = new URL("/api/proxy", options.appOrigin);
    target.searchParams.set("url", source);
    target.searchParams.set("headers", headers);
    target.searchParams.set("rewrite", mode);
    return target.toString();
  };
  if (options.liveTsOnly) {
    const ts = xtreamLiveTsVariant(url);
    if (ts) return [relay(ts, "streamnet")];
  }
  const attempts = urls.map((source) => relay(source, "streamnet"));
  if (options.resolverUrl) {
    for (const source of urls) {
      if (/\.m3u8?(?:$|[?#])/i.test(source)) {
        // Fetch manifests through the app, but route all segments to the worker.
        attempts.push(relay(source, "resolver"));
      }
    }
    for (const source of urls) {
      const target = new URL(
        `${options.resolverUrl.replace(/\/+$/, "")}/media`,
      );
      target.searchParams.set("url", source);
      target.searchParams.set("h", headers);
      attempts.push(target.toString());
    }
  }
  return [...new Set(attempts)];
}
