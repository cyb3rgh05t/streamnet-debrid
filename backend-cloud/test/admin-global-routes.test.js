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
  assert.deepEqual(response.json().playlists.find((item) => item.id === "tv"), { id: "tv", name: "TV", accountCount: 2 });
  assert.equal(response.body.includes("secret.test"), false);
});

test("global inventory lists the accounts that never synced an app entry, accounts without a device first", async (t) => {
  const { rows, send } = await fixture(t);
  rows[0].email = "a@example.test"; rows[0].last_device_seen_at = "2026-11-10T09:00:00Z";
  rows[1].email = "b@example.test"; rows[1].last_device_seen_at = null;
  rows[1].payload.iptvByProfile.main.playlists = [{ id: "streamnet_tv", name: "StreamNet TV", m3uUrl: "https://secret.test/token" }];
  const body = (await send("GET", "/admin-api/global")).json();
  const streamnet = body.playlists.find((item) => item.id === "streamnet_tv");
  assert.equal(streamnet.accountCount, 1);
  assert.deepEqual(streamnet.missingAccounts.map((account) => account.id), ["account-a"]);
  assert.equal(streamnet.missingAccounts[0].email, "a@example.test");
  const subtitles = body.addons.find((item) => item.id === "opensubtitles");
  assert.equal(subtitles.accountCount, 0);
  // Never-seen devices come first; the account without a snapshot or profile is not listed at all.
  assert.deepEqual(subtitles.missingAccounts.map((account) => account.id), ["account-b", "account-a"]);
  assert.equal(JSON.stringify(body).includes("secret.test"), false);
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

test("global app settings preview without writes, apply to every account and are audited with their fields", async (t) => {
  const { send, queries } = await fixture(t);
  const request = { operation: "set_app_settings", data: { settings: { autoPlayNext: false, dnsProvider: "google" } } };
  const preview = await send("POST", "/admin-api/global/preview", request);
  assert.equal(preview.statusCode, 200);
  assert.equal(preview.json().changed, 2);
  assert.equal(queries.some(({ sql }) => /update account_sync|insert into admin_audit/.test(sql)), false);
  const response = await send("PATCH", "/admin-api/global/snapshot", {
    ...request, expectedState: preview.json().state, confirmation: "ALLE ACCOUNTS",
  });
  assert.equal(response.statusCode, 200);
  const updates = queries.filter(({ sql }) => sql.includes("update account_sync_snapshots"));
  assert.equal(updates.length, 2);
  const next = JSON.parse(updates[0].values[1]);
  assert.equal(next.dnsProvider, "google");
  assert.equal(next.profileSettingsById.kids.autoPlayNext, false);
  const audit = queries.find(({ sql }) => sql.includes("insert into admin_audit_logs"));
  assert.equal(audit.values[3], "global_set_app_settings");
  assert.deepEqual(JSON.parse(audit.values[5]).settings, request.data.settings);
});

test("app-setting defaults are validated, stored centrally and listed with the settings catalog", async (t) => {
  const { app, send, queries } = await fixture(t);
  assert.equal((await app.inject({ method: "PUT", url: "/admin-api/global/app-defaults" })).statusCode, 401);
  const rejected = await send("PUT", "/admin-api/global/app-defaults", { settings: { subtitleSize: "Huge" } });
  assert.equal(rejected.statusCode, 400);
  assert.equal(queries.some(({ sql }) => sql.includes("insert into catalog_config")), false);
  const saved = await send("PUT", "/admin-api/global/app-defaults", { settings: { autoPlayNext: false } });
  assert.equal(saved.statusCode, 200);
  const write = queries.find(({ sql }) => sql.includes("insert into catalog_config"));
  assert.equal(write.values[0], "app-setting-defaults");
  assert.deepEqual(JSON.parse(write.values[1]), { settings: { autoPlayNext: false } });
  const overview = (await send("GET", "/admin-api/global")).json();
  assert.ok(overview.settingsCatalog.length > 0);
  assert.deepEqual(overview.appDefaults.settings, {});
});

test("global apply rejects stale previews without writes or automatic retry", async (t) => {
  const { send, rows, queries } = await fixture(t);
  const preview = await send("POST", "/admin-api/global/preview", addPlaylist);
  rows[0].payload.iptvByProfile.main.playlists.push({ id: "other", name: "Other" });
  const response = await send("PATCH", "/admin-api/global/snapshot", {
    ...addPlaylist, expectedState: preview.json().state, confirmation: "ALLE ACCOUNTS",
  });
  assert.equal(response.statusCode, 409);
  assert.equal(queries.some(({ sql }) => sql.includes("update account_sync_snapshots")), false);
  assert.equal(queries.at(-1).sql, "rollback");
});

test("global actions tolerate unrelated sync pushes that only bump revisions", async (t) => {
  const { send, rows, queries } = await fixture(t);
  const preview = await send("POST", "/admin-api/global/preview", addPlaylist);
  rows[0].revision = "4";
  rows[0].updated_at = "2026-11-15";
  rows[0].payload.watchStateByProfile = { main: { movie: { position: 1 } } };
  rows[1].revision = "9";
  const response = await send("PATCH", "/admin-api/global/snapshot", {
    ...addPlaylist, expectedState: preview.json().state, confirmation: "ALLE ACCOUNTS",
  });
  assert.equal(response.statusCode, 200);
  const updates = queries.filter(({ sql }) => sql.includes("update account_sync_snapshots"));
  assert.deepEqual(updates.map(({ values }) => values[2]), [5, 10]);
  assert.deepEqual(JSON.parse(updates[0].values[1]).watchStateByProfile, { main: { movie: { position: 1 } } });
});

test("global host preview and apply handle blank StreamNet presets alongside configured profiles", async (t) => {
  const { send, rows, queries } = await fixture(t);
  const preset = { id: "streamnet_tv", name: "StreamNet TV", m3uUrl: "", enabled: false };
  rows[0].payload.iptvByProfile.main.playlists = [structuredClone(preset)];
  rows[0].payload.iptvByProfile.kids.playlists = [{
    ...preset, m3uUrl: "https://old.test user pass", enabled: true,
  }];
  rows[1].payload.iptvByProfile.main.playlists = [structuredClone(preset)];
  const request = {
    operation: "change_xtream_host", targetId: "streamnet_tv", data: { host: "https://new.test" },
  };
  const preview = await send("POST", "/admin-api/global/preview", request);
  assert.equal(preview.statusCode, 200);
  assert.equal(preview.json().changed, 2);
  assert.equal(preview.json().skipped, 2);
  assert.equal(queries.some(({ sql }) => sql.includes("update account_sync_snapshots")), false);
  assert.deepEqual(rows[0].payload.iptvByProfile.main.playlists[0], preset);
  const response = await send("PATCH", "/admin-api/global/snapshot", {
    ...request, expectedState: preview.json().state, confirmation: "ALLE ACCOUNTS",
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().changed, 2);
  const updates = queries.filter(({ sql }) => sql.includes("update account_sync_snapshots"));
  assert.equal(updates.length, 2);
  for (const { values } of updates) {
    const next = JSON.parse(values[1]);
    assert.deepEqual(next.iptvByProfile.main.playlists[0], {
      ...preset, streamNetHostOverride: "https://new.test",
    });
    assert.equal(next.streamNetHostOverridesByProfile.main, "https://new.test");
  }
  const configured = JSON.parse(updates[0].values[1]).iptvByProfile.kids.playlists[0];
  assert.equal(new URL(configured.m3uUrl).origin, "https://new.test");
  assert.equal(new URL(configured.m3uUrl).searchParams.get("username"), "user");
  assert.equal(new URL(configured.m3uUrl).searchParams.get("password"), "pass");
  assert.equal(configured.enabled, true);
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

test("host changes tolerate unrelated sync pushes and preserve their latest data", async (t) => {
  const { send, rows, queries } = await fixture(t);
  const playlist = {
    id: "streamnet_tv", name: "StreamNet TV", m3uUrl: "https://old.test user pass",
    enabled: true, expiresAtEpochSeconds: 100, expirationCheckedAtMillis: 1000,
  };
  rows[0].payload.iptvByProfile.main.playlists = [playlist];
  const request = {
    operation: "change_xtream_host", targetId: "streamnet_tv", data: { host: "https://new.test" },
  };
  const preview = await send("POST", "/admin-api/global/preview", request);
  assert.equal(preview.statusCode, 200);
  rows[0].revision = "10";
  rows[0].updated_at = "2026-11-05";
  rows[0].payload.watchStateByProfile = { main: { movie: { position: 123 } } };
  rows[0].payload.fieldUpdatedAt = { "w:main:movie": 5000 };
  playlist.expiresAtEpochSeconds = 200;
  playlist.expirationCheckedAtMillis = 5000;
  // JSON object key order is not meaningful and can change on a database round trip.
  rows[0].payload.iptvByProfile.main.playlists[0] = Object.fromEntries(Object.entries(playlist).reverse());
  rows[0].payload.iptvByProfile.main.playlists.push({ id: "custom", m3uUrl: "https://custom.test/list" });
  rows[1].revision = "8";
  const applied = await send("PATCH", "/admin-api/global/snapshot", {
    ...request, expectedState: preview.json().state, confirmation: "ALLE ACCOUNTS",
  });
  assert.equal(applied.statusCode, 200);
  const updates = queries.filter(({ sql }) => sql.includes("update account_sync_snapshots"));
  assert.equal(updates.length, 1);
  assert.equal(updates[0].values[2], 11);
  const next = JSON.parse(updates[0].values[1]);
  assert.deepEqual(next.watchStateByProfile, rows[0].payload.watchStateByProfile);
  assert.equal(next.fieldUpdatedAt["w:main:movie"], 5000);
  assert.deepEqual(next.iptvByProfile.main.playlists[1], rows[0].payload.iptvByProfile.main.playlists[1]);
  assert.equal(next.iptvByProfile.main.playlists[0].streamNetHostOverride, "https://new.test");
});

test("host changes reject relevant changes and modified requests without writes", async (t) => {
  const changes = {
    credentials: (rows) => { rows[0].payload.iptvByProfile.main.playlists[0].m3uUrl = "https://old.test other pass"; },
    activation: (rows) => { rows[0].payload.iptvByProfile.main.playlists[0].enabled = false; },
    options: (rows) => { rows[0].payload.iptvByProfile.main.playlists[0].importVod = false; },
    override: (rows) => { rows[0].payload.iptvByProfile.main.playlists[0].streamNetHostOverride = "https://other.test"; },
    policy: (rows) => { rows[0].payload.streamNetHostOverridesByProfile = { main: "https://other.test" }; },
    removal: (rows) => { rows[0].payload.iptvByProfile.main.playlists = []; },
    profile: (rows) => { rows[0].payload.profiles.push({ id: "new" }); },
    account: (rows) => { rows.push({ account_id: "new", payload: null }); },
    snapshot: (rows) => { rows[2].payload = payload(); },
    host: (_rows, request) => { request.data = { host: "https://other.test" }; },
    target: (_rows, request) => { request.targetId = "other"; },
  };
  for (const [name, change] of Object.entries(changes)) {
    await t.test(name, async (t) => {
      const { send, rows, queries } = await fixture(t);
      rows[0].payload.iptvByProfile.main.playlists = [{
        id: "streamnet_tv", m3uUrl: "https://old.test user pass", enabled: true,
      }];
      const request = {
        operation: "change_xtream_host", targetId: "streamnet_tv", data: { host: "https://new.test" },
      };
      const preview = await send("POST", "/admin-api/global/preview", request);
      assert.equal(preview.statusCode, 200);
      change(rows, request);
      const applied = await send("PATCH", "/admin-api/global/snapshot", {
        ...request, expectedState: preview.json().state, confirmation: "ALLE ACCOUNTS",
      });
      assert.equal(applied.statusCode, 409);
      assert.equal(queries.some(({ sql }) => /update account_sync|insert into admin_audit/.test(sql)), false);
      assert.equal(queries.at(-1).sql, "rollback");
    });
  }
});

test("catalog templates preview and apply account-wide with preserved metadata and audit", async (t) => {
  const { send, rows, queries } = await fixture(t);
  rows[0].payload.catalogsByProfile = { main: [{
    id: "built-in", title: "Built-in", sourceType: "MDBLIST", isPreinstalled: true,
    sourceUrl: "https://mdblist.com/lists/owner/list", enabled: true,
  }] };
  const request = {
    operation: "add_catalog",
    data: { sourceType: "PREINSTALLED", templateId: "built-in", title: "Cinema", enabled: false },
  };
  const preview = await send("POST", "/admin-api/global/preview", request);
  assert.equal(preview.statusCode, 200);
  assert.equal(preview.json().changed, 2);
  assert.equal(queries.some(({ sql }) => sql.includes("update account_sync_snapshots")), false);
  const result = await send("PATCH", "/admin-api/global/snapshot", {
    ...request, expectedState: preview.json().state, confirmation: "ALLE ACCOUNTS",
  });
  assert.equal(result.statusCode, 200);
  const updates = queries.filter(({ sql }) => sql.includes("update account_sync_snapshots"));
  assert.equal(updates.length, 2);
  for (const { values } of updates) {
    const payload = JSON.parse(values[1]);
    const catalog = payload.catalogsByProfile.main.find((item) => item.id === "built-in");
    assert.equal(catalog.title, "Cinema");
    assert.equal(catalog.sourceType, "MDBLIST");
    assert.equal(catalog.sourceUrl, "https://mdblist.com/lists/owner/list");
    assert.ok(payload.hiddenPreinstalledByProfile.main.includes("built-in"));
    assert.ok(payload.catalogsUpdatedAtByProfile.main > 0);
  }
  const audits = queries.filter(({ sql }) => sql.includes("insert into admin_audit_logs"));
  assert.equal(audits.length, 2);
  assert.ok(audits.every(({ values }) => values[3] === "global_add_catalog"));
});

test("catalog removal tolerates unrelated sync pushes but rejects changes to that catalog", async (t) => {
  const custom = { id: "custom-list", title: "Custom", sourceType: "MDBLIST", enabled: true };
  const request = { operation: "delete_catalog", targetId: "custom-list" };
  const apply = (send, preview) => send("PATCH", "/admin-api/global/snapshot", {
    ...request, expectedState: preview.json().state, confirmation: "ALLE ACCOUNTS",
  });

  const unrelated = await fixture(t);
  for (const row of unrelated.rows.slice(0, 2)) row.payload.catalogsByProfile = { main: [{ ...custom }] };
  const preview = await unrelated.send("POST", "/admin-api/global/preview", request);
  assert.equal(preview.statusCode, 200);
  assert.equal(preview.json().changed, 2);
  unrelated.rows[0].revision = "4";
  unrelated.rows[1].revision = "8";
  unrelated.rows[0].payload.watchStateByProfile = { main: { movie: { position: 1 } } };
  const applied = await apply(unrelated.send, preview);
  assert.equal(applied.statusCode, 200);
  assert.equal(unrelated.queries.filter(({ sql }) => sql.includes("update account_sync_snapshots")).length, 2);

  const related = await fixture(t);
  for (const row of related.rows.slice(0, 2)) row.payload.catalogsByProfile = { main: [{ ...custom }] };
  const stale = await related.send("POST", "/admin-api/global/preview", request);
  related.rows[0].payload.catalogsByProfile.main[0].enabled = false;
  const rejected = await apply(related.send, stale);
  assert.equal(rejected.statusCode, 409);
  assert.equal(related.queries.some(({ sql }) => sql.includes("update account_sync_snapshots")), false);
  assert.equal(related.queries.at(-1).sql, "rollback");
});

test("MDBList list titles are read from the page title, cached, validated and tolerate failures", async (t) => {
  const { send } = await fixture(t);
  const requested = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    requested.push(String(url));
    if (String(url).endsWith("/broken/list")) throw new Error("offline");
    return new Response("<html><title>Popular 2020s &amp; More, a list by snoak - mdblist.com</title></html>", { status: 200 });
  });
  const first = await send("GET", "/admin-api/global/mdblist-titles?slugs=title-user/ok-list,title-user/broken/list,title-user/broken-list,../evil,a%20b/c,x/..");
  assert.equal(first.statusCode, 200);
  assert.deepEqual(first.json().titles, { "title-user/ok-list": "Popular 2020s & More", "title-user/broken-list": "Popular 2020s & More" });
  assert.deepEqual(requested.sort(), [
    "https://mdblist.com/lists/title-user/broken-list",
    "https://mdblist.com/lists/title-user/ok-list",
  ]);
  await send("GET", "/admin-api/global/mdblist-titles?slugs=title-user/ok-list");
  assert.equal(requested.length, 2);

  t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  const failed = await send("GET", "/admin-api/global/mdblist-titles?slugs=title-user/down-list");
  assert.deepEqual(failed.json().titles, { "title-user/down-list": null });
});

test("bundled catalog lists are listed across accounts without rows the app no longer ships", async (t) => {
  const { send, rows } = await fixture(t);
  const homeRow = () => ({
    id: "trending_movies", title: "Trending", sourceType: "MDBLIST", isPreinstalled: true, enabled: true,
    sourceUrl: "https://mdblist.com/lists/snoak/trending-movies",
    sourceRef: "mdblist:https://mdblist.com/lists/snoak/trending-movies",
  });
  const decade = () => ({
    id: "decade_2020s", title: "2020s", sourceType: "PREINSTALLED", isPreinstalled: true, kind: "COLLECTION",
    collectionSources: [
      { kind: "TMDB_GENRE", tmdbGenreId: 28 },
      { kind: "MDBLIST_PUBLIC", mdblistSlug: "snoak/top-2020s-movies" },
    ],
  });
  for (const row of rows.slice(0, 2)) row.payload.catalogsByProfile = { main: [homeRow(), decade()], kids: [homeRow()] };
  // An older build stored a differently ordered source list and extra rows the app no longer ships.
  rows[1].payload.catalogsByProfile.main[1].id = "collection_decade_2020s";
  rows[1].payload.catalogsByProfile.main[1].collectionSources.unshift({ kind: "ADDON_CATALOG" });
  rows[1].payload.catalogsByProfile.main.push({
    id: "legacy_row", title: "Legacy", sourceType: "MDBLIST", isPreinstalled: true,
    sourceUrl: "https://mdblist.com/lists/old/legacy",
  });
  rows[0].payload.catalogsByProfile.main[1].id = "collection_decade_2020s";
  // Network collections were dropped by the app; accounts that still hold one must not be listed.
  rows[0].payload.catalogsByProfile.main.push({
    id: "collection_network_disneyplus", title: "Disney+", isPreinstalled: true, kind: "COLLECTION",
    collectionSources: [{ kind: "MDBLIST_PUBLIC", mdblistSlug: "garycrawfordgc/disney-shows" }],
  });

  const list = await send("GET", "/admin-api/global/default-catalogs");
  assert.equal(list.statusCode, 200);
  const byId = Object.fromEntries(list.json().catalogs.map((item) => [item.id, item]));
  assert.equal(byId.legacy_row, undefined);
  assert.equal(byId.collection_network_disneyplus, undefined);
  assert.equal(byId.trending_movies.kind, "home");
  assert.deepEqual(byId.trending_movies.sources[0].variants, [
    { value: "https://mdblist.com/lists/snoak/trending-movies", accounts: 2 },
  ]);
  assert.equal(byId.collection_decade_2020s.sources.length, 1);
  assert.deepEqual(byId.collection_decade_2020s.sources[0].variants, [
    { value: "snoak/top-2020s-movies", accounts: 2 },
  ]);
});

test("clearing a catalog source override removes only the override fields, including titles added per account", async (t) => {
  const { send, rows, queries } = await fixture(t);
  rows[0].payload.catalogsByProfile = { main: [{
    id: "trending_movies", title: "Trending", sourceType: "MDBLIST", isPreinstalled: true, remoteManaged: true,
    sourceUrl: "https://mdblist.com/lists/me/new", remoteSourceUrl: "https://mdblist.com/lists/me/new",
  }, {
    id: "collection_franchise_lotr", title: "LotR", isPreinstalled: true, kind: "COLLECTION", remoteExtraRefs: ["tv:84773"],
  }] };
  for (const targetId of ["trending_movies", "collection_franchise_lotr"]) {
    const request = { operation: "clear_catalog_source", targetId };
    const preview = await send("POST", "/admin-api/global/preview", request);
    const applied = await send("PATCH", "/admin-api/global/snapshot", {
      ...request, expectedState: preview.json().state, confirmation: "ALLE ACCOUNTS",
    });
    assert.equal(applied.statusCode, 200, targetId);
  }
  const updates = queries.filter(({ sql }) => sql.includes("update account_sync_snapshots"));
  assert.equal(updates.length, 2);
  // The fixture does not keep state between requests, so each update shows the effect of its own request.
  const row = JSON.parse(updates[0].values[1]).catalogsByProfile.main[0];
  const lotr = JSON.parse(updates[1].values[1]).catalogsByProfile.main[1];
  assert.equal("remoteSourceUrl" in row, false);
  assert.equal(row.title, "Trending");
  assert.equal("remoteExtraRefs" in lotr, false);
  assert.equal(lotr.title, "LotR");
});

test("removing obsolete catalogs keeps everything the app still ships", async (t) => {
  const { send, rows, queries } = await fixture(t);
  const mdb = (slug) => ({ kind: "MDBLIST_PUBLIC", mdblistSlug: slug });
  const keep = { id: "collection_service_netflix", title: "Netflix", isPreinstalled: true, kind: "COLLECTION" };
  const dc = {
    id: "collection_franchise_dc_universe", title: "DC", isPreinstalled: true, kind: "COLLECTION",
    collectionSources: [mdb("kingkearney/dc-universe"), mdb("kraftynic/dc-tv-shows1")],
    remoteSlugOverrides: { "kingkearney/dc-universe": "me/dc", "other/list": "me/other" },
  };
  const solo = {
    id: "collection_franchise_solo", title: "Solo", isPreinstalled: true, kind: "COLLECTION",
    collectionSources: [mdb("kingkearney/dc-universe")],
  };
  const disney = { id: "collection_network_disneyplus", title: "Disney+", isPreinstalled: true, kind: "COLLECTION" };
  const studio = { id: "collection_studio_pixar", title: "Pixar", isPreinstalled: true, kind: "COLLECTION" };
  const featured = { id: "collection_featured_trending_movies", title: "Trending Movies", isPreinstalled: true, kind: "COLLECTION" };
  rows[0].payload.catalogsByProfile = { main: [keep, disney, dc, solo, studio, featured] };
  rows[0].payload.hiddenPreinstalledByProfile = { main: ["collection_network_disneyplus", "trending_movies"] };
  rows[1].payload.catalogsByProfile = { main: [keep] };

  const request = { operation: "remove_obsolete_catalogs" };
  const preview = await send("POST", "/admin-api/global/preview", request);
  assert.equal(preview.statusCode, 200);
  assert.equal(preview.json().changed, 1);
  const applied = await send("PATCH", "/admin-api/global/snapshot", {
    ...request, expectedState: preview.json().state, confirmation: "ALLE ACCOUNTS",
  });
  assert.equal(applied.statusCode, 200);
  const saved = JSON.parse(queries.find(({ sql }) => sql.includes("update account_sync_snapshots")).values[1]);
  assert.deepEqual(saved.catalogsByProfile.main.map((c) => c.id),
    ["collection_service_netflix", "collection_franchise_dc_universe", "collection_franchise_solo"]);
  const savedDc = saved.catalogsByProfile.main[1];
  assert.deepEqual(savedDc.collectionSources.map((s) => s.mdblistSlug), ["kraftynic/dc-tv-shows1"]);
  assert.deepEqual(savedDc.remoteSlugOverrides, { "other/list": "me/other" });
  assert.equal("remoteManaged" in savedDc, false);
  // A collection is never emptied, even when its only list is obsolete.
  assert.equal(saved.catalogsByProfile.main[2].collectionSources.length, 1);
  assert.deepEqual(saved.hiddenPreinstalledByProfile.main, ["trending_movies"]);

  rows[0].payload = saved;
  const again = await send("POST", "/admin-api/global/preview", request);
  assert.equal(again.json().changed, 0);
});

test("unavailable catalog templates are rejected without snapshot writes", async (t) => {
  const { send, queries } = await fixture(t);
  const result = await send("POST", "/admin-api/global/preview", {
    operation: "add_catalog", data: { sourceType: "ADDON", templateId: "missing" },
  });
  assert.equal(result.statusCode, 400);
  assert.equal(result.json().error, "Catalog template is unavailable");
  assert.equal(queries.some(({ sql }) => sql.includes("update account_sync_snapshots")), false);
  assert.equal(queries.at(-1).sql, "rollback");
});
