const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/playerRecovery.ts"),
).href;

async function setup(t, throws = false) {
  const { createMediaRecovery, MEDIA_RECOVERY_TIMEOUT_MS } = await import(moduleUrl);
  assert.equal(MEDIA_RECOVERY_TIMEOUT_MS, 15000);
  const timers = new Map();
  let nextId = 0;
  let recoveries = 0;
  let failures = 0;
  t.mock.method(globalThis, "setTimeout", (callback, delay) => {
    assert.equal(delay, MEDIA_RECOVERY_TIMEOUT_MS);
    const id = ++nextId;
    timers.set(id, callback);
    return id;
  });
  t.mock.method(globalThis, "clearTimeout", (id) => timers.delete(id));
  const recovery = createMediaRecovery(
    () => {
      recoveries += 1;
      if (throws) throw new Error("Recovery failed");
    },
    () => { failures += 1; },
  );
  return {
    recovery,
    timers,
    get recoveries() { return recoveries; },
    get failures() { return failures; },
    timeout() {
      assert.equal(timers.size, 1);
      const [id, callback] = timers.entries().next().value;
      timers.delete(id);
      callback();
    },
  };
}

test("Duplicate engine and element errors consume only one pending recovery", async (t) => {
  const state = await setup(t);
  assert.equal(state.recovery.request(), true);
  assert.equal(state.recovery.isPending(), true);
  for (let i = 0; i < 5; i++) assert.equal(state.recovery.request(), true);
  assert.equal(state.recoveries, 1);
  assert.equal(state.failures, 0);
  state.timeout();
  assert.equal(state.recoveries, 2);
  assert.equal(state.failures, 0);
  state.recovery.request();
  assert.equal(state.recoveries, 2);
  state.timeout();
  assert.equal(state.failures, 1);
  assert.equal(state.recovery.isPending(), false);
  assert.equal(state.recovery.request(), false);
});

test("Successful playback cancels timeout without resetting the bounded budget", async (t) => {
  const state = await setup(t);
  state.recovery.request();
  state.recovery.succeeded();
  assert.equal(state.recovery.isPending(), false);
  assert.equal(state.timers.size, 0);
  state.recovery.request();
  assert.equal(state.recoveries, 2);
  state.recovery.succeeded();
  state.recovery.request();
  assert.equal(state.recoveries, 2);
  assert.equal(state.failures, 1);
});

test("Disposal prevents delayed retries and failure notifications", async (t) => {
  const state = await setup(t);
  state.recovery.request();
  state.recovery.dispose();
  assert.equal(state.timers.size, 0);
  assert.equal(state.recovery.request(), false);
  assert.equal(state.recoveries, 1);
  assert.equal(state.failures, 0);
});

test("A throwing recovery fails explicitly once and cancels its timer", async (t) => {
  const state = await setup(t, true);
  state.recovery.request();
  assert.equal(state.failures, 1);
  assert.equal(state.timers.size, 0);
  assert.equal(state.recovery.request(), false);
});

test("STREAMNET live TS buffering favors stability without changing other TS paths", async () => {
  const { mpegTsBufferOptions } = await import(moduleUrl);
  assert.deepEqual(mpegTsBufferOptions(true, true), {
    liveBufferLatencyChasing: true,
    liveBufferLatencyChasingOnPaused: false,
    liveBufferLatencyMaxLatency: 12,
    liveBufferLatencyMinRemain: 3,
    enableStashBuffer: true,
    stashInitialSize: 128 * 1024,
  });
  const legacy = mpegTsBufferOptions(true, false);
  assert.equal(legacy.enableStashBuffer, false);
  assert.equal(legacy.liveBufferLatencyMaxLatency, 5);
  assert.equal(legacy.liveBufferLatencyMinRemain, 1);
  assert.equal(legacy.liveBufferLatencyChasingOnPaused, true);
  const vod = mpegTsBufferOptions(false, false);
  assert.equal(vod.liveBufferLatencyChasing, false);
  assert.equal(vod.enableStashBuffer, true);
});
