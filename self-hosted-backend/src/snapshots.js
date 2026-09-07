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
