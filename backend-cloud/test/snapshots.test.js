import assert from "node:assert/strict";
import test from "node:test";
import {
  dropRedundantLegacyCatalogs,
  mergePushPayloadByFieldTimestamps,
  payloadMetrics,
  payloadsEquivalent,
  payloadUpdatedAtMillis,
} from "../src/snapshots.js";

test("a push that only restamps updatedAt is equivalent to the stored snapshot", () => {
  const current = {
    updatedAt: 1000,
    profiles: [{ id: "p1", name: "A" }],
    settings: { subtitles: "de", autoplay: true },
    fieldUpdatedAt: { "g:settings": 500 },
  };
  const incoming = {
    fieldUpdatedAt: { "g:settings": 500 },
    settings: { autoplay: true, subtitles: "de" },
    profiles: [{ name: "A", id: "p1" }],
    updatedAt: 99_000,
  };
  const merged = mergePushPayloadByFieldTimestamps(incoming, current);
  assert.equal(payloadsEquivalent(merged, current), true);
});

test("a changed field or a missing section is not equivalent", () => {
  const current = { updatedAt: 1, settings: { autoplay: true }, fieldUpdatedAt: { "g:settings": 5 } };
  const changed = mergePushPayloadByFieldTimestamps(
    { updatedAt: 2, settings: { autoplay: false }, fieldUpdatedAt: { "g:settings": 9 } },
    current,
  );
  assert.equal(payloadsEquivalent(changed, current), false);
  assert.equal(payloadsEquivalent({ updatedAt: 2, settings: current.settings }, current), false);
  assert.equal(payloadsEquivalent(null, current), false);
});

test("the legacy catalogs list is dropped only when every profile has its own catalogs entry", () => {
  const complete = { profiles: [{ id: "a" }, { id: "b" }], catalogs: [{ id: "x" }], catalogsByProfile: { a: [], b: [{ id: "x" }] } };
  assert.equal(dropRedundantLegacyCatalogs(complete), true);
  assert.equal(Object.hasOwn(complete, "catalogs"), false);
  assert.deepEqual(complete.catalogsByProfile.b, [{ id: "x" }]);

  for (const kept of [
    { profiles: [{ id: "a" }, { id: "b" }], catalogs: [{ id: "x" }], catalogsByProfile: { a: [] } },
    { profiles: [{ id: "a" }], catalogs: [{ id: "x" }] },
    { profiles: [], catalogs: [{ id: "x" }], catalogsByProfile: {} },
    { profiles: [{ id: "a" }], catalogsByProfile: { a: [] } },
  ]) {
    const before = JSON.stringify(kept);
    assert.equal(dropRedundantLegacyCatalogs(kept), false);
    assert.equal(JSON.stringify(kept), before);
  }
});

test("ranks a populated multi-profile snapshot above a partial payload", () => {
  const metrics = payloadMetrics({
    profiles: [{ id: "one" }, { id: "two" }],
    profileSettingsById: { one: {}, two: {} },
  });
  assert.equal(metrics.restoreRank, 80);
  assert.equal(metrics.profileCount, 2);
  assert.equal(metrics.scopedCoverage, 2);
});

test("normalizes valid payload timestamps for PostgreSQL", () => {
  assert.equal(
    payloadUpdatedAtMillis({ updatedAt: 1787557021000 }),
    1787557021000,
  );
  assert.equal(payloadUpdatedAtMillis({ updatedAt: 0 }), null);
  assert.equal(payloadUpdatedAtMillis({ updatedAt: "invalid" }), null);
});

