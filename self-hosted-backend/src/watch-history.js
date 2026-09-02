export function isValidWatchHistoryIdentity(body) {
  const mediaType = String(body?.media_type || "").trim();
  const showTmdbId = Number(body?.show_tmdb_id);
  const streamAddonId = String(body?.stream_addon_id || "").trim();

  if (!mediaType || !Number.isInteger(showTmdbId) || showTmdbId === 0)
    return false;

  return showTmdbId > 0 || streamAddonId === "iptv_xtream_vod";
}
