import type { AuthClient } from "./auth";

export interface AccountSyncRevisionEvent {
  type: "account_sync_revision";
  revision: number;
  sourceDeviceId?: string | null;
  changedAreas?: string[];
  occurredAt?: string;
}

export function subscribeCloudSyncEvents(
  auth: AuthClient,
  onRevision: (event: AccountSyncRevisionEvent) => void,
): () => void {
  let eventSource: EventSource | null = null;
  let isClosed = false;
  let reconnectTimer: NodeJS.Timeout | null = null;
  let attempt = 0;

  async function connect() {
    if (isClosed || !auth.session) return;
    try {
      const token = await auth.accessToken();
      if (isClosed) return;
      const url = `/api/cloud-auth/account-sync-events?token=${encodeURIComponent(token)}`;
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        attempt = 0;
      };

      eventSource.onmessage = (event) => {
        if (!event.data) return;
        try {
          const parsed = JSON.parse(event.data) as AccountSyncRevisionEvent;
          if (
            parsed &&
            parsed.type === "account_sync_revision" &&
            typeof parsed.revision === "number"
          ) {
            onRevision(parsed);
          }
        } catch {
          // Ignore parse errors on ping/comment frames
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (isClosed) return;
        attempt++;
        const backoff = Math.min(1000 * Math.pow(2, attempt), 30_000);
        reconnectTimer = setTimeout(connect, backoff);
      };
    } catch {
      if (isClosed) return;
      attempt++;
      const backoff = Math.min(1000 * Math.pow(2, attempt), 30_000);
      reconnectTimer = setTimeout(connect, backoff);
    }
  }

  void connect();

  return () => {
    isClosed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}
