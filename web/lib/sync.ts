import { mdblistClient } from "./mdblist";
import { simklClient } from "./simkl";
import { loadStored, saveStored } from "./storage";
import { traktClient } from "./store";

export type SyncProvider = "trakt" | "mdblist" | "simkl" | "none";
export type TrackingReadMode = "auto" | "trakt" | "simkl" | "both" | "mdblist";
export type TrackingFeature = "watchlist" | "continueWatching" | "watched";

export interface TrackingPreferences {
  watchlistReadMode: TrackingReadMode;
  continueWatchingReadMode: TrackingReadMode;
  watchedReadMode: TrackingReadMode;
  writeToTrakt: boolean;
  writeToSimkl: boolean;
}

export interface SyncMediaRef {
  mediaType: "movie" | "tv";
  tmdbId: number;
  season?: number | null;
  episode?: number | null;
  isAnime?: boolean;
}

export interface SyncClient {
  readonly isConnected: boolean;
  watchlist(): Promise<unknown[]>;
  playback(): Promise<unknown[]>;
  watched(type: "movies" | "shows"): Promise<unknown[]>;
  addToWatchlist(item: SyncMediaRef): Promise<void>;
  removeFromWatchlist(item: SyncMediaRef): Promise<void>;
  addToHistory(item: SyncMediaRef): Promise<void>;
  removeFromHistory(item: SyncMediaRef): Promise<void>;
  dismissFromContinueWatching(item: SyncMediaRef): Promise<void>;
  scrobble(action: "start" | "pause" | "stop", item: SyncMediaRef & { progress: number }): Promise<void>;
}

const preferencesKey = (profileId: string) => `arvio.web.tracking.preferences.v2:${profileId}`;

export function defaultTrackingPreferences(): TrackingPreferences {
  const trakt = traktClient.isConnected;
  const simkl = simklClient.isConnected;
  const mdb = mdblistClient.isConnected;
  const mode: TrackingReadMode = mdb ? "mdblist" : trakt && simkl ? "both" : trakt ? "trakt" : simkl ? "simkl" : "auto";
  return {
    watchlistReadMode: mode,
    continueWatchingReadMode: mode,
    watchedReadMode: mode,
    writeToTrakt: trakt,
    writeToSimkl: simkl
  };
}

export function loadTrackingPreferences(profileId?: string | null): TrackingPreferences {
  if (!profileId) return defaultTrackingPreferences();
  return { ...defaultTrackingPreferences(), ...loadStored<Partial<TrackingPreferences>>(preferencesKey(profileId), {}) };
}

export function saveTrackingPreferences(profileId: string, preferences: TrackingPreferences): TrackingPreferences {
  saveStored(preferencesKey(profileId), preferences);
  return preferences;
}

function readMode(feature: TrackingFeature, profileId?: string | null): TrackingReadMode {
  const preferences = loadTrackingPreferences(profileId);
  return feature === "watchlist"
    ? preferences.watchlistReadMode
    : feature === "continueWatching"
      ? preferences.continueWatchingReadMode
      : preferences.watchedReadMode;
}

function readClients(feature: TrackingFeature): SyncClient[] {
  if (mdblistClient.isConnected) return [mdblistClient as unknown as SyncClient];
  const mode = readMode(feature, simklClient.currentProfileId ?? traktClient.currentProfileId);
  const result: SyncClient[] = [];
  if ((mode === "trakt" || mode === "both" || mode === "auto") && traktClient.isConnected) result.push(traktClient as unknown as SyncClient);
  if ((mode === "simkl" || mode === "both" || mode === "auto") && simklClient.isConnected) result.push(simklClient as unknown as SyncClient);
  return result;
}

function writeClients(): SyncClient[] {
  if (mdblistClient.isConnected) return [mdblistClient as unknown as SyncClient];
  const profileId = simklClient.currentProfileId ?? traktClient.currentProfileId;
  const preferences = loadTrackingPreferences(profileId);
  const result: SyncClient[] = [];
  if (preferences.writeToTrakt && traktClient.isConnected) result.push(traktClient as unknown as SyncClient);
  if (preferences.writeToSimkl && simklClient.isConnected) result.push(simklClient as unknown as SyncClient);
  return result;
}

async function readAll(operation: (client: SyncClient) => Promise<unknown[]>): Promise<unknown[]> {
  const settled = await Promise.allSettled(readClients("watchlist").map(operation));
  return settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}

async function writeAll(operation: (client: SyncClient) => Promise<void>): Promise<void> {
  const clients = writeClients();
  if (!clients.length) return;
  const settled = await Promise.allSettled(clients.map(operation));
  if (settled.every((result) => result.status === "rejected")) {
    throw (settled[0] as PromiseRejectedResult).reason;
  }
}

class TrackingRouter implements SyncClient {
  get isConnected() { return readClients("watchlist").length > 0 || writeClients().length > 0; }
  watchlist() { return readAll((client) => client.watchlist()); }
  async playback() {
    const settled = await Promise.allSettled(readClients("continueWatching").map((client) => client.playback()));
    return settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  }
  async watched(type: "movies" | "shows") {
    const settled = await Promise.allSettled(readClients("watched").map((client) => client.watched(type)));
    return settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  }
  addToWatchlist(item: SyncMediaRef) { return writeAll((client) => client.addToWatchlist(item)); }
  removeFromWatchlist(item: SyncMediaRef) { return writeAll((client) => client.removeFromWatchlist(item)); }
  addToHistory(item: SyncMediaRef) { return writeAll((client) => client.addToHistory(item)); }
  removeFromHistory(item: SyncMediaRef) { return writeAll((client) => client.removeFromHistory(item)); }
  dismissFromContinueWatching(item: SyncMediaRef) { return writeAll((client) => client.dismissFromContinueWatching(item)); }
  scrobble(action: "start" | "pause" | "stop", item: SyncMediaRef & { progress: number }) {
    return writeAll((client) => client.scrobble(action, item));
  }
}

const trackingRouter = new TrackingRouter();

export function activeSyncProvider(): SyncProvider {
  if (mdblistClient.isConnected) return "mdblist";
  if (traktClient.isConnected) return "trakt";
  if (simklClient.isConnected) return "simkl";
  return "none";
}

export function syncClient(): SyncClient {
  return trackingRouter;
}
