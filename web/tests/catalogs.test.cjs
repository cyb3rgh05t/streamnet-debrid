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

test("URL catalogs identify their provider and repair old mislabeled Trakt lists", async () => {
  const { catalogUrlSourceType, mergeCatalogs } = await import(moduleUrl);
  const url = "https://trakt.tv/users/movistapp/lists/horror";
  assert.equal(catalogUrlSourceType(url), "trakt");
  assert.equal(catalogUrlSourceType("https://www.mdblist.com/lists/user/horror"), "mdblist");
  assert.equal(catalogUrlSourceType("https://trakt.tv.example.org/lists/test"), null);
  assert.equal(catalogUrlSourceType("not a URL"), null);
  const imported = mergeCatalogs([{
    id: "custom_web", name: "Horror", sourceType: "mdblist",
    sourceUrl: url, enabled: true,
  }]).find((catalog) => catalog.id === "custom_web");
  assert.equal(imported.sourceType, "trakt");
  assert.equal(imported.title, "Horror");
});

test("new URL rails stay ahead of existing TV rails and survive a sync roundtrip", async () => {
  const { defaultCatalogs, mergeCatalogs } = await import(moduleUrl);
  const { writeCatalogProfileState } = await import(
    pathToFileURL(path.resolve(__dirname, "../lib/catalogSync.ts")).href
  );
  const previous = mergeCatalogs(defaultCatalogs);
  const added = {
    id: "custom_new", name: "New list", sourceType: "trakt",
    sourceUrl: "https://trakt.tv/users/movistapp/lists/horror", enabled: true,
  };
  const merged = mergeCatalogs([added, ...previous]);
  assert.equal(merged[0].id, added.id);
  assert.deepEqual(merged.slice(1).map((item) => item.id), previous.map((item) => item.id));
  const root = {};
  const settings = { catalogs: merged, hiddenCatalogIds: [], hiddenHomeServerCatalogIds: [] };
  writeCatalogProfileState(root, "main", settings, null, 2000);
  const restored = mergeCatalogs(root.catalogsByProfile.main);
  assert.deepEqual(restored.map((item) => item.id), merged.map((item) => item.id));
});

test("remote default names survive default overlays and German localization", async () => {
  const { defaultCatalogs, mergeCatalogs, localizedCatalogName } = await import(moduleUrl);
  const builtin = defaultCatalogs[0];
  const stored = {
    ...builtin, title: "Remote Cinema", name: "Remote Cinema",
    remoteTitle: "Remote Cinema", remoteManaged: true, enabled: false,
  };
  const merged = mergeCatalogs([stored], [builtin.id]).find((item) => item.id === builtin.id);
  assert.equal(merged.title, "Remote Cinema");
  assert.equal(merged.name, "Remote Cinema");
  assert.equal(merged.remoteManaged, true);
  assert.equal(merged.enabled, false);
  assert.equal(localizedCatalogName(merged, "de"), "Remote Cinema");
  assert.equal(localizedCatalogName(merged, "en"), "Remote Cinema");
});

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

test("Decades Home rail uses the same German label as Android", async () => {
  const { translateUiText } = await import(i18nModuleUrl);

  assert.equal(translateUiText("de", "Decades"), "Jahrzehnte");
  assert.equal(translateUiText("en", "Decades"), "Decades");
});

