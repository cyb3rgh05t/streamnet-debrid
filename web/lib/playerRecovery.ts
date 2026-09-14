/**
 * Mid-playback stall recovery.
 *
 * The player used to have no recovery once playback had started: the two
 * startup watchdogs only check `readyState` and stop caring the moment the
 * first frame arrives, and the "connection can't keep up" handler needed three
 * stalls inside 90s AND a strictly smaller alternative source before it did
 * anything. With one source, an equal-sized source, or a source whose size is
 * unknown — all common — it returned silently and the video buffered forever
 * with no message and no way to continue.
 *
 * The rules live here rather than inline in the overlay so the escalation order
 * can be unit tested instead of only reproduced by stalling a real stream.
 */

/** How long a stall may last before each step of the ladder is attempted. */
export const NUDGE_AFTER_MS = 6_000;
export const RELOAD_AFTER_MS = 14_000;
export const ESCALATE_AFTER_MS = 24_000;

export type StallAction =
  /** Still inside the grace window — keep waiting. */
  | { kind: "wait" }
  /** Seek a hair forward: unwedges a decoder parked on a bad sample. */
  | { kind: "nudge"; seekTo: number }
  /** Re-attach the same source and resume at the saved position. */
  | { kind: "reload"; resumeAt: number }
  /** Give up on this URL and move down the source ladder. */
  | { kind: "escalate"; resumeAt: number };

export interface StallState {
  /** ms the video has been stalled (not advancing while trying to play). */
  stalledForMs: number;
  /** Playback position to resume from. */
  currentTime: number;
  /** Steps already taken for this stall, so each runs at most once. */
  nudged: boolean;
  reloaded: boolean;
}

/**
 * Next recovery step for a stall.
 *
 * Escalating rather than repeating matters: a nudge fixes a wedged decoder, a
 * reload fixes a dead connection or an expired debrid link, and only after both
 * fail is the source itself likely at fault. Each step is attempted once per
 * stall so a persistent stall walks the ladder instead of looping on the
 * cheapest fix.
 */
export function nextStallAction(state: StallState): StallAction {
  const { stalledForMs, currentTime, nudged, reloaded } = state;

  if (!nudged && stalledForMs >= NUDGE_AFTER_MS) {
    // Forward, never backward: seeking back can re-enter the same bad region.
    return { kind: "nudge", seekTo: currentTime + 0.35 };
  }
  if (!reloaded && stalledForMs >= RELOAD_AFTER_MS) {
    return { kind: "reload", resumeAt: currentTime };
  }
  if (stalledForMs >= ESCALATE_AFTER_MS) {
    return { kind: "escalate", resumeAt: currentTime };
  }
  return { kind: "wait" };
}

/**
 * Whether playback counts as stalled.
 *
 * `waiting` alone is not enough — it also fires for ordinary rebuffering that
 * recovers on its own, and for a deliberate seek. A stall is "we want to be
 * playing, and the clock has not moved".
 */
export function isStalled(opts: {
  paused: boolean;
  seeking: boolean;
  ended: boolean;
  currentTime: number;
  lastProgressTime: number;
}): boolean {
  const { paused, seeking, ended, currentTime, lastProgressTime } = opts;
  if (paused || seeking || ended) return false;
  return currentTime <= lastProgressTime;
}

/** Detect audio advancing without video, including streams with known dimensions. */
export function monitorVideoFrames(
  video: HTMLVideoElement,
  onMissing: () => void,
): () => void {
  let stopped = false;
  let frame: number | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let lastTime = video.currentTime;
  let lastCheck = Date.now();
  let framelessPlayingMs = 0;
  let presented = false;
  const stop = () => {
    stopped = true;
    if (timer !== undefined) clearInterval(timer);
    if (frame !== undefined) video.cancelVideoFrameCallback?.(frame);
  };
  const decodedFrame = () => {
    try {
      const quality = video.getVideoPlaybackQuality?.();
      return (
        quality && quality.totalVideoFrames - quality.droppedVideoFrames > 0
      );
    } catch {
      return false;
    }
  };
  if (video.requestVideoFrameCallback) {
    frame = video.requestVideoFrameCallback(() => {
      presented = true;
      stop();
    });
  }
  timer = setInterval(() => {
    if (stopped) return;
    if (presented || decodedFrame()) {
      stop();
      return;
    }
    const now = Date.now();
    const advancing = video.currentTime > lastTime;
    const elapsed = Math.min(2000, Math.max(0, now - lastCheck));
    lastCheck = now;
    lastTime = video.currentTime;
    // Background tabs may intentionally stop presenting frames. Pauses, seeks
    // and ordinary buffering must not consume the missing-video grace period.
    if (
      document.visibilityState === "hidden" ||
      video.paused ||
      video.seeking ||
      video.ended ||
      !advancing
    ) {
      framelessPlayingMs = 0;
      return;
    }
    const hasFrameTelemetry =
      !!video.requestVideoFrameCallback || !!video.getVideoPlaybackQuality;
    if (!hasFrameTelemetry && video.videoWidth > 0) {
      stop();
      return;
    }
    framelessPlayingMs += elapsed;
    if (framelessPlayingMs >= 12000) {
      stop();
      onMissing();
    }
  }, 1500);
  return stop;
}

