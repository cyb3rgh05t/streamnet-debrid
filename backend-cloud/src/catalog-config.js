import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { mdblistSlugPattern, normalizeAdminListUrl } from "./admin-snapshots.js";
import { appSettingDefaultsId } from "./app-setting-defaults.js";

// Central catalog configuration: what the admin changes here reaches every device, new installs and new
// accounts included (the apps fetch GET /catalog-config and lay it over their built-in standards).
//  - franchises: the ordered title lists of Marvel / DC / Star Wars (built in, editable) and franchises the
//    admin created (custom: title, cover, lists, TMDB collections, MDBList lists).
//  - overrides: replaced MDBList lists of the home rows and collections, and added titles per franchise.
// A missing row means "use what the app ships".
const seedUrl = new URL("./franchise-lists.seed.json", import.meta.url);
const standardsUrl = new URL("./standard-catalogs.txt", import.meta.url);
const coversUrl = new URL("./standard-covers.txt", import.meta.url);
const introsUrl = new URL("./standard-intros.txt", import.meta.url);

const refPattern = /^(movie|tv):\d{1,9}$/;
const tabs = ["movie", "series", "timeline"];
const maxEntries = 500;
const maxTitle = 120;
const maxExtraRefs = 30;
const maxNewRows = 20;
const maxNewCollections = 20;
const newCollectionGroups = ["SERVICE", "DECADE"];
const newRowSources = ["mdblist", "trakt"];
const customIdPattern = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

/** The canonical https://trakt.tv link of a list (trakt.tv/users/{user}/lists/{list} or trakt.tv/lists/{id}); throws otherwise. */
export function cleanTraktRowUrl(raw) {
  const { sourceUrl } = normalizeAdminListUrl("TRAKT", raw);
  const url = new URL(sourceUrl);
  url.protocol = "https:";
  url.hostname = "trakt.tv";
  url.port = "";
  return url.toString();
}

let cached = null;
async function loadStatic() {
  cached ??= (async () => {
    const seed = JSON.parse(await readFile(seedUrl, "utf8")).lists;
    const pairs = async (url) => new Map((await readFile(url, "utf8")).split(/\r?\n/).filter(Boolean).map((line) => {
      const [id, ...value] = line.split(" | ");
      return [id, value.join(" | ")];
    }));
    const covers = await pairs(coversUrl);
    const intros = await pairs(introsUrl);
    const standards = (await readFile(standardsUrl, "utf8")).split(/\r?\n/).filter(Boolean).map((line) => {
      const [id, title, kind, group, sourceUrl, sources = ""] = line.split(" | ");
      const parts = sources.split(" ; ").filter(Boolean);
      return {
        id, title, kind, group, sourceUrl,
        coverUrl: covers.get(id) ?? "",
        introUrl: intros.get(id) ?? "",
        mdblist: parts.filter((s) => s.startsWith("mdblist:")).map((s) => s.slice(8)),
        tmdbCollections: parts.filter((s) => s.startsWith("tmdbCollection:")).map((s) => Number(s.slice(15))),
        // TMDB watch providers of a streaming service (the same id usually appears for movies and series).
        providers: [...new Set(parts.filter((s) => s.startsWith("provider:")).map((s) => Number(s.split(":")[1])))],
        // Titles the app ships outside the Movies / Series / Timeline lists (e.g. the Harry Potter series).
        curated: parts.filter((s) => s.startsWith("curated@:")).flatMap((s) => s.slice(9).split(",")).filter(Boolean),
        sources: parts,
      };
    });
    return { seed, standards };
  })();
  return cached;
}
export const loadSeed = async () => (await loadStatic()).seed;
export const loadStandards = async () => (await loadStatic()).standards;

function fail(message, status = 400) {
  const error = new Error(message);
  error.statusCode = status;
  return error;
}

export function catalogIdFor(id) {
  return `collection_franchise_${id.replace(/-/g, "_")}`;
}

