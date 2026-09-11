import type {
  StreamNetAuthApi,
  StreamNetBackendAdapter,
  StreamNetMediaApi,
  StreamNetProfileApi,
  StreamNetSession,
  StreamNetStreamLink,
  StreamNetStreamSource,
  StreamNetUser,
  StreamNetWatchApi,
  StreamNetWatchState,
  StreamNetMediaDetails,
  StreamNetProfile,
} from "../contracts/streamnetApi";

export interface StreamNetBackendConfig {
  baseUrl: string;
  token?: string;
}

const jsonHeaders = (token?: string) => ({
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

function asNumber(
  value: unknown,
  fallback: number | null = null,
): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export class DefaultStreamNetBackendAdapter implements StreamNetBackendAdapter {
  private readonly baseUrl: string;
  private token?: string;

  constructor(config: StreamNetBackendConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.token = config.token;
  }

  setToken(token?: string): void {
    this.token = token;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...jsonHeaders(this.token),
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(
        `StreamNet request failed for ${path}: ${response.status}`,
      );
    }

    return (await response.json()) as T;
  }

  auth: StreamNetAuthApi = {
    login: async (
      email: string,
      password: string,
    ): Promise<StreamNetSession> => {
      const payload = await this.request<{ session: StreamNetSession }>(
        `/auth-login`,
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      );

      this.token = payload.session.accessToken;
      return payload.session;
    },

    refresh: async (session: StreamNetSession): Promise<StreamNetSession> => {
      const payload = await this.request<{ session: StreamNetSession }>(
        `/auth-refresh`,
        {
          method: "POST",
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        },
      );

      this.token = payload.session.accessToken;
      return payload.session;
    },

    logout: async (): Promise<void> => {
      await this.request("/auth-logout", { method: "POST" });
      this.token = undefined;
    },
  };

  profiles: StreamNetProfileApi = {
    getCurrentUser: async (): Promise<StreamNetUser> => {
      const payload = await this.request<{ user: StreamNetUser }>(
        `/account-profile`,
      );
      return payload.user;
    },

    getProfiles: async (): Promise<StreamNetProfile[]> => {
      const payload = await this.request<{ profiles: StreamNetProfile[] }>(
        `/profiles`,
      );
      return payload.profiles;
    },

    switchProfile: async (profileId: string): Promise<void> => {
      await this.request(`/profiles/${profileId}/switch`, { method: "POST" });
    },
  };

  media: StreamNetMediaApi = {
    getMediaDetails: async (
      mediaId: string,
    ): Promise<StreamNetMediaDetails> => {
      const payload = await this.request<{ media: any }>(`/media/${mediaId}`);
      const media = payload.media ?? payload;

      return {
        id: String(media.id ?? mediaId),
        title: String(media.title ?? media.name ?? "Untitled"),
        type: media.type ?? "movie",
        posterUrl: media.posterUrl ?? media.poster_url ?? null,
        backdropUrl: media.backdropUrl ?? media.backdrop_url ?? null,
        overview: media.overview ?? null,
        year: asNumber(media.year, null),
        genres: Array.isArray(media.genres)
          ? media.genres.map((genre: any) => String(genre))
          : [],
      };
    },

    getSources: async (mediaId: string): Promise<StreamNetStreamSource[]> => {
      const payload = await this.request<{ sources: any[] }>(
        `/media/${mediaId}/sources`,
      );
      const sources = payload.sources ?? [];

      return sources.map((source: any, index: number) => ({
        id: String(source.id ?? `${mediaId}-source-${index}`),
        label: String(source.label ?? source.name ?? `Source ${index + 1}`),
        kind: source.kind ?? "addon",
        isHealthy: source.isHealthy ?? source.healthy ?? true,
        priority: asNumber(source.priority, index) ?? index,
      }));
    },

    getStreamLink: async (
      sourceId: string,
      mediaId: string,
    ): Promise<StreamNetStreamLink> => {
      const payload = await this.request<{ stream: any }>(
        `/media/${mediaId}/source/${sourceId}/stream`,
      );
      const stream = payload.stream ?? payload;

      return {
        id: String(stream.id ?? `${sourceId}-${mediaId}`),
        sourceId,
        url: String(stream.url ?? stream.link ?? ""),
        quality: stream.quality ?? undefined,
        subtitleUrl: stream.subtitleUrl ?? stream.subtitle_url ?? null,
        audioTracks: Array.isArray(stream.audioTracks)
          ? stream.audioTracks.map((track: any) => ({
              label: String(track.label ?? track.name ?? "Audio"),
              language: track.language ?? undefined,
            }))
          : [],
      };
    },
  };

  watch: StreamNetWatchApi = {
    syncProgress: async (state: StreamNetWatchState): Promise<void> => {
      await this.request(`/watch/progress`, {
        method: "POST",
        body: JSON.stringify(state),
      });
    },

    getProgress: async (
      mediaId: string,
      profileId: string,
    ): Promise<number | null> => {
      const payload = await this.request<{ progressSeconds?: number | null }>(
        `/watch/progress?mediaId=${encodeURIComponent(mediaId)}&profileId=${encodeURIComponent(profileId)}`,
      );
      return asNumber(payload.progressSeconds, null);
    },
  };
}
