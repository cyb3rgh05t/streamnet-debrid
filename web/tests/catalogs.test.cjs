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

  assert.equal(ids.includes("collection_featured_latest_movies"), true);
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

  assert.equal(defaultCatalogs.length, 99);
  assert.deepEqual(
    defaultCatalogs.slice(0, 14).map((catalog) => catalog.id),
    [
      "recent_tv",
      "favorite_tv",
      "collection_rail_service",
      "collection_rail_franchise",
      "trending_movies",
      "top10_movies_today",
      "top_movies_week",
      "collection_rail_movie_genre",
      "trending_tv",
      "top10_shows_today",
      "collection_rail_tv_genre",
      "trending_anime",
      "new_kdramas",
      "coming_soon",
    ],
  );
  assert.equal(
    defaultCatalogs.some(
      (catalog) => catalog.id === "collection_service_netflix",
    ),
    true,
  );
  assert.equal(
    defaultCatalogs.some(
      (catalog) => catalog.id === "collection_movie_genre_science_fiction",
    ),
    true,
  );
});

test("Marvel addon chronology is the primary web source with fallbacks retained", async () => {
  const { defaultCatalogs } = await import(moduleUrl);
  const rail = defaultCatalogs.find(
    (catalog) => catalog.id === "collection_franchise_marvel",
  );
  const sources = rail?.collectionSources ?? [];

  assert.equal(sources[0]?.kind, "ADDON_CATALOG");
  assert.equal(sources[0]?.addonCatalogId, "marvel-mcu");
  assert.equal(
    sources[0]?.addonManifestUrl,
    "https://marvel.mystreamnet.club/catalog/marvel-mcu%2Cmovies%2Cseries/manifest.json",
  );
  assert.equal(
    sources.some((source) => source.kind === "CURATED_IDS"),
    true,
  );
  assert.equal(
    sources.some(
      (source) =>
        source.kind === "MDBLIST_PUBLIC" &&
        source.mdblistSlug ===
          "lt3dave/marvel-cinematic-universe-mcu-collection",
    ),
    true,
  );
});

test("catalogs without a row override inherit the global card layout", async () => {
  const { mergeCatalogs, resolveRailPosterMode } = await import(moduleUrl);
  const catalog = mergeCatalogs([
    {
      id: "trending_movies",
      name: "Trending Movies",
      sourceType: "preinstalled",
      enabled: true,
    },
  ]).find((entry) => entry.id === "trending_movies");

  assert.equal(catalog?.layout, undefined);
  assert.equal(resolveRailPosterMode("poster"), true);
  assert.equal(resolveRailPosterMode("landscape"), false);
  assert.equal(resolveRailPosterMode("poster", false), false);
  assert.equal(resolveRailPosterMode("landscape", true), true);
});