/** Returns the cleaned `tabs` object or throws a 400 error. Only the timeline keeps repeated titles. */
export function validateTabs(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw fail("tabs must be an object");
  const unknown = Object.keys(value).filter((key) => !tabs.includes(key));
  if (unknown.length) throw fail(`Unknown tab: ${unknown[0]}`);
  const cleaned = {};
  for (const tab of tabs) {
    const entries = value[tab] ?? [];
    if (!Array.isArray(entries)) throw fail(`${tab} must be a list`);
    if (entries.length > maxEntries) throw fail(`${tab} has more than ${maxEntries} entries`);
    const seen = new Set();
    cleaned[tab] = [];
    for (const entry of entries) {
      const ref = String(entry?.ref ?? "").trim().toLowerCase();
      if (!refPattern.test(ref)) throw fail(`Invalid title reference in ${tab}: ${String(entry?.ref).slice(0, 40)}`);
      if (tab === "movie" && !ref.startsWith("movie:")) throw fail(`The movie tab only takes movie:ID (${ref})`);
      if (tab === "series" && !ref.startsWith("tv:")) throw fail(`The series tab only takes tv:ID (${ref})`);
      if (tab !== "timeline") {
        if (seen.has(ref)) continue;
        seen.add(ref);
      }
      const title = String(entry?.title ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, maxTitle);
      cleaned[tab].push(title ? { ref, title } : { ref });
    }
  }
  return cleaned;
}

function cleanCoverUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  let url;
  try { url = new URL(raw); } catch { throw fail("Cover URL is invalid"); }
  if (url.protocol !== "https:" || url.username || url.password || raw.length > 400) throw fail("Cover URL must be a plain https link");
  return url.toString();
}

function cleanIntList(value, label, limit) {
  const list = Array.isArray(value) ? value : [];
  if (list.length > limit) throw fail(`${label}: at most ${limit}`);
  return [...new Set(list.map((item) => {
    const number = Number(item);
    if (!Number.isInteger(number) || number < 1 || number > 999999999) throw fail(`${label}: invalid id ${String(item).slice(0, 20)}`);
    return number;
  }))];
}

