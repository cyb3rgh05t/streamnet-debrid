import type { CatalogConfig, CollectionSourceConfig } from "./types";

const mdblistSlugPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const addonTokenPattern = /^[A-Za-z0-9_.:-]{1,100}$/;
const addonTypePattern = /^[a-z]{1,20}$/;
const tmdbRefPattern = /^(movie|tv):[0-9]{1,9}$/;
const maxExtraRefs = 30;

/** https://mdblist.com/lists/{user}/{list}, as the admin writes it. */
export function isValidRemoteMdblistUrl(value: unknown) {
  try {
    const url = new URL(String(value ?? "").trim());
    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (host === "mdblist.com" || host.endsWith(".mdblist.com")) &&
      parts.length === 3 &&
      parts[0] === "lists"
    );
  } catch {
    return false;
  }
}

/** https://trakt.tv/users/{user}/lists/{list} or https://trakt.tv/lists/{id}, as the admin writes it. */
export function isValidRemoteTraktUrl(value: unknown) {
  try {
    const url = new URL(String(value ?? "").trim());
    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (host === "trakt.tv" || host.endsWith(".trakt.tv")) &&
      ((parts.length === 4 && parts[0] === "users" && parts[2] === "lists") ||
        (parts.length === 2 && parts[0] === "lists" && /^\d+$/.test(parts[1])))
    );
  } catch {
    return false;
  }
}

function isPlainHttps(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && Boolean(url.hostname);
  } catch {
    return false;
  }
}

/** The app fetches the manifest itself, so only a plain https manifest link without credentials qualifies. */
export function isValidRemoteManifestUrl(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text || text.length > 500) return false;
  try {
    const url = new URL(text);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      Boolean(url.hostname) &&
      url.pathname.endsWith("manifest.json")
    );
  } catch {
    return false;
  }
}

function overrideMdblistSlugs(
  sources: CollectionSourceConfig[],
  overrides: Record<string, string> | undefined,
) {
  if (!overrides) return sources;
  return sources.map((source) => {
    const replacement = String(overrides[source.mdblistSlug ?? ""] ?? "").trim();
    return String(source.kind).toUpperCase() === "MDBLIST_PUBLIC" &&
      mdblistSlugPattern.test(replacement)
      ? { ...source, mdblistSlug: replacement }
      : source;
  });
}

function overrideAddonSources(
  sources: CollectionSourceConfig[],
  overrides: CatalogConfig["remoteAddonOverrides"],
) {
  if (!overrides) return sources;
  return sources.map((source) => {
    if (String(source.kind).toUpperCase() !== "ADDON_CATALOG") return source;
    const replacement =
      overrides[`${source.addonCatalogType ?? ""}|${source.addonCatalogId ?? ""}`];
    const catalogId = String(replacement?.addonCatalogId ?? "").trim();
    if (!replacement || !addonTokenPattern.test(catalogId)) return source;
    const type = String(replacement.addonCatalogType ?? "").trim();
    const addonId = String(replacement.addonId ?? "").trim();
    const manifest = String(replacement.addonManifestUrl ?? "").trim();
    return {
      ...source,
      addonCatalogId: catalogId,
      addonCatalogType: addonTypePattern.test(type)
        ? type
        : source.addonCatalogType,
      addonId: addonTokenPattern.test(addonId) ? addonId : source.addonId,
      addonManifestUrl: isValidRemoteManifestUrl(manifest)
        ? manifest
        : source.addonManifestUrl,
    };
  });
}

function appendExtraRefs(
  sources: CollectionSourceConfig[],
  refs: string[] | undefined,
  group: unknown,
) {
  if (String(group ?? "").toUpperCase() !== "FRANCHISE") return sources;
  const valid = [
    ...new Set(
      (refs ?? []).map((ref) => String(ref).trim().toLowerCase()),
    ),
  ]
    .filter((ref) => tmdbRefPattern.test(ref))
    .slice(0, maxExtraRefs);
  return valid.length
    ? [...sources, { kind: "CURATED_IDS", curatedRefs: valid, remoteExtra: true }]
    : sources;
}

// curated: the titles the app ships outside the tab lists (e.g. the Harry Potter series); empty removes them.
export type CentralSources = { tmdbCollections?: number[]; mdblist?: string[]; curated?: string[] };

/** Swaps all sources of one kind by the admin's list, at the position of the first one of that kind. */
function swapSources(
  sources: CollectionSourceConfig[],
  kind: string,
  replacement: CollectionSourceConfig[] | undefined,
) {
  if (!replacement) return sources;
  const at = sources.findIndex((source) => String(source.kind).toUpperCase() === kind);
  const rest = sources.filter((source) => String(source.kind).toUpperCase() !== kind);
  const insertAt = at < 0 ? rest.length : Math.min(at, rest.length);
  return [...rest.slice(0, insertAt), ...replacement, ...rest.slice(insertAt)];
}

