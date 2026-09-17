import assert from "node:assert/strict";
import test from "node:test";
import {
  applyAdminSnapshotMutation,
  hydrateAdminStremioAddon,
  redactAdminPayload,
  summarizeAdminPayload,
} from "../src/admin-snapshots.js";

const addonManifest = () => ({
  id: "org.example.addon",
  name: "Example Addon",
  version: "2.1.0",
  description: "Example streams",
  logo: "https://example.test/logo.png",
  background: "https://example.test/background.jpg",
  types: ["movie", "series"],
  resources: [
    "stream",
    { name: "catalog", types: ["Movie"], idPrefixes: ["tt"] },
  ],
  catalogs: [
    {
      type: "movie",
      id: "popular",
      name: "Popular",
      genres: ["Action"],
      extra: [{ name: "genre", isRequired: false, options: ["Action"] }],
    },
  ],
  idPrefixes: ["tt"],
  behaviorHints: { configurable: true, p2p: true },
});

const snapshot = () => ({
  profiles: [
    { id: "living-room", name: "Living room" },
    { id: "kids", name: "Kids" },
  ],
  addonsByProfile: { "living-room": [], kids: [] },
  iptvByProfile: { "living-room": { playlists: [] }, kids: { playlists: [] } },
  catalogsByProfile: { "living-room": [{ id: "movies" }] },
  watchlistByProfile: { kids: [{ id: "1" }] },
});

test("upserts an account-wide addon and advances sync timestamps", () => {
  const result = applyAdminSnapshotMutation(
    snapshot(),
    {
      operation: "upsert_addon",
      profileId: "living-room",
      data: {
        id: "example",
        name: "Example",
        url: "https://secret.example/manifest.json",
        manifest: addonManifest(),
      },
    },
    1234,
  );

  assert.equal(result.addonsUpdatedAt, 1234);
  assert.equal(result.updatedAt, 1234);
  const addon = result.addonsByProfile["living-room"][0];
  assert.equal(addon.id, "org.example.addon_c3dad99e9c79");
  assert.equal(addon.name, "Example");
  assert.equal(addon.version, "2.1.0");
  assert.equal(addon.isInstalled, true);
  assert.equal(addon.type, "CUSTOM");
  assert.equal(addon.logo, "https://example.test/logo.png");
  assert.equal(addon.manifest.resources[1].types[0], "movie");
  assert.equal(addon.manifest.catalogs[0].extra[0].name, "genre");
  assert.deepEqual(
    result.addonsByProfile.kids,
    result.addonsByProfile["living-room"],
  );
});

test("hydrates remote Stremio addon links like Android settings installs", async () => {
  const hydrated = await hydrateAdminStremioAddon(
    {
      url: "stremio://torrentio.example/config/manifest.jsonv?token=abc#install",
    },
    async (url) => {
      assert.equal(
        url,
        "https://torrentio.example/config/manifest.json?token=abc",
      );
      return {
        ok: true,
        text: async () => JSON.stringify(addonManifest()),
      };
    },
  );

  const result = applyAdminSnapshotMutation(
    snapshot(),
    { operation: "upsert_addon", profileId: "kids", data: hydrated },
    2222,
  );

  const addon = result.addonsByProfile.kids[0];
  assert.equal(addon.id, "org.example.addon_64efb9b24896");
  assert.equal(addon.name, "Example Addon");
  assert.equal(
    addon.url,
    "https://torrentio.example/config/manifest.json?token=abc",
  );
  assert.equal(addon.transportUrl, "https://torrentio.example/config");
  assert.equal(addon.manifest.id, "org.example.addon");
  assert.equal(addon.manifest.behaviorHints.p2p, true);
  assert.equal(addon.runtimeKind, "STREMIO");
  assert.equal(addon.installSource, "DIRECT_URL");
});

test("requires a remote Stremio addon URL", () => {
  assert.throws(
    () =>
      applyAdminSnapshotMutation(snapshot(), {
        operation: "upsert_addon",
        profileId: "kids",
        data: { id: "empty", name: "Empty" },
      }),
    /Addon manifest URL is required/,
  );
});

