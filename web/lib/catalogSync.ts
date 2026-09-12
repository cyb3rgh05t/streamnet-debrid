type CatalogProfileSettings = {
  catalogs: unknown[];
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
  const timestamps = recordValue<number>(root.catalogsUpdatedAtByProfile);
  timestamps[profileId] = changedAt;
  root.catalogsUpdatedAtByProfile = timestamps;
  return true;
}
