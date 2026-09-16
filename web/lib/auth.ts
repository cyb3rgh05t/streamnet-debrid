import { jsonRequest } from "./http";
import { loadStored, removeStored, saveStored } from "./storage";
import type { AuthSession } from "./types";

export const SESSION_KEY = "streamnet.web.session";

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  user?: { id?: string; email?: string };
}

export function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split(".")[1];
  if (!part) return {};
  const padded = part
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(part.length / 4) * 4, "=");
  try {
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function sessionFromResponse(
  response: AuthResponse,
  fallbackEmail: string,
): AuthSession {
  const payload = decodeJwtPayload(response.access_token);
  const userId = response.user?.id ?? (payload.sub as string | undefined) ?? "";
  const email =
    response.user?.email ??
    (payload.email as string | undefined) ??
    fallbackEmail;
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    userId,
    email,
    expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
  };
}

export class AuthClient {
  session = loadStored<AuthSession | null>(SESSION_KEY, null);
  private refreshInFlight: Promise<void> | null = null;
  private readonly sessionListeners = new Set<
    (session: AuthSession | null) => void
  >();

  onSessionChange(listener: (session: AuthSession | null) => void) {
    this.sessionListeners.add(listener);
    return () => this.sessionListeners.delete(listener);
  }

  private notifySessionChange() {
    for (const listener of this.sessionListeners) listener(this.session);
  }

  get isAuthenticated() {
    return Boolean(this.session?.accessToken);
  }

  private async cloudAuth<T>(path: string, body: Record<string, unknown>) {
    return jsonRequest<T>(`/api/cloud-auth/${path.replace(/^\/+/, "")}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async signIn(email: string, password: string) {
    const response = await this.cloudAuth<AuthResponse>("auth-login", {
      email,
      password,
    });
    this.session = sessionFromResponse(response, email);
    saveStored(SESSION_KEY, this.session);
    this.notifySessionChange();
    return this.session;
  }

  async signUp(email: string, password: string) {
    const response = await this.cloudAuth<AuthResponse>("cloud-auth-email", {
      email,
      password,
    });
    this.session = sessionFromResponse(response, email);
    saveStored(SESSION_KEY, this.session);
    this.notifySessionChange();
    return this.session;
  }

  async accessToken() {
    if (!this.session) throw new Error("Sign in required");
    if (this.session.expiresAt - Date.now() < 120000) {
      await this.refresh();
    }
    if (!this.session?.accessToken) throw new Error("Sign in required");
    return this.session.accessToken;
  }

  async refresh() {
    if (this.refreshInFlight) return this.refreshInFlight;
    const sourceSession = this.session;
    if (!sourceSession) throw new Error("Sign in required");

    const refresh = (async () => {
      let response: AuthResponse;
      try {
        response = await this.cloudAuth<AuthResponse>("auth-refresh", {
          refresh_token: sourceSession.refreshToken,
        });
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 400) {
          this.signOut();
        }
        throw error;
      }

      // A sign-out while refresh was in flight must not silently restore the session.
      if (
        !this.session ||
        this.session.refreshToken !== sourceSession.refreshToken
      )
        return;
      this.session = sessionFromResponse(response, sourceSession.email);
      saveStored(SESSION_KEY, this.session);
      this.notifySessionChange();
    })();

    this.refreshInFlight = refresh;
    try {
      await refresh;
    } finally {
      if (this.refreshInFlight === refresh) this.refreshInFlight = null;
    }
  }

  signOut() {
    this.session = null;
    removeStored(SESSION_KEY);
    this.notifySessionChange();
  }
}