test("applies small admin mutations to large existing snapshots", () => {
  const value = snapshot();
  value.largeGuideCache = "x".repeat(700 * 1024);

  const result = applyAdminSnapshotMutation(
    value,
    {
      operation: "set_profile_field",
      profileId: "kids",
      rootKey: "profileSettingsById",
      field: "liveTvLayoutMode",
      data: "classic",
    },
    1234,
  );

  assert.equal(result.profileSettingsById.kids.liveTvLayoutMode, "classic");
  assert.equal(result.fieldUpdatedAt["p:kids:liveTvLayoutMode"], 1234);
  assert.equal(result.largeGuideCache.length, 700 * 1024);
});

test("upserts a playlist only for the selected profile", () => {
  const result = applyAdminSnapshotMutation(
    snapshot(),
    {
      operation: "upsert_playlist",
      profileId: "kids",
      data: {
        id: "family-tv",
        name: "Family TV",
        m3uUrl: "https://provider.example/list.m3u",
      },
    },
    2345,
  );

  assert.equal(result.iptvByProfile.kids.playlists[0].id, "family-tv");
  assert.equal(result.iptvByProfile.kids.playlists[0].importVod, true);
  assert.equal(result.fieldUpdatedAt["i:kids:playlists"], 2345);
  assert.deepEqual(result.iptvByProfile["living-room"].playlists, []);
});

test("derives playlist id and name when admin only provides urls", () => {
  const result = applyAdminSnapshotMutation(
    snapshot(),
    {
      operation: "upsert_playlist",
      profileId: "kids",
      data: {
        m3uUrl: "https://provider.example/family-tv.m3u",
        epgUrl: "https://provider.example/guide.xml",
      },
    },
    2346,
  );

  const playlist = result.iptvByProfile.kids.playlists[0];
  assert.match(playlist.id, /^family-tv-[a-f0-9]{8}$/);
  assert.equal(playlist.name, "family tv");
  assert.equal(playlist.epgUrls[0], "https://provider.example/guide.xml");
  assert.equal(result.fieldUpdatedAt["i:kids:playlists"], 2346);
});

test("allows only bounded profile fields and rejects unknown profiles", () => {
  const result = applyAdminSnapshotMutation(
    snapshot(),
    {
      operation: "set_profile_field",
      profileId: "kids",
      rootKey: "iptvByProfile",
      field: "sortOrder",
      data: "name",
    },
    4321,
  );
  assert.equal(result.iptvByProfile.kids.sortOrder, "name");
  assert.equal(result.fieldUpdatedAt["i:kids:sortOrder"], 4321);

  assert.throws(
    () =>
      applyAdminSnapshotMutation(snapshot(), {
        operation: "set_profile_field",
        profileId: "missing",
        rootKey: "profileSettingsById",
        field: "accentColor",
        data: "Orange",
      }),
    /Unknown profile/,
  );
  assert.throws(
    () =>
      applyAdminSnapshotMutation(snapshot(), {
        operation: "set_profile_field",
        profileId: "kids",
        rootKey: "traktTokens",
        field: "accessToken",
        data: "nope",
      }),
    /not editable/,
  );
});

test("removes an addon from every profile it was shared with", () => {
  const value = snapshot();
  value.addonsByProfile["living-room"] = [{ id: "example", name: "Example" }];
  value.addonsByProfile.kids = [{ id: "example", name: "Example" }];
  const result = applyAdminSnapshotMutation(value, {
    operation: "delete_addon",
    profileId: "kids",
    data: { id: "example" },
  });

  assert.deepEqual(result.addonsByProfile["living-room"], []);
  assert.deepEqual(result.addonsByProfile.kids, []);
});

test("removes a playlist only from the selected profile", () => {
  const value = snapshot();
  value.iptvByProfile.kids.playlists.push({
    id: "family-tv",
    name: "Family TV",
    m3uUrl: "https://provider.example/list.m3u",
  });
  value.iptvByProfile.kids.m3uUrl = "https://provider.example/list.m3u";
  const result = applyAdminSnapshotMutation(
    value,
    {
      operation: "delete_playlist",
      profileId: "kids",
      data: { id: "family-tv" },
    },
    3456,
  );

  assert.deepEqual(result.iptvByProfile.kids.playlists, []);
  assert.equal(result.iptvByProfile.kids.m3uUrl, "");
  assert.equal(result.fieldUpdatedAt["i:kids:playlists"], 3456);
});

