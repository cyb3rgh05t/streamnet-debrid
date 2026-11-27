import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAccountSyncEvent,
  normalizeSourceDeviceId,
  syncEventKinds,
} from "../src/sync-events.js";

const now = new Date("2026-11-27T10:00:00.000Z");

test("snapshot events tell clients to download the snapshot", () => {
  const event = buildAccountSyncEvent({ revision: 7, sourceDeviceId: "tv-1", now });
  assert.equal(event.type, "account_sync_revision");
  assert.equal(event.kind, "snapshot");
  assert.deepEqual(event.changedAreas, ["snapshot"]);
  assert.equal(event.sourceDeviceId, "tv-1");
  assert.equal(event.revision, 7);
});

test("watch history events only announce the Continue Watching list", () => {
  const event = buildAccountSyncEvent({
    revision: 1,
    kind: syncEventKinds.watchHistory,
    now,
  });
  assert.equal(event.kind, "watch_history");
  assert.deepEqual(event.changedAreas, ["continue_watching"]);
  assert.equal(event.sourceDeviceId, null);
});

test("device ids are only accepted when short and printable", () => {
  assert.equal(normalizeSourceDeviceId(" abc-123_x.y:z "), "abc-123_x.y:z");
  assert.equal(normalizeSourceDeviceId(["first", "second"]), "first");
  assert.equal(normalizeSourceDeviceId(""), null);
  assert.equal(normalizeSourceDeviceId(undefined), null);
  assert.equal(normalizeSourceDeviceId("a b"), null);
  assert.equal(normalizeSourceDeviceId("x".repeat(129)), null);
});
