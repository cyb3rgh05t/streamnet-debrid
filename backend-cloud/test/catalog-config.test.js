import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import Fastify from "fastify";
import { SignJWT } from "jose";
import { registerAdminRoutes } from "../src/admin-routes.js";
import { validateTabs, validateOverrides, catalogIdFor, loadStandards } from "../src/catalog-config.js";

const key = new TextEncoder().encode("test-admin-key-not-for-production");

async function fixture(t, stored = []) {
  const queries = [];
  const rows = [...stored];
  const run = async (sql, values) => {
    queries.push({ sql, values });
    if (sql.includes("from admin_accounts")) return { rows: [{ id: "admin-a" }] };
    if (sql.startsWith("delete from catalog_config")) {
      rows.splice(0, rows.length, ...rows.filter((row) => row.id !== values[0]));
      return { rows: [] };
    }
    if (sql.includes("from catalog_config where id")) return { rows: rows.filter((row) => row.id === values[0]) };
    if (sql.includes("from catalog_config")) return { rows };
    if (sql.includes("insert into catalog_config")) {
      const existing = rows.find((row) => row.id === values[0]);
      const next = { id: values[0], payload: JSON.parse(values[1]), revision: existing ? Number(existing.revision) + 1 : 1, updated_at: "2026-11-19T08:00:00Z" };
      rows.splice(0, rows.length, ...rows.filter((row) => row.id !== values[0]), next);
    }
    return { rows: [] };
  };
  const pool = { query: run, async connect() { return { query: run, release() {} }; } };
  const app = Fastify();
  registerAdminRoutes(app, { pool, jwtKey: key, publicDirectory: "" });
  t.after(() => app.close());
  const token = await new SignJWT({ purpose: "admin" }).setProtectedHeader({ alg: "HS256" })
    .setSubject("admin-a").setExpirationTime("5m").sign(key);
  const headers = { authorization: `Bearer ${token}` };
  const call = (method, url, payload) => app.inject({ method, url, headers, ...(payload ? { payload } : {}) });
  return { app, queries, call, rows };
}

test("the bundled seed meets the rules an admin edit is held to and keeps the Marvel season entries", async () => {
  const seed = JSON.parse(await readFile(new URL("../src/franchise-lists.seed.json", import.meta.url), "utf8"));
  assert.deepEqual(Object.keys(seed.lists), ["marvel", "dc", "starwars"]);
  for (const list of Object.values(seed.lists)) {
    assert.deepEqual(validateTabs(list.tabs), list.tabs, list.id);
    for (const tab of ["movie", "series", "timeline"]) assert.ok(list.tabs[tab].length > 0, `${list.id}/${tab}`);
  }
  const timeline = seed.lists.marvel.tabs.timeline;
  assert.ok(timeline.length > new Set(timeline.map((e) => e.ref)).size, "season entries are repeated in the timeline");
  assert.equal(new Set(seed.lists.marvel.tabs.series.map((e) => e.ref)).size, seed.lists.marvel.tabs.series.length);
});

test("the shipped copies equal the shared contract files of the apps", async () => {
  for (const [local, shared] of [["franchise-lists.seed.json", "franchise-lists.json"], ["standard-catalogs.txt", "standard-catalogs.txt"], ["standard-covers.txt", "standard-covers.txt"]]) {
    const a = (await readFile(new URL(`../src/${local}`, import.meta.url), "utf8")).replace(/\r\n/g, "\n");
    const b = (await readFile(new URL(`../../catalog-contract/${shared}`, import.meta.url), "utf8")).replace(/\r\n/g, "\n");
    assert.equal(a, b, `${local} is out of date; copy it from catalog-contract/${shared}`);
  }
});

test("tabs keep repeated titles only in the timeline", () => {
  const cleaned = validateTabs({
    movie: [{ ref: "movie:1" }, { ref: "movie:1" }],
    series: [{ ref: "tv:2" }, { ref: "tv:2" }],
    timeline: [{ ref: "tv:2", title: "Staffel 1" }, { ref: "tv:2", title: "Staffel 2" }],
  });
  assert.equal(cleaned.movie.length, 1);
  assert.equal(cleaned.series.length, 1);
  assert.deepEqual(cleaned.timeline.map((e) => e.title), ["Staffel 1", "Staffel 2"]);
});

