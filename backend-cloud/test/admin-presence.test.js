import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { SignJWT } from "jose";
import { readFile } from "node:fs/promises";
import { registerAdminRoutes } from "../src/admin-routes.js";

const accountId = "c359e606-48d3-4f16-924c-243178cbcc01";
async function fixture(t) {
  const queries = [];
  const key = new TextEncoder().encode("test-admin-presence-key");
  const app = Fastify();
  registerAdminRoutes(app, {
    publicDirectory: "", jwtKey: key,
    pool: {
      async query(sql, params) {
        queries.push({ sql, params });
        if (sql.includes("from admin_accounts")) return { rows: [{ id: "admin" }] };
        if (sql.includes("presence_supported")) return { rows: [
          { install_id: "live", online: true, presence_supported: true },
          { install_id: "expired", online: false, presence_supported: true },
          { install_id: "legacy", online: false, presence_supported: false },
        ] };
        if (sql.includes("snapshots.payload,")) return { rows: [{ id: accountId }] };
        if (sql.includes("from account_sessions")) return { rows: [] };
        if (sql.includes("removed_devices")) return { rows: [{ removed_devices: 1, removed_events: 0 }] };
        if (sql.includes("as total")) return { rows: [{ total: 0 }] };
        return { rows: [] };
      },
    },
  });
  t.after(() => app.close());
  const token = await new SignJWT({ purpose: "admin" })
    .setProtectedHeader({ alg: "HS256" }).setSubject("admin").setExpirationTime("5m").sign(key);
  return { app, queries, headers: { authorization: `Bearer ${token}` } };
}

test("account counts and online-only pagination use authenticated presence with the same 90-second cutoff", async t => {
  const { app, headers, queries } = await fixture(t);
  const response = await app.inject({ url: "/admin-api/accounts?online_only=1", headers });
  assert.equal(response.statusCode, 200);
  const countQueries = queries.filter(({ sql }) => sql.includes("from device_presence"));
  assert.equal(countQueries.length, 2);
  for (const { sql, params } of countQueries) {
    assert.match(sql, /account_id = accounts.id/);
    assert.match(sql, /last_seen >= now\(\) - interval '90 seconds'/);
    assert.doesNotMatch(sql, /app_usage_events/);
    assert.equal(params.at(-1), true);
  }
});

test("device details distinguish live, expired and unsupported clients; analytics cannot prove online", async t => {
  const { app, headers, queries } = await fixture(t);
  const response = await app.inject({ url: `/admin-api/accounts/${accountId}`, headers });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().account.devices.map(d => [d.install_id, d.online, d.status_label]), [
    ["live", true, "Online"], ["expired", false, "Offline"], ["legacy", false, "Kein Live-Status"],
  ]);
  const { sql, params } = queries.find(({ sql }) => sql.includes("presence_supported"));
  assert.deepEqual(params, [accountId]);
  assert.match(sql, /presence_supported and last_seen >= now\(\) - interval '90 seconds' as online/);
  assert.match(sql, /false as presence_supported/);
  assert.match(sql, /presence.account_id = \$1/);
  assert.match(sql, /presence.install_id = app_usage_events.install_id/);
});

test("removal deletes presence and analytics, while offline cleanup excludes recent heartbeats", async t => {
  const { app, headers, queries } = await fixture(t);
  for (const suffix of ["offline", "install-a"]) {
    const response = await app.inject({ method: "DELETE", url: `/admin-api/accounts/${accountId}/devices/${suffix}`, headers });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().removed_devices, 1);
    assert.equal(response.json().removed_events, 0);
  }
  const removals = queries.filter(({ sql }) => sql.includes("delete from device_presence"));
  assert.equal(removals.length, 2);
  assert.match(removals[0].sql, /last_seen < now\(\) - interval '90 seconds'/);
  assert.match(removals[0].sql, /presence.last_seen >= now\(\) - interval '90 seconds'/);
  assert.match(removals[0].sql, /not exists/);
  assert.deepEqual(removals[0].params, [accountId]);
  assert.deepEqual(removals[1].params, [accountId, "install-a"]);
  for (const { sql } of removals) assert.match(sql, /delete from app_usage_events/);
});

test("presence is bounded per account and installation and cascades on account deletion", async () => {
  const sql = await readFile(new URL("../migrations/012_device_presence.sql", import.meta.url), "utf8");
  assert.match(sql, /references accounts\(id\) on delete cascade/);
  assert.match(sql, /primary key \(account_id, install_id\)/);
});
