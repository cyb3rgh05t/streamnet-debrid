import { SyncClient, SyncMediaRef } from "./sync";
import { loadStored, removeStored, saveStored } from "./storage";
import { jsonRequest } from "./http";

const LEGACY_SIMKL_TOKEN_KEY = "arvio.web.simkl.token";
const SNAPSHOT_TTL_MS = 15 * 60 * 1000;
const SCROBBLE_WRITE_LOCK_MS = 20_500;

export interface SimklToken {
  access_token: string;
}

export interface SimklPinCode {
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}

type SimklIds = { tmdb?: number; simkl?: number; imdb?: string };
type SimklMovieRow = {
  movie?: { title?: string; year?: number; ids?: SimklIds };
  status?: string;
  last_watched_at?: string;
};
type SimklShowRow = {
  show?: { title?: string; year?: number; ids?: SimklIds };
  status?: string;
  last_watched_at?: string;
  seasons?: Array<{ number?: number; episodes?: Array<{ number?: number; watched_at?: string }> }>;
};
type SimklSnapshot = {
  scope: string;
  activity: string | null;
  checkedAt: number;
  movies: SimklMovieRow[];
  shows: SimklShowRow[];
  anime: SimklShowRow[];
};

function extractItems<T>(res: unknown, key: "movies" | "shows" | "anime"): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as T[];
  if (typeof res === "object" && res !== null && key in res) {
    const list = (res as Record<string, unknown>)[key];
    if (Array.isArray(list)) return list as T[];
  }
  return [];
}

function activityMarker(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const root = value as Record<string, unknown>;
  if (typeof root.all === "string") return root.all;
  for (const key of ["movies", "tv_shows", "shows", "anime"]) {
    const group = root[key];
    if (group && typeof group === "object" && typeof (group as Record<string, unknown>).all === "string") {
      return (group as Record<string, string>).all;
    }
  }
  return null;
}

export class SimklClient implements SyncClient {
  token: SimklToken | null = null;
  private profileId: string | null = null;
  private snapshot: SimklSnapshot | null = null;
  private snapshotPromise: Promise<SimklSnapshot> | null = null;
  private lastScrobbleWriteAt = 0;
  private pendingScrobble: {
    scope: string;
    action: "start" | "pause" | "stop";
    item: SyncMediaRef & { progress: number };
  } | null = null;
  private scrobbleTimer: ReturnType<typeof setTimeout> | null = null;

  get isConnected(): boolean {
    return Boolean(this.token?.access_token);
  }

  private tokenKey(profileId: string): string {
    return `arvio.web.simkl.token:${profileId}`;
  }

  setProfile(profileId: string | null) {
    const normalized = profileId?.trim() || null;
    if (normalized === this.profileId) return;
    this.resetScrobbleQueue();
    this.profileId = normalized;
    this.snapshot = null;
    this.snapshotPromise = null;
    if (!normalized) {
      this.token = null;
      return;
    }

    let stored = loadStored<SimklToken | null>(this.tokenKey(normalized), null);
    if (!stored) {
      const legacy = loadStored<SimklToken | null>(LEGACY_SIMKL_TOKEN_KEY, null);
      if (legacy?.access_token) {
        stored = legacy;
        saveStored(this.tokenKey(normalized), legacy);
        removeStored(LEGACY_SIMKL_TOKEN_KEY);
      }
    }
    this.token = stored?.access_token ? stored : null;
  }

  setToken(token: SimklToken | null) {
    const next = token?.access_token ? token : null;
    if (next?.access_token !== this.token?.access_token) this.resetScrobbleQueue();
    this.token = next;
    this.snapshot = null;
    this.snapshotPromise = null;
    if (!this.profileId) return;
    if (this.token) saveStored(this.tokenKey(this.profileId), this.token);
    else removeStored(this.tokenKey(this.profileId));
  }

  disconnect() {
    this.setToken(null);
  }