test("the public config serves the seed, then prefers saved and created franchises", async (t) => {
  const plain = await fixture(t);
  const seeded = (await plain.app.inject({ method: "GET", url: "/catalog-config" })).json();
  assert.equal(seeded.version, 2);
  assert.deepEqual(seeded.franchises.map((f) => f.id), ["marvel", "dc", "starwars"]);
  assert.ok(seeded.franchises.every((f) => f.builtin && f.revision === 0));
  assert.deepEqual(seeded.overrides, { rows: {}, covers: {}, sources: {}, extras: {}, hidden: [], newRows: [] });

  const saved = [
    { id: "franchise:dc", payload: { tabs: { movie: [{ ref: "movie:1" }], series: [], timeline: [] } }, revision: "3", updated_at: "2026-11-19T07:00:00Z" },
    { id: "franchise:ghibli", payload: { title: "Ghibli", coverUrl: "https://example.com/g.jpg", tabs: { movie: [{ ref: "movie:129" }], series: [], timeline: [] }, tmdbCollections: [], mdblist: [] }, revision: "1", updated_at: "2026-11-19T07:30:00Z" },
  ];
  const custom = await fixture(t, saved);
  const config = (await custom.app.inject({ method: "GET", url: "/catalog-config" })).json();
  assert.deepEqual(config.franchises.find((f) => f.id === "dc").tabs.movie, [{ ref: "movie:1" }]);
  const ghibli = config.franchises.find((f) => f.id === "ghibli");
  assert.equal(ghibli.builtin, false);
  assert.equal(ghibli.catalogId, "collection_franchise_ghibli");
});

test("admin saves a built-in list, creates, edits and deletes a custom franchise, with audit entries", async (t) => {
  const { app, call, queries } = await fixture(t);
  const body = { reason: "neu", tabs: { movie: [], series: [{ ref: "tv:114479", title: "The Acolyte" }], timeline: [{ ref: "movie:11" }] } };

  assert.equal((await app.inject({ method: "PUT", url: "/admin-api/catalog-config/franchises/starwars", payload: body })).statusCode, 401);
  const builtin = await call("PUT", "/admin-api/catalog-config/franchises/starwars", body);
  assert.equal(builtin.statusCode, 200);
  assert.equal(builtin.json().franchise.custom, true);
  assert.equal(builtin.json().franchise.title, "Star Wars");

  const created = await call("PUT", "/admin-api/catalog-config/franchises/studio-ghibli", {
    title: "Studio Ghibli", coverUrl: "https://example.com/ghibli.jpg",
    tabs: { movie: [{ ref: "movie:129" }], series: [], timeline: [] }, tmdbCollections: [8], mdblist: ["user/ghibli-list"],
  });
  assert.equal(created.statusCode, 200);
  assert.equal(created.json().franchise.catalogId, "collection_franchise_studio_ghibli");
  const edited = await call("PUT", "/admin-api/catalog-config/franchises/studio-ghibli", {
    title: "Ghibli", tabs: { movie: [{ ref: "movie:129" }, { ref: "movie:128" }], series: [], timeline: [] },
  });
  assert.equal(edited.json().franchise.tabs.movie.length, 2);
  assert.equal(edited.json().franchise.revision, 2);

  assert.equal((await call("DELETE", "/admin-api/catalog-config/franchises/studio-ghibli")).json().deleted, true);
  assert.equal((await call("DELETE", "/admin-api/catalog-config/franchises/studio-ghibli")).statusCode, 404);
  assert.equal((await call("DELETE", "/admin-api/catalog-config/franchises/starwars")).json().franchise.custom, false);
  const operations = queries.filter(({ sql }) => sql.includes("insert into admin_audit_logs")).map(({ values }) => values[2]);
  assert.deepEqual(operations, ["catalog_franchise_save", "catalog_franchise_save", "catalog_franchise_save", "catalog_franchise_delete", "catalog_franchise_reset"]);
});

