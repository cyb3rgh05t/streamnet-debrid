import type { CatalogConfig } from "./types";
import type { UiLanguage } from "./i18n";

const germanCatalogNames: Record<string, string> = {
  trending_movies: "Filmtrends",
  trending_tv: "Serientrends",
  trending_anime: "Anime-Trends",
  top10_movies_today: "Top 10 Filme heute",
  top10_shows_today: "Top 10 Serien heute",
  just_added: "Neu hinzugefügt",
  latest_tv: "Aktuell ausgestrahlt",
  top_movies_week: "Top-Filme dieser Woche",
  new_kdramas: "Neue K-Dramen",
  coming_soon: "Kommende Filme",
  upcoming_series: "Kommende Serien",
  recently_watched_movies: "Zuletzt gesehene Filme",
  recently_watched_series: "Zuletzt gesehene Serien",
  recent_tv: "Zuletzt gesehene Sender",
  favorite_tv: "TV-Favoriten",
};

export function localizedCatalogName(
  catalog: Pick<CatalogConfig, "id" | "name">,
  language: UiLanguage,
): string {
  return language === "de"
    ? (germanCatalogNames[catalog.id] ?? catalog.name)
    : catalog.name;
}

export const defaultCatalogs: CatalogConfig[] = [
  {
    id: "recent_tv",
    name: "Recently Watched TV",
    sourceType: "preinstalled",
    enabled: true,
    isPreinstalled: true,
  },
  {
    id: "favorite_tv",
    name: "Favorite TV",
    sourceType: "preinstalled",
    enabled: true,
    isPreinstalled: true,
  },
  {
    id: "trending_movies",
    name: "Trending in Movies",
    sourceType: "mdblist",
    mediaType: "movie",
    sourceUrl: "https://mdblist.com/lists/snoak/trending-movies",
    enabled: true,
    isPreinstalled: true,
  },
  {
    id: "trending_tv",
    name: "Trending in Shows",
    sourceType: "mdblist",
    mediaType: "tv",
    sourceUrl: "https://mdblist.com/lists/snoak/trakt-s-trending-shows",
    enabled: true,
    isPreinstalled: true,
  },
  {
    id: "trending_anime",
    name: "Trending in Anime",
    sourceType: "mdblist",
    mediaType: "tv",
    sourceUrl: "https://mdblist.com/lists/snoak/trending-anime-shows",
    enabled: true,
    isPreinstalled: true,
  },
  {
    id: "top10_movies_today",
    name: "Top 10 Movies Today",
    sourceType: "mdblist",
    mediaType: "movie",
    sourceUrl: "https://mdblist.com/lists/snoak/top-10-movies-of-the-day",
    enabled: true,
    isPreinstalled: true,
  },
  {
    id: "top10_shows_today",
    name: "Top 10 Shows Today",
    sourceType: "mdblist",
    mediaType: "tv",
    sourceUrl: "https://mdblist.com/lists/snoak/top-10-shows-of-the-day",
    enabled: true,
    isPreinstalled: true,
  },
  {
    id: "just_added",
    name: "Just Added",
    sourceType: "mdblist",
    mediaType: "movie",
    sourceUrl: "https://mdblist.com/lists/snoak/latest-movies-digital-release",
    enabled: true,
    isPreinstalled: true,
  },
  {
    id: "top_movies_week",
    name: "Top Movies This Week",
    sourceType: "mdblist",
    mediaType: "movie",
    sourceUrl:
      "https://mdblist.com/lists/linaspurinis/top-watched-movies-of-the-week",
    enabled: true,
    isPreinstalled: true,
  },
  {
    id: "new_kdramas",
    name: "New in K-Dramas",
    sourceType: "mdblist",
    mediaType: "tv",
    sourceUrl: "https://mdblist.com/lists/snoak/latest-kdrama-shows",
    enabled: true,
    isPreinstalled: true,
  },
  {
    id: "coming_soon",
    name: "Upcoming Movies",
    sourceType: "mdblist",
    mediaType: "movie",
    sourceUrl: "https://mdblist.com/lists/snoak/upcoming-movies",
    enabled: true,
    isPreinstalled: true,
  },
  {
    id: "upcoming_series",
    name: "Upcoming Series",
    sourceType: "mdblist",
    mediaType: "tv",
    sourceUrl: "https://mdblist.com/lists/snoak/latest-tv-shows",
    enabled: true,
    isPreinstalled: true,
  },
  {
    id: "recently_watched_movies",
    name: "Recently Watched Movies",
    sourceType: "preinstalled",
    enabled: true,
    isPreinstalled: true,
  },
  {
    id: "recently_watched_series",
    name: "Recently Watched Series",
    sourceType: "preinstalled",
    enabled: true,
    isPreinstalled: true,
  },
];

