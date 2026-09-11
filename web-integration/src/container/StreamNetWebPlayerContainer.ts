import { StreamNetWebPlayerApp } from "../ui/StreamNetWebPlayerApp";
import {
  resolveStreamNetWebPlayerConfig,
  type StreamNetWebPlayerConfig,
} from "../config/StreamNetWebPlayerConfig";

export class StreamNetWebPlayerContainer {
  readonly app: StreamNetWebPlayerApp;

  constructor(config: Partial<StreamNetWebPlayerConfig> = {}) {
    const resolvedConfig = resolveStreamNetWebPlayerConfig(config);
    this.app = new StreamNetWebPlayerApp(resolvedConfig);
  }

  async bootstrap() {
    return this.app.bootstrap();
  }

  async login(email: string, password: string) {
    return this.app.login(email, password);
  }

  async loadMedia(mediaId: string) {
    return this.app.loadMedia(mediaId);
  }

  async selectSource(mediaId: string, sourceId: string) {
    return this.app.selectSource(mediaId, sourceId);
  }

  async syncProgress(
    mediaId: string,
    profileId: string,
    progressSeconds: number,
    watched = false,
  ) {
    return this.app.syncProgress(mediaId, profileId, progressSeconds, watched);
  }

  getTheme() {
    return this.app.getTheme();
  }

  getViewModel() {
    return this.app.getViewModel();
  }
}
