const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/playerRecovery.ts"),
).href;

async function setup(t, threshold, enabled) {
  const { monitorSilentAudio } = await import(moduleUrl);
  let now = 0;
  let tick;
  let stopped = false;
  let calls = 0;
  t.mock.method(Date, "now", () => now);
  t.mock.method(globalThis, "setInterval", (callback) => {
    tick = callback;
    return 1;
  });
  t.mock.method(globalThis, "clearInterval", () => { stopped = true; });
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  const document = { visibilityState: "visible" };
  Object.defineProperty(globalThis, "document", { value: document, configurable: true });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "document", original);
    else delete globalThis.document;
  });
  const video = {
    currentTime: 0, paused: false, muted: false, volume: 1,
    seeking: false, ended: false, webkitAudioDecodedByteCount: 0,
  };
  const cleanup = monitorSilentAudio(video, () => { calls += 1; }, threshold, enabled);
  return {
    video, document, cleanup,
    get calls() { return calls; },
    step(advance = true) {
      now += 1000;
      if (advance) video.currentTime += 1;
      if (!stopped) tick();
    },
  };
}

test("IPTV silence triggers once at three seconds, not before", async (t) => {
  const state = await setup(t, 3000);
  state.step();
  state.step();
  assert.equal(state.calls, 0);
  state.step();
  assert.equal(state.calls, 1);
  state.step();
  assert.equal(state.calls, 1);
});

test("Default silence threshold remains eight seconds", async (t) => {
  const state = await setup(t);
  for (let i = 0; i < 7; i++) state.step();
  assert.equal(state.calls, 0);
  state.step();
  assert.equal(state.calls, 1);
});

test("Decoded audio and playback interruptions reset the silence timer", async (t) => {
  const state = await setup(t, 3000);
  for (const reason of ["audio", "paused", "muted", "volume", "seeking", "ended", "hidden", "buffering"]) {
    state.step();
    state.step();
    if (reason === "audio") state.video.webkitAudioDecodedByteCount += 10;
    else if (reason === "hidden") state.document.visibilityState = "hidden";
    else if (reason === "volume") state.video.volume = 0;
    else if (reason !== "buffering") state.video[reason] = true;
    state.step(reason !== "buffering");
    assert.equal(state.calls, 0, reason);
    state.video.paused = state.video.muted = state.video.seeking = state.video.ended = false;
    state.video.volume = 1;
    state.document.visibilityState = "visible";
  }
  state.step();
  state.step();
  assert.equal(state.calls, 0);
  state.step();
  assert.equal(state.calls, 1);
});

test("Cleanup stops the watchdog", async (t) => {
  const state = await setup(t, 3000);
  state.step();
  state.cleanup();
  for (let i = 0; i < 5; i++) state.step();
  assert.equal(state.calls, 0);
});

test("Transport changes suspend silence detection and restart its threshold on HLS", async (t) => {
  let enabled = true;
  const state = await setup(t, 3000, () => enabled);
  state.step();
  state.step();
  enabled = false;
  for (let i = 0; i < 6; i++) state.step();
  assert.equal(state.calls, 0);
  enabled = true;
  state.step();
  state.step();
  assert.equal(state.calls, 0);
  state.step();
  assert.equal(state.calls, 1);
});
