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
