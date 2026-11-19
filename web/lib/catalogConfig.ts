import { config, hasCloudBackendConfig } from "./config";
import { jsonRequest } from "./http";
import { applyCentralOverrides, isValidRemoteMdblistUrl, type CentralSources } from "./catalogRemoteOverrides";
import {
  bundledFranchiseLists,
  type FranchiseEntry,
  type FranchiseListTabs,
} from "./franchiseListSeed";
import { loadStored, saveStored } from "./storage";
import type { CatalogConfig, CollectionSourceConfig } from "./types";

// The catalog configuration the admin maintains for all devices: the Marvel / DC / Star Wars lists, extra
// franchises and overrides of the standard rows. The bundle ships a copy of the lists (franchiseListSeed.ts);
// the backend's copy replaces it once fetched. A failed fetch or an outage keeps the last good copy.
const storageKey = "streamnet:catalog-config:v2";
const refreshIntervalMs = 10 * 60 * 1000;
const refPattern = /^(movie|tv):\d{1,9}$/;
const idPattern = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const slugPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const tabNames = ["movie", "series", "timeline"] as const;
type TabName = (typeof tabNames)[number];

export type RemoteFranchise = {
  id: string;
  title: string;
  catalogId: string;
  builtin: boolean;
  coverUrl: string | null;
  tabs: FranchiseListTabs;
  tmdbCollections: number[];
  mdblist: string[];
};

export const centralRowPrefix = "central_row_";

/** A Home row the admin added for everyone: an MDBList list, optionally placed after another row. */
export type CentralRow = { id: string; title: string; url: string; mediaType: "movie" | "tv" | ""; after: string };

export type CentralOverrides = {
  rows: Record<string, string>;
  hidden: string[];
  newRows: CentralRow[];
  covers: Record<string, string>;
  sources: Record<string, CentralSources>;
  extras: Record<string, string[]>;
};

export type CentralConfig = {
  franchises: RemoteFranchise[];
  overrides: CentralOverrides;
};

export const emptyCentralConfig: CentralConfig = {
  franchises: [],
  overrides: { rows: {}, hidden: [], newRows: [], covers: {}, sources: {}, extras: {} },
};

let current: CentralConfig | undefined;
let lastAttempt = 0;
const listeners = new Set<() => void>();

function isPlainHttps(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function cleanEntries(value: unknown, tab: TabName): FranchiseEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: FranchiseEntry[] = [];
  for (const raw of value) {
    const ref = String((raw as { ref?: unknown })?.ref ?? "").trim().toLowerCase();
    if (!refPattern.test(ref)) continue;
    const title = String((raw as { title?: unknown })?.title ?? "").trim().slice(0, 120);
    entries.push(tab === "timeline" && title ? { ref, title } : { ref });
  }
  // Only the timeline keeps repeated titles (one entry per season of a series).
  return tab === "timeline"
    ? entries
    : entries.filter((entry, index) => entries.findIndex((other) => other.ref === entry.ref) === index);
}

function stringRecord(value: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      if (typeof entry === "string") result[key] = entry;
    }
  }
  return result;
}

