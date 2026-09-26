const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.join(__dirname, "..", "lib", "continueWatching.ts"),
).href;

test("recently watched uses the watch time, not the watchlist date", async () => {
  const { traktItemToMedia, traktWatchedToMedia } = await import(
    pathToFileURL(path.join(__dirname, "..", "lib", "mappers.ts")).href
  );
  const row = {
    movie: { title: "Film", ids: { tmdb: 123 } },
    listed_at: "2020-01-01T00:00:00Z",
    last_watched_at: "2026-09-26T12:00:00Z",
  };

  assert.equal(traktItemToMedia(row).activityAt, Date.parse(row.listed_at));
  assert.equal(
    traktWatchedToMedia(row).activityAt,
    Date.parse(row.last_watched_at),
  );
});

test("cloud dismissals prune stale cached Continue Watching items", async () => {
  const { filterDismissedContinueWatching } = await import(moduleUrl);
  const stale = {
    id: 123,
    mediaType: "tv",
    seasonNumber: 1,
    episodeNumber: 1,
    activityAt: 1_000,
  };
  const rewatched = { ...stale, activityAt: 3_000 };
  const dismissals = new Map([["tv:123", 2_000]]);

  assert.deepEqual(filterDismissedContinueWatching([stale], dismissals), []);
  assert.deepEqual(filterDismissedContinueWatching([rewatched], dismissals), [
    rewatched,
  ]);
});

test("episode dismissal does not hide a different episode", async () => {
  const { filterDismissedContinueWatching } = await import(moduleUrl);
  const dismissedEpisode = {
    id: 123,
    mediaType: "tv",
    seasonNumber: 1,
    episodeNumber: 1,
    activityAt: 1_000,
  };
  const nextEpisode = {
    ...dismissedEpisode,
    episodeNumber: 2,
  };
  const dismissals = new Map([["tv:123:1:1", 2_000]]);

  assert.deepEqual(
    filterDismissedContinueWatching(
      [dismissedEpisode, nextEpisode],
      dismissals,
    ),
    [nextEpisode],
  );
});

test("one percent progress is eligible for Continue Watching", async () => {
  const { isPausedContinueWatchingItem } = await import(moduleUrl);

  assert.equal(isPausedContinueWatchingItem({ progress: 0 }), false);
  assert.equal(isPausedContinueWatchingItem({ progress: 1 }), true);
  assert.equal(isPausedContinueWatchingItem({ progress: 89 }), true);
  assert.equal(isPausedContinueWatchingItem({ progress: 90 }), false);
});

test("a real resume position still counts as active even when rounded progress is 0%", async () => {
  const { isPausedContinueWatchingItem } = await import(moduleUrl);

  // Very short taps (a few seconds) stay excluded as accidental starts, but a
  // real ~10s+ resume position must not vanish just because long content
  // rounds the percentage down to 0%.
  assert.equal(
    isPausedContinueWatchingItem({ progress: 0, resumePositionSeconds: 5 }),
    false,
  );
  assert.equal(
    isPausedContinueWatchingItem({ progress: 0, resumePositionSeconds: 10 }),
    true,
  );
});

test("active resume progress renders even when watched state is stale", async () => {
  const { shouldShowContinueWatchingProgress } = await import(moduleUrl);

  assert.equal(shouldShowContinueWatchingProgress(3, false), true);
  assert.equal(shouldShowContinueWatchingProgress(0, false), false);
  assert.equal(shouldShowContinueWatchingProgress(100, false), false);
  assert.equal(shouldShowContinueWatchingProgress(40, true), false);
  // A meaningful resume position renders the bar (as a sliver) even at 0%.
  assert.equal(shouldShowContinueWatchingProgress(0, false, true), true);
});

test("stored cloud progress survives placeholder playback timing", async () => {
  const { continueWatchingProgressPercent } = await import(moduleUrl);

  assert.equal(continueWatchingProgressPercent(0, 1, 0.03), 3);
  assert.equal(continueWatchingProgressPercent(4357, 7670, 0.57), 57);
});