// One tap per <video> element, reused across source reloads on the same
// element — a second createMediaElementSource() call on the same element
// throws, and the element persists across attachPlayback() reattachments.
const audioTaps = new WeakMap<
  HTMLVideoElement,
  { ctx: AudioContext; analyser: AnalyserNode }
>();

/**
 * Detect a video that is decoding and rendering frames while its audio track
 * never produces sound.
 *
 * Many IPTV panels and scene releases carry AC-3/E-AC-3/DTS audio with no
 * codec hint anywhere in the channel name, filename or description — the
 * text-based heuristics in streamCompatibility.ts wave these through as
 * "direct playable", so the browser plays the video track and silently drops
 * the audio track it cannot decode. No `error` event fires because the
 * element is, technically, playing successfully. An `AnalyserNode` tapped
 * onto the element's real output is the only way to tell "no audio track" and
 * "audio track nobody can hear" apart.
 */
export function monitorSilentAudio(
  video: HTMLVideoElement,
  onSilent: () => void,
): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  let silentMs = 0;
  let lastCheck = Date.now();
  const stop = () => {
    stopped = true;
    if (timer !== undefined) clearInterval(timer);
  };
  let analyser: AnalyserNode;
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return stop;
    let tap = audioTaps.get(video);
    if (!tap) {
      const ctx = new AudioCtx();
      const node = ctx.createAnalyser();
      node.fftSize = 512;
      // Route through the analyser so the tap never mutes the element:
      // .volume/.muted on the source element still apply upstream of it.
      ctx
        .createMediaElementSource(video)
        .connect(node)
        .connect(ctx.destination);
      tap = { ctx, analyser: node };
      audioTaps.set(video, tap);
    }
    analyser = tap.analyser;
    if (tap.ctx.state === "suspended")
      void tap.ctx.resume().catch(() => undefined);
  } catch {
    // Autoplay-gated AudioContext, an already-tapped element from another
    // caller, or a browser without Web Audio — never block playback for this.
    return stop;
  }
  const data = new Uint8Array(analyser.fftSize);
  timer = setInterval(() => {
    if (stopped) return;
    const now = Date.now();
    const elapsed = Math.min(2000, Math.max(0, now - lastCheck));
    lastCheck = now;
    if (
      document.visibilityState === "hidden" ||
      video.paused ||
      video.seeking ||
      video.ended ||
      video.muted ||
      video.volume === 0
    ) {
      silentMs = 0;
      return;
    }
    analyser.getByteTimeDomainData(data);
    let peak = 0;
    for (let i = 0; i < data.length; i += 1)
      peak = Math.max(peak, Math.abs(data[i] - 128));
    if (peak > 2) {
      silentMs = 0;
      return;
    } // Real signal, above quantization noise floor.
    silentMs += elapsed;
    if (silentMs >= 8000) {
      stop();
      onSilent();
    }
  }, 1000);
  return stop;
}

/**
 * Total buffered seconds ahead of the playhead.
 *
 * The overlay previously read only `buffered.end(length - 1)` — the end of the
 * LAST range — which misreports badly after seeking backwards, when the range
 * containing the playhead is no longer the last one.
 */
export function bufferedAhead(
  ranges: TimeRanges | null,
  currentTime: number,
): number {
  if (!ranges) return 0;
  for (let i = 0; i < ranges.length; i += 1) {
    if (currentTime >= ranges.start(i) && currentTime <= ranges.end(i)) {
      return Math.max(0, ranges.end(i) - currentTime);
    }
  }
  return 0;
}

/**
 * What a MediaError means for the source.
 *
 * The player used to treat every failure identically, so a momentary network
 * drop was punished exactly like an undecodable codec: walk the ladder, declare
 * the source unplayable, hop away. They need opposite responses — a network
 * fault is worth retrying on the same source, a decode fault never is.
 *
 * Codes are the MediaError constants (1 aborted, 2 network, 3 decode,
 * 4 src-not-supported).
 */
export type MediaFaultKind = "retryable" | "fatal";

export function classifyMediaError(
  code: number | null | undefined,
): MediaFaultKind {
  // DECODE (3) and SRC_NOT_SUPPORTED (4) mean this browser genuinely cannot
  // play these bytes; retrying the same URL will fail the same way.
  if (code === 3 || code === 4) return "fatal";
  // Missing/unknown codes, NETWORK (2), and ABORTED (1) are not evidence of an
  // unsupported codec. Adaptive engines often fail without setting video.error.
  return "retryable";
}

/** End of the buffered range holding the playhead, for the scrubber's buffer bar. */
export function bufferedEndAt(
  ranges: TimeRanges | null,
  currentTime: number,
): number {
  if (!ranges) return 0;
  for (let i = 0; i < ranges.length; i += 1) {
    if (currentTime >= ranges.start(i) && currentTime <= ranges.end(i)) {
      return ranges.end(i);
    }
  }
  return 0;
}
