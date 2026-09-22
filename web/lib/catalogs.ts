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

const androidCollectionGroups = {
  featured: "FEATURED",
  service: "SERVICE",
  decade: "DECADE",
  movieGenre: "MOVIE_GENRE",
  tvGenre: "TV_GENRE",
  franchise: "FRANCHISE",
} as const;

function catalogSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/&/g, "and")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function collectionDefault(
  title: string,
  group: (typeof androidCollectionGroups)[keyof typeof androidCollectionGroups],
  collectionSources: CatalogConfig["collectionSources"] = [],
): CatalogConfig {
  return {
    id: `collection_${group.toLowerCase()}_${catalogSlug(title)}`,
    name: title,
    sourceType: "preinstalled",
    enabled: true,
    isPreinstalled: true,
    kind: "COLLECTION",
    collectionGroup: group,
    collectionDescription: `Browse ${title}.`,
    collectionTileShape: "LANDSCAPE",
    collectionCoverImageUrl: androidCollectionArtwork[title]?.cover,
    collectionFocusGifUrl: androidCollectionArtwork[title]?.cover,
    collectionHeroImageUrl: androidCollectionArtwork[title]?.cover,
    collectionHeroVideoUrl: androidCollectionArtwork[title]?.heroVideo,
    collectionHideTitle: androidCollectionArtwork[title]?.hideTitle,
    collectionSources,
  };
}

function collectionRail(
  group: (typeof androidCollectionGroups)[keyof typeof androidCollectionGroups],
  title: string,
): CatalogConfig {
  return {
    id: `collection_rail_${group.toLowerCase()}`,
    name: title,
    sourceType: "preinstalled",
    enabled: true,
    isPreinstalled: true,
    kind: "COLLECTION_RAIL",
    collectionGroup: group,
  };
}

export function collectionRailIdForGroup(group: string | null | undefined) {
  const normalized = String(group ?? "")
    .trim()
    .toLowerCase();
  return normalized ? `collection_rail_${normalized}` : null;
}

function addonSource(
  addonId: string,
  addonCatalogType: string,
  addonCatalogId: string,
): NonNullable<CatalogConfig["collectionSources"]>[number] {
  return { kind: "ADDON_CATALOG", addonId, addonCatalogType, addonCatalogId };
}

function providerSource(
  mediaType: "movie" | "series",
  tmdbWatchProviderId: number,
): NonNullable<CatalogConfig["collectionSources"]>[number] {
  return {
    kind: "TMDB_WATCH_PROVIDER",
    mediaType,
    tmdbWatchProviderId,
    watchRegion: "US",
    sortBy: "popularity.desc",
  };
}

function serviceSources(
  addonCatalogId: string,
  providerId: number,
  extraProviderIds: number[] = [],
) {
  return [
    addonSource("aio-metadata", "movie", addonCatalogId),
    addonSource("aio-metadata", "series", addonCatalogId),
    ...[providerId, ...extraProviderIds].flatMap((id) => [
      providerSource("movie", id),
      providerSource("series", id),
    ]),
  ];
}

function mdblistAddonSource(
  addonCatalogType: "movie" | "series" | "all",
  addonCatalogId: string,
) {
  return addonSource("aio-metadata", addonCatalogType, addonCatalogId);
}

const androidAssetBase =
  "https://raw.githubusercontent.com/cyb3rgh05t/networks-video-collection/9cc3dde7f7960c9256f0d81a761aa3ccbad4b976/";
const franchiseAssetBase =
  "https://raw.githubusercontent.com/cyb3rgh05t/networks-video-collection/20bee004466c109d992a78601a78f0609dd2f78a/images/Franchises/";
const streamingImageBase = `${androidAssetBase}images/Landscape%20Streaming%20Services/`;
const videoBase = `${androidAssetBase}networks%20videos/`;

const androidCollectionArtwork: Record<
  string,
  { cover: string; heroVideo?: string; hideTitle?: boolean }
