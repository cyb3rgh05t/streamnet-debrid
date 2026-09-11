import {
  resolveStreamNetWebPlayerConfig,
  type StreamNetWebPlayerConfig,
} from "../config/StreamNetWebPlayerConfig";
import { StreamNetWebPlayerFacade } from "../facade/StreamNetWebPlayerFacade";
import {
  StreamNetWebPlayerStateStore,
  type StreamNetWebPlayerState,
} from "../state/StreamNetWebPlayerState";
import { streamnetBrandTheme } from "../theme/branding";

export interface StreamNetWebPlayerAppViewModel {
  state: StreamNetWebPlayerState;
  theme: typeof streamnetBrandTheme;
}

export class StreamNetWebPlayerApp {
  readonly config: ReturnType<typeof resolveStreamNetWebPlayerConfig>;
  readonly facade: StreamNetWebPlayerFacade;
  readonly state: StreamNetWebPlayerStateStore;

  constructor(config: Partial<StreamNetWebPlayerConfig> = {}) {
    this.config = resolveStreamNetWebPlayerConfig(config);
    this.facade = new StreamNetWebPlayerFacade({
      backendBaseUrl: this.config.backendBaseUrl,
      cloudSyncBaseUrl: this.config.cloudSyncBaseUrl,
      token: undefined,
    });
    this.state = new StreamNetWebPlayerStateStore();
  }

  getViewModel(): StreamNetWebPlayerAppViewModel {
    return {
      state: this.state.getState(),
      theme: this.config.theme ?? streamnetBrandTheme,
    };
  }

  setSessionToken(token?: string): void {
    this.facade.setSessionToken(token);
    this.state.setSession(
      token
        ? {
            accessToken: token,
            refreshToken: token,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          }
        : null,
    );
  }

  async login(email: string, password: string) {
    const session = await this.facade.login(email, password);
    this.facade.setSessionToken(session.accessToken);
    this.state.setSession(session);
    return session;
  }

  async bootstrap(): Promise<StreamNetWebPlayerState> {
    const user = await this.facade.getCurrentUser();
    const profiles = await this.facade.getProfiles();
    const activeProfileId = profiles[0]?.id ?? null;
    this.state.setProfiles(user, profiles, activeProfileId);
    return this.state.getState();
  }

  async loadMedia(mediaId: string) {
    const details = await this.facade.getMediaDetails(mediaId);
    this.state.setSelectedMedia(mediaId, details);
    const sources = await this.facade.getSources(mediaId);
    this.state.setSources(sources);
    return {
      details,
      sources,
    };
  }

  async selectSource(mediaId: string, sourceId: string) {
    const streamLink = await this.facade.getStreamLink(sourceId, mediaId);
    this.state.setPlaybackSource(sourceId, streamLink.url);
    return streamLink;
  }

  async syncProgress(
    mediaId: string,
    profileId: string,
    progressSeconds: number,
    watched = false,
  ) {
    const progressState = {
      mediaId,
      profileId,
      progressSeconds,
      watched,
      updatedAtMs: Date.now(),
    };

    this.state.setPlaybackProgress(progressSeconds);
    await this.facade.syncWatchProgress(progressState);
    return progressState;
  }

  getTheme() {
    return this.config.theme ?? streamnetBrandTheme;
  }
}
