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

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeFieldValue(root, key) {
  if (key.startsWith("g:")) {
    const field = key.slice(2);
    return Object.hasOwn(root, field) ? root[field] : undefined;
  }
  if (key.startsWith("i:")) {
    const [, profileId, field] = key.split(":");
    const profile = root?.iptvByProfile?.[profileId];
    return isPlainObject(profile) && Object.hasOwn(profile, field)
      ? profile[field]
      : undefined;
  }
  if (key.startsWith("p:")) {
    const [, profileId, field] = key.split(":");
    const profile = root?.profileSettingsById?.[profileId];
    return isPlainObject(profile) && Object.hasOwn(profile, field)
      ? profile[field]
      : undefined;
  }
  return undefined;
}

function setMergeFieldValue(root, key, value) {
  if (key.startsWith("g:")) {
    root[key.slice(2)] = value;
    return;
  }
  if (key.startsWith("i:")) {
    const [, profileId, field] = key.split(":");
    if (!isPlainObject(root.iptvByProfile)) root.iptvByProfile = {};
    if (!isPlainObject(root.iptvByProfile[profileId]))
      root.iptvByProfile[profileId] = {};
    root.iptvByProfile[profileId][field] = value;
    return;
  }
  if (key.startsWith("p:")) {
    const [, profileId, field] = key.split(":");
    if (!isPlainObject(root.profileSettingsById)) root.profileSettingsById = {};
    if (!isPlainObject(root.profileSettingsById[profileId]))
      root.profileSettingsById[profileId] = {};
    root.profileSettingsById[profileId][field] = value;
  }
}

function continueWatchingItemKey(item) {
  if (!isPlainObject(item)) return null;
  const mediaType = String(item.mediaType || "movie").toLowerCase() === "tv"
    ? "tv"
    : "movie";
  const id = Number(item.id || 0);
  if (!Number.isInteger(id) || id === 0) return null;
  if (mediaType === "tv" && item.season != null && item.episode != null) {
    return `${mediaType}:${id}:${item.season}:${item.episode}`;
  }
  return `${mediaType}:${id}`;
}

function mergeContinueWatchingProfiles(incoming, current) {
  const incomingProfiles = isPlainObject(incoming)
    ? incoming
    : {};
  const currentProfiles = isPlainObject(current) ? current : {};
  const profileIds = new Set([
    ...Object.keys(currentProfiles),
    ...Object.keys(incomingProfiles),
  ]);
  const mergedProfiles = {};
  for (const profileId of profileIds) {
    const itemsByKey = new Map();
    for (const source of [currentProfiles, incomingProfiles]) {
      const items = Array.isArray(source[profileId]) ? source[profileId] : [];
      for (const item of items) {
        const key = continueWatchingItemKey(item);
        if (!key) continue;
        const existing = itemsByKey.get(key);
        const updatedAt = Number(item.updatedAtMs || 0);
        if (!existing || updatedAt >= Number(existing.updatedAtMs || 0)) {
          itemsByKey.set(key, item);
        }
      }
    }
    if (itemsByKey.size > 0 || Object.hasOwn(currentProfiles, profileId)) {
      mergedProfiles[profileId] = [...itemsByKey.values()]
        .sort((left, right) =>
          Number(right.updatedAtMs || 0) - Number(left.updatedAtMs || 0),
        )
        .slice(0, 50);
    }
  }
  return mergedProfiles;
}

function mergeContinueWatchingDismissals(incoming, current) {
  const incomingProfiles = isPlainObject(incoming) ? incoming : {};
  const currentProfiles = isPlainObject(current) ? current : {};
  const profileIds = new Set([
    ...Object.keys(currentProfiles),
    ...Object.keys(incomingProfiles),
  ]);
  const mergedProfiles = {};
  for (const profileId of profileIds) {
    const timestamps = new Map();
    for (const source of [currentProfiles, incomingProfiles]) {
      const encoded = String(source[profileId] || "");
      for (const entry of encoded.split("|")) {
        const separator = entry.lastIndexOf(",");
        if (separator <= 0) continue;
        const timestamp = Number(entry.slice(separator + 1));
        if (!Number.isFinite(timestamp)) continue;
        const key = entry.slice(0, separator);
        timestamps.set(key, Math.max(timestamps.get(key) || 0, timestamp));
      }
    }
    if (timestamps.size > 0) {
      mergedProfiles[profileId] = [...timestamps.entries()]
        .map(([key, timestamp]) => `${key},${timestamp}`)
        .join("|");
    }
  }
  return mergedProfiles;
}

export function mergePushPayloadByFieldTimestamps(
  incomingPayload,
  currentPayload,
) {
  if (!isPlainObject(incomingPayload) || !isPlainObject(currentPayload)) {
    return incomingPayload;
  }
  const incoming = cloneJson(incomingPayload);
  const incomingAddonsUpdatedAt = Number(incoming.addonsUpdatedAt || 0);
  const currentAddonsUpdatedAt = Number(currentPayload.addonsUpdatedAt || 0);
  if (currentAddonsUpdatedAt > incomingAddonsUpdatedAt) {
    if (Object.hasOwn(currentPayload, "addons")) {
      incoming.addons = cloneJson(currentPayload.addons);
    } else {
      delete incoming.addons;
    }
    if (Object.hasOwn(currentPayload, "addonsByProfile")) {
      incoming.addonsByProfile = cloneJson(currentPayload.addonsByProfile);
    } else {
      delete incoming.addonsByProfile;
    }
    incoming.addonsUpdatedAt = currentAddonsUpdatedAt;
  }
  for (const key of [
    "localContinueWatchingByProfile",
    "continueWatchingByProfile",
    "watchHistoryByProfile",
  ]) {
    if (Object.hasOwn(currentPayload, key) || Object.hasOwn(incoming, key)) {
      incoming[key] = mergeContinueWatchingProfiles(
        incoming[key],
        currentPayload[key],
      );
    }
  }
  if (
    Object.hasOwn(currentPayload, "dismissedContinueWatchingByProfile") ||
    Object.hasOwn(incoming, "dismissedContinueWatchingByProfile")
  ) {
    incoming.dismissedContinueWatchingByProfile =
      mergeContinueWatchingDismissals(
        incoming.dismissedContinueWatchingByProfile,
        currentPayload.dismissedContinueWatchingByProfile,
      );
  }
  const incomingTs = isPlainObject(incoming.fieldUpdatedAt)
    ? incoming.fieldUpdatedAt
    : {};
  const currentTs = isPlainObject(currentPayload.fieldUpdatedAt)
    ? currentPayload.fieldUpdatedAt
    : {};
  const mergedTs = { ...incomingTs };
  const keys = new Set([...Object.keys(incomingTs), ...Object.keys(currentTs)]);
  for (const key of keys) {
    const incomingTime = Number(incomingTs[key] || 0);
    const currentTime = Number(currentTs[key] || 0);
    if (currentTime > incomingTime) {
      const value = mergeFieldValue(currentPayload, key);
      if (value !== undefined)
        setMergeFieldValue(incoming, key, cloneJson(value));
      if (currentTime > 0) mergedTs[key] = currentTime;
    } else if (incomingTime > 0) {
      mergedTs[key] = incomingTime;
    }
  }
  incoming.fieldUpdatedAt = mergedTs;
  return incoming;
}
