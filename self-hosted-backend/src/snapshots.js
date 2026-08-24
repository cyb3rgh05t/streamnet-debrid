export function payloadMetrics(payload) {
  const profiles = Array.isArray(payload?.profiles) ? payload.profiles : null;
  const profileCount = profiles?.length ?? null;
  const profileIds = new Set(
    (profiles || []).map((profile) => profile?.id).filter(Boolean),
  );
  const scopedKeys = [
    "profileSettingsById",
    "addonsByProfile",
    "catalogsByProfile",
    "hiddenPreinstalledByProfile",
    "hiddenAddonByProfile",
    "hiddenHomeServerByProfile",
    "hiddenCustomByProfile",
    "iptvByProfile",
    "watchlistByProfile",
  ];
  const scopedCoverage = scopedKeys.reduce((total, key) => {
    const scoped = payload?.[key];
    if (!scoped || typeof scoped !== "object" || Array.isArray(scoped))
      return total;
    return (
      total + [...profileIds].filter((id) => Object.hasOwn(scoped, id)).length
    );
  }, 0);
  const hasFullShape = scopedKeys.some((key) =>
    Object.hasOwn(payload || {}, key),
  );
  const hasConfiguredState =
    (payload?.addons?.length || 0) > 0 ||
    Object.values(payload?.addonsByProfile || {}).some(
      (value) => Array.isArray(value) && value.length > 0,
    ) ||
    scopedCoverage > 0;
  const restoreRank =
    profileCount === 0
      ? 0
      : profileCount > 1 && hasFullShape
        ? 80
        : profileCount > 1
          ? 70
          : hasConfiguredState && hasFullShape
            ? 50
            : hasConfiguredState
              ? 40
              : hasFullShape
                ? 30
                : 10;
  return { profileCount, scopedCoverage, restoreRank };
}

export function payloadUpdatedAtMillis(payload) {
  const updatedAt = Number(payload?.updatedAt || 0);
  return Number.isSafeInteger(updatedAt) && updatedAt > 0 ? updatedAt : null;
}