> = {
  "Latest Movies": {
    cover: `${androidAssetBase}images/Latest-Movies.jpg`,
    hideTitle: true,
  },
  "Latest Shows": {
    cover: `${androidAssetBase}images/Latest-Shows.jpg`,
    hideTitle: true,
  },
  "Trending Movies": {
    cover: `${androidAssetBase}images/Trending-Movies.jpg`,
    hideTitle: true,
  },
  "Trending Shows": {
    cover: `${androidAssetBase}images/Trending-Shows.jpg`,
    hideTitle: true,
  },
  Netflix: {
    cover: `${streamingImageBase}netflix.jpegli.jpg`,
    heroVideo: `${videoBase}netflix.mp4`,
    hideTitle: true,
  },
  "Disney+": {
    cover: `${streamingImageBase}disney.jpegli.jpg`,
    heroVideo: `${videoBase}disneyplus.mp4`,
    hideTitle: true,
  },
  "Apple TV+": {
    cover: `${streamingImageBase}apple.jpegli.jpg`,
    heroVideo: `${videoBase}appletv.mp4`,
    hideTitle: true,
  },
  "Prime Video": {
    cover: `${streamingImageBase}prime.jpegli.jpg`,
    heroVideo: `${videoBase}amazonprime.mp4`,
    hideTitle: true,
  },
  "HBO Max": {
    cover: `${streamingImageBase}hbo.jpegli.jpg`,
    heroVideo: `${videoBase}hbomax.mp4`,
    hideTitle: true,
  },
  Hulu: {
    cover: `${streamingImageBase}hulu.jpegli.jpg`,
    heroVideo: `${videoBase}hulu.mp4`,
    hideTitle: true,
  },
  "Paramount+": {
    cover: `${streamingImageBase}paramount.jpegli.jpg`,
    heroVideo: `${videoBase}paramount.mp4`,
    hideTitle: true,
  },
  Peacock: {
    cover: `${streamingImageBase}peacock.jpegli.jpg`,
    heroVideo: `${videoBase}peacock.mp4`,
    hideTitle: true,
  },
  Starz: {
    cover: `${androidAssetBase}images/Starz.jpg`,
    heroVideo: `${videoBase}starz.mp4`,
    hideTitle: true,
  },
  Shudder: {
    cover: `${streamingImageBase}Shudder.jpegli.jpg`,
    heroVideo: `${videoBase}shudder.mp4`,
    hideTitle: true,
  },
  "MGM+": {
    cover: `${streamingImageBase}mgmplus.jpegli.jpg`,
    heroVideo: `${videoBase}mgm.mp4`,
    hideTitle: true,
  },
  "Discovery+": {
    cover: `${streamingImageBase}discovery.jpegli.jpg`,
    heroVideo: `${videoBase}discovery.mp4`,
    hideTitle: true,
  },
  Crunchyroll: {
    cover:
      "https://mir-s3-cdn-cf.behance.net/project_modules/fs_webp/380e75223389683.67f7c1dc0669a.png",
    heroVideo: `${videoBase}crunchyroll.mp4`,
    hideTitle: true,
  },
  "20's Movies": {
    cover: `${androidAssetBase}images/20snew.jpg`,
    hideTitle: true,
  },
  "10's Movies": {
    cover: `${androidAssetBase}images/10snew.jpg`,
    hideTitle: true,
  },
  "00's Movies": {
    cover: `${androidAssetBase}images/00snew.jpg`,
    hideTitle: true,
  },
  "90's Movies": {
    cover: `${androidAssetBase}images/90snew.jpg`,
    hideTitle: true,
  },
  "80's Movies": {
    cover: `${androidAssetBase}images/80snew.jpg`,
    hideTitle: true,
  },
  "70's Movies": {
    cover: `${androidAssetBase}images/70snew.png`,
    hideTitle: true,
  },
  "60's Movies": {
    cover: `${androidAssetBase}images/60snew.png`,
    hideTitle: true,
  },
  Marvel: { cover: `${franchiseAssetBase}Marvel.jpg`, hideTitle: true },
  "DC Universe": { cover: `${franchiseAssetBase}DC.jpg`, hideTitle: true },
  "Star Wars": { cover: `${franchiseAssetBase}Star-Wars.jpg`, hideTitle: true },
  "James Bond": { cover: `${franchiseAssetBase}007.jpg`, hideTitle: true },
  "Harry Potter": {
    cover: `${franchiseAssetBase}Harry-Potter.jpg`,
    hideTitle: true,
  },
  "Alien vs Predator": {
    cover: `${franchiseAssetBase}avp.jpg`,
    hideTitle: true,
  },
  "Pirates of the Caribbean": {
    cover: `${franchiseAssetBase}pirates.jpg`,
    hideTitle: true,
  },
  Terminator: { cover: `${franchiseAssetBase}Terminator.jpg`, hideTitle: true },
  "Mission Impossible": {
    cover: `${franchiseAssetBase}mission-impossible.jpg`,
    hideTitle: true,
  },
  "Jurassic Park": {
    cover: `${franchiseAssetBase}jurrasic-park.jpg`,
    hideTitle: true,
  },
  "The Matrix": { cover: `${franchiseAssetBase}matrix.jpg`, hideTitle: true },
  "Lord of the Rings": {
    cover: `${franchiseAssetBase}lotr.jpg`,
    hideTitle: true,
  },
  "X-Men": { cover: `${franchiseAssetBase}X-Men.jpg`, hideTitle: true },
  "Hunger Games": {
    cover: `${franchiseAssetBase}Hunger-Games.jpg`,
    hideTitle: true,
  },
  Avatar: { cover: `${franchiseAssetBase}AVATAR.jpg`, hideTitle: true },
  Dune: { cover: `${franchiseAssetBase}Dune.jpg`, hideTitle: true },
  "Indiana Jones": {
    cover: `${franchiseAssetBase}Indiana-Jo.jpg`,
    hideTitle: true,
  },
  "The Godfather": {
    cover: `${franchiseAssetBase}The-Godfather.jpg`,
    hideTitle: true,
  },
  "John Wick": { cover: `${franchiseAssetBase}JW.jpg`, hideTitle: true },
  Transformers: {
    cover: `${franchiseAssetBase}Transformers.jpg`,
    hideTitle: true,
  },
};