function cleanSlugs(value, label, limit) {
  const list = Array.isArray(value) ? value : [];
  if (list.length > limit) throw fail(`${label}: at most ${limit}`);
  return [...new Set(list.map((item) => {
    const raw = String(item ?? "").trim().replace(/^https?:\/\/(www\.)?mdblist\.com\/lists\//i, "").replace(/\/+$/, "");
    if (!mdblistSlugPattern.test(raw)) throw fail(`${label}: "${String(item).slice(0, 40)}" is not user/list`);
    return raw;
  }))];
}

/** Cleans an admin franchise payload. Built-in franchises only carry their title lists. */
export function validateFranchise(id, builtin, body) {
  const cleanedTabs = validateTabs(body?.tabs ?? {});
  if (builtin) return { tabs: cleanedTabs };
  const title = String(body?.title ?? "").replace(/[\u0000-\u001f]/g, " ").trim();
  if (title.length < 2 || title.length > 60) throw fail("Title needs 2 to 60 characters");
  return {
    title,
    coverUrl: cleanCoverUrl(body?.coverUrl),
    tabs: cleanedTabs,
    tmdbCollections: cleanIntList(body?.tmdbCollections, "TMDB collections", 10),
    mdblist: cleanSlugs(body?.mdblist, "MDBList lists", 10),
  };
}

function homeRowIds(standards) {
  return new Set(standards.filter((s) => s.kind === "STANDARD" && s.sourceUrl.includes("mdblist.com/lists/")).map((s) => s.id));
}

/**
 * Cleans the overrides of the standard catalogs: the MDBList URL of a home row, a cover and replacement TMDB-collection /
 * MDBList lists per collection, and added titles per franchise. An empty value means "keep the app's own".
 */
export function validateOverrides(body, standards) {
  const rows = {};
  const rowIds = homeRowIds(standards);
  for (const [id, url] of Object.entries(body?.rows ?? {})) {
    if (!rowIds.has(id)) throw fail(`Unknown home row: ${id.slice(0, 40)}`);
    const raw = String(url ?? "").trim();
    if (!raw) continue;
    const input = mdblistSlugPattern.test(raw) ? `https://mdblist.com/lists/${raw}` : raw;
    try { rows[id] = normalizeAdminListUrl("MDBLIST", input).sourceUrl; } catch { throw fail(`List for ${id} is not an MDBList link`); }
  }
  const byId = new Map(standards.map((s) => [s.id, s]));
  const collection = (catalogId) => {
    const standard = byId.get(catalogId);
    if (!standard || standard.kind !== "COLLECTION") throw fail(`Unknown collection: ${String(catalogId).slice(0, 60)}`);
    return standard;
  };
  const covers = {};
  for (const [catalogId, url] of Object.entries(body?.covers ?? {})) {
    const standard = collection(catalogId);
    const cover = cleanCoverUrl(url);
    if (cover && cover !== standard.coverUrl) covers[catalogId] = cover;
  }
  // Intro clip (hero video) of a collection, e.g. the streaming service clips.
  const intros = {};
  for (const [catalogId, url] of Object.entries(body?.intros ?? {})) {
    const standard = collection(catalogId);
    const intro = cleanCoverUrl(url);
    if (intro && intro !== standard.introUrl) intros[catalogId] = intro;
  }
  // Display name of a collection (the genre names are otherwise delivered by the genre API in the app's language).
  const titles = {};
  for (const [catalogId, value] of Object.entries(body?.titles ?? {})) {
    const standard = collection(catalogId);
    const title = String(value ?? "").replace(/[\u0000-\u001f]/g, " ").trim();
    if (!title) continue;
    if (title.length < 2 || title.length > 60) throw fail(`${standard.title}: name needs 2 to 60 characters`);
    if (title !== standard.title) titles[catalogId] = title;
  }
  const sources = {};
  for (const [catalogId, value] of Object.entries(body?.sources ?? {})) {
    const standard = collection(catalogId);
    const entry = {};
    const tmdb = cleanIntList(value?.tmdbCollections, `${standard.title}: TMDB collections`, 10);
    if (tmdb.length) {
      if (standard.group !== "FRANCHISE") throw fail(`${standard.title}: TMDB collections are only for franchises`);
      if (tmdb.join() !== standard.tmdbCollections.join()) entry.tmdbCollections = tmdb;
    }
    const lists = cleanSlugs(value?.mdblist, `${standard.title}: MDBList lists`, 10);
    if (lists.length && lists.join() !== standard.mdblist.join()) entry.mdblist = lists;
    if (value?.curated !== undefined) {
      if (standard.group !== "FRANCHISE") throw fail(`${standard.title}: fixed titles are only for franchises`);
      const refs = [...new Set((Array.isArray(value.curated) ? value.curated : []).map((ref) => String(ref).trim().toLowerCase()))];
      if (refs.length > maxExtraRefs) throw fail(`${standard.title}: at most ${maxExtraRefs} fixed titles`);
      for (const ref of refs) if (!refPattern.test(ref)) throw fail(`${standard.title}: "${ref.slice(0, 30)}" is not movie:ID or tv:ID`);
      // An empty list is a real override: it removes the titles the app ships.
      if (refs.join() !== standard.curated.join()) entry.curated = refs;
    }
    if (Object.keys(entry).length) sources[catalogId] = entry;
  }
  const extras = {};
  for (const [catalogId, refs] of Object.entries(body?.extras ?? {})) {
    const standard = byId.get(catalogId);
    if (!standard || standard.group !== "FRANCHISE") throw fail(`Unknown franchise: ${catalogId.slice(0, 60)}`);
    const list = [...new Set((Array.isArray(refs) ? refs : []).map((ref) => String(ref).trim().toLowerCase()))];
    if (list.length > maxExtraRefs) throw fail(`${standard.title}: at most ${maxExtraRefs} added titles`);
    for (const ref of list) if (!refPattern.test(ref)) throw fail(`${standard.title}: "${ref.slice(0, 30)}" is not movie:ID or tv:ID`);
    if (list.length) extras[catalogId] = list;
  }
  // Standard rows (and collection rails) switched off for everyone; the app drops them from its defaults.
  const hiddenable = new Set(standards.filter((s) => s.kind === "STANDARD" || s.kind === "COLLECTION_RAIL").map((s) => s.id));
  const hidden = [...new Set((Array.isArray(body?.hidden) ? body.hidden : []).map((id) => String(id)))];
  for (const id of hidden) if (!hiddenable.has(id)) throw fail(`Unknown home row: ${id.slice(0, 40)}`);
  // Rows the admin adds for everyone: an MDBList or Trakt list shown on Home. Rows without a `source` are MDBList.
  const newRowsInput = Array.isArray(body?.newRows) ? body.newRows : [];
  if (newRowsInput.length > maxNewRows) throw fail(`At most ${maxNewRows} added rows`);
  const seenRows = new Set();
  const newRows = newRowsInput.map((row) => {
    const id = String(row?.id ?? "").trim().toLowerCase();
    if (!customIdPattern.test(id)) throw fail("Row id: 3-40 characters, lowercase letters, digits and hyphens");
    if (seenRows.has(id)) throw fail(`Row id used twice: ${id}`);
    seenRows.add(id);
    const title = String(row?.title ?? "").replace(/[\u0000-\u001f]/g, " ").trim();
    if (title.length < 2 || title.length > 60) throw fail("Row title needs 2 to 60 characters");
    if (row?.source !== undefined && !newRowSources.includes(row.source)) throw fail(`Row "${title.slice(0, 30)}": unknown list source`);
    const source = row?.source ?? "mdblist";
    const raw = String(row?.url ?? "").trim();
    let url;
    try {
      url = source === "trakt"
        ? cleanTraktRowUrl(raw)
        : normalizeAdminListUrl("MDBLIST", mdblistSlugPattern.test(raw) ? `https://mdblist.com/lists/${raw}` : raw).sourceUrl;
    } catch { throw fail(`Row "${title.slice(0, 30)}": the list is not ${source === "trakt" ? "a Trakt" : "an MDBList"} link`); }
    // Trakt lists hold movies and shows together; the type only narrows an MDBList list.
    const mediaType = source === "mdblist" && ["movie", "tv"].includes(row?.mediaType) ? row.mediaType : "";
    const after = String(row?.after ?? "").trim();
    if (after && !byId.has(after) && !newRowsInput.some((other) => String(other?.id ?? "").trim().toLowerCase() === after)) throw fail(`Unknown row to place after: ${after.slice(0, 40)}`);
    return { id, title, url, mediaType, after, source };
  });
  // Collections the admin adds for everyone: a streaming service (TMDB watch providers and/or MDBList lists) or a decade (MDBList lists).
  const newCollectionsInput = Array.isArray(body?.newCollections) ? body.newCollections : [];
  if (newCollectionsInput.length > maxNewCollections) throw fail(`At most ${maxNewCollections} added collections`);
  const seenCollections = new Set();
  const newCollections = newCollectionsInput.map((entry) => {
    const group = String(entry?.group ?? "SERVICE").trim().toUpperCase();
    if (!newCollectionGroups.includes(group)) throw fail(`Collections can only be added to: ${newCollectionGroups.join(", ")}`);
    const id = String(entry?.id ?? "").trim().toLowerCase();
    if (!customIdPattern.test(id)) throw fail("Collection id: 3-40 characters, lowercase letters, digits and hyphens");
    const catalogId = newCollectionCatalogId(group, id);
    if (seenCollections.has(catalogId) || byId.has(catalogId)) throw fail(`Collection id already used: ${id}`);
    seenCollections.add(catalogId);
    const title = String(entry?.title ?? "").replace(/[\u0000-\u001f]/g, " ").trim();
    if (title.length < 2 || title.length > 60) throw fail("Collection name needs 2 to 60 characters");
    const providers = cleanIntList(entry?.providers, `${title}: TMDB providers`, 10);
    const lists = cleanSlugs(entry?.mdblist, `${title}: MDBList lists`, 5);
    if (group === "DECADE") {
      if (providers.length) throw fail(`${title}: decades take MDBList lists, not TMDB providers`);
      if (!lists.length) throw fail(`${title}: add an MDBList list`);
    } else if (!providers.length && !lists.length) {
      throw fail(`${title}: add a TMDB provider id or an MDBList list`);
    }
    const region = String(entry?.region ?? "US").trim().toUpperCase() || "US";
    if (!/^[A-Z]{2}$/.test(region)) throw fail(`${title}: region must be a 2-letter country code`);
    return {
      id, group, title, coverUrl: cleanCoverUrl(entry?.coverUrl),
      introUrl: group === "SERVICE" ? cleanCoverUrl(entry?.introUrl) : "", providers, mdblist: lists, region,
    };
  });
  return { rows, covers, intros, titles, sources, extras, hidden, newRows, newCollections };
}
const emptyOverrides = () => ({ rows: {}, covers: {}, intros: {}, titles: {}, sources: {}, extras: {}, hidden: [], newRows: [], newCollections: [] });

export function newCollectionCatalogId(group, id) {
  return `collection_${group.toLowerCase()}_${id.replace(/-/g, "_")}`;
}

function franchiseView(entry, row, builtin) {
  const payload = row?.payload ?? {};
  return {
    id: entry.id,
    title: builtin ? entry.title : payload.title,
    catalogId: builtin ? entry.catalogId : catalogIdFor(entry.id),
    builtin,
    custom: Boolean(row),
    coverUrl: builtin ? "" : payload.coverUrl ?? "",
    tabs: payload.tabs ?? entry.tabs,
    tmdbCollections: payload.tmdbCollections ?? [],
    mdblist: payload.mdblist ?? [],
    revision: row ? Number(row.revision) : 0,
    updatedAt: row ? new Date(row.updated_at).toISOString() : null,
  };
}

export async function readConfig(pool) {
  const { seed } = await loadStatic();
  // Before migration 014 ran there is no table: serve the built-in values instead of failing for every device.
  const rows = (await pool.query("select id, payload, revision, updated_at from catalog_config").catch((error) => {
    if (error?.code === "42P01") return { rows: [] };
    throw error;
  })).rows.filter((row) => row.id !== appSettingDefaultsId);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const franchises = Object.values(seed).map((entry) => franchiseView(entry, byId.get(`franchise:${entry.id}`), true));
  const builtinIds = new Set(Object.keys(seed));
  for (const row of rows) {
    if (!row.id.startsWith("franchise:")) continue;
    const id = row.id.slice(10);
    if (builtinIds.has(id)) continue;
    franchises.push(franchiseView({ id }, row, false));
  }
  const overridesRow = byId.get("overrides");
  const overrides = { ...emptyOverrides(), ...(overridesRow?.payload ?? {}) };
  const stamps = rows.map((row) => new Date(row.updated_at).getTime()).filter(Number.isFinite);
  return { franchises, overrides, overridesUpdatedAt: overridesRow ? new Date(overridesRow.updated_at).toISOString() : null,
    updatedAt: stamps.length ? new Date(Math.max(...stamps)).toISOString() : null };
}

const listInfoCache = new Map();
const listInfoTtlMs = 6 * 60 * 60_000;

/** What a public MDBList list contains (movies / shows) and its name; null fields when MDBList cannot be read. */
export async function mdblistListInfo(slug, listTitle) {
  const cached = listInfoCache.get(slug);
  if (cached && Date.now() - cached.at < (cached.info.total === null ? 5 * 60_000 : listInfoTtlMs)) return cached.info;
  const info = { title: null, movies: null, shows: null, total: null };
  try {
    const response = await fetch(`https://mdblist.com/lists/${slug}/json`, {
      headers: { "User-Agent": "Mozilla/5.0 (StreamNet admin)", Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      const items = await response.json();
      if (Array.isArray(items)) {
        info.movies = items.filter((item) => item?.mediatype === "movie").length;
        info.shows = items.filter((item) => item?.mediatype === "show").length;
        info.total = items.length;
      }
    }
  } catch {
    // Left unknown: the admin shows the list without a type.
  }
  info.title = await listTitle?.(slug).catch(() => null) ?? null;
  listInfoCache.set(slug, { info, at: Date.now() });
  return info;
}

export function registerCatalogConfigRoutes(app, { pool, authenticateAdmin, listTitle }) {
  app.get("/admin-api/catalog-config/list-info", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    await authenticateAdmin(request);
    const slugs = [...new Set(String(request.query?.slugs || "").split(",").map((value) => value.trim()))]
      .filter((value) => mdblistSlugPattern.test(value))
      .slice(0, 30);
    const lists = {};
    for (let index = 0; index < slugs.length; index += 4) {
      const batch = slugs.slice(index, index + 4);
      const resolved = await Promise.all(batch.map((slug) => mdblistListInfo(slug, listTitle)));
      batch.forEach((slug, position) => { lists[slug] = resolved[position]; });
    }
    return { lists };
  });

  // Read by every app. Short cache: an edit reaches devices within minutes; the apps keep the last copy and ship
  // a bundled one, so an outage of this endpoint changes nothing for users.
  app.get("/catalog-config", async (_request, reply) => {
    reply.header("Cache-Control", "public, max-age=300");
    const config = await readConfig(pool);
    return {
      version: 2,
      updatedAt: config.updatedAt,
      franchises: config.franchises.map(({ id, title, catalogId, builtin, coverUrl, tabs: franchiseTabs, tmdbCollections, mdblist, revision }) =>
        ({ id, title, catalogId, builtin, coverUrl, tabs: franchiseTabs, tmdbCollections, mdblist, revision })),
      overrides: config.overrides,
    };
  });

  app.get("/admin-api/catalog-config", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    await authenticateAdmin(request);
    const [config, standards, seed] = await Promise.all([readConfig(pool), loadStandards(), loadSeed()]);
    return {
      ...config,
      builtinFranchiseIds: Object.keys(seed),
      standards: standards.map(({ id, title, kind, group, sourceUrl, coverUrl, introUrl, mdblist, tmdbCollections, providers, curated, sources }) =>
        ({ id, title, kind, group, sourceUrl, coverUrl, introUrl, mdblist, tmdbCollections, providers, curated, sources: sources.map((source) => source.slice(0, 300)), sourceCount: sources.length })),
    };
  });

  const audit = (client, admin, request, operation, details) => client.query(
    `insert into admin_audit_logs (
       id, admin_id, account_id, operation, profile_id, reason,
       details, revision_before, revision_after, request_ip, user_agent
     ) values ($1, $2, null, $3, null, $4, $5::jsonb, 0, 0, $6, $7)`,
    [
      crypto.randomUUID(), admin.id, operation,
      String(request.body?.reason || "").trim().slice(0, 500) || "Ohne Kommentar",
      JSON.stringify(details), request.ip || null,
      String(request.headers["user-agent"] || "").slice(0, 500) || null,
    ],
  );

  async function write(request, operation, details, run) {
    const admin = await authenticateAdmin(request);
    const client = await pool.connect();
    try {
      await client.query("begin");
      await run(client);
      await audit(client, admin, request, operation, details);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  const upsert = (client, id, payload) => client.query(
    `insert into catalog_config (id, payload, revision, updated_at) values ($1, $2::jsonb, 1, now())
     on conflict (id) do update
       set payload = excluded.payload, revision = catalog_config.revision + 1, updated_at = now()`,
    [id, JSON.stringify(payload)],
  );

  app.put("/admin-api/catalog-config/franchises/:id", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const id = String(request.params.id);
    const { seed, standards } = await loadStatic();
    const builtin = Boolean(seed[id]);
    if (!builtin) {
      if (!customIdPattern.test(id)) throw fail("Id: 3-40 characters, lowercase letters, digits and hyphens");
      const reserved = new Set(standards.filter((s) => s.group === "FRANCHISE").map((s) => s.id));
      if (reserved.has(catalogIdFor(id))) throw fail("This id belongs to a built-in franchise");
    }
    const payload = validateFranchise(id, builtin, request.body);
    await write(request, "catalog_franchise_save", { franchiseId: id, builtin, counts: Object.fromEntries(tabs.map((tab) => [tab, payload.tabs[tab].length])) },
      (client) => upsert(client, `franchise:${id}`, payload));
    const franchise = (await readConfig(pool)).franchises.find((item) => item.id === id);
    return { franchise };
  });

  app.delete("/admin-api/catalog-config/franchises/:id", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const id = String(request.params.id);
    const { seed } = await loadStatic();
    const builtin = Boolean(seed[id]);
    const exists = (await pool.query("select id from catalog_config where id = $1", [`franchise:${id}`])).rows.length > 0;
    if (!builtin && !exists) return reply.code(404).send({ error: "Unknown franchise" });
    await write(request, builtin ? "catalog_franchise_reset" : "catalog_franchise_delete", { franchiseId: id },
      (client) => client.query("delete from catalog_config where id = $1", [`franchise:${id}`]));
    return { deleted: !builtin, franchise: builtin ? (await readConfig(pool)).franchises.find((item) => item.id === id) : null };
  });

  app.put("/admin-api/catalog-config/overrides", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    await authenticateAdmin(request);
    const overrides = validateOverrides(request.body, await loadStandards());
    await write(request, "catalog_overrides_save", {
      rows: Object.keys(overrides.rows).length, hidden: overrides.hidden.length, newRows: overrides.newRows.length, covers: Object.keys(overrides.covers).length, sources: Object.keys(overrides.sources).length, extras: Object.keys(overrides.extras).length,
    }, (client) => upsert(client, "overrides", overrides));
    return { overrides };
  });
}
