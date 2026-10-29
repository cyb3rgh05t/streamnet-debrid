import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../public/admin.js", import.meta.url), "utf8");
function fixture() {
  const calls = [];
  const renders = [];
  const toasts = [];
  const metric = { textContent: "1" };
  const selectedAccount = { account: { id: "account-a" }, snapshot: { unsaved: true } };
  const state = { token: "admin", pendingRequests: 0, selectedAccount };
  const nodes = new Map([
    ["account-view", { hidden: false }],
    ["dashboard-home-view", { hidden: true }],
    ["accounts-view", { hidden: true }],
    ["metrics", { querySelector: () => metric }],
    ["account-devices-body", { querySelectorAll: () => [] }],
    ["accounts-body", { querySelectorAll: () => [] }],
  ]);
  for (const node of nodes.values()) node.classList = { contains: () => node.hidden };
  const document = { visibilityState: "visible", addEventListener() {} };
  let interval;
  const context = vm.createContext({
    state, document, byId: id => nodes.get(id),
    api: async url => { calls.push(url); return { account: { devices: ["new-status"] }, online_devices: 3 }; },
    renderDeviceBadges: (...args) => renders.push(args),
    loadAccounts: async () => calls.push("accounts"),
    showToast: (...args) => toasts.push(args),
    window: { setInterval(fn, ms) { interval = { fn, ms }; } },
  });
  vm.runInContext(`let presenceRefreshPending = false; let presenceRefreshFailed = false;
    ${source.match(/async function refreshVisiblePresence\([^]*?\n\}/)[0]}
    ${source.match(/window.setInterval\(refreshVisiblePresence, 15_000\);/)[0]}`, context);
  return { context, state, selectedAccount, document, calls, renders, toasts, metric, nodes, interval };
}

test("admin polls every 15 seconds and updates only devices, preserving editor and expansion", async () => {
  const f = fixture();
  assert.equal(f.interval.ms, 15_000);
  await f.interval.fn();
  assert.deepEqual(f.calls, ["/admin-api/accounts/account-a"]);
  assert.deepEqual(f.renders, [[["new-status"], true]]);
  assert.equal(f.state.selectedAccount, f.selectedAccount);
  assert.equal(f.state.selectedAccount.snapshot.unsaved, true);
});

test("polling is gated by visibility, auth, active view and pending work", async () => {
  const f = fixture();
  f.document.visibilityState = "hidden";
  await f.interval.fn();
  f.document.visibilityState = "visible";
  f.state.token = null;
  await f.interval.fn();
  f.state.token = "admin";
  f.state.pendingRequests = 1;
  await f.interval.fn();
  f.state.pendingRequests = 0;
  f.nodes.get("account-view").hidden = true;
  await f.interval.fn();
  assert.equal(f.calls.length, 0);
});

test("polls do not overlap or render stale account responses after navigation", async () => {
  const f = fixture();
  let resolve;
  let count = 0;
  f.context.api = () => { count++; return new Promise(done => { resolve = done; }); };
  const pending = f.interval.fn();
  await f.interval.fn();
  assert.equal(count, 1);
  f.state.selectedAccount = { account: { id: "account-b" } };
  resolve({ account: { devices: ["wrong-account"] } });
  await pending;
  assert.equal(f.renders.length, 0);
});

test("dashboard polling avoids version lookups; failures invalidate counts and are visible", async () => {
  const f = fixture();
  f.nodes.get("account-view").hidden = true;
  f.nodes.get("dashboard-home-view").hidden = false;
  await f.interval.fn();
  assert.deepEqual(f.calls, ["/admin-api/overview"]);
  assert.equal(f.metric.textContent, 3);
  f.context.api = async () => { throw new Error("offline"); };
  await f.interval.fn();
  await f.interval.fn();
  assert.equal(f.metric.textContent, "—");
  assert.equal(f.toasts.length, 1);
  assert.match(f.toasts[0][0], /offline/);
});
