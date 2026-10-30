import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { SignJWT } from "jose";
import { registerAdminRoutes } from "../src/admin-routes.js";

const key = new TextEncoder().encode("test-overview-key-not-for-production");

async function fixture(t, { failDatabase = false, migrations = ["011_account_session_metadata.sql"] } = {}) {
  const queries = [];
  const pool = {
    async query(sql) {
      queries.push(sql);
      if (sql.includes("from admin_accounts")) return { rows: [{ id: "admin-a" }] };
      if (failDatabase) throw new Error("database unavailable");
      if (sql.includes("generate_series")) return { rows: [{ date: "2026-10-30", devices: 3 }] };
      if (sql.includes("pg_database_size")) return { rows: [{
        accounts: "12", snapshots: "10", profiles: "24", active_sessions: "7",
        online_devices: "3", events_24h: "50", watch_history_items: "81",
        watch_state_items: "9", database_bytes: "83886080",
        new_accounts_24h: "2", new_accounts_7d: "4", syncs_24h: "6",
      }] };
      if (sql.includes("from schema_migrations")) return { rows: migrations.map(version => ({ version })) };
      if (sql.includes("count(*)::int as total") && sql.includes("from admin_audit_logs")) return { rows: [{ total: 1 }] };
      if (sql.includes("from admin_audit_logs")) return { rows: [{
        id: "audit-a", operation: "upsert_addon", account_email: "demo@example.test",
        profile_id: "profile-a", profile_name: "TV & Filme",
        created_at: "2026-10-29T09:00:00Z", reason: "Demo",
      }] };
      if (sql.includes("select id, email, created_at from accounts")) return { rows: [{
        id: "account-a", email: "demo@example.test", created_at: "2026-10-29T08:00:00Z",
      }] };
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
  const app = Fastify();
  registerAdminRoutes(app, { pool, jwtKey: key, publicDirectory: "" });
  t.after(() => app.close());
  const token = await new SignJWT({ purpose: "admin" })
    .setProtectedHeader({ alg: "HS256" }).setSubject("admin-a")
    .setExpirationTime("5m").sign(key);
  const headers = { authorization: `Bearer ${token}` };
  return { app, queries, headers };
}

test("dashboard endpoints require admin authentication before querying or fetching", async (t) => {
  const { app, queries } = await fixture(t);
  t.mock.method(globalThis, "fetch", () => { throw new Error("Unexpected fetch"); });
  for (const url of ["/admin-api/overview", "/admin-api/updates", "/admin-api/versions", "/admin-api/device-activity"]) {
    assert.equal((await app.inject({ url })).statusCode, 401);
  }
  assert.equal(queries.length, 0);
});

test("daily device activity is admin-only, uncached and validates periods", async t => {
  const { app, headers, queries } = await fixture(t);
  for (const days of ["7", "30"]) {
    const response = await app.inject({ url: `/admin-api/device-activity?days=${days}`, headers });
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["cache-control"], "no-store");
    assert.deepEqual(response.json(), { timezone: "UTC", days: [{ date: "2026-10-30", devices: 3 }] });
  }
  assert.equal((await app.inject({ url: "/admin-api/device-activity?days=999", headers })).statusCode, 400);
  const sql = queries.find(query => query.includes("generate_series"));
  assert.match(sql, /left join device_activity_daily/);
  assert.match(sql, /time zone 'UTC'/);
});

test("audit response includes the account-scoped profile name", async (t) => {
  const { app, headers, queries } = await fixture(t);
  const response = await app.inject({ url: "/admin-api/audits", headers });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().audits[0].profile_name, "TV & Filme");
  const sql = queries.find(query => query.includes("profile.name as profile_name"));
  assert.ok(sql.includes("snapshots.account_id = audit.account_id"));
  assert.ok(sql.includes("item->>'id' = audit.profile_id"));
  assert.ok(sql.includes("jsonb_typeof"));
});

