import { applyAdminGlobalMutation, prepareAdminGlobalMutation } from "./admin-snapshots.js";

function playlistHostname(playlist) {
  try {
    return new URL(String(playlist?.m3uUrl || "")).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function hostnameOf(value) {
  const raw = String(value || "").trim();
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Moves every profile whose StreamNet TV playlist currently points at `fromHostname` to `toHost`,
 * with the same rule as the admin panel's "change host" action (credentials stay, the host override is set).
 * Returns the new payload and the touched profiles, or null when nothing matches.
 */
export function migrateStreamNetHost(payload, fromHostname, toHost, now = Date.now()) {
  const mutation = prepareAdminGlobalMutation({
    operation: "change_xtream_host",
    targetId: "streamnet_tv",
    data: { host: toHost },
  });
  let current = payload;
  const profiles = [];
  const skipped = [];
  for (const [profileId, iptv] of Object.entries(payload?.iptvByProfile || {})) {
    const playlist = Array.isArray(iptv?.playlists)
      ? iptv.playlists.find((item) => item?.id === "streamnet_tv")
      : null;
    if (!playlist || playlistHostname(playlist) !== fromHostname) continue;
    try {
      const next = applyAdminGlobalMutation(current, mutation, now, profileId);
      if (!next) continue;
      current = next;
      profiles.push(profileId);
    } catch (error) {
      skipped.push({ profileId, reason: error.message });
    }
  }
  return profiles.length || skipped.length ? { payload: current, profiles, skipped } : null;
}
