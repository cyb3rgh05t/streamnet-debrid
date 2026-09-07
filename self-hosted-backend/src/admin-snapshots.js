const blockedPropertyNames = new Set(["__proto__", "constructor", "prototype"]);
const sensitivePropertyPattern =
  /password|token|secret|authorization|cookie|credential|api[_-]?key|m3uurl|epgurl|transporturl|portalurl|macaddress|avatar|image/i;
const allowedProfileRoots = new Set(["profileSettingsById", "iptvByProfile"]);

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cleanIdentifier(value, field) {
  const normalized = String(value || "").trim();
  if (
    !normalized ||
    normalized.length > 200 ||
    blockedPropertyNames.has(normalized)
  ) {
    throw new Error(`${field} is invalid`);
  }
  return normalized;
}

function cloneJson(value, field = "data") {
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new Error(`${field} must be valid JSON`);
  }
  if (serialized === undefined || serialized.length > 64 * 1024) {
    throw new Error(`${field} is too large`);
  }
  return JSON.parse(serialized);
}

function assertSafeKeys(value) {
  if (Array.isArray(value)) {
    value.forEach(assertSafeKeys);
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (blockedPropertyNames.has(key)) throw new Error("Unsafe property name");
    assertSafeKeys(child);
  }
}

function profileIds(payload) {
  return new Set(
    (Array.isArray(payload.profiles) ? payload.profiles : [])
      .map((profile) => String(profile?.id || "").trim())
      .filter(Boolean),
  );
}

function requireProfile(payload, rawProfileId) {
  const profileId = cleanIdentifier(rawProfileId, "profileId");
  if (!profileIds(payload).has(profileId)) throw new Error("Unknown profile");
  return profileId;
}

function objectAt(payload, rootKey, profileId) {
  if (!isPlainObject(payload[rootKey])) payload[rootKey] = {};
  if (!isPlainObject(payload[rootKey][profileId]))
    payload[rootKey][profileId] = {};
  return payload[rootKey][profileId];
}

function normalizeAddon(data) {
  if (!isPlainObject(data)) throw new Error("Addon data must be an object");
  const addon = cloneJson(data, "Addon data");
  assertSafeKeys(addon);
  addon.id = cleanIdentifier(addon.id, "Addon id");
  addon.name = cleanIdentifier(addon.name, "Addon name");
  addon.version = String(addon.version || "1.0.0").trim();
  addon.description = String(addon.description || "");
  addon.isInstalled = true;
  addon.isEnabled = addon.isEnabled !== false;
  addon.type = String(addon.type || "CUSTOM")
    .trim()
    .toUpperCase();
  addon.runtimeKind = String(addon.runtimeKind || "STREMIO")
    .trim()
    .toUpperCase();
  addon.installSource = String(addon.installSource || "DIRECT_URL")
    .trim()
    .toUpperCase();
  return addon;
}

function normalizePlaylist(data) {
  if (!isPlainObject(data)) throw new Error("Playlist data must be an object");
  const playlist = cloneJson(data, "Playlist data");
  assertSafeKeys(playlist);
  playlist.id = cleanIdentifier(playlist.id, "Playlist id");
  playlist.name = cleanIdentifier(playlist.name, "Playlist name");
  playlist.m3uUrl = String(playlist.m3uUrl || "").trim();
  if (!playlist.m3uUrl) throw new Error("Playlist m3uUrl is required");
  playlist.epgUrl = String(playlist.epgUrl || "").trim();
  playlist.enabled = playlist.enabled !== false;
  playlist.epgUrls = Array.isArray(playlist.epgUrls)
    ? playlist.epgUrls
        .map(String)
        .map((value) => value.trim())
        .filter(Boolean)
    : playlist.epgUrl
      ? [playlist.epgUrl]
      : [];
  playlist.importLiveTv = playlist.importLiveTv !== false;
  playlist.importVod = playlist.importVod !== false;
  playlist.importSeries = playlist.importSeries !== false;
  return playlist;
}

function upsertById(items, item) {
  const next = Array.isArray(items) ? [...items] : [];
  const index = next.findIndex((candidate) => candidate?.id === item.id);
  if (index >= 0) next[index] = item;
  else next.push(item);
  return next;
}

function removeById(items, id) {
  return (Array.isArray(items) ? items : []).filter(
    (item) => item?.id !== id,
  );
}

const profileScopedRoots = [
  "profileSettingsById",
  "iptvByProfile",
  "catalogsByProfile",
  "hiddenCustomByProfile",
  "addonsByProfile",
  "watchlistByProfile",
  "watchlistRemovedByProfile",
  "catalogsUpdatedAtByProfile",
];

