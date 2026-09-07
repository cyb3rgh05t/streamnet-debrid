import assert from "node:assert/strict";
import test from "node:test";
import {
  mergePushPayloadByFieldTimestamps,
  payloadMetrics,
  payloadUpdatedAtMillis,
} from "../src/snapshots.js";

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