test("server-side push merge keeps newer admin profile fields", () => {
  const current = {
    updatedAt: 2000,
    profiles: [{ id: "kids" }],
    profileSettingsById: { kids: { liveTvLayoutMode: "classic" } },
    iptvByProfile: { kids: { sortOrder: "name" } },
    fieldUpdatedAt: {
      "p:kids:liveTvLayoutMode": 2000,
      "i:kids:sortOrder": 2000,
    },
  };
  const incoming = {
    updatedAt: 2100,
    profiles: [{ id: "kids" }],
    profileSettingsById: { kids: { liveTvLayoutMode: "streamnet" } },
    iptvByProfile: { kids: { sortOrder: "provider" } },
    fieldUpdatedAt: {
      "p:kids:liveTvLayoutMode": 1000,
      "i:kids:sortOrder": 1000,
    },
  };

  const merged = mergePushPayloadByFieldTimestamps(incoming, current);

  assert.equal(merged.profileSettingsById.kids.liveTvLayoutMode, "classic");
  assert.equal(merged.iptvByProfile.kids.sortOrder, "name");
  assert.equal(merged.fieldUpdatedAt["p:kids:liveTvLayoutMode"], 2000);
  assert.equal(merged.fieldUpdatedAt["i:kids:sortOrder"], 2000);
});

test("server-side push merge keeps newer admin addon state", () => {
  const current = {
    addons: [{ id: "opensubtitles", isEnabled: true }],
    addonsByProfile: {
      kids: [{ id: "opensubtitles", isEnabled: true }],
    },
    addonsUpdatedAt: 2000,
  };
  const incoming = {
    addons: [{ id: "opensubtitles", isEnabled: false }],
    addonsByProfile: {
      kids: [{ id: "opensubtitles", isEnabled: false }],
    },
    addonsUpdatedAt: 1000,
  };

  const merged = mergePushPayloadByFieldTimestamps(incoming, current);

  assert.equal(merged.addons[0].isEnabled, true);
  assert.equal(merged.addonsByProfile.kids[0].isEnabled, true);
  assert.equal(merged.addonsUpdatedAt, 2000);
});

test("server-side push merge keeps newer incoming profile fields", () => {
  const current = {
    profileSettingsById: { kids: { liveTvLayoutMode: "classic" } },
    fieldUpdatedAt: { "p:kids:liveTvLayoutMode": 1000 },
  };
  const incoming = {
    profileSettingsById: { kids: { liveTvLayoutMode: "streamnet" } },
    fieldUpdatedAt: { "p:kids:liveTvLayoutMode": 2000 },
  };

  const merged = mergePushPayloadByFieldTimestamps(incoming, current);

  assert.equal(merged.profileSettingsById.kids.liveTvLayoutMode, "streamnet");
  assert.equal(merged.fieldUpdatedAt["p:kids:liveTvLayoutMode"], 2000);
});

test("server-side push merge preserves Android Continue Watching omitted by web", () => {
  const current = {
    localContinueWatchingByProfile: {
      ivory: [
        {
          id: 123,
          mediaType: "MOVIE",
          progress: 24,
          updatedAtMs: 3000,
        },
      ],
    },
  };
  const incoming = {
    profileSettingsById: { ivory: { accentColor: "Orange" } },
  };

  const merged = mergePushPayloadByFieldTimestamps(incoming, current);

  assert.equal(merged.localContinueWatchingByProfile.ivory[0].id, 123);
  assert.equal(merged.localContinueWatchingByProfile.ivory[0].progress, 24);
});

test("server-side push merge keeps the newest Continue Watching item and tombstones", () => {
  const current = {
    localContinueWatchingByProfile: {
      ivory: [{ id: 123, mediaType: "MOVIE", progress: 20, updatedAtMs: 3000 }],
    },
    dismissedContinueWatchingByProfile: {
      ivory: "movie:456,3000",
    },
  };
  const incoming = {
    localContinueWatchingByProfile: {
      ivory: [{ id: 123, mediaType: "MOVIE", progress: 40, updatedAtMs: 4000 }],
    },
    dismissedContinueWatchingByProfile: {
      ivory: "movie:789,4000",
    },
  };

  const merged = mergePushPayloadByFieldTimestamps(incoming, current);

  assert.equal(merged.localContinueWatchingByProfile.ivory[0].progress, 40);
  assert.match(
    merged.dismissedContinueWatchingByProfile.ivory,
    /movie:456,3000/,
  );
  assert.match(
    merged.dismissedContinueWatchingByProfile.ivory,
    /movie:789,4000/,
  );
});
