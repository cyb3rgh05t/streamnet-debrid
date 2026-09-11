import type {
  StreamNetProfile,
  StreamNetWatchState,
} from "../contracts/streamnetApi";

export interface SyncSnapshot {
  accountId: string;
  profileId: string;
  revision: number;
  payload: Record<string, unknown>;
  updatedAtMs: number;
}

export interface CloudSyncConflict {
  accepted: false;
  reason: "revision_conflict";
  revision: number;
  current: { payload: Record<string, unknown>; revision: number };
}

export interface CloudSyncBridgeConfig {
  baseUrl: string;
  token?: string;
}

export class CloudSyncBridge {
  private readonly baseUrl: string;
  private token?: string;

  constructor(config: CloudSyncBridgeConfig) {
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
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(
        `Cloud sync request failed for ${path}: ${response.status}`,
      );
    }

    return (await response.json()) as T;
  }

  async pullSnapshot(accountId: string): Promise<SyncSnapshot> {
    const payload = await this.request<{ snapshot: SyncSnapshot }>(
      `/account-sync-pull?accountId=${encodeURIComponent(accountId)}`,
    );
    return payload.snapshot;
  }

  async pushSnapshot(
    snapshot: SyncSnapshot,
    expectedRevision: number,
  ): Promise<SyncSnapshot | CloudSyncConflict> {
    const payload = await this.request<{
      accepted: boolean;
      snapshot?: SyncSnapshot;
      current?: { payload: Record<string, unknown>; revision: number };
      reason?: string;
      revision?: number;
    }>(`/account-sync-push`, {
      method: "POST",
      body: JSON.stringify({
        accountId: snapshot.accountId,
        profileId: snapshot.profileId,
        payload: snapshot.payload,
        expectedRevision,
      }),
    });

    if (payload.accepted === false) {
      return {
        accepted: false,
        reason: "revision_conflict",
        revision: payload.revision ?? snapshot.revision,
        current: {
          payload: payload.current?.payload ?? {},
          revision: payload.current?.revision ?? snapshot.revision,
        },
      };
    }

    return payload.snapshot ?? snapshot;
  }

  async resolveProfileConflict(
    existing: StreamNetProfile[],
    incoming: StreamNetProfile[],
  ): Promise<StreamNetProfile[]> {
    const byId = new Map<string, StreamNetProfile>();

    for (const profile of [...existing, ...incoming]) {
      const key = profile.id;
      const current = byId.get(key);
      if (!current || (profile.updatedAt ?? 0) > (current.updatedAt ?? 0)) {
        byId.set(key, profile);
      }
    }

    return Array.from(byId.values());
  }

  async applyProfileSetting(
    profileId: string,
    key: string,
    value: unknown,
  ): Promise<void> {
    await this.request("/account-sync-push", {
      method: "POST",
      body: JSON.stringify({
        profileId,
        payload: {
          profileSettings: {
            [key]: value,
          },
        },
      }),
    });
  }

  async syncWatchState(state: StreamNetWatchState): Promise<void> {
    await this.request("/watch/progress", {
      method: "POST",
      body: JSON.stringify(state),
    });
  }
}