test("a custom franchise is validated: id, title, cover, lists and reserved built-in ids", async (t) => {
  const { call } = await fixture(t);
  const ok = { title: "Test", tabs: { movie: [], series: [], timeline: [] } };
  const put = (id, body) => call("PUT", `/admin-api/catalog-config/franchises/${id}`, { ...ok, ...body });
  for (const [id, body, pattern] of [
    ["A", {}, /Id: 3-40/],
    ["john-wick", {}, /built-in franchise/],
    ["james-bond", {}, /built-in franchise/],
    ["fine-id", { title: "x" }, /Title needs/],
    ["fine-id", { coverUrl: "http://example.com/a.jpg" }, /plain https/],
    ["fine-id", { coverUrl: "https://user:pw@example.com/a.jpg" }, /plain https/],
    ["fine-id", { tmdbCollections: ["abc"] }, /invalid id/],
    ["fine-id", { mdblist: ["not a list"] }, /is not user\/list/],
    ["fine-id", { tabs: { movie: [{ ref: "tv:1" }] } }, /movie tab only takes movie/],
  ]) {
    const response = await put(id, body);
    assert.equal(response.statusCode, 400, `${id} ${JSON.stringify(body)}`);
    assert.match(response.json().message ?? response.json().error, pattern);
  }
  assert.equal(catalogIdFor("a-b-c"), "collection_franchise_a_b_c");
});

test("overrides accept only known rows, collections and franchises, drop values equal to the default and clean the rest", async (t) => {
  const standards = await loadStandards();
  const row = standards.find((s) => s.kind === "STANDARD" && s.sourceUrl.includes("mdblist.com"));
  const bond = standards.find((s) => s.id === "collection_franchise_james_bond");
  const hp = standards.find((s) => s.id === "collection_franchise_harry_potter");
  const netflix = standards.find((s) => s.id === "collection_service_netflix");
  assert.ok(netflix.coverUrl.startsWith("https://"), "services carry their default cover");
  assert.deepEqual(bond.tmdbCollections, [645]);

  const clean = validateOverrides({
    rows: { [row.id]: "me/my-list" },
    covers: { [netflix.id]: "https://example.com/n.jpg", [bond.id]: bond.coverUrl },
    sources: {
      [hp.id]: { tmdbCollections: [7, 9, 7], mdblist: ["me/hp"] },
      [bond.id]: { tmdbCollections: [645] },
    },
    extras: {},
  }, standards);
  assert.equal(clean.rows[row.id], "https://mdblist.com/lists/me/my-list");
  assert.deepEqual(Object.keys(clean.covers), [netflix.id], "a cover equal to the default is not stored");
  assert.deepEqual(clean.sources, { [hp.id]: { tmdbCollections: [7, 9], mdblist: ["me/hp"] } });

  assert.throws(() => validateOverrides({ rows: { nope: "me/x" } }, standards), /Unknown home row/);
  assert.throws(() => validateOverrides({ rows: { [row.id]: "https://evil.example/lists/a/b" } }, standards), /not an MDBList link/);
  assert.throws(() => validateOverrides({ covers: { nope: "https://example.com/a.jpg" } }, standards), /Unknown collection/);
  assert.throws(() => validateOverrides({ covers: { [netflix.id]: "http://example.com/a.jpg" } }, standards), /plain https/);
  assert.throws(() => validateOverrides({ sources: { [hp.id]: { mdblist: ["bad slug"] } } }, standards), /is not user\/list/);
  assert.throws(() => validateOverrides({ sources: { [netflix.id]: { tmdbCollections: [1] } } }, standards), /only for franchises/);
  assert.throws(() => validateOverrides({ sources: { [hp.id]: { tmdbCollections: ["x"] } } }, standards), /invalid id/);
  assert.throws(() => validateOverrides({ extras: { [bond.id]: ["tv:abc"] } }, standards), /is not movie:ID or tv:ID/);
  assert.throws(() => validateOverrides({ extras: { collection_decade_20s_movies: ["tv:1"] } }, standards), /Unknown franchise/);

  const { call } = await fixture(t);
  const saved = await call("PUT", "/admin-api/catalog-config/overrides", {
    rows: { [row.id]: "me/my-list" }, extras: { [bond.id]: ["TV:84773", "tv:84773"] },
    covers: { [netflix.id]: "https://example.com/n.jpg" },
  });
  assert.equal(saved.statusCode, 200);
  assert.deepEqual(saved.json().overrides.extras[bond.id], ["tv:84773"]);
  assert.equal(saved.json().overrides.covers[netflix.id], "https://example.com/n.jpg");
});
test("home rows: standard rows can be hidden for everyone and new MDBList rows added, with validation", async (t) => {
  const standards = await loadStandards();
  const row = standards.find((s) => s.kind === "STANDARD" && s.sourceUrl.includes("mdblist.com"));
  const rail = standards.find((s) => s.kind === "COLLECTION_RAIL");
  const collection = standards.find((s) => s.kind === "COLLECTION");
  assert.ok(rail, "collection rails are known standards");

  const clean = validateOverrides({
    hidden: [row.id, rail.id, row.id],
    newRows: [
      { id: "top-horror", title: "  Top Horror ", url: "snoak/top-horror", mediaType: "movie", after: row.id },
      { id: "kids", title: "Kids", url: "https://mdblist.com/lists/me/kids", mediaType: "bogus", after: "top-horror" },
    ],
  }, standards);
  assert.deepEqual(clean.hidden, [row.id, rail.id]);
  assert.equal(clean.newRows[0].title, "Top Horror");
  assert.equal(clean.newRows[0].url, "https://mdblist.com/lists/snoak/top-horror");
  assert.equal(clean.newRows[1].mediaType, "");

  assert.throws(() => validateOverrides({ hidden: [collection.id] }, standards), /Unknown home row/);
  assert.throws(() => validateOverrides({ newRows: [{ id: "x", title: "Row", url: "me/x" }] }, standards), /Row id/);
  assert.throws(() => validateOverrides({ newRows: [{ id: "good-id", title: "A", url: "me/x" }] }, standards), /Row title/);
  assert.throws(() => validateOverrides({ newRows: [{ id: "good-id", title: "Row", url: "https://evil.example/lists/a/b" }] }, standards), /not an MDBList link/);
  assert.throws(() => validateOverrides({ newRows: [{ id: "good-id", title: "Row", url: "me/x", after: "nope" }] }, standards), /Unknown row to place after/);
  assert.throws(() => validateOverrides({ newRows: [{ id: "good-id", title: "Row", url: "me/x" }, { id: "good-id", title: "Row2", url: "me/y" }] }, standards), /used twice/);

  const { call } = await fixture(t);
  const saved = await call("PUT", "/admin-api/catalog-config/overrides", { hidden: [rail.id], newRows: [{ id: "top-horror", title: "Top Horror", url: "snoak/top-horror" }] });
  assert.equal(saved.statusCode, 200);
  assert.deepEqual(saved.json().overrides.hidden, [rail.id]);
});