test("completed episode advances within the current season", async () => {
  const { nextEpisodeAfter } = await import(moduleUrl);
  const show = {
    mediaType: "tv",
    seasons: [{ seasonNumber: 1, episodeCount: 10 }],
  };

  assert.deepEqual(nextEpisodeAfter(show, 1, 4), { season: 1, episode: 5 });
});

test("completed season advances to the first episode of the next season", async () => {
  const { nextEpisodeAfter } = await import(moduleUrl);
  const show = {
    mediaType: "tv",
    seasons: [
      { seasonNumber: 1, episodeCount: 10 },
      { seasonNumber: 2, episodeCount: 8 },
    ],
  };

  assert.deepEqual(nextEpisodeAfter(show, 1, 10), { season: 2, episode: 1 });
  assert.equal(nextEpisodeAfter(show, 2, 8), null);
});

test("episode badges use exact keys so unwatching an earlier episode sticks", async () => {
  const { isWatchedShowEpisode } = await import(moduleUrl);

  const watchedKeys = new Set(["tv:123:2:7", "tv:123:2:9"]);
  assert.equal(
    isWatchedShowEpisode(
      { id: 123, mediaType: "tv", seasonNumber: 2, episodeNumber: 8 },
      watchedKeys,
    ),
    false,
  );
  assert.equal(
    isWatchedShowEpisode(
      { id: 123, mediaType: "tv", seasonNumber: 2, episodeNumber: 9 },
      watchedKeys,
    ),
    true,
  );
  assert.equal(
    isWatchedShowEpisode(
      { id: 123, mediaType: "tv", seasonNumber: 2, episodeNumber: 10 },
      watchedKeys,
    ),
    false,
  );
});

test("partial season episode keys never collapse into show-wide watched state", async () => {
  const { isWatchedShowEpisode } = await import(moduleUrl);

  const show = { id: 123, mediaType: "tv" };
  const watchedKeys = new Set(["tv:123:2:7"]);

  assert.equal(isWatchedShowEpisode(show, watchedKeys), false);
  assert.equal(
    isWatchedShowEpisode({ ...show, seasonNumber: 2 }, watchedKeys),
    false,
  );
  assert.equal(
    isWatchedShowEpisode(
      { ...show, seasonNumber: 2, episodeNumber: 7 },
      watchedKeys,
    ),
    true,
  );
});

test("a series is watched only when every known non-special episode is watched", async () => {
  const { isWatchedShowEpisode } = await import(moduleUrl);
  const show = {
    id: 123,
    mediaType: "tv",
    seasons: [
      { seasonNumber: 1, episodeCount: 2 },
      { seasonNumber: 2, episodeCount: 1 },
    ],
  };
  const keys = new Set(["tv:123:1:1", "tv:123:1:2"]);

  assert.equal(isWatchedShowEpisode(show, keys), false);
  keys.add("tv:123:2:1");
  assert.equal(isWatchedShowEpisode(show, keys), true);
  keys.delete("tv:123:1:1");
  assert.equal(isWatchedShowEpisode(show, keys), false);
});

test("Trakt progress contributes completed season episodes to detail badges", async () => {
  const { watchedKeysFromShowProgress } = await import(moduleUrl);
  const watchedKeys = watchedKeysFromShowProgress(123, {
    aired: 24,
    completed: 17,
    seasons: [
      { number: 1, completed: 8 },
      { number: 2, completed: 8 },
      { number: 3, completed: 1 },
    ],
  });

  assert.equal(watchedKeys.has("tv:123:1:8"), true);
  assert.equal(watchedKeys.has("tv:123:2:8"), true);
  assert.equal(watchedKeys.has("tv:123:3:1"), true);
  assert.equal(watchedKeys.has("tv:123:3:2"), false);
  assert.equal(watchedKeys.has("tv:123"), false);
});