function replaceListSources(sources: CollectionSourceConfig[], lists: CentralSources) {
  const template = sources.find((source) => String(source.kind).toUpperCase() === "MDBLIST_PUBLIC");
  const withCurated = lists.curated
    ? (() => {
        const isOwn = (source: CollectionSourceConfig) =>
          String(source.kind).toUpperCase() === "CURATED_IDS" && !source.collectionTab && !source.remoteExtra;
        const at = sources.findIndex(isOwn);
        const rest = sources.filter((source) => !isOwn(source));
        const insert: CollectionSourceConfig[] = lists.curated!.length ? [{ kind: "CURATED_IDS", curatedRefs: lists.curated }] : [];
        const position = at < 0 ? rest.length : Math.min(at, rest.length);
        return [...rest.slice(0, position), ...insert, ...rest.slice(position)];
      })()
    : sources;
  const withTmdb = swapSources(
    withCurated,
    "TMDB_COLLECTION",
    lists.tmdbCollections?.map((tmdbCollectionId) => ({ kind: "TMDB_COLLECTION", tmdbCollectionId })),
  );
  return swapSources(
    withTmdb,
    "MDBLIST_PUBLIC",
    lists.mdblist?.map((mdblistSlug) => ({
      kind: "MDBLIST_PUBLIC",
      mdblistSlug,
      collectionTab: template?.collectionTab,
      mediaType: template?.mediaType,
    })),
  );
}

/**
 * Applies the central overrides (valid for every device, unlike the saved per-account ones) to a default
 * catalog: the list URL of an MDBList home row, the cover and the TMDB / MDBList lists of a collection, and
 * added franchise titles.
 */
export function applyCentralOverrides(
  base: CatalogConfig,
  overrides: {
    rows?: Record<string, string>;
    covers?: Record<string, string>;
    intros?: Record<string, string>;
    titles?: Record<string, string>;
    sources?: Record<string, CentralSources>;
    extras?: Record<string, string[]>;
  },
): CatalogConfig {
  const rowUrl = String(overrides.rows?.[base.id] ?? "").trim();
  const result: CatalogConfig = { ...base };
  if (base.sourceType === "mdblist" && base.sourceUrl && isValidRemoteMdblistUrl(rowUrl)) {
    result.sourceUrl = rowUrl;
    if (base.sourceRef) result.sourceRef = `mdblist:${rowUrl}`;
  }
  const cover = String(overrides.covers?.[base.id] ?? "").trim();
  if (String(base.kind ?? "").toUpperCase() === "COLLECTION" && cover.length <= 500 && isPlainHttps(cover)) {
    result.collectionCoverImageUrl = cover;
    result.collectionFocusGifUrl = cover;
    result.collectionHeroImageUrl = cover;
  }
  const isCollection = String(base.kind ?? "").toUpperCase() === "COLLECTION";
  const intro = String(overrides.intros?.[base.id] ?? "").trim();
  if (isCollection && intro.length <= 500 && isPlainHttps(intro)) result.collectionHeroVideoUrl = intro;
  const title = String(overrides.titles?.[base.id] ?? "").trim();
  if (isCollection && title.length >= 2 && title.length <= 60) {
    result.title = title;
    result.name = title;
  }
  const sources = base.collectionSources ?? [];
  const lists = overrides.sources?.[base.id];
  const next = appendExtraRefs(
    lists ? replaceListSources(sources, lists) : sources,
    overrides.extras?.[base.id],
    base.collectionGroup,
  );
  if (next !== sources) result.collectionSources = next;
  return result;
}

/**
 * Applies the admin overrides stored on a saved catalog to its current default, with the same rules
 * as the Android app: list URL, MDBList slugs and addon catalogs only for remote-managed catalogs,
 * added franchise titles always. Anything malformed falls back to the default value.
 */
export function applyRemoteCatalogOverrides(
  base: CatalogConfig,
  saved: CatalogConfig,
): CatalogConfig {
  const sources = base.collectionSources ?? [];
  const withExtras = appendExtraRefs(
    sources,
    saved.remoteExtraRefs,
    base.collectionGroup,
  );
  const result: CatalogConfig = { ...base };
  let nextSources = withExtras;
  if (saved.remoteManaged) {
    nextSources = overrideAddonSources(
      overrideMdblistSlugs(withExtras, saved.remoteSlugOverrides),
      saved.remoteAddonOverrides,
    );
    const remoteUrl = String(saved.remoteSourceUrl ?? "").trim();
    if (
      base.sourceType === "mdblist" &&
      base.sourceUrl &&
      isValidRemoteMdblistUrl(remoteUrl)
    ) {
      result.sourceUrl = remoteUrl;
      if (base.sourceRef) result.sourceRef = `mdblist:${remoteUrl}`;
    }
  }
  if (nextSources !== sources) result.collectionSources = nextSources;
  return result;
}
