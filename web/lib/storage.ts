export function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// Superseded cache keys from older builds. They can hold megabytes (the v1
// catalog rows alone was 1.5MB) and localStorage tops out around 5MB — once
// full, EVERY save silently fails and none of the instant-paint caches
// (Continue Watching seed, Trakt progress) can ever be written again.
const LEGACY_STORAGE_KEYS = [
  "arvio.web.catalogRows.v1",
  "arvio.web.catalogRows.v2",
  "arvio.web.cardMeta.v1",
  "arvio.web.cw.v1",
  // v1 stored full Trakt progress payloads (~740KB); v2 is slimmed.
  "arvio.web.trakt.progressCache.v1"
];

export function purgeLegacyStorage() {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

// Heaviest evictable caches, best-first to sacrifice: all of these are rebuilt
// on demand, so dropping them costs a refetch — never correctness.
const EVICTABLE_CACHE_KEYS = [
  "arvio.web.catalogRows.v3",
  "arvio.web.seasonEpisodes.v1",
  "arvio.web.cardMeta.v2",
  "arvio.web.cardProviders.v1",
  "arvio.web.logoCache",
  "arvio.web.trakt.progressCache.v2"
];

export function saveStored<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(value);
  try {
    window.localStorage.setItem(key, serialized);
  } catch {
    // Quota exceeded (or storage unavailable). Evict rebuildable caches and
    // retry once — a silent drop here is how the Continue Watching seed and
    // progress cache stayed unwritable for weeks on full-storage devices.
    purgeLegacyStorage();
    for (const evictKey of EVICTABLE_CACHE_KEYS) {
      if (evictKey === key) continue;
      try {
        window.localStorage.removeItem(evictKey);
        window.localStorage.setItem(key, serialized);
        return;
      } catch {
        // Still full — evict the next cache and try again.
      }
    }
  }
}

export function removeStored(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable in strict/private browser contexts.
  }
}
