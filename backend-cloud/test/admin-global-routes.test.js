import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import Fastify from "fastify";
import { SignJWT } from "jose";
import { registerAdminRoutes } from "../src/admin-routes.js";

const key = new TextEncoder().encode("test-admin-key-not-for-production");
const payload = () => ({
  profiles: [{ id: "main", name: "Main" }, { id: "kids", name: "Kids" }],
  iptvByProfile: { main: { playlists: [] }, kids: { playlists: [] } },
});

async function fixture(t, options = {}) {
  const rows = [
    { account_id: "account-a", revision: "3", updated_at: "2026-10-12", payload: payload() },
    { account_id: "account-b", revision: "7", updated_at: "2026-10-12", payload: payload() },
    { account_id: "account-c", revision: null, updated_at: null, payload: null },
    { account_id: "account-d", revision: "1", updated_at: "2026-10-12", payload: { profiles: [] } },
  ];
  const queries = [];
  let released = 0;
  const pool = {
    async query(sql, values) {
      queries.push({ sql, values });
      if (sql.includes("from admin_accounts")) return { rows: [{ id: "admin-a" }] };
      if (sql.includes("from accounts a left join")) return { rows };
      if (options.failAudit && sql.includes("insert into admin_audit_logs")) {
        throw new Error("audit unavailable");
      }
      return { rows: [] };
    },
    async connect() {
      return { query: pool.query.bind(pool), release() { released += 1; } };
    },
  };
  const app = Fastify();
  registerAdminRoutes(app, { pool, jwtKey: key, publicDirectory: "" });
  t.after(() => app.close());
  const token = await new SignJWT({ purpose: "admin" })
    .setProtectedHeader({ alg: "HS256" }).setSubject("admin-a")
    .setExpirationTime("5m").sign(key);
  const headers = { authorization: `Bearer ${token}` };
  const send = (method, url, body) => app.inject({ method, url, headers, ...(body ? { payload: body } : {}) });
  return { app, rows, queries, send, released: () => released };
}

const addPlaylist = {
  operation: "add_playlist",
  data: { name: "TV", m3uUrl: "https://provider.test/list.m3u" },
};

test("global form IDs are unique and its status does not reuse the shared toast", async () => {
  const html = await readFile(new URL("../public/admin.html", import.meta.url), "utf8");
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes("global-mutation-message"));
  assert.ok(ids.includes("global-message"));
  const js = await readFile(new URL("../public/admin.js", import.meta.url), "utf8");
  for (const [, id] of js.matchAll(/byId\("(global-[^"]+)"\)/g)) {
    assert.ok(ids.includes(id), `Missing global element ${id}`);
  }
});

test("global endpoints require an admin token", async (t) => {
  const { app, queries } = await fixture(t);
  for (const [method, url] of [
    ["GET", "/admin-api/global"],
    ["POST", "/admin-api/global/preview"],
    ["PATCH", "/admin-api/global/snapshot"],
  ]) {
    const response = await app.inject({ method, url });
    assert.equal(response.statusCode, 401);
  }
  assert.equal(queries.length, 0);
});

test("global inventory counts all accounts and does not expose playlist URLs", async (t) => {
  const { rows, send } = await fixture(t);
  for (const row of rows.slice(0, 2)) {
    row.payload.iptvByProfile.main.playlists = [{
      id: "tv", name: "TV", m3uUrl: "https://secret.test/token",
    }];
  }
  const response = await send("GET", "/admin-api/global");
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(response.json().total, 4);
  assert.equal(response.json().configurable, 2);
  assert.equal(response.json().skipped, 2);
  assert.deepEqual(response.json().playlists, [{ id: "tv", name: "TV", accountCount: 2 }]);
  assert.equal(response.body.includes("secret.test"), false);
});