test("the public config still answers with the built-in values before the migration created the table", async (t) => {
  const app = Fastify();
  const pool = { query: async () => { throw Object.assign(new Error("relation does not exist"), { code: "42P01" }); } };
  registerAdminRoutes(app, { pool, jwtKey: key, publicDirectory: "" });
  t.after(() => app.close());
  const response = await app.inject({ method: "GET", url: "/catalog-config" });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().franchises.map((f) => f.id), ["marvel", "dc", "starwars"]);
});

test("list info tells whether an MDBList list holds movies or shows, and survives an unreachable MDBList", async (t) => {
  const { app, call } = await fixture(t);
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (url) => {
    if (String(url).includes("/lists/me/mixed/json")) {
      return new Response(JSON.stringify([{ mediatype: "movie" }, { mediatype: "show" }, { mediatype: "show" }]), { status: 200 });
    }
    if (String(url).includes("/lists/me/shows/json")) return new Response(JSON.stringify([{ mediatype: "show" }]), { status: 200 });
    throw new Error("offline");
  };
  assert.equal((await app.inject({ method: "GET", url: "/admin-api/catalog-config/list-info?slugs=me/mixed" })).statusCode, 401);
  const { lists } = (await call("GET", "/admin-api/catalog-config/list-info?slugs=me/mixed,me/shows,me/down,bad%20slug")).json();
  assert.deepEqual([lists["me/mixed"].movies, lists["me/mixed"].shows, lists["me/mixed"].total], [1, 2, 3]);
  assert.deepEqual([lists["me/shows"].movies, lists["me/shows"].shows], [0, 1]);
  assert.equal(lists["me/down"].total, null);
  assert.equal("bad slug" in lists, false);
});

test("the admin overview lists the standard catalogs with their lists", async (t) => {
  const { call } = await fixture(t);
  const overview = (await call("GET", "/admin-api/catalog-config")).json();
  assert.deepEqual(overview.builtinFranchiseIds, ["marvel", "dc", "starwars"]);
  assert.ok(overview.standards.some((s) => s.group === "FRANCHISE" && s.id === "collection_franchise_marvel"));
  assert.ok(overview.standards.some((s) => s.kind === "STANDARD" && s.sourceUrl.includes("mdblist.com")));
  const bond = overview.standards.find((s) => s.id === "collection_franchise_james_bond");
  assert.deepEqual(bond.tmdbCollections, [645]);
  assert.ok(bond.coverUrl.startsWith("https://"));
});
