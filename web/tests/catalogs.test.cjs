const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/catalogs.ts"),
).href;

test("catalog migration removes retired rows and adds current Android defaults", async () => {
  const { mergeCatalogs } = await import(moduleUrl);
  const catalogs = mergeCatalogs([
    {
      id: "trending_movies",
      name: "Old title",
      sourceType: "mdblist",
      enabled: true,
      isPreinstalled: true,
    },
    {
      id: "collection_featured_latest_movies",
      name: "Latest Movies",
      sourceType: "preinstalled",
      collectionGroup: "FEATURED",
      enabled: true,
      isPreinstalled: true,
    },
    {
      id: "collection_decade_1990s",
      name: "1990s",
      sourceType: "preinstalled",
      collectionGroup: "DECADE",
      enabled: true,
      isPreinstalled: true,
    },
    {
      id: "action",
      name: "Popular Action",
      sourceType: "mdblist",
      enabled: true,
      isPreinstalled: true,
    },
    {
      id: "custom_keep",
      name: "Keep me",
      sourceType: "mdblist",
      enabled: true,
    },
  ]);
  const ids = catalogs.map((catalog) => catalog.id);

  assert.equal(ids.includes("collection_featured_latest_movies"), false);
  assert.equal(ids.includes("collection_decade_1990s"), false);
  assert.equal(ids.includes("action"), false);
  assert.equal(ids.includes("custom_keep"), true);
  assert.equal(ids.includes("upcoming_series"), true);
  assert.equal(ids.includes("recently_watched_movies"), true);
  assert.equal(ids.includes("recently_watched_series"), true);
  assert.equal(
    catalogs.find((catalog) => catalog.id === "coming_soon")?.name,
    "Upcoming Movies",
  );
});

test("catalog labels use the requested German upcoming names", async () => {
  const { localizedCatalogName } = await import(moduleUrl);

  assert.equal(
    localizedCatalogName({ id: "coming_soon", name: "Upcoming Movies" }, "de"),
    "Kommende Filme",
  );
  assert.equal(
    localizedCatalogName(
      { id: "upcoming_series", name: "Upcoming Series" },
      "de",
    ),
    "Kommende Serien",
  );
});

test("Web fallback catalogs follow the current Android order", async () => {
  const { defaultCatalogs } = await import(moduleUrl);

  assert.deepEqual(
    defaultCatalogs.map((catalog) => catalog.id),
    [
      "recent_tv",
      "favorite_tv",
      "trending_movies",
      "top10_movies_today",
      "top_movies_week",
      "trending_tv",
      "top10_shows_today",
      "trending_anime",
      "new_kdramas",
      "coming_soon",
      "upcoming_series",
      "just_added",
      "recently_watched_movies",
      "recently_watched_series",
    ],
  );
});