const androidCollectionDefaults: CatalogConfig[] = [
  collectionRail("SERVICE", "Streaming Services"),
  collectionRail("MOVIE_GENRE", "Movie Genres"),
  collectionRail("TV_GENRE", "TV Genres"),
  collectionRail("FRANCHISE", "Franchises"),
  ...["Latest Movies", "Latest Shows", "Trending Movies", "Trending Shows"].map(
    (title) => {
      const sources = {
        "Latest Movies": [mdblistAddonSource("movie", "mdblist.86934")],
        "Latest Shows": [mdblistAddonSource("series", "mdblist.86710")],
        "Trending Movies": [mdblistAddonSource("movie", "mdblist.87667")],
        "Trending Shows": [mdblistAddonSource("series", "mdblist.88434")],
      }[title];
      return collectionDefault(title, "FEATURED", sources);
    },
  ),
  ...[
    "Netflix",
    "Disney+",
    "Apple TV+",
    "Prime Video",
    "HBO Max",
    "Hulu",
    "Paramount+",
    "Peacock",
    "Starz",
    "Shudder",
    "MGM+",
    "Discovery+",
    "Crunchyroll",
  ].map((title) => {
    const sources = {
      Netflix: serviceSources("streaming.nfx", 8),
      "Disney+": serviceSources("streaming.dnp", 337),
      "Apple TV+": serviceSources("streaming.atp", 350),
      "Prime Video": serviceSources("streaming.amp", 9),
      "HBO Max": serviceSources("streaming.hbm", 1899),
      Hulu: serviceSources("streaming.hlu", 15),
      "Paramount+": serviceSources("streaming.pmp", 2303, [2616]),
      Peacock: serviceSources("streaming.pcp", 386, [387]),
      Starz: serviceSources("streaming.sta", 43),
      Shudder: [
        mdblistAddonSource("movie", "mdblist.8862"),
        mdblistAddonSource("series", "mdblist.8861"),
        providerSource("movie", 99),
        providerSource("series", 99),
      ],
      "MGM+": [
        mdblistAddonSource("movie", "mdblist.48305"),
        mdblistAddonSource("series", "mdblist.48306"),
        providerSource("movie", 34),
        providerSource("series", 34),
      ],
      "Discovery+": serviceSources("streaming.dpe", 520),
      Crunchyroll: serviceSources("streaming.cru_movie", 283),
    }[title];
    const normalizedSources =
      title === "Crunchyroll"
        ? [
            addonSource("aio-metadata", "movie", "streaming.cru_movie"),
            addonSource("aio-metadata", "series", "streaming.cru_series"),
            providerSource("movie", 283),
            providerSource("series", 283),
          ]
        : sources;
    return collectionDefault(title, "SERVICE", normalizedSources);
  }),
  ...[
    "20's Movies",
    "10's Movies",
    "00's Movies",
    "90's Movies",
    "80's Movies",
    "70's Movies",
    "60's Movies",
  ].map((title) => {
    const ids: Record<string, string> = {
      "20's Movies": "mdblist.91304",
      "10's Movies": "mdblist.91303",
      "00's Movies": "mdblist.91302",
      "90's Movies": "mdblist.91300",
      "80's Movies": "mdblist.91301",
      "70's Movies": "mdblist.127962",
      "60's Movies": "mdblist.144321",
    };
    return collectionDefault(title, "DECADE", [
      mdblistAddonSource("movie", ids[title]),
    ]);
  }),
  ...[
    "Marvel",
    "DC Universe",
    "Star Wars",
    "James Bond",
    "Harry Potter",
    "Alien vs Predator",
    "Pirates of the Caribbean",
    "Terminator",
    "Mission Impossible",
    "Jurassic Park",
    "The Matrix",
    "Lord of the Rings",
    "X-Men",
    "Hunger Games",
    "Avatar",
    "Dune",
    "Indiana Jones",
    "The Godfather",
    "John Wick",
    "Transformers",
  ].map((title) => {
    const sources = {
      Marvel: [
        addonSource(
          "com.joaogonp.marveladdon.custom.marvel-mcu",
          "Marvel",
          "marvel-mcu",
        ),
      ],
      "DC Universe": [
        addonSource(
          "com.tapframe.dcaddon.custom.dc-chronological",
          "DC",
          "dc-chronological",
        ),
      ],
      "Star Wars": [
        addonSource(
          "com.starwars.addon.custom.sw-movies-series-chronological",
          "StarWars",
          "sw-movies-series-chronological",
        ),
      ],
      "James Bond": [mdblistAddonSource("movie", "mdblist.7947")],
      "Harry Potter": [mdblistAddonSource("movie", "mdblist.102972")],
      "Alien vs Predator": [
        mdblistAddonSource("all", "mdblist.101434"),
        { kind: "TMDB_COLLECTION", tmdbCollectionId: 8091 },
        { kind: "TMDB_COLLECTION", tmdbCollectionId: 399 },
        { kind: "TMDB_COLLECTION", tmdbCollectionId: 115762 },
      ],
      "Pirates of the Caribbean": [
        mdblistAddonSource("movie", "mdblist.82145"),
        { kind: "TMDB_COLLECTION", tmdbCollectionId: 295 },
      ],
      Terminator: [
        mdblistAddonSource("all", "mdblist.125458"),
        { kind: "TMDB_COLLECTION", tmdbCollectionId: 528 },
      ],
      "Mission Impossible": [mdblistAddonSource("movie", "mdblist.42716")],
      "Jurassic Park": [mdblistAddonSource("all", "mdblist.120197")],
      "The Matrix": [
        mdblistAddonSource("movie", "mdblist.125142"),
        { kind: "TMDB_COLLECTION", tmdbCollectionId: 2344 },
      ],
      "Lord of the Rings": [mdblistAddonSource("movie", "mdblist.94304")],
    }[title];
    return collectionDefault(title, "FRANCHISE", sources);
  }),
  ...[
    [28, "Action"],
    [12, "Adventure"],
    [16, "Animation"],
    [35, "Comedy"],
    [80, "Crime"],
    [99, "Documentary"],
    [18, "Drama"],
    [10751, "Family"],
    [14, "Fantasy"],
    [36, "History"],
    [27, "Horror"],
    [10402, "Music"],
    [9648, "Mystery"],
    [10749, "Romance"],
    [878, "Science Fiction"],
    [10770, "TV Movie"],
    [53, "Thriller"],
    [10752, "War"],
    [37, "Western"],
  ].map(([genreId, title]) =>
    collectionDefault(String(title), "MOVIE_GENRE", [
      { kind: "TMDB_GENRE", mediaType: "movie", tmdbGenreId: Number(genreId) },
    ]),
  ),
  ...[
    [10759, "Action & Adventure"],
    [16, "Animation"],
    [35, "Comedy"],
    [80, "Crime"],
    [99, "Documentary"],
    [18, "Drama"],
    [10751, "Family"],
    [10762, "Kids"],
    [9648, "Mystery"],
    [10763, "News"],
    [10764, "Reality"],
    [10765, "Sci-Fi & Fantasy"],
    [10766, "Soap"],
    [10767, "Talk"],
    [10768, "War & Politics"],
    [37, "Western"],
  ].map(([genreId, title]) =>
    collectionDefault(String(title), "TV_GENRE", [
      { kind: "TMDB_GENRE", mediaType: "series", tmdbGenreId: Number(genreId) },
    ]),
  ),
];

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
  ...androidCollectionDefaults,
];

const defaultCatalogOrder = [
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
  "collection_decade_1990s",
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
  return retiredWebCatalogIds.has(catalog.id);
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