test("removes a profile and its scoped data, but keeps at least one profile", () => {
  const value = snapshot();
  const result = applyAdminSnapshotMutation(value, {
    operation: "delete_profile",
    profileId: "kids",
    data: {},
  });

  assert.deepEqual(
    result.profiles.map((profile) => profile.id),
    ["living-room"],
  );
  assert.equal(result.addonsByProfile.kids, undefined);
  assert.equal(result.watchlistByProfile.kids, undefined);

  assert.throws(
    () =>
      applyAdminSnapshotMutation(
        { profiles: [{ id: "solo", name: "Solo" }] },
        { operation: "delete_profile", profileId: "solo", data: {} },
      ),
    /Cannot delete the only profile/,
  );
});

test("edits the whole payload while preserving redacted secret values", () => {
  const value = snapshot();
  value.addons = [{ id: "opensubtitles", isEnabled: false }];
  value.iptvByProfile.kids.m3uUrl = "https://user:pass@example/list.m3u";
  value.profiles[1].name = "Kids";

  const edited = JSON.parse(JSON.stringify(value));
  edited.addons[0].isEnabled = true;
  edited.profiles[1].name = "Kids Room";
  edited.iptvByProfile.kids.m3uUrl = "[REDACTED]";
  edited.iptvByProfile.kids.sortOrder = "name";

  const result = applyAdminSnapshotMutation(
    value,
    {
      operation: "edit_payload",
      data: edited,
    },
    5678,
  );

  assert.equal(result.addons[0].isEnabled, true);
  assert.equal(result.addonsByProfile.kids[0].isEnabled, true);
  assert.equal(result.addonsByProfile["living-room"][0].isEnabled, true);
  assert.equal(result.addonsUpdatedAt, 5678);
  assert.equal(result.profiles[1].name, "Kids Room");
  assert.equal(
    result.iptvByProfile.kids.m3uUrl,
    "https://user:pass@example/list.m3u",
  );
  assert.equal(result.iptvByProfile.kids.sortOrder, "name");
  assert.equal(result.fieldUpdatedAt["i:kids:sortOrder"], 5678);
});

test("rejects a payload edit that removes every profile", () => {
  assert.throws(
    () =>
      applyAdminSnapshotMutation(snapshot(), {
        operation: "edit_payload",
        data: { profiles: [] },
      }),
    /Payload must include at least one profile/,
  );
});

test("redacts credentials recursively while retaining useful structure", () => {
  const redacted = redactAdminPayload({
    profile: { name: "Kids", apiKey: "secret" },
    iptvByProfile: { kids: { m3uUrl: "https://user:pass@example/list" } },
  });

  assert.equal(redacted.profile.name, "Kids");
  assert.equal(redacted.profile.apiKey, "[REDACTED]");
  assert.equal(redacted.iptvByProfile.kids.m3uUrl, "[REDACTED]");
});

test("summarizes profile-scoped objects without exposing secrets", () => {
  const value = snapshot();
  value.iptvByProfile.kids.playlists.push({
    id: "family-tv",
    name: "Family TV",
    m3uUrl: "https://provider.example/list.m3u",
  });
  value.addonsByProfile.kids = [
    { id: "example", name: "Example", isEnabled: true },
  ];
  const summary = summarizeAdminPayload(value);

  assert.equal(summary.profileCount, 2);
  assert.equal(summary.playlistCount, 1);
  assert.equal(summary.profiles[1].watchlistCount, 1);
  assert.deepEqual(summary.profiles[1].playlists, [
    { id: "family-tv", name: "Family TV", enabled: true },
  ]);
  assert.deepEqual(summary.addons, [
    { id: "example", name: "Example", isEnabled: true },
  ]);
  assert.equal(
    summary.payload.iptvByProfile.kids.playlists[0].m3uUrl,
    "[REDACTED]",
  );
});
