import assert from "node:assert/strict";
import test from "node:test";
import { payloadMetrics } from "../src/snapshots.js";

test("ranks a populated multi-profile snapshot above a partial payload", () => {
  const metrics = payloadMetrics({
    profiles: [{ id: "one" }, { id: "two" }],
    profileSettingsById: { one: {}, two: {} },
  });
  assert.equal(metrics.restoreRank, 80);
  assert.equal(metrics.profileCount, 2);
  assert.equal(metrics.scopedCoverage, 2);
});
