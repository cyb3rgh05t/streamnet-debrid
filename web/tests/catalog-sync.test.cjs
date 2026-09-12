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