const defaultCatalogOrder = [
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
];
const defaultCatalogRank = new Map(
  defaultCatalogOrder.map((catalogId, index) => [catalogId, index]),
);
defaultCatalogs.sort(
  (left, right) =>
    (defaultCatalogRank.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
    (defaultCatalogRank.get(right.id) ?? Number.MAX_SAFE_INTEGER),
);

const retiredWebCatalogIds = new Set([
  "latest_tv",
  "action",
  "comedy",
  "scifi",
  "thriller",
  "drama",
  "horror",
  "documentary",
  "romance",
  "animated",
  "family",
  "bond",
  "harry_potter",
  "matrix",
  "lotr",
  "jurassic",
  "tmdb_popular_movies",
  "tmdb_popular_tv",
]);

function isValidCatalog(
  catalog: CatalogConfig | null | undefined,
): catalog is CatalogConfig {
  if (!catalog || typeof catalog !== "object") return false;
  if (!String(catalog.id ?? "").trim()) return false;
  if (!String(catalog.name ?? catalog.title ?? "").trim()) return false;
  if (!String(catalog.sourceType ?? "").trim()) return false;
  return true;
}

function normalizedSourceType(value: unknown): CatalogConfig["sourceType"] {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  if (raw === "preinstalled") return "preinstalled";
  if (raw === "trakt") return "trakt";
  if (raw === "mdblist" || raw === "mdb-list") return "mdblist";
  if (raw === "addon") return "addon";
  if (raw === "home-server" || raw === "homeserver") return "home-server";
  if (raw === "template") return "template";
  if (raw === "tmdb") return "tmdb";
  return "preinstalled";
}

function normalizedLayout(catalog: CatalogConfig): CatalogConfig["layout"] {
  const shape = String(catalog.collectionTileShape ?? "")
    .trim()
    .toLowerCase();
  if (shape === "poster") return "poster";
  return catalog.layout ?? "landscape";
}

function normalizedCatalog(catalog: CatalogConfig): CatalogConfig {
  return {
    ...catalog,
    id: String(catalog.id).trim(),
    name: String(catalog.name ?? catalog.title).trim(),
    title: String(catalog.name ?? catalog.title).trim(),
    sourceType: normalizedSourceType(catalog.sourceType),
    layout: normalizedLayout(catalog),
    enabled: catalog.enabled !== false,
  };
}

// Old web builds seeded per-service mdblist rows (garycrawfordgc lists) that are
// now dead or stale, and those entries were synced into user clouds. The real
// service rows are the APK's collection catalogs — drop the legacy ones anywhere
// they appear so services never show twice.
function isLegacyServiceCatalog(catalog: CatalogConfig) {
  if (String(catalog.sourceUrl ?? "").includes("garycrawfordgc")) return true;
  return (
    catalog.sourceType === "mdblist" &&
    [
      "netflix",
      "disney",
      "prime",
      "hbo",
      "apple_tv",
      "hulu",
      "paramount",
    ].includes(catalog.id)
  );
}

function isRetiredCatalog(catalog: CatalogConfig) {
  const group = String(catalog.collectionGroup ?? "").toUpperCase();
  return (
    group === "DECADE" ||
    group === "FEATURED" ||
    /^collection_(?:rail_)?(?:decade|featured)(?:_|$)/i.test(catalog.id) ||
    retiredWebCatalogIds.has(catalog.id)
  );
}

export function mergeCatalogs(
  saved: CatalogConfig[] | undefined,
  hiddenIds: string[] = [],
) {
  const cleaned = (saved ?? [])
    .filter(isValidCatalog)
    .map(normalizedCatalog)
    .filter((catalog) => !isRetiredCatalog(catalog))
    .filter((catalog) => !isLegacyServiceCatalog(catalog));
  const savedById = new Map(cleaned.map((catalog) => [catalog.id, catalog]));
  const result = cleaned.map((catalog) => {
    const currentDefault = defaultCatalogs.find(
      (candidate) => candidate.id === catalog.id,
    );
    return {
      ...catalog,
      ...(currentDefault && catalog.isPreinstalled ? currentDefault : {}),
      enabled: !hiddenIds.includes(catalog.id) && catalog.enabled !== false,
    };
  });
  for (const catalog of defaultCatalogs) {
    if (savedById.has(catalog.id)) continue;
    const rank = defaultCatalogRank.get(catalog.id) ?? Number.MAX_SAFE_INTEGER;
    const successor = result.findIndex(
      (candidate) => (defaultCatalogRank.get(candidate.id) ?? -1) > rank,
    );
    const enabled = !hiddenIds.includes(catalog.id) && catalog.enabled;
    result.splice(successor < 0 ? result.length : successor, 0, {
      ...catalog,
      enabled,
    });
  }
  return result;
}
