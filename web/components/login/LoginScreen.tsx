"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import {
  hasNetlifyBackendConfig,
  hasSupabaseConfig,
  getAuthPortalUrl,
} from "@/lib/config";
import { config } from "@/lib/config";
import { useApp } from "@/lib/store";
import { localize } from "@/lib/i18n";

export function LoginScreen() {
  const { settings, backToProfiles, cloudLoginRequired, signIn } = useApp();
  const cloudConfigured = hasNetlifyBackendConfig() || hasSupabaseConfig();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectToAuthPortal = () => {
    if (typeof window === "undefined") return;
    const redirectUri = window.location.origin + "/";
    const portalUrl = getAuthPortalUrl();
    window.location.href = `${portalUrl}?redirect_uri=${encodeURIComponent(redirectUri)}`;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password, mode);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : localize(
              settings.uiLanguage,
              "Anmeldung fehlgeschlagen.",
              "Sign-in failed.",
            ),
      );
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && cloudConfigured && !config.selfHosted) {
      const hash = window.location.hash || "";
      if (!hash.includes("access_token=")) {
        redirectToAuthPortal();
      }
    }
  }, [mounted, cloudConfigured]);

  return (
    <main className="login-shell">
      {!cloudLoginRequired && (
        <button
          type="button"
          className="login-back"
          onClick={backToProfiles}
          aria-label={localize(settings.uiLanguage, "Zurück", "Back")}
        >
          <ArrowLeft size={20} />{" "}
          {localize(settings.uiLanguage, "Zurück", "Back")}
        </button>
      )}
      <div className="login-hero">
        <div className="login-copy">
          <div className="login-brand-lockup">
            <img
              src="/streamnet-wordmark.svg"
              alt="StreamNet"
              className="login-wordmark"
            />
          </div>
          <p className="login-tag">
            {localize(
              settings.uiLanguage,
              "StreamNet-Cloud-Anmeldung",
              "StreamNet Cloud Sign-In",
            )}
          </p>
          <p className="login-sub">
            {localize(
              settings.uiLanguage,
              "Melde dich an, um Profile, Fortschritt, Trakt-Aktivitäten, Add-ons, Kataloge und Wiedergabeeinstellungen geräteübergreifend zu synchronisieren.",
              "Sign in to sync profiles, progress, Trakt activity, addons, catalogs, and playback settings across your devices.",
            )}
          </p>
          <div className="login-proof">
            <span>{localize(settings.uiLanguage, "Profile", "Profiles")}</span>
            <span>
              {localize(
                settings.uiLanguage,
                "Wiedergabeverlauf",
                "Watch history",
              )}
            </span>
            <span>Add-ons</span>
            <span>
              {localize(
                settings.uiLanguage,
                "Trakt-Synchronisierung",
                "Trakt sync",
              )}
            </span>
          </div>
        </div>

        <div className="login-card">
          <p className="login-card-title">
            {mode === "sign-in"
              ? localize(
                  settings.uiLanguage,
                  "Mit StreamNet Cloud anmelden",
                  "Sign in with StreamNet Cloud",
                )
              : localize(
                  settings.uiLanguage,
                  "StreamNet-Konto erstellen",
                  "Create StreamNet account",
                )}
          </p>
          {!cloudConfigured && (
            <p className="login-error">
              {localize(
                settings.uiLanguage,
                "StreamNet Cloud ist nicht konfiguriert. Prüfe die Backend-URL in der Web-Konfiguration.",
                "StreamNet Cloud is not configured. Check the backend URL in the web configuration.",
              )}
            </p>
          )}
          {config.selfHosted ? (
            <form className="login-form" onSubmit={submit}>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="E-Mail"
                autoComplete="email"
                required
              />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder={localize(
                  settings.uiLanguage,
                  "Passwort",
                  "Password",
                )}
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
                required
              />
              {error && <p className="login-error">{error}</p>}
              <button
                type="submit"
                className="primary login-submit"
                disabled={busy}
              >
                {busy
                  ? localize(
                      settings.uiLanguage,
                      "Bitte warten ...",
                      "Please wait...",
                    )
                  : mode === "sign-in"
                    ? localize(settings.uiLanguage, "Anmelden", "Sign in")
                    : localize(
                        settings.uiLanguage,
                        "Konto erstellen",
                        "Create account",
                      )}
              </button>
              <button
                type="button"
                className="secondary login-submit"
                onClick={() =>
                  setMode(mode === "sign-in" ? "sign-up" : "sign-in")
                }
              >
                {mode === "sign-in"
                  ? localize(
                      settings.uiLanguage,
                      "Neues Konto erstellen",
                      "Create new account",
                    )
                  : localize(
                      settings.uiLanguage,
                      "Zum Anmelden wechseln",
                      "Switch to sign in",
                    )}
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="primary login-submit"
              onClick={redirectToAuthPortal}
              disabled={!cloudConfigured}
            >
              {localize(
                settings.uiLanguage,
                "Mit StreamNet Cloud anmelden",
                "Sign in with StreamNet Cloud",
              )}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
