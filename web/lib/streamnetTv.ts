import type { IptvPlaylistEntry } from "./types";

export function buildStreamNetTvPlaylist(
  baseUrl: string,
  username: string,
  password: string,
): IptvPlaylistEntry {
  const base = baseUrl.replace(/\/+$/, "");
  const m3u = new URL(`${base}/get.php`);
  m3u.searchParams.set("username", username.trim());
  m3u.searchParams.set("password", password.trim());
  m3u.searchParams.set("type", "m3u_plus");
  m3u.searchParams.set("output", "m3u8");
  const epg = new URL(`${base}/xmltv.php`);
  epg.searchParams.set("username", username.trim());
  epg.searchParams.set("password", password.trim());
  return {
    id: "streamnet_tv",
    name: "STREAMNET TV",
    m3uUrl: m3u.toString(),
    epgUrl: epg.toString(),
    enabled: true,
  };
}
