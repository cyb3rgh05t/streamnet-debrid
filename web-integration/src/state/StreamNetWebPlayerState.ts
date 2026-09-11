import type {
  StreamNetMediaDetails,
  StreamNetProfile,
  StreamNetSession,
  StreamNetStreamSource,
  StreamNetUser,
} from "../contracts/streamnetApi";

export interface StreamNetWebPlayerState {
  auth: {
    session: StreamNetSession | null;
    isAuthenticated: boolean;
    isRefreshing: boolean;
  };
  profiles: {
    user: StreamNetUser | null;
    list: StreamNetProfile[];
    activeProfileId: string | null;
  };
  media: {
    selectedMediaId: string | null;
    details: StreamNetMediaDetails | null;
    sources: StreamNetStreamSource[];
  };
  playback: {
    selectedSourceId: string | null;
    streamUrl: string | null;
    isPlaying: boolean;
    progressSeconds: number | null;
  };
}

export const initialStreamNetWebPlayerState: StreamNetWebPlayerState = {
  auth: {
    session: null,
    isAuthenticated: false,
    isRefreshing: false,
  },
  profiles: {
    user: null,
    list: [],
    activeProfileId: null,
  },
  media: {
    selectedMediaId: null,
    details: null,
    sources: [],
  },
  playback: {
    selectedSourceId: null,
    streamUrl: null,
    isPlaying: false,
    progressSeconds: null,
  },
};

export class StreamNetWebPlayerStateStore {
  private state: StreamNetWebPlayerState = initialStreamNetWebPlayerState;

  getState(): StreamNetWebPlayerState {
    return this.state;
  }

  setSession(session: StreamNetSession | null): void {
    this.state = {
      ...this.state,
      auth: {
        ...this.state.auth,
        session,
        isAuthenticated: Boolean(session),
      },
    };
  }

  setProfiles(
    user: StreamNetUser | null,
    list: StreamNetProfile[],
    activeProfileId: string | null,
  ): void {
    this.state = {
      ...this.state,
      profiles: {
        user,
        list,
        activeProfileId,
      },
    };
  }

  setActiveProfile(profileId: string | null): void {
    this.state = {
      ...this.state,
      profiles: {
        ...this.state.profiles,
        activeProfileId: profileId,
      },
    };
  }

  setSelectedMedia(
    mediaId: string | null,
    details: StreamNetMediaDetails | null,
  ): void {
    this.state = {
      ...this.state,
      media: {
        ...this.state.media,
        selectedMediaId: mediaId,
        details,
      },
    };
  }

  setSources(sources: StreamNetStreamSource[]): void {
    this.state = {
      ...this.state,
      media: {
        ...this.state.media,
        sources,
      },
    };
  }

  setPlaybackSource(sourceId: string | null, streamUrl: string | null): void {
    this.state = {
      ...this.state,
      playback: {
        ...this.state.playback,
        selectedSourceId: sourceId,
        streamUrl,
      },
    };
  }

  setPlaybackProgress(progressSeconds: number | null): void {
    this.state = {
      ...this.state,
      playback: {
        ...this.state.playback,
        progressSeconds,
      },
    };
  }

  setIsPlaying(isPlaying: boolean): void {
    this.state = {
      ...this.state,
      playback: {
        ...this.state.playback,
        isPlaying,
      },
    };
  }
}