test("global preview performs no writes and applying advances every changed revision with an audit", async (t) => {
  const { send, queries, released } = await fixture(t);
  const preview = await send("POST", "/admin-api/global/preview", addPlaylist);
  assert.equal(preview.statusCode, 200);
  assert.equal(preview.json().changed, 2);
  assert.equal(preview.json().skipped, 2);
  assert.equal(queries.some(({ sql }) => /update account_sync|insert into admin_audit/.test(sql)), false);
  const response = await send("PATCH", "/admin-api/global/snapshot", {
    ...addPlaylist, expectedState: preview.json().state, confirmation: "ALLE ACCOUNTS",
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().accepted, true);
  assert.equal(response.json().changed, 2);
  const updates = queries.filter(({ sql }) => sql.includes("update account_sync_snapshots"));
  const audits = queries.filter(({ sql }) => sql.includes("insert into admin_audit_logs"));
  assert.equal(updates.length, 2);
  assert.equal(audits.length, 2);
  assert.deepEqual(updates.map(({ values }) => values[2]), [4, 8]);
  for (const { values } of updates) {
    const next = JSON.parse(values[1]);
    assert.equal(next.iptvByProfile.main.playlists.length, 1);
    assert.equal(next.iptvByProfile.kids.playlists.length, 1);
  }
  assert.equal(audits[0].values[3], "global_add_playlist");
  assert.equal(JSON.parse(audits[0].values[5]).batchId, JSON.parse(audits[1].values[5]).batchId);
  assert.equal(queries.filter(({ sql }) => sql === "commit").length, 2);
  assert.equal(released(), 2);
});

test("global apply rejects stale previews without writes or automatic retry", async (t) => {
  const { send, rows, queries } = await fixture(t);
  const preview = await send("POST", "/admin-api/global/preview", addPlaylist);
  rows[0].revision = "4";
  const response = await send("PATCH", "/admin-api/global/snapshot", {
    ...addPlaylist, expectedState: preview.json().state, confirmation: "ALLE ACCOUNTS",
  });
  assert.equal(response.statusCode, 409);
  assert.equal(queries.some(({ sql }) => sql.includes("update account_sync_snapshots")), false);
  assert.equal(queries.at(-1).sql, "rollback");
});

test("global apply requires explicit confirmation and rejects invalid operations", async (t) => {
  const { send, queries } = await fixture(t);
  assert.equal((await send("PATCH", "/admin-api/global/snapshot", addPlaylist)).statusCode, 400);
  assert.equal((await send("POST", "/admin-api/global/preview", { operation: "edit_payload" })).statusCode, 400);
  assert.equal(queries.some(({ sql }) => sql === "begin"), false);
});

test("global selected removal is a no-op for accounts without that entry", async (t) => {
  const { send, rows, queries } = await fixture(t);
  rows[0].payload.iptvByProfile.main.playlists = [{ id: "tv", m3uUrl: "https://provider.test" }];
  const request = { operation: "delete_playlist", targetId: "tv" };
  const preview = await send("POST", "/admin-api/global/preview", request);
  assert.equal(preview.json().changed, 1);
  assert.equal(preview.json().unchanged, 1);
  const response = await send("PATCH", "/admin-api/global/snapshot", {
    ...request, expectedState: preview.json().state, confirmation: "ALLE ACCOUNTS",
  });
  assert.equal(response.statusCode, 200);
  assert.equal(queries.filter(({ sql }) => sql.includes("update account_sync_snapshots")).length, 1);
});

test("global changes roll back rather than reporting success if auditing fails", async (t) => {
  const { send, queries, released } = await fixture(t, { failAudit: true });
  const preview = await send("POST", "/admin-api/global/preview", addPlaylist);
  const response = await send("PATCH", "/admin-api/global/snapshot", {
    ...addPlaylist, expectedState: preview.json().state, confirmation: "ALLE ACCOUNTS",
  });
  assert.equal(response.statusCode, 500);
  assert.equal(queries.at(-1).sql, "rollback");
  assert.equal(queries.filter(({ sql }) => sql === "commit").length, 1);
  assert.equal(released(), 2);
});

test("a validation failure in a later account rolls back the entire global action", async (t) => {
  const { send, rows, queries } = await fixture(t);
  rows[1].payload.profiles[0].id = "__proto__";
  const inventory = await send("GET", "/admin-api/global");
  const response = await send("PATCH", "/admin-api/global/snapshot", {
    ...addPlaylist,
    expectedState: inventory.json().state,
    confirmation: "ALLE ACCOUNTS",
  });

  assert.equal(response.statusCode, 400);
  assert.match(response.json().error, /account-b.*profileId is invalid/);
  assert.equal(queries.filter(({ sql }) => sql.includes("update account_sync_snapshots")).length, 1);
  assert.equal(queries.at(-1).sql, "rollback");
  assert.equal(queries.some(({ sql }) => sql === "commit"), false);
});

test("Remote Config host migration retains individual credentials across accounts", async (t) => {
  const { send, rows, queries } = await fixture(t);
  for (const [index, row] of rows.slice(0, 2).entries()) {
    row.payload.iptvByProfile.main.playlists = [{
      id: "streamnet_tv", name: "StreamNet TV", m3uUrl: `https://old.test user${index} pass${index}`,
    }];
  }
  const request = {
    operation: "change_xtream_host", targetId: "streamnet_tv", data: { host: "https://new.test" },
  };
  const preview = await send("POST", "/admin-api/global/preview", request);
  assert.equal(preview.statusCode, 200);
  const applied = await send("PATCH", "/admin-api/global/snapshot", {
    ...request, expectedState: preview.json().state, confirmation: "ALLE ACCOUNTS",
  });
  assert.equal(applied.statusCode, 200);
  const updates = queries.filter(({ sql }) => sql.includes("update account_sync_snapshots"));
  assert.equal(updates.length, 2);
  for (const [index, { values }] of updates.entries()) {
    const item = JSON.parse(values[1]).iptvByProfile.main.playlists[0];
    assert.equal(new URL(item.m3uUrl).searchParams.get("username"), `user${index}`);
    assert.equal(new URL(item.m3uUrl).searchParams.get("password"), `pass${index}`);
    assert.equal(item.streamNetHostOverride, "https://new.test");
  }
});
