import assert from "node:assert/strict";
import test from "node:test";
import {
  applyAdminSnapshotMutation,
  redactAdminPayload,
  summarizeAdminPayload,
} from "../src/admin-snapshots.js";

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
      },
    },
    1234,
  );

  assert.equal(result.addonsUpdatedAt, 1234);
  assert.equal(result.updatedAt, 1234);
  assert.equal(result.addonsByProfile["living-room"][0].isInstalled, true);
  assert.deepEqual(
    result.addonsByProfile.kids,
    result.addonsByProfile["living-room"],
  );
});

test("upserts a playlist only for the selected profile", () => {
  const result = applyAdminSnapshotMutation(snapshot(), {
    operation: "upsert_playlist",
    profileId: "kids",
    data: {
      id: "family-tv",
      name: "Family TV",
      m3uUrl: "https://provider.example/list.m3u",
    },
  });

  assert.equal(result.iptvByProfile.kids.playlists[0].id, "family-tv");
  assert.equal(result.iptvByProfile.kids.playlists[0].importVod, true);
  assert.deepEqual(result.iptvByProfile["living-room"].playlists, []);
});

test("allows only bounded profile fields and rejects unknown profiles", () => {
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
    m3uUrl: "https://provider.example/list.m3u",
  });
  const summary = summarizeAdminPayload(value);

  assert.equal(summary.profileCount, 2);
  assert.equal(summary.playlistCount, 1);
  assert.equal(summary.profiles[1].watchlistCount, 1);
  assert.equal(
    summary.payload.iptvByProfile.kids.playlists[0].m3uUrl,
    "[REDACTED]",
  );
});