export function applyAdminSnapshotMutation(
  payloadValue,
  request,
  now = Date.now(),
) {
  if (!isPlainObject(payloadValue))
    throw new Error("Snapshot payload is invalid");
  if (!isPlainObject(request)) throw new Error("Mutation request is invalid");
  const payload = cloneJson(payloadValue, "Snapshot payload");
  const operation = String(request.operation || "").trim();
  const profileId = requireProfile(payload, request.profileId);
  const data = request.data;

  if (operation === "upsert_addon") {
    const addon = normalizeAddon(data);
    const ids = profileIds(payload);
    if (!isPlainObject(payload.addonsByProfile)) payload.addonsByProfile = {};
    for (const id of ids) {
      payload.addonsByProfile[id] = upsertById(
        payload.addonsByProfile[id],
        addon,
      );
    }
    payload.addonsUpdatedAt = now;
  } else if (operation === "upsert_playlist") {
    const playlist = normalizePlaylist(data);
    const iptv = objectAt(payload, "iptvByProfile", profileId);
    iptv.playlists = upsertById(iptv.playlists, playlist);
    if (!iptv.m3uUrl) iptv.m3uUrl = playlist.m3uUrl;
    if (!iptv.epgUrl && playlist.epgUrl) iptv.epgUrl = playlist.epgUrl;
  } else if (operation === "delete_addon") {
    const addonId = cleanIdentifier(data?.id, "Addon id");
    if (isPlainObject(payload.addonsByProfile)) {
      for (const id of Object.keys(payload.addonsByProfile)) {
        payload.addonsByProfile[id] = removeById(
          payload.addonsByProfile[id],
          addonId,
        );
      }
    }
    payload.addonsUpdatedAt = now;
  } else if (operation === "delete_playlist") {
    const playlistId = cleanIdentifier(data?.id, "Playlist id");
    const iptv = objectAt(payload, "iptvByProfile", profileId);
    const removed = Array.isArray(iptv.playlists)
      ? iptv.playlists.find((item) => item?.id === playlistId)
      : null;
    iptv.playlists = removeById(iptv.playlists, playlistId);
    if (removed && iptv.m3uUrl === removed.m3uUrl) iptv.m3uUrl = "";
    if (removed && iptv.epgUrl && iptv.epgUrl === removed.epgUrl)
      iptv.epgUrl = "";
  } else if (operation === "delete_profile") {
    const profiles = Array.isArray(payload.profiles) ? payload.profiles : [];
    if (profiles.length <= 1) {
      throw new Error("Cannot delete the only profile");
    }
    payload.profiles = profiles.filter(
      (profile) => String(profile?.id || "") !== profileId,
    );
    for (const rootKey of profileScopedRoots) {
      if (isPlainObject(payload[rootKey])) delete payload[rootKey][profileId];
    }
  } else if (operation === "set_profile_field") {
    const rootKey = cleanIdentifier(request.rootKey, "rootKey");
    const field = cleanIdentifier(request.field, "field");
    if (!allowedProfileRoots.has(rootKey) || field === "playlists") {
      throw new Error("Profile field is not editable through this operation");
    }
    const clonedValue = cloneJson(data, "Field data");
    assertSafeKeys(clonedValue);
    objectAt(payload, rootKey, profileId)[field] = clonedValue;
  } else {
    throw new Error("Unsupported operation");
  }

  payload.updatedAt = now;
  return payload;
}

export function redactAdminPayload(value, key = "") {
  if (sensitivePropertyPattern.test(key)) return "[REDACTED]";
  if (Array.isArray(value))
    return value.map((item) => redactAdminPayload(item));
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([childKey, child]) => [
      childKey,
      redactAdminPayload(child, childKey),
    ]),
  );
}

export function summarizeAdminPayload(payloadValue) {
  const payload = isPlainObject(payloadValue) ? payloadValue : {};
  const profiles = (
    Array.isArray(payload.profiles) ? payload.profiles : []
  ).map((profile) => {
    const id = String(profile?.id || "");
    const playlists = Array.isArray(payload.iptvByProfile?.[id]?.playlists)
      ? payload.iptvByProfile[id].playlists
      : [];
    return {
      id,
      name: String(profile?.name || id || "Unnamed"),
      addonCount: Array.isArray(payload.addonsByProfile?.[id])
        ? payload.addonsByProfile[id].length
        : 0,
      playlistCount: playlists.length,
      catalogCount: Array.isArray(payload.catalogsByProfile?.[id])
        ? payload.catalogsByProfile[id].length
        : 0,
      watchlistCount: Array.isArray(payload.watchlistByProfile?.[id])
        ? payload.watchlistByProfile[id].length
        : 0,
      playlists: playlists.map((playlist) => ({
        id: String(playlist?.id || ""),
        name: String(playlist?.name || playlist?.id || "Unnamed"),
        enabled: playlist?.enabled !== false,
      })),
    };
  });
  const addonsById = new Map();
  for (const items of Object.values(payload.addonsByProfile || {})) {
    if (!Array.isArray(items)) continue;
    for (const addon of items) {
      const id = String(addon?.id || "");
      if (id && !addonsById.has(id)) {
        addonsById.set(id, {
          id,
          name: String(addon?.name || id),
          isEnabled: addon?.isEnabled !== false,
        });
      }
    }
  }
  return {
    profiles,
    profileCount: profiles.length,
    addons: [...addonsById.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
    addonCount: addonsById.size,
    playlistCount: Object.values(payload.iptvByProfile || {}).reduce(
      (total, state) =>
        total + (Array.isArray(state?.playlists) ? state.playlists.length : 0),
      0,
    ),
    payload: redactAdminPayload(payload),
  };
}
