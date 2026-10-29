const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function fixture() {
  const compiled = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, "../lib/presence.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const timers = new Map();
  const listeners = new Map();
  const calls = [];
  const storage = new Map();
  const warnings = [];
  const doc = { visibilityState: "visible",
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name) };
  const win = {
    setInterval(fn, ms) { timers.set("interval", { fn, ms }); return "interval"; },
    clearInterval(id) { timers.delete(id); },
    setTimeout(fn, ms) { timers.set("timeout", { fn, ms }); return "timeout"; },
    clearTimeout(id) { timers.delete(id); },
  };
  new Function("require", "module", "exports", "document", "window", "localStorage", "crypto", "fetch", "console", compiled)(
    name => {
      if (name === "./auth") return { browserDeviceType: () => "web" };
      if (name === "../package.json") return { version: "1.0.070" };
      throw new Error(`Unexpected import ${name}`);
    }, module, module.exports, doc, win,
    { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    { randomUUID: () => "browser-install" },
    async (url, options) => { calls.push({ url, options }); return { ok: true }; },
    { warn: (...args) => warnings.push(args) },
  );
  const auth = { session: { userId: "account-a" }, accessToken: async () => "fresh-token" };
  return { ...module.exports, auth, doc, timers, listeners, calls, storage, warnings };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test("visible authenticated Web sends immediately, every 30s and on visibility return", async () => {
  const f = fixture();
  const stop = f.startWebPresence(f.auth, "profile-a");
  await flush();
  assert.equal(f.calls.length, 1);
  assert.equal(f.timers.get("interval").ms, 30_000);
  assert.equal(f.calls[0].url, "/api/cloud-auth/device-presence");
  assert.equal(f.calls[0].options.headers.authorization, "Bearer fresh-token");
  assert.deepEqual(JSON.parse(f.calls[0].options.body), {
    install_id: "browser-install", profile_id: "profile-a", platform: "web",
    device_type: "web", app_version: "1.0.070", distribution: "web",
  });
  f.timers.get("interval").fn();
  await flush();
  assert.equal(f.calls.length, 2);
  f.doc.visibilityState = "hidden";
  f.listeners.get("visibilitychange")();
  f.timers.get("interval").fn();
  await flush();
  assert.equal(f.calls.length, 2);
  f.doc.visibilityState = "visible";
  f.listeners.get("visibilitychange")();
  await flush();
  assert.equal(f.calls.length, 3);
  assert.equal(f.storage.size, 1);
  stop();
  assert.equal(f.timers.size, 0);
  assert.equal(f.listeners.size, 0);
});

test("signed-out Web does not schedule presence; account switch cannot send an old identity", async () => {
  const f = fixture();
  f.auth.session = null;
  f.startWebPresence(f.auth, null)();
  assert.equal(f.timers.size, 0);
  f.auth.session = { userId: "account-a" };
  let release;
  f.auth.accessToken = () => new Promise(resolve => { release = resolve; });
  const stop = f.startWebPresence(f.auth, null);
  f.auth.session = { userId: "account-b" };
  release("other-account-token");
  await flush();
  assert.equal(f.calls.length, 0);
  stop();
});

test("cleanup cancels pending requests, stops timers and prevents late sends", async () => {
  const f = fixture();
  let release;
  f.auth.accessToken = () => new Promise(resolve => { release = resolve; });
  const stop = f.startWebPresence(f.auth, null);
  f.timers.get("interval").fn();
  stop();
  release("token");
  await flush();
  assert.equal(f.calls.length, 0);
  assert.equal(f.timers.size, 0);
});

test("authentication failures are reported without claiming a successful signal", async () => {
  const f = fixture();
  f.auth.accessToken = async () => { throw new Error("expired"); };
  const stop = f.startWebPresence(f.auth, null);
  await flush();
  assert.equal(f.calls.length, 0);
  assert.equal(f.warnings.length, 1);
  stop();
});

test("quick hide and return queues an immediate heartbeat after the cancelled attempt", async () => {
  const f = fixture();
  let release;
  f.auth.accessToken = () => new Promise(resolve => { release = resolve; });
  const stop = f.startWebPresence(f.auth, null);
  f.doc.visibilityState = "hidden";
  f.listeners.get("visibilitychange")();
  f.doc.visibilityState = "visible";
  f.listeners.get("visibilitychange")();
  f.auth.accessToken = async () => "fresh-token";
  release("cancelled-token");
  await flush();
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].options.headers.authorization, "Bearer fresh-token");
  assert.equal(f.calls[0].options.signal.aborted, false);
  stop();
  assert.equal(f.calls[0].options.signal.aborted, true);
});
