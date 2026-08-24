import assert from "node:assert/strict";
import test from "node:test";
import { payloadMetrics, payloadUpdatedAtMillis } from "../src/snapshots.js";

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
  assert.equal(payloadUpdatedAtMillis({ updatedAt: 1787557021000 }), 1787557021000);
  assert.equal(payloadUpdatedAtMillis({ updatedAt: 0 }), null);
  assert.equal(payloadUpdatedAtMillis({ updatedAt: "invalid" }), null);
});
