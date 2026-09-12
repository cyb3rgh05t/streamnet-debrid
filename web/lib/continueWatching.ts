import type { MediaItem } from "./types";

type WatchedRow = {
  status?: string;
  last_watched_at?: string;
  movie?: { ids?: { tmdb?: number } };
  show?: { ids?: { tmdb?: number } };
  seasons?: {
    number: number;
    episodes?: { number: number; last_watched_at?: string }[];
  }[];
};

/** Only positive completion evidence can prune a saved rail during a partial outage. */
export function completionTimes(
  movies: unknown[],
  shows: unknown[],
): Map<string, number> {
  const times = new Map<string, number>();
  const add = (key: string, date?: string) =>
    times.set(key, Math.max(times.get(key) ?? 0, Date.parse(date ?? "") || 0));
  for (const raw of movies) {
    const row = raw as WatchedRow;
    const id = row.movie?.ids?.tmdb;
    if (id && (!row.status || row.status === "completed"))
      add(`movie:${id}`, row.last_watched_at);
  }
  for (const raw of shows) {
    const row = raw as WatchedRow;
    const id = row.show?.ids?.tmdb;
    if (!id) continue;
    for (const season of row.seasons ?? []) {
      for (const episode of season.episodes ?? []) {
        add(
          `tv:${id}:${season.number}:${episode.number}`,
          episode.last_watched_at,
        );
      }
    }
  }
  return times;
}

/** Exact episode completion wins unless the tracker explicitly reset progress later. */
export function pruneCompletedResume(
  items: MediaItem[],
  completions: Map<string, number>,
  activeResumeKeys: Set<string> = new Set(),
): MediaItem[] {
  const next = items.filter((item) => {
    const key =
      item.mediaType === "tv"
        ? `tv:${item.id}:${item.seasonNumber}:${item.episodeNumber}`
        : `movie:${item.id}`;
    if (activeResumeKeys.has(key)) return true;
    if (!completions.has(key)) return true;
    const completedAt = completions.get(key) ?? 0;
    if (
      item.mediaType === "tv" &&
      item.badge === "Up Next" &&
      completedAt > 0
    ) {
      // activityAt is the show's latest watch (possibly a DIFFERENT episode).
      // It must not make an already watched episode look like a new rewatch.
      return (item.progressResetAt ?? 0) > completedAt;
    }
    if (completedAt > 0) return (item.activityAt ?? 0) > completedAt;
    // Without a watch timestamp an old watched flag cannot disprove a reset Up Next.
    return item.badge === "Up Next";
  });
  return next.length === items.length ? items : next;
}

export function traktProgressActivityKey(raw: unknown): string {
  const row = raw as {
    last_watched_at?: string;
    last_updated_at?: string;
    reset_at?: string;
  };
  return [
    row.last_watched_at ?? "",
    row.last_updated_at ?? "",
    row.reset_at ?? "",
  ].join("|");
}

/** Timestamped history distinguishes stale Up Next from a real reset/rewatch. */
export function isUnwatchedContinueWatching(
  item: MediaItem,
  watchedKeys: Set<string>,
  completions?: Map<string, number>,
  activeResumeKeys: Set<string> = new Set(),
): boolean {
  const key =
    item.mediaType === "tv"
      ? `tv:${item.id}:${item.seasonNumber}:${item.episodeNumber}`
      : `movie:${item.id}`;
  if (activeResumeKeys.has(key)) return true;
  if (completions)
    return (
      pruneCompletedResume([item], completions, activeResumeKeys).length > 0
    );
  // Untimestamped badge flags alone cannot disprove a tracker progress reset.
  if (item.mediaType === "tv" && item.badge === "Up Next") return true;
  return !watchedKeys.has(key);
}

export function isPausedContinueWatchingItem(item: MediaItem): boolean {
  if (item.badge === "Up Next") return true;
  const progress = item.progress ?? 0;
  return progress >= 1 && progress < 90;
}

export function continueWatchingProgressPercent(
  positionSeconds: number,
  durationSeconds: number,
  storedProgress: number,
): number {
  const positionProgress =
    durationSeconds > 0
      ? Math.round(Math.min(1, positionSeconds / durationSeconds) * 100)
      : 0;
  const storedProgressPercent = Math.round(
    Math.min(1, Math.max(0, storedProgress)) * 100,
  );
  return Math.max(positionProgress, storedProgressPercent);
}

export function shouldShowContinueWatchingProgress(
  progressPercent: number,
  isUpNext: boolean,
): boolean {
  return !isUpNext && progressPercent >= 1 && progressPercent < 100;
}

export function preferActiveCloudResumeRecord<
  T extends { progress?: number; updatedAtMs?: number },
>(current: T | undefined, candidate: T): T {
  if (!current) return candidate;
  const currentProgress = Number(current.progress ?? 0);
  const candidateProgress = Number(candidate.progress ?? 0);
  const currentIsActive = currentProgress >= 1 && currentProgress < 90;
  const candidateIsActive = candidateProgress >= 1 && candidateProgress < 90;
  if (currentIsActive !== candidateIsActive) {
    return candidateIsActive ? candidate : current;
  }
  return Number(candidate.updatedAtMs ?? 0) > Number(current.updatedAtMs ?? 0)
    ? candidate
    : current;
}

