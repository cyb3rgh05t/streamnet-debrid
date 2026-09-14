import {
  cachedDebridDirectUrl,
  parseDebridStream,
  resolveDebridDirectUrl,
  resolveTranscodeStream,
} from "./debrid";
import {
  playbackPlan,
  canProviderTranscode,
  canTryRemux,
  videoDecodableForDevice,
  recordBrowserPlaybackFailure,
} from "./streamCompatibility";
import { prepareHomeServerPlayback } from "./homeServerPlayback";
import {
  canSelfTranscode,
  createServerTranscodeSession,
  probeServerMedia,
  probeSelfTranscodeDuration,
} from "./resolver";
import type { AppSettings, StreamSource } from "./types";

export type PreparePlaybackOptions = {
  forceRemux?: boolean;
  forceTranscode?: boolean;
  forceSelfTranscode?: boolean;
  forceServerTranscode?: boolean;
  signal?: AbortSignal;
};

export async function prepareBrowserStream(
  stream: StreamSource,
  settings: AppSettings,
  options: PreparePlaybackOptions = {},
): Promise<StreamSource> {
  const check = () => {
    if (options.signal?.aborted)
      throw new DOMException("Playback cancelled", "AbortError");
  };
  check();
  if (!stream.url) throw new Error("This source has no playback URL");
  // Last-resort fallback: neither the browser nor the in-browser WebCodecs
  // remux could produce audio for this source. Re-encode audio to AAC on our
  // own server (web/app/api/transcode/route.ts) and play the plain result.
  if (options.forceSelfTranscode || options.forceServerTranscode) {
    if (stream.transcoded)
      throw new Error(
        "Server conversion was already attempted. Use an external player.",
      );
    const startSeconds = stream.resumePositionSeconds ?? 0;
    const sourceUrl = stream.url;
    const originalUrl = stream.originalUrl ?? sourceUrl;
    const session = await createServerTranscodeSession(
      sourceUrl,
      stream.behaviorHints?.proxyHeaders?.request,
      startSeconds,
    );
    if (!session)
      throw new Error("This source cannot be converted by our own server.");
    check();
    // The known total duration is the ONLY way Continue Watching progress
    // can be computed for this stream — `video.duration` never becomes
    // finite while it's being streamed live from ffmpeg (see PlayerOverlay's
    // capturePosition). Best-effort: playback still works if this fails.
    const knownDurationSeconds =
      stream.transport === "mpegts"
        ? null
        : await probeSelfTranscodeDuration(
            sourceUrl,
            stream.behaviorHints?.proxyHeaders?.request,
          ).catch(() => null);
    check();
    return {
      ...stream,
      url: new URL(session.url, window.location.origin).toString(),
      originalUrl,
      remux: false,
      transcoded: true,
      transport: "hls",
      media: undefined,
      selfTranscodeStartOffset: session.startSeconds,
      knownDurationSeconds: knownDurationSeconds ?? undefined,
      behaviorHints: {
        ...stream.behaviorHints,
        notWebReady: false,
        proxyHeaders: undefined,
      },
    };
  }
  if (stream.homeServer) {
    return prepareHomeServerPlayback(stream, settings, {
      forceTranscode: options.forceTranscode || options.forceRemux,
      signal: options.signal,
    });
  }
  // The converted HLS URL is already the provider's browser output. Reopening
  // it must not reclassify the original filename (DV/TrueHD/MKV) or start another
  // conversion. Explicitly reselecting the original source permits a new try.
  if (stream.transcoded) {
    if (options.forceRemux || options.forceTranscode)
      throw new Error(
        "Provider conversion was already attempted. Choose another source or use an external player.",
      );
    return { ...stream, remux: false };
  }
  if (
    !options.forceRemux &&
    !options.forceTranscode &&
    !options.forceServerTranscode &&
    stream.transport !== "hls" &&
    stream.transport !== "dash" &&
    canSelfTranscode(stream.url)
  ) {
    const probe = await probeServerMedia(
      stream.url,
      stream.behaviorHints?.proxyHeaders?.request,
    );
    check();
    const audio = (probe?.audioCodecs ?? []).map((codec) =>
      codec.toLowerCase(),
    );
    const container = (probe?.container ?? "").toLowerCase();
    const needsServerAudio = audio.some((codec) =>
      /^(ac3|eac3|dts|truehd|mlp)$/.test(codec),
    );
    const needsServerContainer =
      stream.transport === "mpegts" || /(^|,)mpegts(,|$)/.test(container);
    if (needsServerAudio || needsServerContainer)
      return prepareBrowserStream(stream, settings, {
        ...options,
        forceServerTranscode: true,
      });
  }
  const plan = playbackPlan(stream);
  const debrid = parseDebridStream(stream.originalUrl ?? stream.url);
  if (options.forceTranscode || plan.method === "transcode") {
    if (!debrid || !canProviderTranscode(stream))
      throw new Error(
        "This source cannot be converted by its provider. Use an external player.",
      );
    const result = await resolveTranscodeStream(debrid);
    check();
    if (!result.url) {
      const reason = result.error ?? "Server conversion is unavailable";
      if (
        /not supported|unsupported|permission|forbidden|subscription|premium|pro plan|not available|unavailable/i.test(
          reason,
        )
      ) {
        recordBrowserPlaybackFailure(
          stream,
          `Provider conversion is unavailable: ${reason}`,
          true,
        );
      }
      throw new Error(reason);
    }
    return {
      ...stream,
      url: result.url,
      originalUrl: stream.originalUrl ?? stream.url,
      remux: false,
      transcoded: true,
      transport: "hls",
      media: undefined,
      // The original addon's headers do not belong to the provider's signed
      // HLS URL. They also force iPad playback off the native HLS path.
      behaviorHints: {
        ...stream.behaviorHints,
        notWebReady: false,
        proxyHeaders: undefined,
      },
    };
  }
  // Remux can extract a verified HDR10 base, but cannot convert profile 5 colours.
  if (
    plan.route !== "here" &&
    (!options.forceRemux || !videoDecodableForDevice(stream))
  )
    throw new Error(plan.detail || "This format requires an external player");
  const remux =
    !!options.forceRemux ||
    plan.method === "remux" ||
    (Object.keys(stream.behaviorHints?.proxyHeaders?.request ?? {}).length >
      0 &&
      canTryRemux(stream));
  const cached = cachedDebridDirectUrl(stream.originalUrl ?? stream.url);
  let url = cached ?? stream.url;
  if (debrid && remux && !cached) {
    const result = await resolveDebridDirectUrl(debrid);
    check();
    if (!result.url)
      throw new Error(
        result.error ?? "The provider could not resolve this source",
      );
    url = result.url;
  }
  return {
    ...stream,
    url,
    originalUrl:
      stream.originalUrl ?? (url !== stream.url ? stream.url : undefined),
    remux,
  };
}
