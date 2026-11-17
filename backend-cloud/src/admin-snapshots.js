import crypto from "node:crypto";
import {
  normalizeXtreamHost,
  rewriteXtreamPlaylistHost,
  syncAdminStreamNetHostOverrides,
  xtreamUrls,
} from "./streamnet-host-overrides.js";

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

// The app merges these per-profile lists as one unit, ordered by catalogsUpdatedAtByProfile.
const catalogStateRoots = [
  "catalogsByProfile",
  "hiddenPreinstalledByProfile",
  "hiddenAddonByProfile",
  "hiddenHomeServerByProfile",
  "hiddenCustomByProfile",
];

function stampEditedCatalogTimestamps(current, edited, now) {
  const currentStamps = isPlainObject(current.catalogsUpdatedAtByProfile)
    ? current.catalogsUpdatedAtByProfile
    : {};
  const editedStamps = isPlainObject(edited.catalogsUpdatedAtByProfile)
    ? edited.catalogsUpdatedAtByProfile
    : {};
  const profileIdsToCheck = new Set();
  for (const root of catalogStateRoots) {
    for (const source of [current[root], edited[root]]) {
      if (isPlainObject(source)) {
        for (const profileId of Object.keys(source)) profileIdsToCheck.add(profileId);
      }
    }
  }
  for (const profileId of profileIdsToCheck) {
    const changed = catalogStateRoots.some(
      (root) => !jsonEqual(current[root]?.[profileId], edited[root]?.[profileId]),
    );
    // An explicitly edited timestamp is left alone; otherwise devices would keep their older state.
    if (!changed || !jsonEqual(currentStamps[profileId], editedStamps[profileId])) continue;
    if (!isPlainObject(edited.catalogsUpdatedAtByProfile)) {
      edited.catalogsUpdatedAtByProfile = {};
    }
    edited.catalogsUpdatedAtByProfile[profileId] = now;
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
  stampEditedCatalogTimestamps(current, edited, now);
}

function mirrorEditedTopLevelAddonsToProfiles(current, edited) {
  if (
    jsonEqual(current.addons, edited.addons) ||
    !Array.isArray(edited.addons)
  ) {
    return;
  }
  replaceAccountAddons(edited, edited.addons);
}

function sharedAddonsFromPayload(payload) {
  const addonsById = new Map();
  const scopedAddons = isPlainObject(payload.addonsByProfile)
    ? Object.values(payload.addonsByProfile)
    : [];
  const sources = [payload.addons, ...scopedAddons];
  for (const addons of sources) {
    if (!Array.isArray(addons)) continue;
    for (const addon of addons) {
      const id = String(addon?.id || "").trim();
      if (id && !addonsById.has(id)) addonsById.set(id, addon);
    }
  }
  return [...addonsById.values()];
}

function addonWithProfileActivation(addon, previousAddon) {
  const next = cloneJson(addon, "Payload addon");
  if (!previousAddon) return next;
  if (Object.hasOwn(previousAddon, "isEnabled")) {
    next.isEnabled = previousAddon.isEnabled !== false;
  }
  if (Object.hasOwn(previousAddon, "enabled")) {
    next.enabled = previousAddon.enabled !== false;
  }
  return next;
}

function replaceAccountAddons(payload, addons) {
  payload.addons = cloneJson(addons, "Payload addons");
  const previousByProfile = isPlainObject(payload.addonsByProfile)
    ? payload.addonsByProfile
    : {};
  payload.addonsByProfile = {};
  for (const profileId of profileIds(payload)) {
    const previousById = new Map(
      (Array.isArray(previousByProfile[profileId])
        ? previousByProfile[profileId]
        : []
      ).map((addon) => [addon?.id, addon]),
    );
    payload.addonsByProfile[profileId] = addons.map((addon) =>
      addonWithProfileActivation(addon, previousById.get(addon?.id)),
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
  playlist.m3uUrl = String(playlist.m3uUrl || "").trim();
  if (!playlist.m3uUrl) throw new Error("Playlist m3uUrl is required");
  const fallbackName = playlistNameFromUrl(playlist.m3uUrl);
  playlist.name = cleanIdentifier(
    playlist.name || fallbackName,
    "Playlist name",
  );
  playlist.id = cleanIdentifier(
    playlist.id || playlistIdFromNameAndUrl(playlist.name, playlist.m3uUrl),
    "Playlist id",
  );
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

function playlistNameFromUrl(value) {
  try {
    const url = new URL(value);
    const lastPath =
      url.pathname.split("/").filter(Boolean).at(-1) || "Playlist";
    return (
      lastPath.replace(/\.(m3u8?|txt|xml)$/i, "").replace(/[._-]+/g, " ") ||
      "Playlist"
    );
  } catch {
    return "Playlist";
  }
}

function playlistIdFromNameAndUrl(name, url) {
  const slug =
    String(name || "playlist")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "playlist";
  const hash = crypto
    .createHash("sha256")
    .update(
      String(url || "")
        .trim()
        .toLowerCase(),
    )
    .digest("hex")
    .slice(0, 8);
  return `${slug}-${hash}`;
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
    syncAdminStreamNetHostOverrides(payload, merged);
    merged.updatedAt = now;
    return merged;
  }

  if (operation === "change_streamnet_host" || operation === "clear_streamnet_host_override") {
    // Single-account variants of the global StreamNet TV host actions; credentials and options stay untouched.
    const profileId = request.profileId ? requireProfile(payload, request.profileId) : null;
    const clearing = operation === "clear_streamnet_host_override";
    const mutation = clearing
      ? prepareAdminGlobalMutation({ operation: "clear_streamnet_host_override" })
      : prepareAdminGlobalMutation({
        operation: "change_xtream_host", targetId: "streamnet_tv", data: { host: data?.host },
      });
    const configured = [...profileIds(payload)].some((id) =>
      (!profileId || id === profileId) &&
      Array.isArray(payload.iptvByProfile?.[id]?.playlists) &&
      payload.iptvByProfile[id].playlists.some((item) => item?.id === "streamnet_tv"));
    if (!configured) throw new Error("StreamNet TV is not configured for this account");
    const next = applyAdminGlobalMutation(payload, mutation, now, profileId);
    if (!next) {
      throw new Error(clearing ? "StreamNet TV has no host override" : "StreamNet TV host is already set");
    }
    return next;
  }

  if (operation === "upsert_addon") {
    const addon = normalizeAddon(data);
    replaceAccountAddons(
      payload,
      upsertById(sharedAddonsFromPayload(payload), addon),
    );
    payload.addonsUpdatedAt = now;
  } else if (operation === "upsert_playlist") {
    const profileId = requireProfile(payload, request.profileId);
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
    replaceAccountAddons(
      payload,
      removeById(sharedAddonsFromPayload(payload), addonId),
    );
    payload.addonsUpdatedAt = now;
  } else if (operation === "delete_playlist") {
    const profileId = requireProfile(payload, request.profileId);
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
    const profileId = requireProfile(payload, request.profileId);
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
    const profileId = requireProfile(payload, request.profileId);
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
  syncAdminStreamNetHostOverrides(payloadValue, payload);
  return payload;
}

export function prepareAdminGlobalMutation(request) {
  if (!isPlainObject(request)) throw new Error("Mutation request is invalid");
  const operation = request.operation;
  const allowed = new Set([
    "add_addon", "edit_addon", "delete_addon", "clear_addons",
    "add_playlist", "edit_playlist", "delete_playlist", "clear_playlists",
    "change_xtream_host", "clear_streamnet_host_override",
    "add_catalog", "rename_catalog", "set_catalog_enabled", "delete_catalog",
    "set_catalog_source", "clear_catalog_source", "set_catalog_slug", "remove_obsolete_catalogs",
    "add_catalog_item", "remove_catalog_item", "set_catalog_addon",
  ]);
  if (!allowed.has(operation)) throw new Error("Unsupported operation");
  const targetId = operation === "clear_streamnet_host_override"
    ? "streamnet_tv"
    : /^(edit|delete|rename|set)_/.test(operation) || operation === "clear_catalog_source" ||
        operation === "change_xtream_host" || operation.endsWith("_catalog_item")
    ? cleanIdentifier(request.targetId, operation.endsWith("addon") ? "Addon id" : operation.includes("catalog") ? "Catalog id" : "Playlist id")
    : null;
  let data = null;
  if (operation === "set_catalog_addon") {
    const input = isPlainObject(request.data) ? request.data : {};
    const token = (value, label) => {
      const text = String(value ?? "").trim();
      if (!addonTokenPattern.test(text)) throw new Error(`${label} is invalid`);
      return text;
    };
    data = {
      fromType: String(input.fromType || "").trim(),
      fromCatalogId: token(input.fromCatalogId, "Current addon catalog"),
      addonCatalogId: token(input.addonCatalogId, "Addon catalog"),
    };
    if (!addonTypePattern.test(data.fromType)) throw new Error("Current addon catalog type is invalid");
    const type = String(input.addonCatalogType || "").trim();
    if (type) {
      if (!addonTypePattern.test(type)) throw new Error("Addon catalog type is invalid");
      data.addonCatalogType = type;
    }
    if (String(input.addonId || "").trim()) data.addonId = token(input.addonId, "Addon id");
    if (String(input.addonManifestUrl || "").trim()) {
      data.addonManifestUrl = normalizeAddonManifestUrl(input.addonManifestUrl);
    }
  }
  if (operation.endsWith("_catalog_item")) {
    if (!franchiseCatalogPattern.test(targetId)) throw new Error("Titles can only be added to franchise collections");
    data = { ref: normalizeTmdbRef(request.data?.ref) };
  }
  if (operation === "set_catalog_source") {
    data = { sourceUrl: normalizeAdminListUrl("MDBLIST", mdblistUrlInput(request.data?.sourceUrl)).sourceUrl.replace(/^http:/i, "https:") };
  }
  if (operation === "set_catalog_slug") {
    const fromSlug = String(request.data?.fromSlug || "").trim();
    if (!mdblistSlugPattern.test(fromSlug)) throw new Error("Current MDBList list is invalid");
    // Accepts a full list URL or "user/list"; both name the same list.
    const { parts } = normalizeAdminListUrl("MDBLIST", mdblistUrlInput(request.data?.mdblistSlug));
    data = { fromSlug, mdblistSlug: `${parts[1]}/${parts[2]}` };
  }
  if (operation === "rename_catalog") {
    data = { title: cleanIdentifier(request.data?.title, "Catalog title") };
  }
  if (operation === "set_catalog_enabled") {
    if (typeof request.data?.enabled !== "boolean") throw new Error("Catalog enabled must be a boolean");
    data = { enabled: request.data.enabled };
  }
  if (operation === "add_catalog") {
    if (!isPlainObject(request.data)) throw new Error("Catalog data must be an object");
    if (request.data.enabled !== undefined && typeof request.data.enabled !== "boolean") {
      throw new Error("Catalog enabled must be a boolean");
    }
    const sourceType = String(request.data.sourceType || "").toUpperCase();
    if (["PREINSTALLED", "ADDON"].includes(sourceType)) {
      data = {
        sourceType, templateId: cleanIdentifier(request.data.templateId, "Catalog id"),
        title: String(request.data.title || "").trim(),
        enabled: request.data.enabled !== false,
      };
      if (data.title) data.title = cleanIdentifier(data.title, "Catalog title");
    } else {
      data = normalizeAdminListCatalog(request.data);
    }
  }
  if (/^(add|edit)_addon$/.test(operation)) data = normalizeAddon(request.data);
  if (operation === "change_xtream_host") {
    data = { host: normalizeXtreamHost(request.data?.host) };
  }
  if (/^(add|edit)_playlist$/.test(operation)) {
    if (!isPlainObject(request.data)) {
      throw new Error("Playlist data must be an object");
    }
    const input = { ...request.data };
    const sourceType = input.sourceType || "m3u";
    if (!["m3u", "xtream", "streamnet_tv"].includes(sourceType)) {
      throw new Error("Playlist source type is invalid");
    }
    if (sourceType !== "m3u") {
      const host = normalizeXtreamHost(input.host);
      Object.assign(input, xtreamUrls(host, input.username, input.password));
      input.expiresAtEpochSeconds = 0;
      input.expirationCheckedAtMillis = 0;
      if (sourceType === "streamnet_tv") {
        if (operation === "edit_playlist" && targetId !== "streamnet_tv") {
          throw new Error("Select StreamNet TV to edit its configuration");
        }
        input.id = "streamnet_tv";
        input.name = "StreamNet TV";
        input.streamNetHostOverride = host;
      }
    }
    delete input.sourceType;
    delete input.host;
    delete input.username;
    delete input.password;
    data = normalizePlaylist({
      ...input,
      ...(operation === "edit_playlist" ? { id: targetId } : {}),
    });
  }
  return { operation, targetId, data };
}

const mdblistSlugPattern = /^(?!\.+\/)[A-Za-z0-9_.-]{1,100}\/(?!\.+$)[A-Za-z0-9_.-]{1,100}$/;
const franchiseCatalogPattern = /^collection_franchise_[A-Za-z0-9_.-]{1,100}$/;
const addonTokenPattern = /^[A-Za-z0-9_.:-]{1,100}$/;
const addonTypePattern = /^[a-z]{1,20}$/;

/** The app fetches this manifest itself, so only a plain https manifest link without credentials is accepted. */
function normalizeAddonManifestUrl(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    throw new Error("Addon manifest URL is invalid");
  }
  if (url.protocol !== "https:" || url.username || url.password || !url.pathname.endsWith("manifest.json") ||
      url.toString().length > 500) {
    throw new Error("Addon manifest URL is invalid");
  }
  return url.toString();
}
const maxExtraRefs = 30;

/** A TMDB title as the admin wrote it: "tv:84773", "movie:120" or a themoviedb.org title URL. */
export function normalizeTmdbRef(value) {
  const raw = String(value || "").trim();
  const short = /^(movie|tv):(\d{1,9})$/i.exec(raw);
  if (short) return `${short[1].toLowerCase()}:${Number(short[2])}`;
  try {
    const url = new URL(raw);
    const match = /^\/(movie|tv)\/(\d{1,9})(?:-[^/]*)?\/?$/.exec(url.pathname);
    if (url.protocol === "https:" && (url.hostname === "themoviedb.org" || url.hostname === "www.themoviedb.org") && match) {
      return `${match[1]}:${Number(match[2])}`;
    }
  } catch {
    // Falls through to the error below.
  }
  throw new Error("TMDB title is invalid (use tv:ID, movie:ID or a themoviedb.org link)");
}

// Collections the app no longer ships (dropped 2026-09-02; the app discards them on its next start)
// and MDBList lists it replaced. Accounts last written by an older app version still carry them.
const obsoleteCatalogIdPattern = /^collection_(network|studio)_/;
const obsoleteMdblistSlugs = new Set(["kingkearney/dc-universe"]);

function isObsoleteCatalog(catalog) {
  return obsoleteCatalogIdPattern.test(String(catalog?.id || ""));
}

function isObsoleteSource(source) {
  return source?.kind === "MDBLIST_PUBLIC" && obsoleteMdblistSlugs.has(source.mdblistSlug);
}

/** The catalog without its obsolete list sources; never empties a collection. Null when nothing changes. */
function withoutObsoleteSources(catalog) {
  const sources = Array.isArray(catalog?.collectionSources) ? catalog.collectionSources : [];
  if (!sources.some(isObsoleteSource)) return null;
  const kept = sources.filter((source) => !isObsoleteSource(source));
  if (!kept.length) return null;
  const overrides = isPlainObject(catalog.remoteSlugOverrides)
    ? Object.fromEntries(Object.entries(catalog.remoteSlugOverrides).filter(([key]) => !obsoleteMdblistSlugs.has(key)))
    : catalog.remoteSlugOverrides;
  const next = { ...catalog, collectionSources: kept };
  if (overrides !== undefined) next.remoteSlugOverrides = overrides;
  return next;
}

/** A MDBList list as the admin typed it: full URL or "user/list". */
function mdblistUrlInput(value) {
  const raw = String(value || "").trim();
  return mdblistSlugPattern.test(raw) ? `https://mdblist.com/lists/${raw}` : raw;
}

function normalizeAdminListUrl(sourceType, rawValue) {
  if (!["TRAKT", "MDBLIST"].includes(sourceType)) throw new Error("Catalog source type is invalid");
  let url;
  try {
    const raw = String(rawValue || "").trim();
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new Error("Catalog list URL is invalid");
  }
  const domain = sourceType === "TRAKT" ? "trakt.tv" : "mdblist.com";
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      (url.hostname !== domain && !url.hostname.endsWith(`.${domain}`))) {
    throw new Error("Catalog list URL is invalid");
  }
  const parts = url.pathname.split("/").filter(Boolean);
  const valid = sourceType === "TRAKT"
    ? (parts.length === 4 && parts[0] === "users" && parts[2] === "lists") ||
      (parts.length === 2 && parts[0] === "lists" && /^\d+$/.test(parts[1]))
    : parts.length === 3 && parts[0] === "lists";
  if (!valid) throw new Error("Catalog list URL is invalid");
  url.search = "";
  url.hash = "";
  url.pathname = `/${parts.join("/")}`;
  return { sourceUrl: url.toString(), parts };
}

function normalizeAdminListCatalog(data) {
  const sourceType = String(data.sourceType || "").toUpperCase();
  const { sourceUrl, parts } = normalizeAdminListUrl(sourceType, data.sourceUrl);
  const title = cleanIdentifier(data.title, "Catalog title");
  return {
    id: `custom_${crypto.createHash("sha256").update(`${sourceType}|${sourceUrl}`).digest("hex").slice(0, 16)}`,
    title, name: title, sourceType, sourceUrl,
    sourceRef: sourceType === "MDBLIST" ? `mdblist:${sourceUrl}` :
      parts[0] === "users" ? `trakt_user:${parts[1]}:${parts[3]}` : `trakt_list:${parts[1]}`,
    isPreinstalled: false, enabled: data.enabled !== false, kind: "STANDARD",
    remoteManaged: true, remoteTitle: title,
  };
}

function catalogType(catalog) {
  return String(catalog?.sourceType || "").toUpperCase().replace(/-/g, "_");
}

function catalogsForProfile(payload, profileId) {
  if (Object.hasOwn(payload.catalogsByProfile || {}, profileId)) {
    return Array.isArray(payload.catalogsByProfile[profileId]) ? payload.catalogsByProfile[profileId] : [];
  }
  return Array.isArray(payload.catalogs) ? payload.catalogs : [];
}

function addonCatalogTemplates(payload) {
  return sharedAddonsFromPayload(payload).flatMap((addon) =>
    (Array.isArray(addon.manifest?.catalogs) ? addon.manifest.catalogs : [])
      .filter(isPlainObject)
      .map((catalog) => ({
        ...catalog, type: String(catalog.type || "").trim().toLowerCase(),
        id: String(catalog.id || "").trim(),
      }))
      .filter((catalog) => ["movie", "series", "tv", "show", "shows"].includes(catalog.type) && catalog.id &&
        !(Array.isArray(catalog.extra) ? catalog.extra : []).some((extra) =>
          extra?.isRequired && String(extra.name).toLowerCase() !== "skip"))
      .map((catalog) => {
        const hash = crypto.createHash("sha256").update(`${addon.id}|${catalog.type}|${catalog.id}`).digest("hex").slice(0, 16);
        const encode = (value) => new URLSearchParams({ v: value }).toString().slice(2);
        return {
          id: `addon_${hash}`, title: String(catalog.name || catalog.id),
          name: String(catalog.name || catalog.id), sourceType: "ADDON",
          addonId: addon.id, addonName: addon.name, addonCatalogId: catalog.id,
          addonCatalogType: catalog.type,
          sourceRef: `addon_catalog|${encode(addon.id)}|${encode(catalog.type)}|${encode(catalog.id)}`,
          isPreinstalled: false, enabled: true, kind: "STANDARD",
        };
      }),
  );
}

export function resolveAdminCatalogTemplate(payload, id) {
  for (const profileId of profileIds(payload)) {
    const found = catalogsForProfile(payload, profileId).find((catalog) => catalog?.id === id);
    if (found) return found;
  }
  return addonCatalogTemplates(payload).find((catalog) => catalog.id === id);
}

function catalogHiddenRoot(catalog) {
  if (catalog.isPreinstalled || catalogType(catalog) === "PREINSTALLED") return "hiddenPreinstalledByProfile";
  if (catalogType(catalog) === "ADDON") return "hiddenAddonByProfile";
  if (catalogType(catalog) === "HOME_SERVER") return "hiddenHomeServerByProfile";
  return "hiddenCustomByProfile";
}

function setCatalogHidden(payload, profileId, catalog, hidden) {
  const root = catalogHiddenRoot(catalog);
  const byProfile = isPlainObject(payload[root]) ? payload[root] : {};
  const ids = new Set(Array.isArray(byProfile[profileId]) ? byProfile[profileId] : []);
  if (hidden) ids.add(catalog.id);
  else ids.delete(catalog.id);
  payload[root] = { ...byProfile, [profileId]: [...ids] };
}

function applyGlobalCatalogMutation(payload, mutation, now) {
  const { operation, targetId, data } = mutation;
  let changed = false;
  if (data?.id) cleanIdentifier(data.id, "Catalog id");
  for (const profileId of profileIds(payload)) {
    const current = catalogsForProfile(payload, profileId);
    const target = current.find((catalog) => catalog?.id === targetId) ||
      addonCatalogTemplates(payload).find((catalog) => catalog.id === targetId);
    if (operation !== "add_catalog" && operation !== "remove_obsolete_catalogs" && !target) continue;
    if (operation === "add_catalog" && data.sourceType === "ADDON" &&
        !sharedAddonsFromPayload(payload).some((addon) => addon.id === data.addonId)) continue;
    const before = JSON.stringify([current, ...[
      "hiddenPreinstalledByProfile", "hiddenAddonByProfile", "hiddenHomeServerByProfile", "hiddenCustomByProfile",
    ].map((root) => payload[root]?.[profileId] || [])]);
    let next;
    if (operation === "remove_obsolete_catalogs") {
      next = current.filter((catalog) => !isObsoleteCatalog(catalog))
        .map((catalog) => withoutObsoleteSources(catalog) || catalog);
      const removedIds = new Set(current.filter(isObsoleteCatalog).map((catalog) => String(catalog.id)));
      for (const root of [
        "hiddenPreinstalledByProfile", "hiddenAddonByProfile", "hiddenHomeServerByProfile", "hiddenCustomByProfile",
      ]) {
        const ids = payload[root]?.[profileId];
        if (Array.isArray(ids) && ids.some((id) => removedIds.has(String(id)) || obsoleteCatalogIdPattern.test(String(id)))) {
          payload[root] = { ...payload[root], [profileId]: ids.filter((id) => !obsoleteCatalogIdPattern.test(String(id))) };
        }
      }
    } else if (operation === "add_catalog_item" || operation === "remove_catalog_item") {
      if (!franchiseCatalogPattern.test(String(targetId))) continue;
      const refs = Array.isArray(target.remoteExtraRefs) ? target.remoteExtraRefs.map(String) : [];
      const updated = operation === "add_catalog_item"
        ? [...new Set([...refs, data.ref])].slice(0, maxExtraRefs)
        : refs.filter((ref) => ref !== data.ref);
      const { remoteExtraRefs: _previous, ...rest } = target;
      // Not remoteManaged: that flag would also freeze the collection's title and visibility.
      next = upsertById(current, updated.length ? { ...rest, remoteExtraRefs: updated } : rest);
    } else if (operation === "add_catalog") {
      if (!data.id) throw new Error("Catalog template is unavailable");
      assertSafeKeys(data);
      const existing = current.find((catalog) => catalog.id === data.id);
      const catalog = { ...existing, ...data, remoteManaged: true };
      next = existing ? upsertById(current, catalog) : [catalog, ...current];
      setCatalogHidden(payload, profileId, catalog, !catalog.enabled);
    } else if (operation === "rename_catalog") {
      const hidden = payload[catalogHiddenRoot(target)]?.[profileId] || [];
      const catalog = {
        ...target, title: data.title, name: data.title, remoteTitle: data.title,
        enabled: target.enabled !== false && !hidden.includes(target.id), remoteManaged: true,
      };
      next = upsertById(current, catalog);
    } else if (operation === "set_catalog_enabled") {
      const catalog = { ...target, enabled: data.enabled, remoteManaged: true };
      next = upsertById(current, catalog);
      setCatalogHidden(payload, profileId, catalog, !data.enabled);
    } else if (operation === "set_catalog_source") {
      // Only list-backed bundled rows carry a list URL; anything else is skipped for this account.
      if (!bundledMdblistHomeIds.has(String(targetId)) || catalogType(target) !== "MDBLIST" || !target.sourceUrl) continue;
      next = upsertById(current, {
        ...target, sourceUrl: data.sourceUrl, sourceRef: `mdblist:${data.sourceUrl}`,
        remoteSourceUrl: data.sourceUrl, remoteManaged: true,
      });
    } else if (operation === "set_catalog_slug") {
      const sources = Array.isArray(target.collectionSources) ? target.collectionSources : [];
      const matches = (source) => source?.kind === "MDBLIST_PUBLIC" && source.mdblistSlug === data.fromSlug;
      if (!sources.some(matches)) continue;
      const nextSources = sources.map((source) =>
        matches(source) ? { ...source, mdblistSlug: data.mdblistSlug } : source);
      // Overrides map the app's bundled slug to the new one. A chained change (A->B, then B->C)
      // updates the existing entry instead of adding B->C, which the app could never match.
      const overrides = { ...(isPlainObject(target.remoteSlugOverrides) ? target.remoteSlugOverrides : {}) };
      const chained = Object.keys(overrides).filter((key) => overrides[key] === data.fromSlug);
      for (const key of chained.length ? chained : [data.fromSlug]) overrides[key] = data.mdblistSlug;
      for (const key of Object.keys(overrides)) if (key === overrides[key]) delete overrides[key];
      const { remoteCollectionSources: _legacy, ...rest } = target;
      next = upsertById(current, {
        ...rest, collectionSources: nextSources, remoteSlugOverrides: overrides, remoteManaged: true,
      });
    } else if (operation === "set_catalog_addon") {
      const sources = Array.isArray(target.collectionSources) ? target.collectionSources : [];
      const matches = (source) => source?.kind === "ADDON_CATALOG" &&
        source.addonCatalogType === data.fromType && source.addonCatalogId === data.fromCatalogId;
      if (!sources.some(matches)) continue;
      const replacement = {
        addonCatalogId: data.addonCatalogId,
        ...(data.addonCatalogType ? { addonCatalogType: data.addonCatalogType } : {}),
        ...(data.addonId ? { addonId: data.addonId } : {}),
        ...(data.addonManifestUrl ? { addonManifestUrl: data.addonManifestUrl } : {}),
      };
      const nextSources = sources.map((source) => matches(source) ? { ...source, ...replacement } : source);
      // Overrides map the app's bundled "type|catalogId" to the new target. A chained change updates
      // the existing entry, because the app can only match the bundled key.
      const overrides = { ...(isPlainObject(target.remoteAddonOverrides) ? target.remoteAddonOverrides : {}) };
      const chained = Object.keys(overrides).filter((key) => {
        const value = overrides[key] || {};
        return (value.addonCatalogType || key.split("|")[0]) === data.fromType && value.addonCatalogId === data.fromCatalogId;
      });
      for (const key of chained.length ? chained : [`${data.fromType}|${data.fromCatalogId}`]) {
        overrides[key] = { ...(overrides[key] || {}), ...replacement };
      }
      for (const key of Object.keys(overrides)) {
        const value = overrides[key];
        const [type, catalogId] = key.split("|");
        if ((value.addonCatalogType || type) === type && value.addonCatalogId === catalogId &&
            !value.addonId && !value.addonManifestUrl) delete overrides[key];
      }
      const { remoteAddonOverrides: _oldAddons, ...base } = target;
      next = upsertById(current, {
        ...base, collectionSources: nextSources, remoteManaged: true,
        ...(Object.keys(overrides).length ? { remoteAddonOverrides: overrides } : {}),
      });
    } else if (operation === "clear_catalog_source") {
      const {
        remoteSourceUrl: _url, remoteSlugOverrides: _slugs, remoteCollectionSources: _legacy,
        remoteAddonOverrides: _addons, ...rest
      } = target;
      // The app restores the bundled list on its next sync; the stored values stay until then.
      next = upsertById(current, rest);
    } else if (operation === "delete_catalog") {
      setCatalogHidden(payload, profileId, target, true);
      // Defaults and manifest catalogs regenerate; keep a disabled record as a tombstone.
      next = ["PREINSTALLED", "ADDON", "HOME_SERVER"].includes(catalogType(target)) || target.isPreinstalled
        ? upsertById(current, { ...target, enabled: false, remoteManaged: true })
        : removeById(current, targetId);
    } else throw new Error("Unsupported operation");
    const after = JSON.stringify([next, ...[
      "hiddenPreinstalledByProfile", "hiddenAddonByProfile", "hiddenHomeServerByProfile", "hiddenCustomByProfile",
    ].map((root) => payload[root]?.[profileId] || [])]);
    if (before === after) continue;
    payload.catalogsByProfile = { ...(payload.catalogsByProfile || {}), [profileId]: next };
    payload.catalogsUpdatedAtByProfile = { ...(payload.catalogsUpdatedAtByProfile || {}), [profileId]: now };
    changed = true;
  }
  return changed;
}

/**
 * The part of an account snapshot a global catalog mutation reads or writes. Used as the preview
 * fingerprint so unrelated sync pushes (watch state, TV session, ...) do not invalidate a preview.
 */
export function adminCatalogFingerprint(payload, mutation) {
  if (!isPlainObject(payload)) return null;
  const ids = new Set(
    [mutation.targetId, mutation.data?.id, mutation.data?.templateId].filter(Boolean).map(String),
  );
  const hiddenRoots = [
    "hiddenPreinstalledByProfile", "hiddenAddonByProfile", "hiddenHomeServerByProfile", "hiddenCustomByProfile",
  ];
  const cleanup = mutation.operation === "remove_obsolete_catalogs";
  const relevant = (catalog) => cleanup
    ? isObsoleteCatalog(catalog) || Boolean(withoutObsoleteSources(catalog))
    : ids.has(String(catalog?.id));
  return {
    profiles: [...profileIds(payload)].sort().map((profileId) => ({
      profileId,
      catalogs: catalogsForProfile(payload, profileId).filter(relevant),
      hidden: hiddenRoots.map((root) =>
        (Array.isArray(payload[root]?.[profileId]) ? payload[root][profileId] : [])
          .map(String).filter((id) => cleanup ? obsoleteCatalogIdPattern.test(id) : ids.has(id)).sort()),
    })),
    resolvable: [...ids].sort().map((id) => [id, Boolean(resolveAdminCatalogTemplate(payload, id))]),
  };
}

export function adminGlobalInventory(payload) {
  if (!isPlainObject(payload)) throw new Error("Snapshot payload is invalid");
  const playlists = new Map();
  const catalogs = new Map();
  for (const id of profileIds(payload)) {
    for (const catalog of catalogsForProfile(payload, id)) {
      if (catalog?.id) catalogs.set(String(catalog.id), {
        id: String(catalog.id), name: String(catalog.title || catalog.name || catalog.id),
        sourceType: catalog.isPreinstalled ? "PREINSTALLED" : catalogType(catalog),
      });
    }
    const iptv = payload.iptvByProfile?.[id];
    for (const playlist of Array.isArray(iptv?.playlists) ? iptv.playlists : []) {
      if (playlist?.id) playlists.set(String(playlist.id), { id: String(playlist.id), name: String(playlist.name || playlist.id) });
    }
    for (const catalog of addonCatalogTemplates(payload)) {
      if (!catalogs.has(catalog.id)) catalogs.set(catalog.id, { id: catalog.id, name: catalog.title, sourceType: "ADDON" });
    }
  }
  return {
    profileCount: profileIds(payload).size,
    addons: sharedAddonsFromPayload(payload).map((addon) => ({
      id: String(addon.id), name: String(addon.name || addon.id),
    })),
    playlists: [...playlists.values()],
    catalogs: [...catalogs.values()],
  };
}

/**
 * Bundled (preinstalled) catalogs of one snapshot whose list can be redirected by the admin:
 * MDBList home rows (list URL) and collection sources backed by an MDBList slug. Sources are
 * identified by their current slug, not their position: the order differs between app versions.
 * Home rows are limited to the ids the app ships; older builds stored other preinstalled rows
 * that the current app no longer knows.
 */
const bundledMdblistHomeIds = new Set([
  "trending_movies", "top10_movies_today", "top_movies_week", "trending_tv", "top10_shows_today",
  "trending_anime", "coming_soon", "upcoming_series", "just_added", "new_kdramas",
]);

export function adminEditableDefaultCatalogs(payload) {
  if (!isPlainObject(payload)) return [];
  const found = new Map();
  for (const profileId of profileIds(payload)) {
    for (const catalog of catalogsForProfile(payload, profileId)) {
      if (!catalog?.id || catalog.isPreinstalled !== true) continue;
      const id = String(catalog.id);
      // The app no longer ships studio or network collections; accounts that still hold them were
      // last written by an old app version and drop them on their next update.
      if (id.startsWith("collection_network_") || id.startsWith("collection_studio_")) continue;
      const entry = found.get(id) || { id, title: String(catalog.title || catalog.name || id), sources: new Map() };
      if (bundledMdblistHomeIds.has(id) && catalogType(catalog) === "MDBLIST" &&
          typeof catalog.sourceUrl === "string" && catalog.sourceUrl) {
        entry.kind = "home";
        entry.sources.set("url", { key: "url", label: "MDBList-Liste", value: catalog.sourceUrl });
      }
      if (id.startsWith("collection_")) {
        for (const source of Array.isArray(catalog.collectionSources) ? catalog.collectionSources : []) {
          if (source?.kind === "ADDON_CATALOG" && addonTypePattern.test(String(source.addonCatalogType || "")) &&
              addonTokenPattern.test(String(source.addonCatalogId || ""))) {
            // "type|catalogId|addonId|manifestUrl": the first two identify the source for a change.
            const key = `addon:${source.addonCatalogType}|${source.addonCatalogId}`;
            entry.kind = "collection";
            entry.sources.set(key, {
              key, label: "Addon-Katalog",
              value: [source.addonCatalogType, source.addonCatalogId, source.addonId || "", source.addonManifestUrl || ""].join("|"),
            });
            continue;
          }
          if (source?.kind !== "MDBLIST_PUBLIC" || typeof source.mdblistSlug !== "string" || !source.mdblistSlug) continue;
          entry.kind = "collection";
          entry.sources.set(`slug:${source.mdblistSlug}`, {
            key: `slug:${source.mdblistSlug}`, label: "MDBList-Liste", value: source.mdblistSlug,
          });
        }
      }
      if (franchiseCatalogPattern.test(id)) {
        // Franchises accept admin-added titles even when they have no MDBList source.
        entry.kind = "collection";
        entry.franchise = true;
        entry.extraRefs = entry.extraRefs || new Set();
        for (const ref of Array.isArray(catalog.remoteExtraRefs) ? catalog.remoteExtraRefs : []) {
          if (typeof ref === "string" && /^(movie|tv):\d{1,9}$/.test(ref)) entry.extraRefs.add(ref);
        }
      }
      if (entry.sources.size || entry.franchise) found.set(id, entry);
    }
  }
  return [...found.values()].map((entry) => ({
    ...entry, sources: [...entry.sources.values()], extraRefs: [...(entry.extraRefs || [])],
  }));
}

export function applyAdminGlobalMutation(payloadValue, mutation, now = Date.now(), onlyProfileId = null) {
  if (!isPlainObject(payloadValue)) throw new Error("Snapshot payload is invalid");
  const payload = cloneJson(payloadValue, "Snapshot payload", adminSnapshotMaxBytes);
  for (const id of profileIds(payload)) cleanIdentifier(id, "profileId");
  const { operation, targetId, data } = mutation;
  if (operation.includes("catalog")) {
    if (!applyGlobalCatalogMutation(payload, mutation, now)) return null;
  } else if (operation.endsWith("addon") || operation === "clear_addons") {
    const current = sharedAddonsFromPayload(payload);
    if (/^(edit|delete)_addon$/.test(operation) && !current.some((addon) => addon.id === targetId)) {
      return null;
    }
    let next;
    if (operation === "clear_addons") next = [];
    else if (operation === "delete_addon") next = removeById(current, targetId);
    else if (operation === "add_addon") next = upsertById(current, data);
    else if (operation === "edit_addon") {
      next = upsertById(removeById(current, targetId), data);
      // Keep each profile's activation even when a changed URL produces a new ID.
      for (const items of Object.values(payload.addonsByProfile || {})) {
        if (!Array.isArray(items)) continue;
        for (const addon of items) {
          if (addon?.id === targetId) addon.id = data.id;
        }
      }
    } else throw new Error("Unsupported operation");
    replaceAccountAddons(payload, next);
    if (jsonEqual(payloadValue.addons, payload.addons) &&
        jsonEqual(payloadValue.addonsByProfile, payload.addonsByProfile)) return null;
    payload.addonsUpdatedAt = now;
  } else {
    let changed = false;
    for (const profileId of profileIds(payload)) {
      if (onlyProfileId && profileId !== onlyProfileId) continue;
      const previous = payload.iptvByProfile?.[profileId];
      const items = Array.isArray(previous?.playlists) ? previous.playlists : [];
      const selected = items.find((item) => item?.id === targetId);
      if ((/^(edit|delete)_playlist$/.test(operation) ||
          operation === "change_xtream_host" || operation === "clear_streamnet_host_override") && !selected) continue;
      const iptv = objectAt(payload, "iptvByProfile", profileId);
      if (operation === "clear_streamnet_host_override") {
        // Only the override goes. Credentials and options stay; the app moves an entry without an
        // override back to its built-in server on the next load.
        const { streamNetHostOverride: _removed, ...withoutOverride } = selected;
        iptv.playlists = upsertById(items, withoutOverride);
      } else if (operation === "clear_playlists") {
        iptv.playlists = [];
        iptv.m3uUrl = "";
        iptv.epgUrl = "";
        if (Object.hasOwn(iptv, "epgUrls")) iptv.epgUrls = [];
      } else if (operation === "delete_playlist") {
        iptv.playlists = removeById(items, targetId);
        if (iptv.m3uUrl === selected.m3uUrl) iptv.m3uUrl = "";
        if (iptv.epgUrl === selected.epgUrl) {
          iptv.epgUrl = "";
          if (Object.hasOwn(iptv, "epgUrls")) iptv.epgUrls = [];
        }
      } else if (operation === "change_xtream_host") {
        const replacement = rewriteXtreamPlaylistHost(selected, data.host);
        iptv.playlists = upsertById(items, replacement);
        if (iptv.m3uUrl === selected.m3uUrl) iptv.m3uUrl = replacement.m3uUrl;
        if (iptv.epgUrl === selected.epgUrl) {
          iptv.epgUrl = replacement.epgUrl;
          if (Object.hasOwn(iptv, "epgUrls")) iptv.epgUrls = replacement.epgUrls;
        }
      } else if (operation === "add_playlist" || operation === "edit_playlist") {
        iptv.playlists = upsertById(items, operation === "edit_playlist" ? { ...selected, ...data } : data);
        if (!iptv.m3uUrl || (selected && iptv.m3uUrl === selected.m3uUrl)) iptv.m3uUrl = data.m3uUrl;
        if (!iptv.epgUrl || (selected && iptv.epgUrl === selected.epgUrl)) {
          iptv.epgUrl = data.epgUrl;
          if (Object.hasOwn(iptv, "epgUrls")) iptv.epgUrls = data.epgUrls;
        }
      } else throw new Error("Unsupported operation");
      const original = payloadValue.iptvByProfile?.[profileId] || {};
      for (const field of ["playlists", "m3uUrl", "epgUrl", "epgUrls"]) {
        if (!jsonEqual(original[field], iptv[field])) {
          stampFieldUpdatedAt(payload, "iptvByProfile", profileId, field, now);
          changed = true;
        }
      }
    }
    if (!changed) return null;
  }
  payload.updatedAt = now;
  syncAdminStreamNetHostOverrides(payloadValue, payload);
  cloneJson(payload, "Payload data", adminSnapshotMaxBytes);
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
