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

/**
 * Total buffered seconds ahead of the playhead.
 *
 * The overlay previously read only `buffered.end(length - 1)` — the end of the
 * LAST range — which misreports badly after seeking backwards, when the range
 * containing the playhead is no longer the last one.
 */
export function bufferedAhead(ranges: TimeRanges | null, currentTime: number): number {
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

export function classifyMediaError(code: number | null | undefined): MediaFaultKind {
  // NETWORK (2) and ABORTED (1) say nothing about whether the browser can play
  // this content — the bytes just stopped arriving.
  if (code === 1 || code === 2) return "retryable";
  // DECODE (3) and SRC_NOT_SUPPORTED (4) mean this browser genuinely cannot
  // play these bytes; retrying the same URL will fail the same way.
  return "fatal";
}

/** End of the buffered range holding the playhead, for the scrubber's buffer bar. */
export function bufferedEndAt(ranges: TimeRanges | null, currentTime: number): number {
  if (!ranges) return 0;
  for (let i = 0; i < ranges.length; i += 1) {
    if (currentTime >= ranges.start(i) && currentTime <= ranges.end(i)) {
      return ranges.end(i);
    }
  }
  return 0;
}
