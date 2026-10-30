import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { registerPresenceRoutes, presenceTimeoutSeconds } from "../src/presence.js";

async function fixture(t) {
  const queries = [];
  const app = Fastify();
  registerPresenceRoutes(app, {
    pool: { async query(sql, params) { queries.push({ sql, params }); } },
    async authenticatedAccount(request) {
      if (request.headers.authorization !== "Bearer test-account") {
        throw Object.assign(new Error("Invalid bearer token"), { statusCode: 401 });
      }
      return { id: "authenticated-account" };
    },
  });
  t.after(() => app.close());
  return { app, queries };
}
const payload = { install_id: "install-a", platform: "android", device_type: "tv" };
const headers = { authorization: "Bearer test-account" };

test("presence requires authenticated account and never writes for unauthorized clients", async t => {
  const { app, queries } = await fixture(t);
  for (const authorization of [undefined, "Bearer expired", "Basic test-account"]) {
    const response = await app.inject({
      method: "POST", url: "/device-presence", payload,
      headers: authorization ? { authorization } : {},
    });
    assert.equal(response.statusCode, 401);
  }
  assert.equal(queries.length, 0);
});

test("heartbeat upserts account-scoped presence with server time, not analytics events", async t => {
  const { app, queries } = await fixture(t);
  for (let i = 0; i < 2; i++) {
    const response = await app.inject({
      method: "POST", url: "/device-presence", headers,
      payload: { ...payload, account_id: "forged-account", user_id: "forged-user",
        profile_id: "profile-a", app_version: "2.5.081", app_version_code: 482 },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["cache-control"], "no-store");
    assert.deepEqual(response.json(), { ok: true, expires_in: 90 });
  }
  assert.equal(presenceTimeoutSeconds, 90);
  assert.equal(queries.length, 2);
  for (const { sql, params } of queries) {
    assert.deepEqual(params, ["authenticated-account", "install-a", "profile-a", "android", "tv", "2.5.081", 482, null]);
    assert.match(sql, /on conflict \(account_id, install_id\) do update/);
    assert.match(sql, /last_seen = now\(\)/);
    assert.doesNotMatch(sql, /app_usage_events/);
    assert.match(sql, /insert into device_activity_daily/);
    assert.match(sql, /on conflict \(activity_date, account_id, install_id\) do nothing/);
    assert.match(sql, /time zone 'UTC'/);
  }
});

test("presence validates required identity, platform, bounded metadata and payload size", async t => {
  const { app, queries } = await fixture(t);
  for (const invalid of [
    {}, { ...payload, install_id: "" }, { ...payload, install_id: "a".repeat(201) },
    { ...payload, install_id: "bad id" }, { ...payload, platform: "unknown" },
    { ...payload, device_type: "" }, { ...payload, app_version: "a".repeat(81) },
    { ...payload, app_version_code: -1 },
  ]) {
    assert.equal((await app.inject({ method: "POST", url: "/device-presence", headers, payload: invalid })).statusCode, 400);
  }
  assert.equal((await app.inject({
    method: "POST", url: "/device-presence", headers, payload: { ...payload, extra: "x".repeat(5000) },
  })).statusCode, 413);
  assert.equal(queries.length, 0);
});

test("database failure is an error, never a successful heartbeat", async t => {
  const app = Fastify();
  registerPresenceRoutes(app, {
    pool: { async query() { throw new Error("database unavailable"); } },
    authenticatedAccount: async () => ({ id: "account" }),
  });
  t.after(() => app.close());
  assert.equal((await app.inject({ method: "POST", url: "/device-presence", headers, payload })).statusCode, 500);
});