test("active cloud movie resume survives tracker completion", async () => {
  const { pruneCompletedResume } = await import(moduleUrl);
  const item = {
    id: 9481,
    mediaType: "movie",
    activityAt: 2_000,
    progress: 46,
  };

  assert.deepEqual(
    pruneCompletedResume(
      [item],
      new Map([["movie:9481", 3_000]]),
      new Set(["movie:9481"]),
    ),
    [item],
  );
});

test("active cloud episode resume survives tracker completion", async () => {
  const { isUnwatchedContinueWatching } = await import(moduleUrl);
  const item = {
    id: 95350,
    mediaType: "tv",
    seasonNumber: 1,
    episodeNumber: 1,
    activityAt: 2_000,
    progress: 3,
  };
  const key = "tv:95350:1:1";

  assert.equal(
    isUnwatchedContinueWatching(
      item,
      new Set([key]),
      new Map([[key, 3_000]]),
      new Set([key]),
    ),
    true,
  );
});

test("active cloud episode wins over a different Trakt episode for the same show", async () => {
  const { dedupeContinueWatchingShows } = await import(moduleUrl);
  const cloudResume = {
    id: 95350,
    mediaType: "tv",
    seasonNumber: 1,
    episodeNumber: 1,
    activityAt: 2_000,
    progress: 3,
  };
  const newerTraktUpNext = {
    ...cloudResume,
    episodeNumber: 2,
    activityAt: 3_000,
    progress: 0,
    badge: "Up Next",
  };

  assert.deepEqual(
    dedupeContinueWatchingShows(
      [newerTraktUpNext, cloudResume],
      new Set(["tv:95350:1:1"]),
    ),
    [cloudResume],
  );
});

test("final reconciliation restores active cloud episodes omitted upstream", async () => {
  const { preserveActiveCloudResumes } = await import(moduleUrl);
  const lanterns = {
    id: 95350,
    mediaType: "tv",
    seasonNumber: 1,
    episodeNumber: 1,
    activityAt: 2_000,
    progress: 3,
  };
  const bull = {
    id: 66840,
    mediaType: "tv",
    seasonNumber: 5,
    episodeNumber: 3,
    activityAt: 1_000,
    progress: 3,
  };
  const activeKeys = new Set(["tv:95350:1:1", "tv:66840:5:3"]);

  assert.deepEqual(
    preserveActiveCloudResumes([], [lanterns, bull], activeKeys),
    [lanterns, bull],
  );
});

test("watchlist merges cloud and tracker items without duplicate titles", async () => {
  const { mergeWatchlistItems } = await import(moduleUrl);
  const cloudOnly = {
    id: 10,
    mediaType: "movie",
    title: "Cloud only",
    activityAt: 2_000,
  };
  const cloudShared = {
    id: 20,
    mediaType: "tv",
    title: "Cloud title",
    activityAt: 1_000,
  };
  const trackerShared = {
    ...cloudShared,
    title: "Tracker title",
    activityAt: 3_000,
  };

  assert.deepEqual(
    mergeWatchlistItems([cloudOnly, cloudShared], [trackerShared]),
    [trackerShared, cloudOnly],
  );
});

test("active cloud resume wins over newer completed history for the same title", async () => {
  const { preferActiveCloudResumeRecord } = await import(moduleUrl);
  const activeBull = {
    id: 66840,
    mediaType: "TV",
    progress: 69,
    updatedAtMs: 2_000,
  };
  const completedBull = {
    ...activeBull,
    progress: 100,
    updatedAtMs: 3_000,
  };

  assert.deepEqual(
    preferActiveCloudResumeRecord(activeBull, completedBull),
    activeBull,
  );
  assert.deepEqual(
    preferActiveCloudResumeRecord(completedBull, activeBull),
    activeBull,
  );
});
