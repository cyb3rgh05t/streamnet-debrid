import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../public/admin.js", import.meta.url), "utf8");

function fixture() {
  const state = { token: "admin", onlineOnly: false, accounts: { limit: 10, offset: 0, total: 0 } };
  const search = { value: "" };
  const pending = [];
  const renders = [];
  const notes = [];
  const context = vm.createContext({
    state,
    byId: id => id === "account-search" ? search : {
      classList: { toggle: (...args) => notes.push(args) },
    },
    api: url => new Promise(resolve => pending.push({ url, resolve })),
    renderAccounts: rows => renders.push(rows),
    renderPagination() {},
  });
  vm.runInContext(`let accountsRequestId = 0;
    ${source.match(/async function loadAccounts\([^]*?\n\}/)[0]}`, context);
  const result = label => ({ accounts: [label], total: 1, limit: 10, offset: 0 });
  return { context, state, search, pending, renders, notes, result };
}

test("older unfiltered response cannot overwrite the online-only account list", async () => {
  const f = fixture();
  const old = f.context.loadAccounts();
  f.state.onlineOnly = true;
  const current = f.context.loadAccounts();
  assert.match(f.pending[1].url, /online_only=1/);
  f.pending[1].resolve(f.result("online"));
  await current;
  f.pending[0].resolve(f.result("all"));
  await old;
  assert.deepEqual(f.renders, [["online"]]);
  assert.deepEqual(f.notes, [["hidden", false]]);
});

test("changed filters, pagination and auth invalidate pending account responses", async () => {
  for (const change of [
    f => { f.state.onlineOnly = true; },
    f => { f.search.value = "new search"; },
    f => { f.state.accounts.offset = 10; },
    f => { f.state.accounts.limit = 20; },
    f => { f.state.token = null; },
  ]) {
    const f = fixture();
    const request = f.context.loadAccounts();
    change(f);
    f.pending[0].resolve(f.result("stale"));
    await request;
    assert.equal(f.renders.length, 0);
    assert.equal(f.state.accounts.total, 0);
  }
});

test("dashboard online shortcut always enables the filter, even after repeated clicks", () => {
  const handler = source.match(/item\.addEventListener\("click", \(\) => \{\n        state\.onlineOnly[^]*?\n      \}\);/)[0];
  const state = { onlineOnly: true, accounts: { offset: 20 } };
  const views = [];
  const context = vm.createContext({ state, selectView: view => views.push(view), item: {
    addEventListener: (_event, fn) => { fn(); fn(); },
  } });
  vm.runInContext(handler, context);
  assert.equal(state.onlineOnly, true);
  assert.equal(state.accounts.offset, 0);
  assert.deepEqual(views, ["accounts", "accounts"]);
});
