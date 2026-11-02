function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function normalizeXtreamHost(value) {
  const raw = String(value || "").trim().replace(/\/+$/, "");
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Xtream server URL is invalid");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      url.search || url.hash || /\s/.test(raw)) {
    throw new Error("Xtream server URL is invalid");
  }
  url.pathname = url.pathname.replace(/\/(?:get|player_api|xmltv)\.php$/i, "").replace(/\/+$/, "");
  return url.toString().replace(/\/+$/, "");
}

export function xtreamUrls(host, username, password) {
  const user = String(username || "").trim();
  const pass = String(password || "").trim();
  if (!user || !pass || user.length > 500 || pass.length > 500) {
    throw new Error("Xtream username and password are required");
  }
  const credentials = new URLSearchParams({ username: user, password: pass });
  return {
    m3uUrl: `${host}/get.php?${credentials}&type=m3u_plus&output=ts`,
    epgUrl: `${host}/xmltv.php?${credentials}`,
  };
}

function existingXtreamCredentials(value) {
  const raw = String(value || "").trim();
  try {
    const url = new URL(raw);
    if (["http:", "https:"].includes(url.protocol) &&
        /\/(?:get|player_api)\.php$/i.test(url.pathname)) {
      const username = url.searchParams.get("username");
      const password = url.searchParams.get("password");
      if (username && password) return {
        username, password,
        type: url.searchParams.get("type"),
        output: url.searchParams.get("output"),
      };
    }
  } catch {
    // Android also stores Xtream access as a host/user/password triplet.
  }
  const parts = raw.split(/\s+/);
  if (parts.length === 3) {
    const host = parts[0].replace(/^(?:xtream|xstream|xtreamcodes):\/\//i, "http://");
    normalizeXtreamHost(/^https?:\/\//i.test(host) ? host : `http://${host}`);
    return { username: parts[1], password: parts[2] };
  }
  throw new Error("Selected playlist has no valid Xtream credentials");
}

export function rewriteXtreamPlaylistHost(playlist, host) {
  const credentials = existingXtreamCredentials(playlist.m3uUrl);
  const urls = xtreamUrls(host, credentials.username, credentials.password);
  const m3u = new URL(urls.m3uUrl);
  for (const field of ["type", "output"]) {
    if (credentials[field]) m3u.searchParams.set(field, credentials[field]);
  }
  urls.m3uUrl = m3u.toString();
  return {
    ...playlist, ...urls, epgUrls: [urls.epgUrl],
    expiresAtEpochSeconds: 0, expirationCheckedAtMillis: 0,
    ...(playlist.id === "streamnet_tv" ? { streamNetHostOverride: host } : {}),
  };
}

function streamNetPlaylist(profile) {
  return Array.isArray(profile?.playlists)
    ? profile.playlists.find((playlist) => playlist?.id === "streamnet_tv")
    : undefined;
}

function overrideHost(profile) {
  return String(streamNetPlaylist(profile)?.streamNetHostOverride || "").trim();
}

function storedOverrides(payload) {
  return isObject(payload?.streamNetHostOverridesByProfile)
    ? payload.streamNetHostOverridesByProfile
    : {};
}

// Only admin mutations change this server-owned map. An empty host is a reset tombstone.
export function syncAdminStreamNetHostOverrides(previous, next) {
  const overrides = { ...storedOverrides(previous) };
  const profiles = new Set((next.profiles || []).map((profile) => profile.id));
  for (const profileId of Object.keys(overrides)) {
    if (!profiles.has(profileId)) delete overrides[profileId];
  }
  for (const profileId of profiles) {
    const oldHost = overrideHost(previous.iptvByProfile?.[profileId]);
    const host = overrideHost(next.iptvByProfile?.[profileId]);
    if (host !== oldHost) overrides[profileId] = host ? normalizeXtreamHost(host) : "";
  }
  if (Object.keys(overrides).length) next.streamNetHostOverridesByProfile = overrides;
  else delete next.streamNetHostOverridesByProfile;
}

export function preserveStreamNetHostOverrides(incoming, current) {
  const overrides = { ...storedOverrides(current) };
  // Adopt overrides written before the server-owned map was introduced.
  for (const [profileId, profile] of Object.entries(current?.iptvByProfile || {})) {
    const host = overrideHost(profile);
    if (host && !Object.hasOwn(overrides, profileId)) overrides[profileId] = host;
  }
  delete incoming.streamNetHostOverridesByProfile;
  const profiles = new Set((incoming.profiles || []).map((profile) => profile.id));
  for (const [profileId, host] of Object.entries(overrides)) {
    if (Array.isArray(incoming.profiles) && !profiles.has(profileId)) {
      delete overrides[profileId];
      continue;
    }
    const profile = incoming.iptvByProfile?.[profileId];
    const playlist = streamNetPlaylist(profile);
    if (!playlist) continue;
    let replacement;
    if (!host) {
      const { streamNetHostOverride: _removed, ...cleared } = playlist;
      replacement = cleared;
    } else if (!playlist.m3uUrl) {
      replacement = { ...playlist, streamNetHostOverride: host };
    } else {
      replacement = rewriteXtreamPlaylistHost(playlist, host);
      // Avoid resetting cached account info on an already-correct playlist.
      if (playlist.m3uUrl === replacement.m3uUrl && playlist.streamNetHostOverride === host) {
        replacement.expiresAtEpochSeconds = playlist.expiresAtEpochSeconds;
        replacement.expirationCheckedAtMillis = playlist.expirationCheckedAtMillis;
      }
      const currentPlaylist = streamNetPlaylist(current?.iptvByProfile?.[profileId]);
      for (const field of ["m3uUrl", "epgUrl", "epgUrls"]) {
        if (profile[field] !== undefined &&
            (JSON.stringify(profile[field]) === JSON.stringify(playlist[field]) ||
             (currentPlaylist?.[field] !== undefined &&
              JSON.stringify(profile[field]) === JSON.stringify(currentPlaylist[field])))) {
          profile[field] = replacement[field];
        }
      }
    }
    profile.playlists = profile.playlists.map((item) => item === playlist ? replacement : item);
  }
  if (Object.keys(overrides).length) incoming.streamNetHostOverridesByProfile = overrides;
  return incoming;
}
