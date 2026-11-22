import type { IptvPlaylistEntry } from "./types";

// A profile still needs a playlist when no enabled entry with a URL exists.
export function needsPlaylistSetup(
  playlists: IptvPlaylistEntry[] | null | undefined,
): boolean {
  return !(playlists ?? []).some(
    (playlist) => playlist.enabled !== false && Boolean(playlist.m3uUrl?.trim()),
  );
}

// The prompt is shown once per account + profile so it never turns into a loop.
export function playlistPromptKey(
  accountId: string | null | undefined,
  profileId: string,
): string {
  return `streamnet.playlistPrompt.v1:${accountId ?? "local"}:${profileId}`;
}
