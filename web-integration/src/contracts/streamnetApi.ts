export type ProfileId = string;
export type MediaId = string;
export type SourceId = string;

export interface StreamNetSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface StreamNetProfile {
  id: ProfileId;
  name: string;
  avatarUrl?: string | null;
  isDefault?: boolean;
  updatedAt?: string | number | null;
}

export interface StreamNetUser {
  id: string;
  email?: string;
  profiles: StreamNetProfile[];
}

export interface StreamNetMediaDetails {
  id: MediaId;
  title: string;
  type: "movie" | "series" | "live" | "episode";
  posterUrl?: string | null;
  backdropUrl?: string | null;
  overview?: string | null;
  year?: number | null;
  genres?: string[];
}

export interface StreamNetStreamSource {
  id: SourceId;
  label: string;
  kind: "addon" | "iptv" | "vod" | "custom";
  isHealthy?: boolean;
  priority?: number;
}

export interface StreamNetStreamLink {
  id: string;
  sourceId: SourceId;
  url: string;
  quality?: string;
  subtitleUrl?: string | null;
  audioTracks?: Array<{ label: string; language?: string }>;
}

export interface StreamNetWatchState {
  mediaId: MediaId;
  profileId: ProfileId;
  progressSeconds?: number;
  updatedAtMs?: number;
  watched?: boolean;
}

export interface StreamNetAuthApi {
  login(email: string, password: string): Promise<StreamNetSession>;
  refresh(session: StreamNetSession): Promise<StreamNetSession>;
  logout(): Promise<void>;
}

export interface StreamNetProfileApi {
  getCurrentUser(): Promise<StreamNetUser>;
  getProfiles(): Promise<StreamNetProfile[]>;
  switchProfile(profileId: ProfileId): Promise<void>;
}

export interface StreamNetMediaApi {
  getMediaDetails(mediaId: MediaId): Promise<StreamNetMediaDetails>;
  getSources(mediaId: MediaId): Promise<StreamNetStreamSource[]>;
  getStreamLink(
    sourceId: SourceId,
    mediaId: MediaId,
  ): Promise<StreamNetStreamLink>;
}

export interface StreamNetWatchApi {
  syncProgress(state: StreamNetWatchState): Promise<void>;
  getProgress(mediaId: MediaId, profileId: ProfileId): Promise<number | null>;
}

export interface StreamNetBackendAdapter {
  auth: StreamNetAuthApi;
  profiles: StreamNetProfileApi;
  media: StreamNetMediaApi;
  watch: StreamNetWatchApi;
}