/** Parses the `/catalog-config` response; null when it is not a usable configuration. */
export function parseCatalogConfig(body: unknown): CentralConfig | null {
  const root = body as {
    franchises?: unknown;
    overrides?: { rows?: unknown; hidden?: unknown; newRows?: unknown; covers?: unknown; sources?: unknown; extras?: unknown };
  } | null;
  if (!root || !Array.isArray(root.franchises)) return null;
  const franchises = new Map<string, RemoteFranchise>();
  for (const raw of root.franchises as Array<Record<string, unknown>>) {
    const id = String(raw?.id ?? "").trim();
    const builtin = raw?.builtin === true;
    const catalogId = builtin
      ? String(raw?.catalogId ?? "")
      : `collection_franchise_${id.replace(/-/g, "_")}`;
    if (builtin ? !bundledFranchiseLists[catalogId] : !idPattern.test(id)) continue;
    const title = String(raw?.title ?? "").trim().slice(0, 120);
    if (!title || franchises.has(catalogId)) continue;
    const tabs = (raw.tabs ?? {}) as Record<string, unknown>;
    const cover = String(raw.coverUrl ?? "").trim();
    franchises.set(catalogId, {
      id,
      title,
      catalogId,
      builtin,
      coverUrl: cover.length <= 500 && isPlainHttps(cover) ? cover : null,
      tabs: {
        movie: cleanEntries(tabs.movie, "movie"),
        series: cleanEntries(tabs.series, "series"),
        timeline: cleanEntries(tabs.timeline, "timeline"),
      },
      tmdbCollections: [
        ...new Set(
          (Array.isArray(raw.tmdbCollections) ? raw.tmdbCollections : [])
            .map(Number)
            .filter((value) => Number.isInteger(value) && value > 0),
        ),
      ].slice(0, 10),
      mdblist: [
        ...new Set(
          (Array.isArray(raw.mdblist) ? raw.mdblist : [])
            .map((value) => String(value).trim())
            .filter((value) => slugPattern.test(value)),
        ),
      ].slice(0, 10),
    });
  }
  if (!franchises.size && root.franchises.length) return null;
  const sources: Record<string, CentralSources> = {};
  for (const [catalogId, value] of Object.entries(
    (root.overrides?.sources && typeof root.overrides.sources === "object" ? root.overrides.sources : {}) as Record<string, unknown>,
  )) {
    const item = (value ?? {}) as { tmdbCollections?: unknown; mdblist?: unknown };
    const tmdb = [
      ...new Set(
        (Array.isArray(item.tmdbCollections) ? item.tmdbCollections : [])
          .map(Number)
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ].slice(0, 10);
    const lists = [
      ...new Set(
        (Array.isArray(item.mdblist) ? item.mdblist : [])
          .map((slug) => String(slug).trim())
          .filter((slug) => slugPattern.test(slug)),
      ),
    ].slice(0, 10);
    if (tmdb.length || lists.length) {
      sources[catalogId] = {
        ...(tmdb.length ? { tmdbCollections: tmdb } : {}),
        ...(lists.length ? { mdblist: lists } : {}),
      };
    }
  }  const extras: Record<string, string[]> = {};
  for (const [catalogId, value] of Object.entries(
    (root.overrides?.extras && typeof root.overrides.extras === "object" ? root.overrides.extras : {}) as Record<string, unknown>,
  )) {
    if (Array.isArray(value)) extras[catalogId] = value.map(String);
  }
  return {
    franchises: [...franchises.values()],
    overrides: {
      rows: stringRecord(root.overrides?.rows),
      hidden: (Array.isArray(root.overrides?.hidden) ? root.overrides.hidden : []).map(String),
      newRows: parseRows(root.overrides?.newRows),
      covers: stringRecord(root.overrides?.covers),
      sources,
      extras,
    },
  };
}

function parseRows(value: unknown): CentralRow[] {
  const rows: CentralRow[] = [];
  for (const raw of (Array.isArray(value) ? value : []) as Array<Record<string, unknown>>) {
    const id = String(raw?.id ?? "").trim();
    const title = String(raw?.title ?? "").trim().slice(0, 120);
    const url = String(raw?.url ?? "").trim();
    if (!idPattern.test(id) || !title || !isValidRemoteMdblistUrl(url)) continue;
    rows.push({
      id,
      title,
      url,
      mediaType: raw?.mediaType === "movie" || raw?.mediaType === "tv" ? raw.mediaType : "",
      after: String(raw?.after ?? "").trim(),
    });
  }
  return rows.slice(0, 20);
}

async function refresh() {
  try {
    const body = await jsonRequest<unknown>(`${config.backendUrl.replace(/\/$/, "")}/catalog-config`);
    const parsed = parseCatalogConfig(body);
    if (!parsed) return;
    current = parsed;
    saveStored(storageKey, body);
    listeners.forEach((listener) => listener());
  } catch {
    // Keep the current copy.
  }
}

/** The central configuration: the stored copy until the backend's one arrives (then listeners are notified). */
export function getCentralConfig(): CentralConfig {
  if (current === undefined) {
    current = parseCatalogConfig(loadStored<unknown>(storageKey, null)) ?? emptyCentralConfig;
  }
  const now = Date.now();
  if (hasCloudBackendConfig() && now - lastAttempt >= refreshIntervalMs) {
    lastAttempt = now;
    void refresh();
  }
  return current;
}

export function subscribeCentralConfig(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function curatedTabSource(entries: FranchiseEntry[], tab: TabName): CollectionSourceConfig {
  return {
    kind: "CURATED_IDS",
    collectionTab: tab,
    curatedRefs: entries.map((entry) => entry.ref),
    ...(tab === "timeline" ? { curatedTitles: entries.map((entry) => entry.title ?? "") } : {}),
  };
}

/** Swaps the curated source of each tab for [lists]; an emptied tab disappears, added titles (no tab) stay. */
export function replaceTabLists(
  sources: CollectionSourceConfig[],
  lists: FranchiseListTabs,
): CollectionSourceConfig[] {
  return sources.flatMap((source) => {
    const tab = source.collectionTab;
    if (String(source.kind ?? "").toUpperCase() !== "CURATED_IDS" || !tab || !tabNames.includes(tab)) {
      return [source];
    }
    return lists[tab].length ? [curatedTabSource(lists[tab], tab)] : [];
  });
}

/** The tab lists of a Marvel/DC/Star Wars collection (also for its `:movie`/`:tv`/`:timeline` tab views). */
export function withFranchiseLists(
  catalogId: string,
  sources: CollectionSourceConfig[],
): CollectionSourceConfig[] {
  const baseId = catalogId.replace(/:(movie|tv|timeline)$/, "");
  if (!bundledFranchiseLists[baseId]) return sources;
  const franchise = getCentralConfig().franchises.find((item) => item.catalogId === baseId);
  return franchise ? replaceTabLists(sources, franchise.tabs) : sources;
}

function franchiseCatalog(franchise: RemoteFranchise): CatalogConfig {
  const sources: CollectionSourceConfig[] = [
    ...tabNames
      .filter((tab) => franchise.tabs[tab].length)
      .map((tab) => curatedTabSource(franchise.tabs[tab], tab)),
    ...franchise.tmdbCollections.map((tmdbCollectionId) => ({ kind: "TMDB_COLLECTION", tmdbCollectionId })),
    ...franchise.mdblist.map((mdblistSlug) => ({ kind: "MDBLIST_PUBLIC", mdblistSlug })),
  ];
  return {
    id: franchise.catalogId,
    name: franchise.title,
    title: franchise.title,
    sourceType: "preinstalled",
    enabled: true,
    isPreinstalled: true,
    remoteFranchise: true,
    kind: "COLLECTION",
    collectionGroup: "FRANCHISE",
    collectionTileShape: "LANDSCAPE",
    collectionCoverImageUrl: franchise.coverUrl,
    collectionFocusGifUrl: franchise.coverUrl,
    collectionHeroImageUrl: franchise.coverUrl,
    collectionHideTitle: Boolean(franchise.coverUrl),
    collectionSources: sources,
  };
}

function centralRowId(row: CentralRow) {
  return centralRowPrefix + row.id.replace(/-/g, "_");
}

/** Adds the rows the admin created, each after the row it names (or at the end). */
function withCentralRows(catalogs: CatalogConfig[], rows: CentralRow[]): CatalogConfig[] {
  const result = [...catalogs];
  for (const row of rows) {
    const id = centralRowId(row);
    if (result.some((catalog) => catalog.id === id)) continue;
    const added: CatalogConfig = {
      id,
      name: row.title,
      title: row.title,
      sourceType: "mdblist",
      mediaType: row.mediaType || undefined,
      sourceUrl: row.url,
      sourceRef: `mdblist:${row.url}`,
      enabled: true,
      isPreinstalled: true,
    };
    const anchor = result.findIndex((catalog) => catalog.id === row.after || catalog.id === centralRowPrefix + row.after.replace(/-/g, "_"));
    if (row.after && anchor >= 0) result.splice(anchor + 1, 0, added);
    else result.push(added);
  }
  return result;
}

/** The default catalogs with the central lists and overrides applied, plus the admin-created franchises. */
export function applyCentralConfig(defaults: CatalogConfig[], central: CentralConfig): CatalogConfig[] {
  const lists = new Map(central.franchises.filter((item) => item.builtin).map((item) => [item.catalogId, item.tabs]));
  const hidden = new Set(central.overrides.hidden ?? []);
  const adjusted = withCentralRows(defaults.filter((catalog) => !hidden.has(catalog.id)), central.overrides.newRows ?? []).map((catalog) => {
    const tabs = lists.get(catalog.id);
    const withTabs = tabs
      ? { ...catalog, collectionSources: replaceTabLists(catalog.collectionSources ?? [], tabs) }
      : catalog;
    return applyCentralOverrides(withTabs, central.overrides);
  });
  const created = central.franchises
    .filter((item) => !item.builtin && !adjusted.some((catalog) => catalog.id === item.catalogId))
    .map((item) => applyCentralOverrides(franchiseCatalog(item), central.overrides));
  if (!created.length) return adjusted;
  let last = -1;
  adjusted.forEach((catalog, index) => {
    if (
      String(catalog.kind ?? "").toUpperCase() === "COLLECTION" &&
      String(catalog.collectionGroup ?? "").toUpperCase() === "FRANCHISE"
    ) {
      last = index;
    }
  });
  const insertAt = last >= 0 ? last + 1 : adjusted.length;
  return [...adjusted.slice(0, insertAt), ...created, ...adjusted.slice(insertAt)];
}