test("overview preserves numeric metrics and adds runtime, schema and recent activity", async (t) => {
  const { app, headers, queries } = await fixture(t);
  const response = await app.inject({ url: "/admin-api/overview", headers });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["cache-control"], "no-store");
  const body = response.json();
  assert.equal(body.accounts, 12);
  assert.equal(body.profiles, 24);
  assert.equal(body.watch_history_items, 81);
  assert.equal(body.watch_state_items, 9);
  assert.equal(body.new_accounts_24h, 2);
  assert.equal(body.new_accounts_7d, 4);
  assert.equal(body.syncs_24h, 6);
  assert.equal(body.system.database_connected, true);
  assert.equal(body.system.schema_version, "011_account_session_metadata.sql");
  for (const field of ["uptime_seconds", "database_query_ms", "memory_rss_bytes",
    "heap_used_bytes", "heap_total_bytes", "host_memory_total_bytes",
    "host_memory_free_bytes", "cpu_average_percent"]) {
    assert.ok(Number.isFinite(body.system[field]) && body.system[field] >= 0, field);
  }
  assert.equal(body.system.node_version, process.version);
  assert.deepEqual(Object.keys(body.versions), ["backend"]);
  assert.equal(body.android_devices, undefined);
  const overviewSql = queries.find(sql => sql.includes("pg_database_size"));
  assert.match(overviewSql, /from device_presence\s+where last_seen >= now\(\) - interval '90 seconds'/);
  assert.doesNotMatch(overviewSql, /latest_events|distinct on \(install_id\)/);
  assert.equal(queries.some(sql => sql.includes("group by app_version")), false);
  assert.equal(body.recent_accounts.length, 1);
  assert.equal(body.recent_audits[0].operation, "upsert_addon");
  assert.ok(queries.some(sql => sql.includes("jsonb_typeof(payload->'profiles')")));
  assert.match(overviewSql, /localWatchedMoviesByProfile/);
  assert.match(overviewSql, /localWatchedEpisodesByProfile/);
  assert.match(overviewSql, /select account_id, state_type, state_key from snapshot_marks\s+union\s+select account_id, state_type, state_key from watch_state/);
  assert.match(overviewSql, /state_type in \('watched_movies', 'watched_episodes'\)/);
  assert.match(overviewSql, /payload->>'watched' is distinct from 'false'/);
  assert.ok(queries.filter(sql => sql.includes("limit 5")).length === 2);
});

test("overview explicitly reports an empty migration history", async (t) => {
  const { app, headers } = await fixture(t, { migrations: [] });
  const response = await app.inject({ url: "/admin-api/overview", headers });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().system.schema_version, null);
});

test("database failure is not presented as a healthy overview", async (t) => {
  const { app, headers } = await fixture(t, { failDatabase: true });
  const response = await app.inject({ url: "/admin-api/overview", headers });
  assert.equal(response.statusCode, 500);
  assert.equal(response.json().system, undefined);
});

test("live versions fetch deployed web and published APK without credentials", async (t) => {
  const { app, headers } = await fixture(t);
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    return Response.json(url.includes("api.github.com")
      ? { tag_name: "2.5.082", published_at: "2026-10-29T09:00:00Z", draft: false, prerelease: false, assets: [{ name: "StreamNet-Debrid-2.5.082.apk" }] }
      : { version: "1.0.070", build: "12345" });
  });
  const response = await app.inject({ url: "/admin-api/versions", headers });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["cache-control"], "no-store");
  const components = response.json().components;
  assert.equal(components[0].component, "backend");
  assert.equal(components[1].version, "1.0.070");
  assert.equal(components[1].build, "12345");
  assert.equal(components[2].version, "2.5.082");
  assert.equal(components[2].published_at, "2026-10-29T09:00:00Z");
  assert.deepEqual(calls.map(call => call.url), [
    "https://web.streamnet.live/api/version",
    "https://api.github.com/repos/cyb3rgh05t/streamnet-debrid/releases/latest",
  ]);
  for (const { url, options } of calls) {
    assert.deepEqual(options.headers, { accept: "application/json" });
    assert.equal(options.redirect, "error");
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal instanceof AbortSignal);
  }
});

test("live version check reports missing deployed endpoint and invalid release data", async (t) => {
  const { app, headers } = await fixture(t);
  t.mock.method(globalThis, "fetch", async url => {
    if (url.includes("web.streamnet.live")) return new Response("missing", { status: 404 });
    return Response.json({ tag_name: "invalid" });
  });
  const response = await app.inject({ url: "/admin-api/updates", headers });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().components.slice(1).map(item => item.error), [
    "Webplayer HTTP 404", "Ungültige Versionsantwort",
  ]);
});

test("live version check rejects releases without an APK and reports timeouts", async (t) => {
  const { app, headers } = await fixture(t);
  t.mock.method(globalThis, "fetch", async url => {
    if (url.includes("web.streamnet.live")) throw new Error("Request timed out");
    return Response.json({ tag_name: "2.5.082", published_at: "2026-10-29T09:00:00Z", assets: [] });
  });
  const response = await app.inject({ url: "/admin-api/versions", headers });
  assert.deepEqual(response.json().components.slice(1).map(item => item.error), [
    "Request timed out", "Kein veröffentlichtes APK-Release gefunden",
  ]);
});
