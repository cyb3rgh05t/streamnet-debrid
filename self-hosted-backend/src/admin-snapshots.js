import crypto from "node:crypto";

const blockedPropertyNames = new Set(["__proto__", "constructor", "prototype"]);
const sensitivePropertyPattern =
  /password|token|secret|authorization|cookie|credential|api[_-]?key|m3uurl|epgurl|transporturl|portalurl|macaddress|avatar|image/i;
const allowedProfileRoots = new Set(["profileSettingsById", "iptvByProfile"]);
const adminSnapshotMaxBytes = 8 * 1024 * 1024;
const addonManifestMaxBytes = 1024 * 1024;

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

export function normalizeStremioInstallUrl(value) {
  let clean = String(value || "").trim();
  if (!clean) throw new Error("Addon manifest URL is required");
  if (clean.startsWith("stremio://")) {
    const payload = clean.slice("stremio://".length).trim();
    clean = /^https?:\/\//i.test(payload) ? payload : `https://${payload}`;
  }
  if (!/^https?:\/\//i.test(clean)) clean = `https://${clean}`;
  clean = clean.split("#", 1)[0].trim();
  clean = clean.replace(/\/manifest\.json[^/?]*(?=\?|$)/i, "/manifest.json");
  return clean;
}

export function stremioManifestUrl(value) {
  const clean = normalizeStremioInstallUrl(value);
  const [base, query = ""] = clean.split("?", 2);
  const manifestBase = base.replace(/\/+$/, "").endsWith("/manifest.json")
    ? base.replace(/\/+$/, "")
    : `${base.replace(/\/+$/, "")}/manifest.json`;
  return query ? `${manifestBase}?${query}` : manifestBase;
}

function addonTransportUrl(manifestUrl) {
  return manifestUrl
    .split("?", 1)[0]
    .replace(/\/manifest\.json$/i, "")
    .replace(/\/+$/, "");
}

function addonInstanceId(manifestId, installUrl) {
  const digest = crypto
    .createHash("sha256")
    .update(installUrl.trim().toLowerCase())
    .digest("hex")
    .slice(0, 12);
  return `${manifestId}_${digest}`;
}

function stringList(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string")
    : [];
}

function convertAddonManifest(manifest) {
  if (!isPlainObject(manifest)) throw new Error("Addon manifest is invalid");
  const id = cleanIdentifier(manifest.id, "Addon manifest id");
  const name = cleanIdentifier(manifest.name, "Addon manifest name");
  const version = String(manifest.version || "").trim();
  if (!version) throw new Error("Addon manifest version is invalid");
  return {
    id,
    name,
    version,
    description: String(manifest.description || ""),
    logo: typeof manifest.logo === "string" ? manifest.logo : null,
    background:
      typeof manifest.background === "string" ? manifest.background : null,
    types: stringList(manifest.types),
    resources: Array.isArray(manifest.resources)
      ? manifest.resources
          .map((resource) => {
            if (typeof resource === "string") {
              return { name: resource.trim().toLowerCase() };
            }
            if (!isPlainObject(resource)) return null;
            const name = String(resource.name || "")
              .trim()
              .toLowerCase();
            if (!name) return null;
            return {
              name,
              types: stringList(resource.types).map((item) =>
                item.trim().toLowerCase(),
              ),
              idPrefixes: stringList(resource.idPrefixes),
            };
          })
          .filter(Boolean)
      : [],
    catalogs: Array.isArray(manifest.catalogs)
      ? manifest.catalogs.filter(isPlainObject).map((catalog) => ({
          type: String(catalog.type || ""),
          id: String(catalog.id || ""),
          name: String(catalog.name || ""),
          genres: Array.isArray(catalog.genres) ? catalog.genres : null,
          extra: Array.isArray(catalog.extra)
            ? catalog.extra.filter(isPlainObject).map((extra) => ({
                name: String(extra.name || ""),
                isRequired: extra.isRequired === true,
                options: Array.isArray(extra.options) ? extra.options : null,
              }))
            : null,
        }))
      : [],
    idPrefixes: Array.isArray(manifest.idPrefixes) ? manifest.idPrefixes : null,
    behaviorHints: isPlainObject(manifest.behaviorHints)
      ? {
          adult: manifest.behaviorHints.adult === true,
          p2p: manifest.behaviorHints.p2p === true,
          configurable: manifest.behaviorHints.configurable === true,
          configurationRequired:
            manifest.behaviorHints.configurationRequired === true,
        }
      : null,
  };
}

function addonTypeFromManifest(manifest) {
  const names = new Set(
    (manifest.resources || []).map((resource) => resource.name),
  );
  return names.has("subtitles") && !names.has("stream") ? "SUBTITLE" : "CUSTOM";
}

function buildAddonFromManifest(data) {
  const installUrl = normalizeStremioInstallUrl(data.url || data.manifestUrl);
  const manifestUrl = stremioManifestUrl(installUrl);
  const manifest = convertAddonManifest(data.manifest);
  const customName = String(data.name || data.customName || "").trim();
  return {
    id: addonInstanceId(manifest.id, installUrl),
    name: customName || manifest.name,
    version: manifest.version,
    description: manifest.description,
    isInstalled: true,
    isEnabled: data.isEnabled !== false,
    type: addonTypeFromManifest(manifest),
    runtimeKind: "STREMIO",
    installSource: "DIRECT_URL",
    url: installUrl,
    logo: manifest.logo,
    manifest,
    transportUrl: addonTransportUrl(manifestUrl),
  };
}

export async function hydrateAdminStremioAddon(data, fetchImpl = fetch) {
  if (!isPlainObject(data)) throw new Error("Addon data must be an object");
  const installUrl = normalizeStremioInstallUrl(data.url || data.manifestUrl);
  const manifestUrl = stremioManifestUrl(installUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let response;
  try {
    response = await fetchImpl(manifestUrl, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
  } catch {
    throw new Error("Addon manifest fetch failed");
  } finally {
    clearTimeout(timeout);
  }
  if (!response?.ok) throw new Error("Addon manifest fetch failed");
  const text = await response.text();
  if (text.length > addonManifestMaxBytes) {
    throw new Error("Addon manifest is too large");
  }
  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch {
    throw new Error("Addon manifest is invalid");
  }
  return buildAddonFromManifest({ ...data, url: installUrl, manifest });
}

function cloneJson(value, field = "data", maxBytes = 64 * 1024) {
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new Error(`${field} must be valid JSON`);
  }
  if (serialized === undefined || serialized.length > maxBytes) {
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

function stampFieldUpdatedAt(payload, rootKey, profileId, field, now) {
  if (!isPlainObject(payload.fieldUpdatedAt)) payload.fieldUpdatedAt = {};
  const prefix = rootKey === "iptvByProfile" ? "i" : "p";
  payload.fieldUpdatedAt[`${prefix}:${profileId}:${field}`] = now;
}

function jsonEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function stampEditedProfileFields(current, edited, rootKey, prefix, now) {
  const currentRoot = isPlainObject(current[rootKey]) ? current[rootKey] : {};
  const editedRoot = isPlainObject(edited[rootKey]) ? edited[rootKey] : {};
  for (const [profileId, editedProfile] of Object.entries(editedRoot)) {
    if (!isPlainObject(editedProfile)) continue;
    const currentProfile = isPlainObject(currentRoot[profileId])
      ? currentRoot[profileId]
      : {};
    for (const [field, value] of Object.entries(editedProfile)) {
      if (!jsonEqual(currentProfile[field], value)) {
        if (!isPlainObject(edited.fieldUpdatedAt)) edited.fieldUpdatedAt = {};
        edited.fieldUpdatedAt[`${prefix}:${profileId}:${field}`] = now;
      }
    }
  }
}

function stampEditedPayloadTimestamps(current, edited, now) {
  if (
    !jsonEqual(current.addons, edited.addons) ||
    !jsonEqual(current.addonsByProfile, edited.addonsByProfile)
  ) {
    edited.addonsUpdatedAt = now;
  }
  stampEditedProfileFields(current, edited, "profileSettingsById", "p", now);
  stampEditedProfileFields(current, edited, "iptvByProfile", "i", now);
}

function mirrorEditedTopLevelAddonsToProfiles(current, edited) {
  if (
    jsonEqual(current.addons, edited.addons) ||
    !Array.isArray(edited.addons)
  ) {
    return;
  }
  const sharedAddons = cloneJson(edited.addons, "Payload addons");
  const ids = profileIds(edited);
  edited.addonsByProfile = {};
  for (const profileId of ids) {
    edited.addonsByProfile[profileId] = cloneJson(
      sharedAddons,
      "Payload addons",
    );
  }
}

function normalizeAddon(data) {
  if (!isPlainObject(data)) throw new Error("Addon data must be an object");
  const addon = cloneJson(data, "Addon data");
  assertSafeKeys(addon);
  return buildAddonFromManifest(addon);
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
  return (Array.isArray(items) ? items : []).filter((item) => item?.id !== id);
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

const redactedSentinel = "[REDACTED]";

// Wherever the edited tree still shows the sentinel, keep the real stored value so a
// masked view can never overwrite actual secrets (passwords, tokens, playlist URLs, ...).
function mergeRedactedPreservingSecrets(current, edited) {
  if (edited === redactedSentinel) return current;
  if (Array.isArray(edited)) {
    const currentArray = Array.isArray(current) ? current : [];
    return edited.map((item, index) =>
      mergeRedactedPreservingSecrets(currentArray[index], item),
    );
  }
  if (isPlainObject(edited)) {
    const currentObject = isPlainObject(current) ? current : {};
    const result = {};
    for (const [key, value] of Object.entries(edited)) {
      if (blockedPropertyNames.has(key)) continue;
      result[key] = mergeRedactedPreservingSecrets(currentObject[key], value);
    }
    return result;
  }
  return edited;
}

export function applyAdminSnapshotMutation(
  payloadValue,
  request,
  now = Date.now(),
) {
  if (!isPlainObject(payloadValue))
    throw new Error("Snapshot payload is invalid");
  if (!isPlainObject(request)) throw new Error("Mutation request is invalid");
  const payload = cloneJson(
    payloadValue,
    "Snapshot payload",
    adminSnapshotMaxBytes,
  );
  const operation = String(request.operation || "").trim();
  const data = request.data;

  if (operation === "edit_payload") {
    const edited = cloneJson(data, "Payload data", adminSnapshotMaxBytes);
    assertSafeKeys(edited);
    if (!Array.isArray(edited.profiles) || edited.profiles.length === 0) {
      throw new Error("Payload must include at least one profile");
    }
    const merged = mergeRedactedPreservingSecrets(payload, edited);
    mirrorEditedTopLevelAddonsToProfiles(payload, merged);
    stampEditedPayloadTimestamps(payload, merged, now);
    merged.updatedAt = now;
    return merged;
  }

  const profileId = requireProfile(payload, request.profileId);

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
    stampFieldUpdatedAt(payload, "iptvByProfile", profileId, "playlists", now);
    if (!iptv.m3uUrl) iptv.m3uUrl = playlist.m3uUrl;
    if (!iptv.epgUrl && playlist.epgUrl) iptv.epgUrl = playlist.epgUrl;
    stampFieldUpdatedAt(payload, "iptvByProfile", profileId, "m3uUrl", now);
    stampFieldUpdatedAt(payload, "iptvByProfile", profileId, "epgUrl", now);
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
    stampFieldUpdatedAt(payload, "iptvByProfile", profileId, "playlists", now);
    if (removed && iptv.m3uUrl === removed.m3uUrl) iptv.m3uUrl = "";
    if (removed && iptv.epgUrl && iptv.epgUrl === removed.epgUrl)
      iptv.epgUrl = "";
    if (removed) {
      stampFieldUpdatedAt(payload, "iptvByProfile", profileId, "m3uUrl", now);
      stampFieldUpdatedAt(payload, "iptvByProfile", profileId, "epgUrl", now);
    }
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
    stampFieldUpdatedAt(payload, rootKey, profileId, field, now);
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
