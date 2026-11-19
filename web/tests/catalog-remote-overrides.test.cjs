const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(path.resolve(__dirname, "../lib/catalogs.ts")).href;

async function setup() {
  const { defaultCatalogs, mergeCatalogs } = await import(moduleUrl);
  const byId = (id) => defaultCatalogs.find((catalog) => catalog.id === id);
  const merged = (stored) => mergeCatalogs([stored]).find((catalog) => catalog.id === stored.id);
  return { byId, merged };
}

test("admin-added franchise titles are appended as one extra source and keep the release-date order", async () => {
  const { byId, merged } = await setup();
  const lotr = byId("collection_franchise_lord_of_the_rings");
  const result = merged({ ...lotr, remoteExtraRefs: ["tv:84773", "TV:84773", "movie:120", "tv:abc", "x:1"] });
  assert.equal(result.collectionSources.length, lotr.collectionSources.length + 1);
  assert.deepEqual(result.collectionSources.slice(0, -1), lotr.collectionSources);
  assert.deepEqual(result.collectionSources.at(-1), {
    kind: "CURATED_IDS", curatedRefs: ["tv:84773", "movie:120"], remoteExtra: true,
  });
  // Not a franchise: ignored. Nothing valid: unchanged.
  const decade = byId("collection_decade_90s_movies");
  assert.deepEqual(merged({ ...decade, remoteExtraRefs: ["tv:1"] }).collectionSources, decade.collectionSources);
  assert.deepEqual(merged({ ...lotr, remoteExtraRefs: ["nope"] }).collectionSources, lotr.collectionSources);
});

test("remote-managed lists, slugs and addon catalogs replace the defaults and malformed values fall back", async () => {
  const { byId, merged } = await setup();

  const row = byId("trending_movies");
  const changed = merged({ ...row, remoteManaged: true, remoteSourceUrl: "https://mdblist.com/lists/me/other" });
  assert.equal(changed.sourceUrl, "https://mdblist.com/lists/me/other");
  for (const remoteSourceUrl of ["https://evil.example/lists/a/b", "http://mdblist.com/lists/a/b", "https://mdblist.com/lists/a"]) {
    assert.equal(merged({ ...row, remoteManaged: true, remoteSourceUrl }).sourceUrl, row.sourceUrl, remoteSourceUrl);
  }
  assert.equal(merged({ ...row, remoteSourceUrl: "https://mdblist.com/lists/me/other" }).sourceUrl, row.sourceUrl);

  const xmen = byId("collection_franchise_x_men");
  const slugSource = xmen.collectionSources.findIndex((source) => source.mdblistSlug === "jxduffy/x-men-chronological-order");
  assert.ok(slugSource >= 0);
  const slugged = merged({ ...xmen, remoteManaged: true, remoteSlugOverrides: { "jxduffy/x-men-chronological-order": "me/new-list" } });
  assert.equal(slugged.collectionSources[slugSource].mdblistSlug, "me/new-list");
  const badSlug = merged({ ...xmen, remoteManaged: true, remoteSlugOverrides: { "jxduffy/x-men-chronological-order": "not a slug" } });
  assert.equal(badSlug.collectionSources[slugSource].mdblistSlug, "jxduffy/x-men-chronological-order");

  // No standard collection carries an addon source any more; the override logic still serves a user's own.
  const dcBase = byId("collection_franchise_dc_universe");
  const lotr = {
    ...dcBase,
    collectionSources: [
      { kind: "ADDON_CATALOG", addonId: "com.example.addon", addonCatalogType: "movie", addonCatalogId: "dc-movies", addonManifestUrl: "https://example.com/original/manifest.json", collectionTab: "movie" },
      ...dcBase.collectionSources,
    ],
  };
  const addonIndex = lotr.collectionSources.findIndex((source) => source.kind === "ADDON_CATALOG");
  const bundled = lotr.collectionSources[addonIndex];
  const key = `${bundled.addonCatalogType}|${bundled.addonCatalogId}`;
  const { applyRemoteCatalogOverrides } = await import(pathToFileURL(path.resolve(__dirname, "../lib/catalogRemoteOverrides.ts")).href);
  const merged2 = (saved) => applyRemoteCatalogOverrides(lotr, saved);
  const replaced = merged2({
    ...lotr, remoteManaged: true,
    remoteAddonOverrides: { [key]: { addonCatalogId: "mdblist.99999", addonManifestUrl: "https://example.com/abc/manifest.json" } },
  }).collectionSources[addonIndex];
  assert.equal(replaced.addonCatalogId, "mdblist.99999");
  assert.equal(replaced.addonId, bundled.addonId);
  assert.equal(replaced.addonCatalogType, bundled.addonCatalogType);
  assert.equal(replaced.addonManifestUrl, "https://example.com/abc/manifest.json");
  const bad = merged2({
    ...lotr, remoteManaged: true,
    remoteAddonOverrides: { [key]: { addonCatalogId: "mdblist.99999", addonManifestUrl: "http://example.com/manifest.json" } },
  }).collectionSources[addonIndex];
  assert.equal(bad.addonCatalogId, "mdblist.99999");
  assert.equal(bad.addonManifestUrl, bundled.addonManifestUrl);
  const unmanaged = merged2({ ...lotr, remoteAddonOverrides: { [key]: { addonCatalogId: "mdblist.99999" } } });
  assert.deepEqual(unmanaged.collectionSources[addonIndex], bundled);
});

test("admin overrides survive a web save and are not applied twice", async () => {
  const { defaultCatalogs, mergeCatalogs } = await import(moduleUrl);
  const { writeCatalogProfileState } = await import(
    pathToFileURL(path.resolve(__dirname, "../lib/catalogSync.ts")).href
  );
  const lotr = defaultCatalogs.find((catalog) => catalog.id === "collection_franchise_lord_of_the_rings");
  const first = mergeCatalogs([{ ...lotr, remoteExtraRefs: ["tv:84773"] }]);
  const root = {};
  writeCatalogProfileState(root, "main", { catalogs: first, hiddenCatalogIds: [], hiddenHomeServerCatalogIds: [] }, null, 2000);
  const saved = root.catalogsByProfile.main.find((catalog) => catalog.id === lotr.id);
  assert.deepEqual(saved.remoteExtraRefs, ["tv:84773"]);
  const again = mergeCatalogs(root.catalogsByProfile.main).find((catalog) => catalog.id === lotr.id);
  assert.equal(again.collectionSources.length, lotr.collectionSources.length + 1);
  assert.equal(again.collectionSources.filter((source) => source.remoteExtra).length, 1);
});
