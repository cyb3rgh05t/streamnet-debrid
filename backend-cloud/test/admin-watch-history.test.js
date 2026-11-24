import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { SignJWT } from "jose";
import { registerAdminRoutes } from "../src/admin-routes.js";

const accountId = "c359e606-48d3-4f16-924c-243178cbcc01";

async function fixture(t) {
  const queries = [];
  const key = new TextEncoder().encode("test-admin-history-key");
  const app = Fastify();
  registerAdminRoutes(app, {
    publicDirectory: "", jwtKey: key,
    pool: {
      async query(sql, params) {
        queries.push({ sql, params });
        if (sql.includes("from admin_accounts")) return { rows: [{ id: "admin" }] };
        if (sql.includes("count(*)::int as total from watch_history")) return { rows: [{ total: 7 }] };
        if (sql.includes("from watch_history")) {
          return { rows: [{
            id: "h1", profile_id: "main", media_type: "tv", show_tmdb_id: 1399, season: 2, episode: 3,
            updated_at: "2026-11-23T21:40:49.709Z",
            payload: {
              title: "Show", episode_title: "Pilot", progress: 0.42, position_seconds: 600, duration_seconds: 1400,
              poster_path: "/p.jpg", stream_title: "Release.1080p", stream_key: "secret-key", user_id: "u1",
              progress_junk: { nested: true },
            },
          }] };
        }
        return { rows: [] };
      },
    },
  });
  t.after(() => app.close());
  const token = await new SignJWT({ purpose: "admin" })
    .setProtectedHeader({ alg: "HS256" }).setSubject("admin").setExpirationTime("5m").sign(key);
  return { app, queries, headers: { authorization: `Bearer ${token}` } };
}

test("watch history lists only display fields, newest first, with paging and a profile filter", async t => {
  const { app, headers, queries } = await fixture(t);
  const response = await app.inject({
    url: `/admin-api/accounts/${accountId}/watch-history?limit=500&offset=-5&profile_id=main`, headers,
  });
  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.total, 7);
  assert.equal(body.limit, 100);
  assert.equal(body.offset, 0);
  assert.deepEqual(body.items[0], {
    id: "h1", profile_id: "main", media_type: "tv", tmdb_id: 1399, season: 2, episode: 3,
    title: "Show", episode_title: "Pilot", progress: 0.42, position_seconds: 600, duration_seconds: 1400,
    poster_path: "/p.jpg", stream_title: "Release.1080p", updated_at: "2026-11-23T21:40:49.709Z",
  });
  const select = queries.find(({ sql }) => sql.includes("payload") && sql.includes("from watch_history"));
  assert.match(select.sql, /account_id = \$1 and profile_id = \$2/);
  assert.match(select.sql, /order by updated_at desc/);
  assert.deepEqual(select.params, [accountId, "main"]);
});

test("watch history requires an admin token", async t => {
  const { app } = await fixture(t);
  const response = await app.inject({ url: `/admin-api/accounts/${accountId}/watch-history` });
  assert.equal(response.statusCode, 401);
});
