const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/catalogSync.ts"),
).href;

const settings = (catalogIds) => ({
  catalogs: catalogIds.map((id) => ({ id })),
  hiddenCatalogIds: [],
  hiddenHomeServerCatalogIds: [],
});

test("web catalog changes receive the profile timestamp Android uses", async () => {
  const { writeCatalogProfileState } = await import(moduleUrl);
  const root = {
    catalogsByProfile: { main: [{ id: "old" }] },
    catalogsUpdatedAtByProfile: { main: 100 },
  };

  assert.equal(
    writeCatalogProfileState(
      root,
      "main",
      settings(["second", "first"]),
      settings(["first", "second"]),
      500,
    ),
    true,
  );
  assert.deepEqual(
    root.catalogsByProfile.main.map((catalog) => catalog.id),
    ["second", "first"],
  );
  assert.equal(root.catalogsUpdatedAtByProfile.main, 500);
});

test("unrelated web settings saves preserve newer cloud catalog state", async () => {
  const { writeCatalogProfileState } = await import(moduleUrl);
  const root = {
    catalogsByProfile: { main: [{ id: "tv-order" }] },
    catalogsUpdatedAtByProfile: { main: 900 },
  };
  const unchanged = settings(["stale-web-order"]);

  assert.equal(
    writeCatalogProfileState(root, "main", unchanged, unchanged, 1000),
    false,
  );
  assert.deepEqual(root.catalogsByProfile.main, [{ id: "tv-order" }]);
  assert.equal(root.catalogsUpdatedAtByProfile.main, 900);
});

test("web re-enabling remote addon and custom catalogs clears Android hidden roots", async () => {
  const { writeCatalogProfileState } = await import(moduleUrl);
  const root = {
    hiddenAddonByProfile: { main: ["addon", "unrelated-addon"] },
    hiddenCustomByProfile: { main: ["custom", "deleted-list"] },
  };
  const current = {
    ...settings([]),
    catalogs: [
      { id: "addon", sourceType: "addon", enabled: true },
      { id: "custom", sourceType: "MDBLIST", enabled: true },
    ],
  };
  writeCatalogProfileState(root, "main", current, settings([]), 1200);
  assert.deepEqual(root.hiddenAddonByProfile.main, ["unrelated-addon"]);
  assert.deepEqual(root.hiddenCustomByProfile.main, ["deleted-list"]);
  current.catalogs.forEach((item) => { item.enabled = false; });
  writeCatalogProfileState(root, "main", current, settings([]), 1300);
  assert.deepEqual(root.hiddenAddonByProfile.main, ["unrelated-addon", "addon"]);
  assert.deepEqual(root.hiddenCustomByProfile.main, ["deleted-list", "custom"]);
});

test("hidden URL catalogs remain in the web payload and can be re-enabled for Android", async () => {
  const { writeCatalogProfileState } = await import(moduleUrl);
  const catalog = { id: "custom_horror", sourceType: "mdblist", enabled: true };
  const baseline = { ...settings([]), catalogs: [catalog] };
  const hidden = {
    ...settings([]),
    catalogs: [{ ...catalog, enabled: false }],
    hiddenCatalogIds: [catalog.id],
  };
  const root = { catalogsByProfile: { other: [{ id: "untouched" }] } };

  writeCatalogProfileState(root, "main", hidden, baseline, 1400);
  assert.deepEqual(root.catalogsByProfile.main, [{ ...hidden.catalogs[0], sourceType: "MDBLIST" }]);
  assert.deepEqual(root.hiddenCustomByProfile.main, [catalog.id]);
  assert.deepEqual(root.catalogsByProfile.other, [{ id: "untouched" }]);

  writeCatalogProfileState(root, "main", baseline, hidden, 1500);
  assert.deepEqual(root.hiddenCustomByProfile.main, []);
  assert.deepEqual(root.hiddenPreinstalledByProfile.main, []);
  assert.equal(root.catalogsByProfile.main[0].enabled, true);
});

test("web deletion of visible and hidden URLs prevents Android legacy recovery", async () => {
  const { writeCatalogProfileState } = await import(moduleUrl);
  const baseline = {
    ...settings([]),
    catalogs: [
      { id: "visible", sourceType: "trakt", enabled: true },
      { id: "hidden", sourceType: "MDBLIST", enabled: false },
    ],
    hiddenCatalogIds: ["hidden"],
  };
  const root = {
    hiddenCustomByProfile: { main: ["hidden"], other: ["untouched"] },
  };

  writeCatalogProfileState(root, "main", settings([]), baseline, 1600);
  assert.deepEqual(root.catalogsByProfile.main, []);
  assert.deepEqual(new Set(root.hiddenCustomByProfile.main), new Set(["visible", "hidden"]));
  assert.deepEqual(root.hiddenCustomByProfile.other, ["untouched"]);
  assert.equal(root.catalogsUpdatedAtByProfile.main, 1600);
});

test("web exports Android-compatible catalog titles and enums without losing URL or enabled state", async () => {
  const { writeCatalogProfileState } = await import(moduleUrl);
  const root = {};
  const current = {
    ...settings([]),
    catalogs: [{
      id: "custom_web", name: "Horror", sourceType: "mdblist",
      sourceUrl: "https://trakt.tv/users/movistapp/lists/horror",
      enabled: false, kind: "standard", collectionTileShape: "poster",
    }, {
      id: "server", name: "Library", sourceType: "home-server", enabled: true,
    }],
    hiddenCatalogIds: ["custom_web"],
  };
  writeCatalogProfileState(root, "main", current, settings([]), 2000);
  const [url, server] = root.catalogsByProfile.main;
  assert.equal(url.title, "Horror");
  assert.equal(url.sourceType, "TRAKT");
  assert.equal(url.kind, "STANDARD");
  assert.equal(url.collectionTileShape, "POSTER");
  assert.equal(url.sourceUrl, current.catalogs[0].sourceUrl);
  assert.equal(url.enabled, false);
  assert.equal(server.sourceType, "HOME_SERVER");
  assert.deepEqual(root.hiddenCustomByProfile.main, ["custom_web"]);
});
