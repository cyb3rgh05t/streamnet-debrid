const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.join(__dirname, "..", "lib", "continueWatching.ts"),
).href;

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