test("Web fallback catalogs follow the current Android order", async () => {
  const { defaultCatalogs } = await import(moduleUrl);

  assert.equal(defaultCatalogs.length, 96);
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

test("standard collections do not depend on addons the user has to install", async () => {
  const { defaultCatalogs } = await import(moduleUrl);
  for (const catalog of defaultCatalogs.filter((c) => c.kind === "COLLECTION")) {
    for (const source of catalog.collectionSources ?? []) {
      if (source.kind !== "ADDON_CATALOG") continue;
      assert.ok(source.addonManifestUrl, `${catalog.id} needs an installed addon`);
    }
  }
});

test("Marvel, DC and Star Wars run on bundled title lists with movie, series and timeline tabs", async () => {
  const { defaultCatalogs } = await import(moduleUrl);
  for (const id of ["collection_franchise_marvel", "collection_franchise_dc_universe", "collection_franchise_star_wars"]) {
    const sources = defaultCatalogs.find((c) => c.id === id).collectionSources;
    assert.equal(sources.some((s) => s.kind === "ADDON_CATALOG"), false, id);
    for (const tab of ["movie", "series", "timeline"]) {
      const list = sources.find((s) => s.kind === "CURATED_IDS" && s.collectionTab === tab);
      assert.ok(list && list.curatedRefs.length > 0, id + " " + tab);
    }
  }
});

test("the bundled franchise lists are exactly the shared franchise-lists json", async () => {
  const { bundledFranchiseLists } = await import(pathToFileURL(path.resolve(__dirname, "../lib/franchiseListSeed.ts")).href);
  const master = JSON.parse(require("node:fs").readFileSync(path.resolve(__dirname, "../../catalog-contract/franchise-lists.json"), "utf8")).lists;
  for (const list of Object.values(master)) {
    const bundled = bundledFranchiseLists[list.catalogId];
    assert.deepEqual(bundled.movie.map((e) => e.ref), list.tabs.movie.map((e) => e.ref), list.id + " movie");
    assert.deepEqual(bundled.series.map((e) => e.ref), list.tabs.series.map((e) => e.ref), list.id + " series");
    assert.deepEqual(bundled.timeline, list.tabs.timeline.map((e) => ({ ref: e.ref, title: e.title })), list.id + " timeline");
  }
  const marvel = bundledFranchiseLists.collection_franchise_marvel.timeline;
  assert.ok(marvel.length > new Set(marvel.map((e) => e.ref)).size, "season entries repeat in the Marvel timeline");
});

test("the central config is parsed, malformed entries are dropped and the timeline keeps repeats", async () => {
  const { parseCatalogConfig } = await import(pathToFileURL(path.resolve(__dirname, "../lib/catalogConfig.ts")).href);
  const parsed = parseCatalogConfig({
    franchises: [
      { id: "marvel", title: "Marvel", catalogId: "collection_franchise_marvel", builtin: true, tabs: {
        movie: [{ ref: "movie:1" }, { ref: "MOVIE:2" }, { ref: "movie:1" }, { ref: "x" }],
        series: [{ ref: "tv:3" }],
        timeline: [{ ref: "tv:3", title: "Staffel 1" }, { ref: "tv:3", title: "Staffel 2" }] } },
      { id: "ghibli", title: "Ghibli", builtin: false, coverUrl: "https://example.com/g.jpg", tabs: { movie: [{ ref: "movie:129" }] },
        tmdbCollections: [8, 0, "x"], mdblist: ["me/list", "bad slug"] },
      { id: "oops", title: "Cover", builtin: false, coverUrl: "http://example.com/a.jpg", tabs: {} },
      { id: "x", title: "Short id", builtin: false, tabs: {} },
      { id: "other", title: "Other", catalogId: "collection_franchise_other", builtin: true, tabs: {} },
    ],
    overrides: { rows: { trending_movies: "https://mdblist.com/lists/me/x" }, covers: { collection_service_netflix: "https://example.com/n.jpg", x: "http://bad" }, sources: { c: { tmdbCollections: [8, 0], mdblist: ["me/a", "bad slug"] }, d: { tmdbCollections: [] } }, extras: { c: ["tv:1"] } },
  });
  assert.deepEqual(parsed.franchises.map((f) => f.catalogId), ["collection_franchise_marvel", "collection_franchise_ghibli", "collection_franchise_oops"]);
  const [marvel, ghibli, oops] = parsed.franchises;
  assert.deepEqual(marvel.tabs.movie.map((e) => e.ref), ["movie:1", "movie:2"]);
  assert.deepEqual(marvel.tabs.timeline, [{ ref: "tv:3", title: "Staffel 1" }, { ref: "tv:3", title: "Staffel 2" }]);
  assert.equal(ghibli.coverUrl, "https://example.com/g.jpg");
  assert.deepEqual(ghibli.tmdbCollections, [8]);
  assert.deepEqual(ghibli.mdblist, ["me/list"]);
  assert.equal(oops.coverUrl, null);
  assert.equal(parsed.overrides.rows.trending_movies, "https://mdblist.com/lists/me/x");
  assert.deepEqual(parsed.overrides.sources, { c: { tmdbCollections: [8], mdblist: ["me/a"] } });
  assert.equal(parsed.overrides.covers.collection_service_netflix, "https://example.com/n.jpg");
  assert.equal(parseCatalogConfig("nope"), null);
});

test("the central config replaces the tab lists, adds franchises and applies the overrides to the defaults", async () => {
  const { defaultCatalogs } = await import(moduleUrl);
  const { applyCentralConfig, withFranchiseLists, getCentralConfig } = await import(pathToFileURL(path.resolve(__dirname, "../lib/catalogConfig.ts")).href);
  const tabs = (movie, timeline = []) => ({ movie, series: [], timeline });
  const result = applyCentralConfig(defaultCatalogs, {
    franchises: [
      { id: "marvel", title: "Marvel", catalogId: "collection_franchise_marvel", builtin: true, coverUrl: null, tabs: tabs([{ ref: "movie:1" }]), tmdbCollections: [], mdblist: [] },
      { id: "ghibli", title: "Ghibli", catalogId: "collection_franchise_ghibli", builtin: false, coverUrl: "https://example.com/g.jpg", tabs: tabs([{ ref: "movie:129" }]), tmdbCollections: [8], mdblist: ["me/list"] },
    ],
    overrides: {
      rows: { trending_movies: "https://mdblist.com/lists/me/trending", recent_tv: "https://mdblist.com/lists/me/ignored" },
      covers: { collection_service_netflix: "https://example.com/netflix.jpg", collection_service_hulu: "http://insecure" },
      sources: { collection_franchise_harry_potter: { tmdbCollections: [7, 9], mdblist: ["me/hp"] } },
      extras: { collection_franchise_james_bond: ["TV:84773", "bogus"] },
    },
  });
  const marvel = result.find((c) => c.id === "collection_franchise_marvel").collectionSources;
  assert.deepEqual(marvel.find((s) => s.collectionTab === "movie").curatedRefs, ["movie:1"]);
  assert.equal(marvel.some((s) => s.collectionTab === "series"), false, "an emptied tab disappears");
  assert.equal(result.find((c) => c.id === "trending_movies").sourceUrl, "https://mdblist.com/lists/me/trending");
  assert.equal(result.find((c) => c.id === "recent_tv").sourceUrl, undefined);
  const hp = result.find((c) => c.id === "collection_franchise_harry_potter").collectionSources;
  assert.deepEqual(hp.filter((s) => s.tmdbCollectionId).map((s) => s.tmdbCollectionId), [7, 9]);
  assert.deepEqual(hp.filter((s) => s.mdblistSlug).map((s) => s.mdblistSlug), ["me/hp"]);
  assert.ok(hp.some((s) => String(s.curatedRefs) === "tv:224377"), "added titles of the app stay");
  const netflix = result.find((c) => c.id === "collection_service_netflix");
  assert.equal(netflix.collectionCoverImageUrl, "https://example.com/netflix.jpg");
  assert.equal(netflix.collectionHeroImageUrl, "https://example.com/netflix.jpg");
  assert.equal(result.find((c) => c.id === "collection_service_hulu").collectionCoverImageUrl, defaultCatalogs.find((c) => c.id === "collection_service_hulu").collectionCoverImageUrl);
  assert.ok(result.find((c) => c.id === "collection_franchise_james_bond").collectionSources.some((s) => String(s.curatedRefs) === "tv:84773"));
  const ghibli = result.find((c) => c.id === "collection_franchise_ghibli");
  assert.equal(ghibli.remoteFranchise, true);
  assert.ok(ghibli.collectionSources.some((s) => s.tmdbCollectionId === 8));
  const franchises = result.filter((c) => c.kind === "COLLECTION" && c.collectionGroup === "FRANCHISE");
  assert.equal(franchises.at(-1).id, "collection_franchise_ghibli");
  assert.equal(result.length, defaultCatalogs.length + 1);

  // With nothing fetched or stored, the sources of any collection (also a tab view) are returned unchanged.
  getCentralConfig();
  const own = [{ kind: "CURATED_IDS", collectionTab: "movie", curatedRefs: ["movie:5"] }];
  assert.deepEqual(withFranchiseLists("collection_service_netflix", own), own);
});
test("the titles a franchise ships outside its lists can be replaced or removed centrally", async () => {
  const { defaultCatalogs } = await import(moduleUrl);
  const { applyCentralConfig, parseCatalogConfig } = await import(pathToFileURL(path.resolve(__dirname, "../lib/catalogConfig.ts")).href);
  const own = (curated) => {
    const central = parseCatalogConfig({ franchises: [], overrides: { sources: { collection_franchise_harry_potter: { curated } } } });
    const hp = applyCentralConfig(defaultCatalogs, central).find((c) => c.id === "collection_franchise_harry_potter");
    return hp.collectionSources.filter((s) => s.kind === "CURATED_IDS" && !s.collectionTab).flatMap((s) => s.curatedRefs);
  };
  assert.deepEqual(own(["TV:1", "movie:2", "bogus"]), ["tv:1", "movie:2"]);
  assert.deepEqual(own([]), []);
  const untouched = applyCentralConfig(defaultCatalogs, parseCatalogConfig({ franchises: [], overrides: {} }));
  assert.deepEqual(untouched.find((c) => c.id === "collection_franchise_harry_potter").collectionSources.filter((s) => s.kind === "CURATED_IDS").flatMap((s) => s.curatedRefs), ["tv:224377"]);
});

test("home rows can be hidden for everyone and added with a position, and saved copies follow the central config", async () => {
  const { defaultCatalogs, mergeCatalogs } = await import(moduleUrl);
  const { applyCentralConfig, parseCatalogConfig } = await import(pathToFileURL(path.resolve(__dirname, "../lib/catalogConfig.ts")).href);
  const central = parseCatalogConfig({ franchises: [], overrides: {
    hidden: ["new_kdramas", "collection_rail_tv_genre"],
    newRows: [
      { id: "top-horror", title: "Top Horror", url: "https://mdblist.com/lists/snoak/top-horror", mediaType: "movie", after: "trending_movies" },
      { id: "kids", title: "Kids", url: "https://mdblist.com/lists/me/kids", after: "top-horror" },
      { id: "bad", title: "Bad", url: "https://evil.example/lists/a/b" },
    ],
  } });
  assert.deepEqual(central.overrides.newRows.map((row) => row.id), ["top-horror", "kids"]);
  const result = applyCentralConfig(defaultCatalogs, central);
  const ids = result.map((catalog) => catalog.id);
  assert.ok(!ids.includes("new_kdramas") && !ids.includes("collection_rail_tv_genre"));
  const at = ids.indexOf("trending_movies");
  assert.deepEqual(ids.slice(at, at + 3), ["trending_movies", "central_row_top_horror", "central_row_kids"]);
  const row = result.find((catalog) => catalog.id === "central_row_top_horror");
  assert.equal(row.sourceUrl, "https://mdblist.com/lists/snoak/top-horror");
  assert.equal(row.sourceType, "mdblist");
  assert.equal(row.mediaType, "movie");
  assert.equal(result.length, defaultCatalogs.length);

  // With nothing fetched, a saved copy of an admin-added row no longer in the central config is dropped.
  const saved = [{ id: "central_row_old", name: "Old", sourceType: "mdblist", sourceUrl: "https://mdblist.com/lists/a/b", enabled: true, isPreinstalled: true }];
  assert.equal(mergeCatalogs(saved).some((catalog) => catalog.id === "central_row_old"), false);
});

test("streaming services use the country of the language as watch region", async () => {
  const { watchRegionForLanguage } = await import(
    pathToFileURL(path.resolve(__dirname, "../lib/tmdb.ts")).href
  );
  assert.equal(watchRegionForLanguage("de-DE"), "DE");
  assert.equal(watchRegionForLanguage("pt-BR"), "BR");
  assert.equal(watchRegionForLanguage("en"), "US");
});
test("an explicit watch region wins over the language and automatic follows the language", async () => {
  const { watchRegionForLanguage } = await import(
    pathToFileURL(path.resolve(__dirname, "../lib/tmdb.ts")).href
  );
  assert.equal(watchRegionForLanguage("de-DE", "auto"), "DE");
  assert.equal(watchRegionForLanguage("de-DE", "ch"), "CH");
  assert.equal(watchRegionForLanguage("en-US", "ZZ"), "US");
});