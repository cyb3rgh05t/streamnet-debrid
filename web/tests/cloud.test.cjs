const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/cloud.ts"),
).href;

test("Android Poster setting maps to the web poster layout", async () => {
  const { settingsFromAndroidProfile } = await import(moduleUrl);

  assert.equal(
    settingsFromAndroidProfile({ cardLayoutMode: "Poster" }).cardLayoutMode,
    "poster",
  );
  assert.equal(
    settingsFromAndroidProfile({ cardLayoutMode: "Landscape" }).cardLayoutMode,
    "landscape",
  );
  assert.deepEqual(
    settingsFromAndroidProfile({
      catalogueRowLayoutModes: {
        "home:trending_movies": "Poster",
        "home:recently_watched_movies": "Landscape",
      },
    }).catalogueRowLayoutModes,
    {
      "home:trending_movies": "poster",
      "home:recently_watched_movies": "landscape",
    },
  );
});

test("cloud watched changes distinguish recent watches from later removals", async () => {
  const { watchedStateFromPayload } = await import(moduleUrl);
  const state = watchedStateFromPayload(
    {
      localWatchedMoviesByProfile: { profile: [123] },
      localWatchedEpisodesByProfile: { profile: ["show_tmdb:45:2:7"] },
      localWatchedMovieChangesByProfile: { profile: "123,1000|456,2000" },
      localWatchedEpisodeChangesByProfile: {
        profile: "show_tmdb:45:2:7,3000|show_tmdb:45:2:8,4000",
      },
    },
    "profile",
  );

  assert.deepEqual([...state.keys], ["movie:123", "tv:45:2:7"]);
  assert.equal(state.activityAt.get("movie:123"), 1000);
  assert.equal(state.activityAt.get("tv:45:2:7"), 3000);
  assert.equal(state.removedAt.get("movie:456"), 2000);
  assert.equal(state.removedAt.get("tv:45:2:8"), 4000);
});

test("batch watched writes affect only selected episodes and record removal times", async () => {
  const { updateWatchedEpisodesInPayload, watchedStateFromPayload } =
    await import(moduleUrl);
  const root = {
    localWatchedEpisodesByProfile: { profile: ["show_tmdb:45:2:7"] },
    localContinueWatchingByProfile: {
      profile: [
        { id: 45, mediaType: "TV", season: 2, episode: 7 },
        { id: 45, mediaType: "TV", season: 3, episode: 1 },
      ],
    },
  };

  updateWatchedEpisodesInPayload(
    root,
    "profile",
    45,
    [
      { seasonNumber: 2, episodeNumber: 7 },
      { seasonNumber: 2, episodeNumber: 8 },
    ],
    true,
    2000,
  );
  assert.deepEqual(root.localContinueWatchingByProfile.profile, [
    { id: 45, mediaType: "TV", season: 3, episode: 1 },
  ]);
  updateWatchedEpisodesInPayload(
    root,
    "profile",
    45,
    [{ seasonNumber: 2, episodeNumber: 7 }],
    false,
    3000,
  );
  const state = watchedStateFromPayload(root, "profile");
  assert.deepEqual([...state.keys], ["tv:45:2:8"]);
  assert.equal(state.removedAt.get("tv:45:2:7"), 3000);
});

test("an empty Android home server value clears the web home servers", async () => {
  const { settingsFromAndroidProfile } = await import(moduleUrl);

  assert.deepEqual(
    settingsFromAndroidProfile({ homeServerConnectionJson: "" }),
    { homeServers: [] },
  );
});

test("an Android home server value still maps to web settings", async () => {
  const { settingsFromAndroidProfile } = await import(moduleUrl);

  assert.deepEqual(
    settingsFromAndroidProfile({
      homeServerConnectionJson: JSON.stringify({
        connections: [
          {
            connectionId: "server-1",
            serverKind: "JELLYFIN",
            serverUrl: "https://media.example",
            serverName: "Media",
            accessToken: "token",
          },
        ],
      }),
    }).homeServers,
    [
      {
        id: "server-1",
        type: "jellyfin",
        name: "Media",
        url: "https://media.example",
        token: "token",
        username: undefined,
        password: undefined,
        enabled: true,
        serverId: undefined,
        userId: undefined,
        userName: undefined,
        accountToken: undefined,
        collections: undefined,
        lastConnectedAt: undefined,
      },
    ],
  );
});