  private async simkl<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...(options.headers as Record<string, string>)
    };
    if (this.token?.access_token) headers["x-user-token"] = this.token.access_token;
    return jsonRequest<T>(`/api/simkl${path}`, { ...options, headers });
  }

  private scope(): string {
    return `${this.profileId ?? "none"}:${this.token?.access_token ?? "none"}`;
  }

  private invalidateSnapshot() {
    this.snapshot = null;
    this.snapshotPromise = null;
  }

  private resetScrobbleQueue() {
    if (this.scrobbleTimer) clearTimeout(this.scrobbleTimer);
    this.scrobbleTimer = null;
    this.pendingScrobble = null;
    this.lastScrobbleWriteAt = 0;
  }

  private async loadSnapshot(): Promise<SimklSnapshot> {
    if (!this.isConnected) {
      return { scope: this.scope(), activity: null, checkedAt: Date.now(), movies: [], shows: [], anime: [] };
    }
    const scope = this.scope();
    const cached = this.snapshot?.scope === scope ? this.snapshot : null;
    if (cached && Date.now() - cached.checkedAt < SNAPSHOT_TTL_MS) return cached;
    if (this.snapshotPromise) return this.snapshotPromise;

    const request = (async () => {
      const activities = await this.simkl<unknown>("/sync/activities").catch(() => null);
      const marker = activityMarker(activities);
      if (cached && marker && marker === cached.activity) {
        return { ...cached, checkedAt: Date.now() };
      }

      const query = "?extended=full&episode_watched_at=yes&include_all_episodes=original";
      const [moviesRes, showsRes, animeRes] = await Promise.all([
        this.simkl<unknown>(`/sync/all-items/movies/all${query}`),
        this.simkl<unknown>(`/sync/all-items/shows/all${query}`),
        this.simkl<unknown>(`/sync/all-items/anime/all${query}`)
      ]);
      return {
        scope,
        activity: marker,
        checkedAt: Date.now(),
        movies: extractItems<SimklMovieRow>(moviesRes, "movies"),
        shows: extractItems<SimklShowRow>(showsRes, "shows"),
        anime: extractItems<SimklShowRow>(animeRes, "anime")
      };
    })();
    this.snapshotPromise = request;

    try {
      const result = await request;
      if (result.scope === this.scope()) this.snapshot = result;
      return result;
    } finally {
      if (this.snapshotPromise === request) this.snapshotPromise = null;
    }
  }

  async beginPinAuth(): Promise<SimklPinCode> {
    return this.simkl<SimklPinCode>("/oauth/pin");
  }

  async pollPinToken(userCode: string): Promise<boolean> {
    type PollRes = { result: string; access_token?: string };
    const res = await this.simkl<PollRes>(`/oauth/pin/${encodeURIComponent(userCode)}`);
    if (res.result === "OK" && res.access_token) {
      this.setToken({ access_token: res.access_token });
      return true;
    }
    return false;
  }

  async watchlist(): Promise<unknown[]> {
    const snapshot = await this.loadSnapshot();
    const movies = snapshot.movies
      .filter((item) => item.status === "plantowatch" && item.movie?.ids?.tmdb)
      .map((item) => ({ type: "movie", movie: item.movie, listed_at: item.last_watched_at }));
    const shows = [...snapshot.shows, ...snapshot.anime]
      .filter((item) => item.status === "plantowatch" && item.show?.ids?.tmdb)
      .map((item) => ({ type: "show", show: item.show, listed_at: item.last_watched_at }));
    return [...movies, ...shows];
  }

  async playback(): Promise<unknown[]> {
    return [];
  }

  async watched(type: "movies" | "shows"): Promise<unknown[]> {
    const snapshot = await this.loadSnapshot();
    if (type === "movies") {
      return snapshot.movies.filter((item) =>
        item.movie?.ids?.tmdb && (item.status === "completed" || item.status === "watching" || Boolean(item.last_watched_at))
      );
    }
    return [...snapshot.shows, ...snapshot.anime];
  }

  async addToWatchlist(item: SyncMediaRef): Promise<void> {
    if (!this.isConnected) return;
    const body = item.mediaType === "movie"
      ? { movies: [{ to: "plantowatch", ids: { tmdb: item.tmdbId } }] }
      : item.isAnime
        ? { anime: [{ to: "plantowatch", ids: { tmdb: item.tmdbId } }] }
        : { shows: [{ to: "plantowatch", ids: { tmdb: item.tmdbId } }] };
    await this.simkl("/sync/add-to-list", { method: "POST", body: JSON.stringify(body) });
    this.invalidateSnapshot();
  }

  async removeFromWatchlist(item: SyncMediaRef): Promise<void> {
    if (!this.isConnected) return;
    const snapshot = await this.loadSnapshot();
    const watched = item.mediaType === "movie"
      ? snapshot.movies.some((row) => row.movie?.ids?.tmdb === item.tmdbId && Boolean(row.last_watched_at))
      : [...snapshot.shows, ...snapshot.anime].some((row) =>
          row.show?.ids?.tmdb === item.tmdbId && (Boolean(row.last_watched_at) || row.seasons?.some((s) => s.episodes?.length))
        );
    const body = item.mediaType === "movie"
      ? { movies: [{ ...(watched ? { to: "completed" } : {}), ids: { tmdb: item.tmdbId } }] }
      : item.isAnime
        ? { anime: [{ ...(watched ? { to: "completed" } : {}), ids: { tmdb: item.tmdbId } }] }
        : { shows: [{ ...(watched ? { to: "completed" } : {}), ids: { tmdb: item.tmdbId } }] };
    await this.simkl(watched ? "/sync/add-to-list" : "/sync/history/remove", {
      method: "POST",
      body: JSON.stringify(body)
    });
    this.invalidateSnapshot();
  }

  async addToHistory(item: SyncMediaRef): Promise<void> {
    if (!this.isConnected) return;
    const hasEpisode = typeof item.season === "number" && typeof item.episode === "number";
    const series = { ids: { tmdb: item.tmdbId }, seasons: hasEpisode ? [{ number: item.season!, episodes: [{ number: item.episode! }] }] : undefined };
    const body = item.mediaType === "movie"
      ? { movies: [{ ids: { tmdb: item.tmdbId } }] }
      : item.isAnime ? { anime: [series] } : { shows: [series] };
    await this.simkl("/sync/history", { method: "POST", body: JSON.stringify(body) });
    this.invalidateSnapshot();
  }

  async removeFromHistory(item: SyncMediaRef): Promise<void> {
    if (!this.isConnected) return;
    const hasEpisode = typeof item.season === "number" && typeof item.episode === "number";
    const series = { ids: { tmdb: item.tmdbId }, seasons: hasEpisode ? [{ number: item.season!, episodes: [{ number: item.episode! }] }] : undefined };
    const body = item.mediaType === "movie"
      ? { movies: [{ ids: { tmdb: item.tmdbId } }] }
      : item.isAnime ? { anime: [series] } : { shows: [series] };
    await this.simkl("/sync/history/remove", { method: "POST", body: JSON.stringify(body) });
    this.invalidateSnapshot();
  }

  async dismissFromContinueWatching(): Promise<void> {
    // SIMKL playback sessions are not currently used as ARVIO's resume source.
  }

  private async sendScrobble(action: "start" | "pause" | "stop", item: SyncMediaRef & { progress: number }): Promise<void> {
    if (!this.isConnected) return;
    const progress = item.progress <= 1 ? item.progress * 100 : item.progress;
    const body = item.mediaType === "movie"
      ? { movie: { ids: { tmdb: item.tmdbId } }, progress }
      : {
          ...(item.isAnime
            ? { anime: { ids: { tmdb: item.tmdbId } } }
            : { show: { ids: { tmdb: item.tmdbId } } }),
          episode: typeof item.season === "number" && typeof item.episode === "number"
            ? { season: item.season, number: item.episode }
            : undefined,
          progress
        };
    await this.simkl(`/scrobble/${action}`, { method: "POST", body: JSON.stringify(body) });
  }

  async scrobble(action: "start" | "pause" | "stop", item: SyncMediaRef & { progress: number }): Promise<void> {
    if (!this.isConnected) return;
    const now = Date.now();
    const remaining = SCROBBLE_WRITE_LOCK_MS - (now - this.lastScrobbleWriteAt);
    if (!this.lastScrobbleWriteAt || (remaining <= 0 && !this.scrobbleTimer)) {
      this.lastScrobbleWriteAt = now;
      await this.sendScrobble(action, item);
      return;
    }

    this.pendingScrobble = { scope: this.scope(), action, item };
    if (this.scrobbleTimer) return;
    this.scrobbleTimer = setTimeout(() => {
      this.scrobbleTimer = null;
      const pending = this.pendingScrobble;
      this.pendingScrobble = null;
      if (!pending || pending.scope !== this.scope()) return;
      this.lastScrobbleWriteAt = Date.now();
      void this.sendScrobble(pending.action, pending.item).catch(() => undefined);
    }, Math.max(1, remaining));
  }
}

export const simklClient = new SimklClient();
