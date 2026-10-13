type CatalogProfileSettings = {
  catalogs: {
    id: string;
    sourceType?: string;
    isPreinstalled?: boolean;
    enabled?: boolean;
  }[];
  hiddenCatalogIds: string[];
  hiddenHomeServerCatalogIds: string[];
};

type RawPayload = Record<string, unknown>;

function recordValue<T>(value: unknown): Record<string, T> {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, T>)
    : {};
}

function sameValue(left: unknown, right: unknown) {
  if (left === right) return true;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function setProfileValue<T>(
  root: RawPayload,
  key: string,
  profileId: string,
  value: T,
) {
  const byProfile = recordValue<T>(root[key]);
  byProfile[profileId] = value;
  root[key] = byProfile;
}

export function writeCatalogProfileState(
  root: RawPayload,
  profileId: string,
  settings: CatalogProfileSettings,
  baseline: CatalogProfileSettings | null | undefined,
  changedAt: number,
) {
  const changed =
    !baseline ||
    !sameValue(settings.catalogs, baseline.catalogs) ||
    !sameValue(settings.hiddenCatalogIds, baseline.hiddenCatalogIds) ||
    !sameValue(
      settings.hiddenHomeServerCatalogIds,
      baseline.hiddenHomeServerCatalogIds,
    );
  if (!changed) return false;

  setProfileValue(root, "catalogsByProfile", profileId, settings.catalogs);
  setProfileValue(
    root,
    "hiddenPreinstalledByProfile",
    profileId,
    settings.hiddenCatalogIds,
  );
  setProfileValue(
    root,
    "hiddenHomeServerByProfile",
    profileId,
    settings.hiddenHomeServerCatalogIds,
  );
  for (const [key, addon] of [
    ["hiddenAddonByProfile", true],
    ["hiddenCustomByProfile", false],
  ] as const) {
    const ids = new Set(recordValue<string[]>(root[key])[profileId] || []);
    for (const catalog of settings.catalogs) {
      const type = catalog.sourceType?.toUpperCase().replace(/-/g, "_");
      if (catalog.isPreinstalled || type === "PREINSTALLED" || type === "HOME_SERVER") continue;
      if ((type === "ADDON") !== addon) continue;
      if (catalog.enabled === false || settings.hiddenCatalogIds.includes(catalog.id)) ids.add(catalog.id);
      else ids.delete(catalog.id);
    }
    setProfileValue(root, key, profileId, [...ids]);
  }
  const timestamps = recordValue<number>(root.catalogsUpdatedAtByProfile);
  timestamps[profileId] = changedAt;
  root.catalogsUpdatedAtByProfile = timestamps;
  return true;
}
