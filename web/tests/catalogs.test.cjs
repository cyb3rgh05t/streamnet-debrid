const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/catalogs.ts"),
).href;
const i18nModuleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/i18n.ts"),
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

test("Decades Home rail uses the same German label as Android", async () => {
  const { translateUiText } = await import(i18nModuleUrl);

  assert.equal(translateUiText("de", "Decades"), "Jahrzehnte");
  assert.equal(translateUiText("en", "Decades"), "Decades");
});

test("Web fallback catalogs follow the current Android order", async () => {
  const { defaultCatalogs } = await import(moduleUrl);

  assert.equal(defaultCatalogs.length, 100);
  assert.deepEqual(
    defaultCatalogs.slice(0, 15).map((catalog) => catalog.id),
    [
      "recent_tv",
      "favorite_tv",
      "collection_rail_service",
      "collection_rail_franchise",
      "collection_rail_decade",
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

test("Decades rail and collections use public MDBList sources without addons", async () => {
  const { defaultCatalogs } = await import(moduleUrl);
  const rail = defaultCatalogs.find(
    (catalog) => catalog.id === "collection_rail_decade",
  );
  const expectedSlugs = [
    "snoak/top-2020s-movies",
    "snoak/top-2010s-movies",
    "snoak/top-2000s-movies",
    "snoak/top-1990s-movies",
    "snoak/top-1980s-movies",
    "snoak/popular-1970s-movies",
    "snoak/popular-1960s-movies",
  ];
  const decades = defaultCatalogs.filter(
    (catalog) =>
      catalog.kind === "COLLECTION" && catalog.collectionGroup === "DECADE",
  );

  assert.equal(rail?.kind, "COLLECTION_RAIL");
  assert.equal(decades.length, expectedSlugs.length);
  decades.forEach((catalog, index) => {
    assert.equal(catalog.collectionSources?.length, 1);
    assert.equal(catalog.collectionSources?.[0]?.kind, "MDBLIST_PUBLIC");
    assert.equal(
      catalog.collectionSources?.[0]?.mdblistSlug,
      expectedSlugs[index],
    );
    assert.equal(catalog.collectionSources?.[0]?.mediaType, "movie");
  });
});

test("disabled Decades rail is not recreated from its enabled collection cards", async () => {
  const { buildHomeCatalogEntries, defaultCatalogs, mergeCatalogs } =
    await import(moduleUrl);
  const enabledEntries = buildHomeCatalogEntries(defaultCatalogs);
  const disabledCatalogs = mergeCatalogs(defaultCatalogs, [
    "collection_rail_decade",
  ]);
  const disabledEntries = buildHomeCatalogEntries(disabledCatalogs);

  assert.equal(
    enabledEntries.some(
      (entry) => entry.type === "group" && entry.group === "DECADE",
    ),
    true,
  );
  assert.equal(
    disabledEntries.some(
      (entry) => entry.type === "group" && entry.group === "DECADE",
    ),
    false,
  );
});

test("Marvel release-order sources and chronology timeline retain fallbacks", async () => {
  const { defaultCatalogs } = await import(moduleUrl);
  const rail = defaultCatalogs.find(
    (catalog) => catalog.id === "collection_franchise_marvel",
  );
  const sources = rail?.collectionSources ?? [];

  assert.equal(sources[0]?.kind, "ADDON_CATALOG");
  assert.equal(sources[0]?.addonCatalogId, "movies");
  assert.equal(sources[0]?.collectionTab, "movie");
  assert.equal(
    sources[0]?.addonManifestUrl,
    "https://marvel.mystreamnet.club/catalog/marvel-mcu%2Cmovies%2Cseries/manifest.json",
  );
  assert.equal(
    sources.some(
      (source) =>
        source.kind === "ADDON_CATALOG" &&
        source.addonCatalogId === "series" &&
        source.collectionTab === "series",
    ),
    true,
  );
  assert.equal(
    sources.some(
      (source) =>
        source.kind === "ADDON_CATALOG" &&
        source.addonCatalogId === "marvel-mcu" &&
        source.addonCatalogType === "all" &&
        source.collectionTab === "timeline",
    ),
    true,
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

test("DC and Star Wars use their MystreamNet chronological manifests", async () => {
  const { defaultCatalogs } = await import(moduleUrl);
  const cases = [
    {
      id: "collection_franchise_dc_universe",
      manifestId: "com.cyb3rgh05t.dcaddon.custom.dc-chronological",
      catalogId: "dc-chronological",
      manifestUrl:
        "https://dc.mystreamnet.club/catalog/dc-chronological/manifest.json",
    },
    {
      id: "collection_franchise_star_wars",
      manifestId:
        "com.cyb3rgh05t.starwarsaddon.custom.sw-movies-series-chronological",
      catalogId: "sw-movies-series-chronological",
      manifestUrl:
        "https://starwars.mystreamnet.club/catalog/sw-movies-series-chronological/manifest.json",
    },
  ];

  for (const expected of cases) {
    const sources =
      defaultCatalogs.find((catalog) => catalog.id === expected.id)
        ?.collectionSources ?? [];
    const timeline = sources.find(
      (source) => source.collectionTab === "timeline",
    );
    assert.equal(timeline?.kind, "ADDON_CATALOG");
    assert.equal(timeline?.addonId, expected.manifestId);
    assert.equal(timeline?.addonCatalogId, expected.catalogId);
    assert.equal(timeline?.addonCatalogType, "all");
    assert.equal(timeline?.addonManifestUrl, expected.manifestUrl);
    assert.equal(
      sources.some((source) => source.collectionTab === "movie"),
      true,
    );
    assert.equal(
      sources.some((source) => source.collectionTab === "series"),
      true,
    );
    assert.equal(
      sources.some((source) => source.kind === "CURATED_IDS"),
      true,
    );
    assert.equal(
      sources.some((source) => source.kind === "MDBLIST_PUBLIC"),
      true,
    );
  }
});

test("direct franchise IMDb entries use localized TMDB overviews and landscape artwork", async () => {
  const { loadCatalog } = await import(
    pathToFileURL(path.join(__dirname, "..", "lib", "tmdb.ts")).href
  );
  const previousWindow = global.window;
  const previousFetch = global.fetch;
  const requestedLanguages = [];
  global.window = { location: { origin: "http://localhost" } };
  global.fetch = async (url) => {
    const request = new URL(url);
    if (request.pathname === "/api/proxy") {
      return Response.json({
        metas: [
          {
            id: "tt0371746",
            type: "movie",
            name: "Iron Man",
            poster: "portrait.jpg",
            description: "No description available.",
          },
        ],
      });
    }
    if (request.pathname === "/api/tmdb/find/tt0371746") {
      return Response.json({ movie_results: [{ id: 1726 }] });
    }
    if (request.pathname === "/api/tmdb/movie/1726") {
      const language = request.searchParams.get("language");
      requestedLanguages.push(language);
      return Response.json({
        id: 1726,
        title: "Iron Man",
        overview:
          language === "de-DE"
            ? "Deutsche Beschreibung"
            : "English description",
        poster_path: "/portrait.jpg",
        backdrop_path: "/wide.jpg",
      });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };
  const catalog = {
    id: "collection_franchise_marvel",
    name: "Marvel",
    kind: "COLLECTION",
    enabled: true,
    collectionSources: [
      {
        kind: "ADDON_CATALOG",
        addonManifestUrl: "https://marvel.example/manifest.json",
        addonCatalogType: "movie",
        addonCatalogId: "marvel-mcu",
        mediaType: "movie",
      },
    ],
  };
  try {
    const german = await loadCatalog(catalog, "de-DE");
    const english = await loadCatalog(catalog, "en-US");
    assert.equal(german.items[0].id, 1726);
    assert.equal(german.items[0].overview, "Deutsche Beschreibung");
    assert.match(german.items[0].backdrop, /wide\.jpg$/);
    assert.equal(english.items[0].overview, "English description");
    assert.deepEqual(requestedLanguages, ["de-DE", "en-US"]);
  } finally {
    global.fetch = previousFetch;
    global.window = previousWindow;
  }
});

test("direct franchise manifest remains authoritative over an installed legacy addon URL", async () => {
  const { loadCatalog } = await import(
    pathToFileURL(path.join(__dirname, "..", "lib", "tmdb.ts")).href
  );
  const previousWindow = global.window;
  const previousFetch = global.fetch;
  global.window = { location: { origin: "http://localhost" } };
  const requestedUrls = [];
  global.fetch = async (url) => {
    requestedUrls.push(String(url));
    const request = new URL(url);
    if (request.pathname === "/api/proxy") {
      return Response.json({
        metas: [
          {
            id: "tt0371746",
            type: "movie",
            name: "Iron Man",
            poster: "portrait.jpg",
          },
        ],
      });
    }
    if (request.pathname === "/api/tmdb/find/tt0371746") {
      return Response.json({ movie_results: [{ id: 1726 }] });
    }
    if (request.pathname === "/api/tmdb/movie/1726") {
      return Response.json({
        id: 1726,
        title: "Iron Man",
        overview: "Iron Man",
        poster_path: "/portrait.jpg",
        backdrop_path: "/wide.jpg",
      });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };
  try {
    await loadCatalog(
      {
        id: "collection_franchise_marvel",
        name: "Marvel",
        kind: "COLLECTION",
        enabled: true,
        collectionSources: [
          {
            kind: "ADDON_CATALOG",
            addonId: "marvel",
            addonManifestUrl:
              "https://marvel.mystreamnet.club/catalog/marvel-mcu/manifest.json",
            addonCatalogType: "movie",
            addonCatalogId: "marvel-mcu",
            mediaType: "movie",
          },
        ],
      },
      "de-DE",
      [
        {
          id: "marvel",
          name: "Marvel",
          manifestUrl: "https://legacy.example/manifest.json",
          enabled: true,
          isEnabled: true,
        },
      ],
    );
    assert.equal(
      requestedUrls.some((url) => url.includes("marvel.mystreamnet.club")),
      true,
    );
    assert.equal(
      requestedUrls.some((url) => url.includes("legacy.example")),
      false,
    );
  } finally {
    global.fetch = previousFetch;
    global.window = previousWindow;
  }
});

test("unresolved direct franchise entries do not show English manifest copy in German", async () => {
  const { loadCatalog } = await import(
    pathToFileURL(path.join(__dirname, "..", "lib", "tmdb.ts")).href
  );
  const previousWindow = global.window;
  const previousFetch = global.fetch;
  global.window = { location: { origin: "http://localhost" } };
  global.fetch = async (url) => {
    const request = new URL(url);
    if (request.pathname === "/api/proxy") {
      return Response.json({
        metas: [
          {
            id: "tt99999999",
            type: "movie",
            name: "Unknown Film",
            poster: "portrait.jpg",
            description: "English plot",
          },
        ],
      });
    }
    if (request.pathname.startsWith("/api/tmdb/")) {
      return Response.json(
        request.pathname.includes("/find/")
          ? { movie_results: [] }
          : { results: [] },
      );
    }
    throw new Error(`Unexpected URL: ${url}`);
  };
  try {
    const row = await loadCatalog(
      {
        id: "collection_franchise_dc",
        name: "DC",
        kind: "COLLECTION",
        enabled: true,
        collectionSources: [
          {
            kind: "ADDON_CATALOG",
            addonManifestUrl: "https://dc.example/manifest.json",
            addonCatalogType: "movie",
            addonCatalogId: "dc-chronological",
            mediaType: "movie",
          },
        ],
      },
      "de-DE",
    );
    assert.equal(row.items[0].overview, "");
    assert.equal(row.items[0].backdrop, null);
    assert.equal(row.items[0].image, "portrait.jpg");
  } finally {
    global.fetch = previousFetch;
    global.window = previousWindow;
  }
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
