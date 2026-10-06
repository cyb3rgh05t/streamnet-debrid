const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/cloud.ts"),
).href;

test("cloud history cannot leak another profile when a legacy backend returns all rows", async (t) => {
  const { pullCloudWatchHistory } = await import(moduleUrl);
  t.mock.method(globalThis, "fetch", async () => Response.json([
    { show_tmdb_id: 123, profile_id: "profile-scope-test", progress: 0.2 },
    { show_tmdb_id: 456, profile_id: "other", progress: 0.2 },
  ]));
  const auth = {
    session: { userId: "profile-scope-account", accessToken: "test-token" },
    accessToken: async () => "test-token",
  };
  const rows = await pullCloudWatchHistory(auth, "profile-scope-test");
  assert.deepEqual(rows.map((row) => row.show_tmdb_id), [123]);
});

test("legacy cloud resume without timestamp remains visible without a real dismissal", async (t) => {
  const { getContinueWatching, invalidateRawPayloadCache } = await import(moduleUrl);
  invalidateRawPayloadCache();
  t.mock.method(globalThis, "fetch", async (url) => {
    if (url === "/api/cloud-auth/account-sync-pull") return Response.json({
      revision: 1, payload: { localContinueWatchingByProfile: {
        "legacy-profile-test": [{ id: 123, title: "Movie", mediaType: "MOVIE",
          progress: 20, resumePositionSeconds: 120, updatedAtMs: 0 }],
      } },
    });
    return Response.json([]);
  });
  const auth = {
    session: { userId: "legacy-scope-account", accessToken: "test-token" },
    accessToken: async () => "test-token",
  };
  const rows = await getContinueWatching(auth, "legacy-profile-test");
  assert.deepEqual(rows.map((row) => row.show_tmdb_id), [123]);
});

async function progressSyncFixture(t, failures = {}) {
  const { saveProgress, invalidateRawPayloadCache } = await import(moduleUrl);
  invalidateRawPayloadCache();
  let payload = {
    localContinueWatchingByProfile: {
      other: [{ id: 999, mediaType: "MOVIE", progress: 20, updatedAtMs: 1 }],
    },
  };
  const writes = [];
  const now = Date.parse("2026-10-06T10:30:00Z");
  t.mock.method(Date, "now", () => now);
  t.mock.method(globalThis, "fetch", async (url, init) => {
    if (url === "/api/cloud-auth/watch-history") {
      writes.push(JSON.parse(init.body));
      if (failures.history) return Response.json({ error: "Unavailable" }, { status: 503 });
      return Response.json({});
    }
    if (url === "/api/cloud-auth/account-sync-pull")
      return Response.json({ payload, revision: 1 });
    if (url === "/api/cloud-auth/account-sync-push") {
      if (failures.payload) return Response.json({ error: "Unavailable" }, { status: 503 });
      payload = JSON.parse(init.body).payload;
      return Response.json({ accepted: true, revision: 2 });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  const auth = {
    session: { userId: "test-account", accessToken: "test-token" },
    accessToken: async () => "test-token",
  };
  return {
    now, writes,
    get payload() { return payload; },
    save: (entry) => saveProgress(auth, entry, "main"),
  };
}

test("web and confirmed VLC progress write an Android-compatible item timestamp without tracking", async (t) => {
  const state = await progressSyncFixture(t);
  await state.save({
    media_type: "movie", show_tmdb_id: 123, title: "Movie",
    progress: 0.25, duration_seconds: 0, position_seconds: 0,
  });
  const item = state.payload.localContinueWatchingByProfile.main[0];
  assert.equal(item.updatedAtMs, state.now);
  assert.equal(item.mediaType, "MOVIE");
  assert.equal(item.progress, 25);
  assert.equal(Date.parse(state.writes[0].updated_at), item.updatedAtMs);
  assert.equal(state.payload.localContinueWatchingByProfile.other[0].id, 999);
});

test("progress sync preserves supplied timestamps and separate series episodes", async (t) => {
  const state = await progressSyncFixture(t);
  const updated_at = "2026-10-06T10:00:00Z";
  const entry = {
    media_type: "tv", show_tmdb_id: 123, season: 1, episode: 1,
    progress: 0.1, duration_seconds: 3000, position_seconds: 300, updated_at,
  };
  await state.save(entry);
  await state.save({ ...entry, episode: 2 });
  const items = state.payload.localContinueWatchingByProfile.main;
  assert.deepEqual(items.map((item) => item.episode), [2, 1]);
  assert.ok(items.every((item) => item.updatedAtMs === Date.parse(updated_at)));
});

test("invalid timestamps are repaired before writing Android progress", async (t) => {
  const state = await progressSyncFixture(t);
  await state.save({
    media_type: "movie", show_tmdb_id: 123,
    progress: 0.01, duration_seconds: 6000, position_seconds: 60,
    updated_at: "invalid",
  });
  assert.equal(state.payload.localContinueWatchingByProfile.main[0].updatedAtMs, state.now);
});

test("watch-history failure is reported while account sync still saves timestamped progress", async (t) => {
  const state = await progressSyncFixture(t, { history: true });
  const warning = t.mock.method(console, "warn", () => {});
  await state.save({
    media_type: "movie", show_tmdb_id: 123, progress: 0.25,
  });
  assert.equal(warning.mock.callCount(), 1);
  assert.equal(state.payload.localContinueWatchingByProfile.main[0].updatedAtMs, state.now);
});

test("account sync failure rejects progress saving instead of reporting success", async (t) => {
  const state = await progressSyncFixture(t, { payload: true });
  await assert.rejects(state.save({
    media_type: "movie", show_tmdb_id: 123, progress: 0.25,
  }), /Unavailable/);
});

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