/** Active cloud episodes win same-show arbitration before completion filtering. */
export function dedupeContinueWatchingShows(
  items: MediaItem[],
  activeResumeKeys: Set<string> = new Set(),
): MediaItem[] {
  const exactKey = (item: MediaItem) =>
    item.mediaType === "tv"
      ? `tv:${item.id}:${item.seasonNumber}:${item.episodeNumber}`
      : `movie:${item.id}`;
  const showKey = (item: MediaItem) => `${item.mediaType}:${item.id}`;
  const isNewer = (candidate: MediaItem, current: MediaItem) =>
    (candidate.activityAt ?? 0) > (current.activityAt ?? 0) ||
    ((candidate.activityAt ?? 0) === (current.activityAt ?? 0) &&
      ((candidate.resumePositionSeconds ?? 0) >
        (current.resumePositionSeconds ?? 0) ||
        ((candidate.resumePositionSeconds ?? 0) ===
          (current.resumePositionSeconds ?? 0) &&
          (candidate.progress ?? 0) > (current.progress ?? 0))));
  const newestByShow = new Map<string, MediaItem>();
  for (const item of items) {
    const key = showKey(item);
    const current = newestByShow.get(key);
    if (!current) {
      newestByShow.set(key, item);
      continue;
    }
    const itemIsActive = activeResumeKeys.has(exactKey(item));
    const currentIsActive = activeResumeKeys.has(exactKey(current));
    if (
      (itemIsActive && !currentIsActive) ||
      (itemIsActive === currentIsActive && isNewer(item, current))
    ) {
      newestByShow.set(key, item);
    }
  }
  return [...newestByShow.values()].sort(
    (a, b) => (b.activityAt ?? 0) - (a.activityAt ?? 0),
  );
}

export function preserveActiveCloudResumes(
  items: MediaItem[],
  cloudItems: MediaItem[],
  activeResumeKeys: Set<string>,
): MediaItem[] {
  const activeCloudItems = cloudItems.filter((item) => {
    const key =
      item.mediaType === "tv"
        ? `tv:${item.id}:${item.seasonNumber}:${item.episodeNumber}`
        : `movie:${item.id}`;
    return activeResumeKeys.has(key) && isPausedContinueWatchingItem(item);
  });
  return dedupeContinueWatchingShows(
    [...items, ...activeCloudItems],
    activeResumeKeys,
  );
}

/** A stale pause on a watched episode must not suppress the show's next episode. */
export function mergeTrackerContinueWatching(
  playback: MediaItem[],
  upNext: MediaItem[],
  watchedKeys: Set<string>,
  completions?: Map<string, number>,
): MediaItem[] {
  const unwatched = completions
    ? pruneCompletedResume(playback, completions)
    : playback.filter(
        (item) =>
          !watchedKeys.has(
            item.mediaType === "tv"
              ? `tv:${item.id}:${item.seasonNumber}:${item.episodeNumber}`
              : `movie:${item.id}`,
          ),
      );
  const pausedShows = new Set(
    unwatched.filter((item) => item.mediaType === "tv").map((item) => item.id),
  );
  return [...unwatched, ...upNext.filter((item) => !pausedShows.has(item.id))];
}

/** Failed progress requests must not erase unrelated saved shows. Fresh results win per show. */
export function mergePartialContinueWatching(
  fresh: MediaItem[],
  cached: MediaItem[],
  completions: Map<string, number>,
): MediaItem[] {
  const seen = new Set(fresh.map((item) => `${item.mediaType}:${item.id}`));
  const remaining = pruneCompletedResume(cached, completions).filter((item) => {
    const key = `${item.mediaType}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...fresh, ...remaining].sort(
    (a, b) => (b.activityAt ?? 0) - (a.activityAt ?? 0),
  );
}

/** Tracker list membership must not discard saved IPTV VOD sessions. */
export function includeIptvContinueWatching(
  primary: MediaItem[],
  local: MediaItem[],
): MediaItem[] {
  const key = (item: MediaItem) => `${item.mediaType}:${item.id}`;
  const primaryKeys = new Set(primary.map(key));
  const newest = new Map<string, MediaItem>();
  for (const item of local) {
    const previous = newest.get(key(item));
    if (!previous || (item.activityAt ?? 0) > (previous.activityAt ?? 0))
      newest.set(key(item), item);
  }
  const additions = [...newest.values()].filter((item) => {
    const progress = item.progress ?? 0;
    const position = item.resumePositionSeconds ?? 0;
    const duration = item.durationSeconds ?? 0;
    return (
      !primaryKeys.has(key(item)) &&
      item.id > 0 &&
      item.streamAddonId?.trim().toLowerCase() === "iptv_xtream_vod" &&
      !/^(live:|\[live\])/i.test(item.title) &&
      !item.isWatched &&
      progress < 90 &&
      (duration <= 0 || position / duration < 0.9) &&
      (progress >= 1 || position >= 60)
    );
  });
  return [...primary, ...additions].sort(
    (a, b) => (b.activityAt ?? 0) - (a.activityAt ?? 0),
  );
}

export function filterDismissedContinueWatching(
  items: MediaItem[],
  dismissals: Map<string, number>,
): MediaItem[] {
  if (!items.length || !dismissals.size) return items;
  const filtered = items.filter((item) => {
    const showKey = `${item.mediaType}:${item.id}`;
    const exactKey =
      item.mediaType === "tv" &&
      item.seasonNumber != null &&
      item.episodeNumber != null
        ? `${showKey}:${item.seasonNumber}:${item.episodeNumber}`
        : showKey;
    const dismissedAt = Math.max(
      dismissals.get(showKey) ?? 0,
      dismissals.get(exactKey) ?? 0,
    );
    return dismissedAt === 0 || (item.activityAt ?? 0) > dismissedAt;
  });
  return filtered.length === items.length ? items : filtered;
}
