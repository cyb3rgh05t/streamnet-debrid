"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  KeyRound,
  Tv,
  X,
} from "lucide-react";
import { hasCloudBackendConfig } from "@/lib/config";
import { useApp } from "@/lib/store";
import { localize } from "@/lib/i18n";
import { jsonRequest } from "@/lib/http";

type LoginMode =
  | "sign-in"
  | "sign-up"
  | "recovery"
  | "recovery-complete"
  | "tv-pair";

export function LoginScreen() {
  const { settings, backToProfiles, cloudLoginRequired, signIn, auth } =
    useApp();
  const cloudConfigured = hasCloudBackendConfig();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [tvCode, setTvCode] = useState("");
  const [tvIntent, setTvIntent] = useState<"signin" | "signup">("signin");
  const [mode, setMode] = useState<LoginMode>("sign-in");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [successTitle, setSuccessTitle] = useState<string | null>(null);

  const canGoBack = Boolean(auth && !cloudLoginRequired);
  const feedback = error
    ? { kind: "error" as const, message: error }
    : success
      ? { kind: "success" as const, message: success }
      : null;

  const closeFeedback = () => {
    setError(null);
    setErrorTitle(null);
    setSuccess(null);
    setSuccessTitle(null);
  };

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get("code");
      const tokenParam = params.get("token");
      const modeParam = params.get("mode");
      if (codeParam) {
        setTvCode(codeParam.toUpperCase());
        setMode("tv-pair");
      } else if (tokenParam || modeParam === "recovery") {
        if (tokenParam) setResetToken(tokenParam);
        setMode("recovery-complete");
      }
    }
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setErrorTitle(null);
    setSuccess(null);
    setSuccessTitle(null);
    try {
      if (mode === "sign-in" || mode === "sign-up") {
        await signIn(email, password, mode, false);
      } else if (mode === "recovery") {
        await jsonRequest("/api/cloud-auth/cloud-auth-reset", {
          method: "POST",
          body: JSON.stringify({ email: email.trim() }),
        });
        setSuccess(
          localize(
            settings.uiLanguage,
            "Falls dieses Konto existiert, wurde eine E-Mail zum Zurücksetzen gesendet.",
            "If this account exists, a password reset email has been sent.",
          ),
        );
      } else if (mode === "recovery-complete") {
        await jsonRequest("/api/cloud-auth/auth-password-complete", {
          method: "POST",
          body: JSON.stringify({ token: resetToken.trim(), password }),
        });
        setSuccess(
          localize(
            settings.uiLanguage,
            "Passwort erfolgreich geändert! Du kannst dich jetzt anmelden.",
            "Password changed successfully! You can now sign in.",
          ),
        );
        setTimeout(() => setMode("sign-in"), 2500);
      } else if (mode === "tv-pair") {
        await jsonRequest("/api/cloud-auth/tv-auth-web", {
          method: "POST",
          body: JSON.stringify({
            code: tvCode.trim().toUpperCase(),
            email: email.trim(),
            password,
            intent: tvIntent,
          }),
        });
        setSuccess(
          localize(
            settings.uiLanguage,
            "TV-Gerät erfolgreich gekoppelt! Die App verbindet sich in wenigen Sekunden.",
            "TV paired successfully! The app will connect in a few seconds.",
          ),
        );
        setTimeout(() => setMode("sign-in"), 3000);
      }
    } catch (cause) {
      setErrorTitle(
        localize(
          settings.uiLanguage,
          mode === "sign-up"
            ? "Konto konnte nicht erstellt werden"
            : mode === "sign-in"
              ? "Anmeldung fehlgeschlagen"
              : "Aktion fehlgeschlagen",
          mode === "sign-up"
            ? "Account could not be created"
            : mode === "sign-in"
              ? "Sign-in failed"
              : "Operation failed",
        ),
      );
      setError(
        cause instanceof Error
          ? cause.message
          : localize(
              settings.uiLanguage,
              "Aktion fehlgeschlagen.",
              "Operation failed.",
            ),
      );
    } finally {
      setBusy(false);
    }
  };

  const titleText = () => {
    if (mode === "sign-in")
      return localize(
        settings.uiLanguage,
        "Mit StreamNet Cloud anmelden",
        "Sign in with StreamNet Cloud",
      );
    if (mode === "sign-up")
      return localize(
        settings.uiLanguage,
        "StreamNet-Konto erstellen",
        "Create StreamNet account",
      );
    if (mode === "recovery")
      return localize(
        settings.uiLanguage,
        "Passwort zurücksetzen",
        "Reset password",
      );
    if (mode === "recovery-complete")
      return localize(
        settings.uiLanguage,
        "Neues Passwort wählen",
        "Choose new password",
      );
    if (mode === "tv-pair")
      return localize(
        settings.uiLanguage,
        "TV-Gerät mit Code koppeln",
        "Pair TV device",
      );
    return "";
  };

  return (
    <main className="login-shell">
      {canGoBack && (
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
              "StreamNet-Cloud-Portal",
              "StreamNet Cloud Portal",
            )}
          </p>
          <p className="login-sub">
            {localize(
              settings.uiLanguage,
              "Melde dich an oder koppele dein TV-Gerät, um Profile, Wiedergabefortschritt, Trakt-Aktivitäten, Add-ons und Einstellungen geräteübergreifend in Echtzeit zu synchronisieren.",
              "Sign in or pair your TV device to sync profiles, watch progress, Trakt activity, addons, and settings across your devices in real-time.",
            )}
          </p>
          <div className="login-proof">
            <span>{localize(settings.uiLanguage, "Profile", "Profiles")}</span>
            <span>
              {localize(
                settings.uiLanguage,
                "Echtzeit-Synchronisierung",
                "Realtime sync",
              )}
            </span>
            <span>
              {localize(
                settings.uiLanguage,
                "Wiedergabeverlauf",
                "Watch history",
              )}
            </span>
            <span>Add-ons</span>
            <span>TV-Kopplung</span>
          </div>
        </div>

        <div className="login-card">
          <p className="login-card-title">{titleText()}</p>

          <form className="login-form" onSubmit={submit}>
            {mode === "tv-pair" && (
              <div style={{ display: "grid", gap: "10px" }}>
                <input
                  value={tvCode}
                  onChange={(e) => setTvCode(e.target.value.toUpperCase())}
                  type="text"
                  placeholder={localize(
                    settings.uiLanguage,
                    "TV-Code (z.B. A1B2-C3D4)",
                    "TV Code (e.g. A1B2-C3D4)",
                  )}
                  maxLength={12}
                  required
                />
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="tvIntent"
                      value="signin"
                      checked={tvIntent === "signin"}
                      onChange={() => setTvIntent("signin")}
                    />
                    {localize(
                      settings.uiLanguage,
                      "Bestehendes Konto",
                      "Existing account",
                    )}
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="tvIntent"
                      value="signup"
                      checked={tvIntent === "signup"}
                      onChange={() => setTvIntent("signup")}
                    />
                    {localize(
                      settings.uiLanguage,
                      "Neues Konto",
                      "New account",
                    )}
                  </label>
                </div>
              </div>
            )}

            {mode === "recovery-complete" && (
              <input
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                type="text"
                placeholder={localize(
                  settings.uiLanguage,
                  "Wiederherstellungs-Token",
                  "Reset Token",
                )}
                required
              />
            )}

            {mode !== "recovery-complete" && (
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="E-Mail"
                autoComplete="email"
                required
              />
            )}

            {mode !== "recovery" && (
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder={
                  mode === "recovery-complete"
                    ? localize(
                        settings.uiLanguage,
                        "Neues Passwort",
                        "New Password",
                      )
                    : localize(settings.uiLanguage, "Passwort", "Password")
                }
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
                required
              />
            )}

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
                  : mode === "sign-up"
                    ? localize(
                        settings.uiLanguage,
                        "Konto erstellen",
                        "Create account",
                      )
                    : mode === "recovery"
                      ? localize(
                          settings.uiLanguage,
                          "Reset-Link anfordern",
                          "Request reset link",
                        )
                      : mode === "recovery-complete"
                        ? localize(
                            settings.uiLanguage,
                            "Passwort speichern",
                            "Save password",
                          )
                        : localize(
                            settings.uiLanguage,
                            "TV-Gerät jetzt koppeln",
                            "Pair TV device now",
                          )}
            </button>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                marginTop: "8px",
              }}
            >
              {mode === "sign-in" && (
                <>
                  <button
                    type="button"
                    className="login-toggle"
                    onClick={() => {
                      setError(null);
                      setSuccess(null);
                      setMode("sign-up");
                    }}
                  >
                    {localize(
                      settings.uiLanguage,
                      "Neues Konto erstellen",
                      "Create new account",
                    )}
                  </button>
                  <button
                    type="button"
                    className="login-toggle"
                    onClick={() => {
                      setError(null);
                      setSuccess(null);
                      setMode("recovery");
                    }}
                  >
                    <KeyRound
                      size={14}
                      style={{ display: "inline", marginRight: "4px" }}
                    />
                    {localize(
                      settings.uiLanguage,
                      "Passwort vergessen?",
                      "Forgot password?",
                    )}
                  </button>
                  <button
                    type="button"
                    className="login-toggle"
                    onClick={() => {
                      setError(null);
                      setSuccess(null);
                      setMode("tv-pair");
                    }}
                  >
                    <Tv
                      size={14}
                      style={{ display: "inline", marginRight: "4px" }}
                    />
                    {localize(
                      settings.uiLanguage,
                      "TV-Gerät mit Code koppeln",
                      "Pair TV device with code",
                    )}
                  </button>
                </>
              )}

              {mode !== "sign-in" && (
                <button
                  type="button"
                  className="login-toggle"
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    setMode("sign-in");
                  }}
                >
                  {localize(
                    settings.uiLanguage,
                    "Zurück zum Anmelden",
                    "Back to sign in",
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
      {!cloudConfigured && !feedback && (
        <div className="login-config-note">
          {localize(
            settings.uiLanguage,
            "StreamNet Cloud ist nicht konfiguriert. Prüfe die Backend-URL in der Web-Konfiguration.",
            "StreamNet Cloud is not configured. Check the backend URL in the web configuration.",
          )}
        </div>
      )}
      {feedback && (
        <div
          className="modal-scrim login-feedback-scrim"
          role="presentation"
          onClick={closeFeedback}
        >
          <section
            className={`login-feedback-dialog is-${feedback.kind}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="login-feedback-title"
            aria-describedby="login-feedback-message"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="login-feedback-icon" aria-hidden="true">
              {feedback.kind === "success" ? (
                <CheckCircle size={24} />
              ) : (
                <AlertCircle size={24} />
              )}
            </div>
            <div className="login-feedback-copy">
              <h2 id="login-feedback-title">
                {feedback.kind === "success"
                  ? (successTitle ??
                    localize(settings.uiLanguage, "Erfolgreich", "Success"))
                  : (errorTitle ??
                    localize(
                      settings.uiLanguage,
                      "Das hat nicht geklappt",
                      "Something went wrong",
                    ))}
              </h2>
              <p id="login-feedback-message">{feedback.message}</p>
            </div>
            <button
              type="button"
              className="login-feedback-close"
              onClick={closeFeedback}
              aria-label={localize(
                settings.uiLanguage,
                "Meldung schließen",
                "Close message",
              )}
            >
              <X size={20} />
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
