import { DefaultStreamNetBackendAdapter } from "../adapter/StreamNetBackendAdapter";
import { CloudSyncBridge } from "../adapter/CloudSyncBridge";
import type {
  StreamNetBackendAdapter,
  StreamNetMediaDetails,
  StreamNetProfile,
  StreamNetSession,
  StreamNetStreamLink,
  StreamNetStreamSource,
  StreamNetUser,
  StreamNetWatchState,
} from "../contracts/streamnetApi";

export interface StreamNetWebPlayerFacadeConfig {
  backendBaseUrl: string;
  cloudSyncBaseUrl: string;
  token?: string;
}

export class StreamNetWebPlayerFacade {
  private readonly backend: StreamNetBackendAdapter;
  private readonly cloudSync: CloudSyncBridge;

  constructor(config: StreamNetWebPlayerFacadeConfig) {
    this.backend = new DefaultStreamNetBackendAdapter({
      baseUrl: config.backendBaseUrl,
      token: config.token,
    });

    this.cloudSync = new CloudSyncBridge({
      baseUrl: config.cloudSyncBaseUrl,
      token: config.token,
    });
  }

  setSessionToken(token?: string): void {
    const adapter = this.backend as DefaultStreamNetBackendAdapter;
    if ("setToken" in adapter) {
      adapter.setToken(token);
    }
    this.cloudSync.setToken(token);
  }

  async login(email: string, password: string): Promise<StreamNetSession> {
    return this.backend.auth.login(email, password);
  }

  async refreshSession(session: StreamNetSession): Promise<StreamNetSession> {
    return this.backend.auth.refresh(session);
  }

  async logout(): Promise<void> {
    await this.backend.auth.logout();
  }

  async getCurrentUser(): Promise<StreamNetUser> {
    return this.backend.profiles.getCurrentUser();
  }

  async getProfiles(): Promise<StreamNetProfile[]> {
    return this.backend.profiles.getProfiles();
  }

  async switchProfile(profileId: string): Promise<void> {
    await this.backend.profiles.switchProfile(profileId);
  }

  async getMediaDetails(mediaId: string): Promise<StreamNetMediaDetails> {
    return this.backend.media.getMediaDetails(mediaId);
  }

  async getSources(mediaId: string): Promise<StreamNetStreamSource[]> {
    return this.backend.media.getSources(mediaId);
  }

  async getStreamLink(
    sourceId: string,
    mediaId: string,
  ): Promise<StreamNetStreamLink> {
    return this.backend.media.getStreamLink(sourceId, mediaId);
  }

  async syncWatchProgress(state: StreamNetWatchState): Promise<void> {
    await this.backend.watch.syncProgress(state);
    await this.cloudSync.syncWatchState(state);
  }

  async getWatchProgress(
    mediaId: string,
    profileId: string,
  ): Promise<number | null> {
    return this.backend.watch.getProgress(mediaId, profileId);
  }

  async pullCloudSnapshot(accountId: string): Promise<unknown> {
    return this.cloudSync.pullSnapshot(accountId);
  }

  async pushCloudSnapshot(
    snapshot: unknown,
    expectedRevision: number,
  ): Promise<unknown> {
    return this.cloudSync.pushSnapshot(snapshot as any, expectedRevision);
  }
}
