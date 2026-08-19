"use client";

import { BadgeCheck, Check, ExternalLink, Loader2, LogOut, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { config } from "@/lib/config";
import { HttpError } from "@/lib/http";
import {
  cachedEntitlement,
  fetchEntitlement,
  kofiSubscribeUrl,
  linkKofiEmail,
  startTrial,
  type EntitlementState
} from "@/lib/entitlement";
import { authClient, useApp } from "@/lib/store";
import { capturePremiumAttribution, trackPremiumEvent, trackPremiumMilestone, TRIAL_INTENT_KEY } from "@/lib/premiumAnalytics";

// Three-day free trial: enabled — enough time to use ARVIO Web on normal days,
// blind $2.99 ask. One trial per account (trialUsed is stamped server-side).
const SHOW_TRIAL = true;

// Gate that stands between profile selection and the app when the paywall is
// enabled. Fails OPEN on backend errors (a paying user is never locked out by a
// hiccup) and CLOSED on a confirmed non-entitled state.
export function EntitlementGate({ children }: { children: React.ReactNode }) {
  const { auth, signOut, goToLogin } = useApp();
  const accountId = auth?.userId ?? null;
  const [state, setState] = useState<EntitlementState | null>(() => cachedEntitlement(authClient));
  const [status, setStatus] = useState<"loading" | "ready" | "error">(state ? "ready" : "loading");

  useEffect(() => {
    if (!config.paywallEnabled) return;
    const cached = cachedEntitlement(authClient);
    setState(cached);
    if (!accountId) {
      setStatus("ready");
      return;
    }
    setStatus(cached ? "ready" : "loading");
    let active = true;
    void fetchEntitlement(authClient)
      .then((next) => { if (active) { setState(next); setStatus("ready"); } })
      .catch(() => { if (active) setStatus("error"); });
    return () => { active = false; };
  }, [accountId]);

  // Paywall off, or entitled → app. On a backend error with no cached "not
  // entitled", fail open so we never lock out a paying user over a hiccup.
  if (!config.paywallEnabled) return <>{children}</>;
  if (state?.entitled) return <>{children}</>;
  if (status === "error" && !state) return <>{children}</>;
  if (status === "loading") {
    return (
      <main className="paywall-boot">
        <Loader2 className="paywall-spinner" size={40} />
      </main>
    );
  }

  return (
    <PaywallScreen
      state={state}
      isSignedIn={Boolean(auth)}
      onEntitled={(next) => setState(next)}
      onConnect={goToLogin}
      onSignOut={signOut}
    />
  );
}

function PaywallScreen({
  state,
  isSignedIn,
  onEntitled,
  onConnect,
  onSignOut
}: {
  state: EntitlementState | null;
  isSignedIn: boolean;
  onEntitled: (next: EntitlementState) => void;
  onConnect: () => void;
  onSignOut: () => void;
}) {
  const [busy, setBusy] = useState<"trial" | "link" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [kofiEmail, setKofiEmail] = useState("");
  const trialAvailable = state?.trialAvailable ?? true;
  const trialDays = state?.trialDurationDays ?? 3;
  const expired = state?.reason === "expired" || state?.status === "cancelled";

  useEffect(() => {
    capturePremiumAttribution();
    if (!isSignedIn) return;
    void trackPremiumEvent(authClient, "paywall_view", {}, true);
    void trackPremiumMilestone(authClient, "account_connected");
  }, [isSignedIn]);

  const beginTrial = useCallback(async () => {
    if (!isSignedIn) {
      capturePremiumAttribution();
      try { localStorage.setItem(TRIAL_INTENT_KEY, "1"); } catch { /* storage is optional */ }
      onConnect();
      return;
    }
    void trackPremiumEvent(authClient, "trial_requested");
    setBusy("trial"); setError(null);
    try {
      const next = await startTrial(authClient);
      if (next.entitled) {
        try { localStorage.removeItem(TRIAL_INTENT_KEY); } catch { /* storage is optional */ }
        onEntitled(next);
      }
      else setError("Your free trial has already been used.");
    } catch (err) {
      // startTrial already refreshed + retried on a stale token; reaching this
      // catch means the session is genuinely dead, the trial was consumed, or
      // the backend hiccuped — say which, and give the dead-session case a way
      // out (the generic message left users stuck with no next step).
      const status = err instanceof HttpError ? err.status : null;
      if (status === 401) {
        onConnect();
        return;
      } else if (status === 409) {
        try { localStorage.removeItem(TRIAL_INTENT_KEY); } catch { /* storage is optional */ }
        setError("Your free trial has already been used.");
      } else setError("Could not start the trial — please try again in a moment.");
      void trackPremiumEvent(authClient, "trial_start_failed", { status: status || 0 });
    } finally {
      setBusy(null);
    }
  }, [isSignedIn, onConnect, onEntitled]);

  useEffect(() => {
    if (!isSignedIn || busy !== null || !trialAvailable || expired) return;
    let pending = false;
    try { pending = localStorage.getItem(TRIAL_INTENT_KEY) === "1"; } catch { pending = false; }
    if (pending) {
      try { localStorage.removeItem(TRIAL_INTENT_KEY); } catch { /* storage is optional */ }
      void beginTrial();
    }
  }, [beginTrial, busy, expired, isSignedIn, trialAvailable]);

  const link = useCallback(async () => {
    if (!kofiEmail.trim()) return;
    void trackPremiumEvent(authClient, "membership_link_started");
    setBusy("link"); setError(null);
    try {
      const next = await linkKofiEmail(authClient, kofiEmail.trim());
      if (next.entitled) {
        void trackPremiumEvent(authClient, "membership_linked");
        onEntitled(next);
      }
      else setError("No active membership was found for that email.");
    } catch {
      void trackPremiumEvent(authClient, "membership_link_failed");
      setError("No active membership was found for that email.");
    } finally {
      setBusy(null);
    }
  }, [kofiEmail, onEntitled]);

  return (
    <main className="paywall">
      <div className="paywall-card">
        <div className="paywall-brand">
          <img src="/arvio-logo.svg" alt="" className="paywall-logo" />
          <img src="/arvio-wordmark.svg" alt="ARVIO" className="paywall-wordmark" />
        </div>

        <h1>{expired ? "Your ARVIO Web membership has ended" : "ARVIO Web is a members feature"}</h1>
        <p className="paywall-sub">
          Take your existing ARVIO setup to iPhone, iPad, smart-TV browsers and any desktop.
          Your profiles, libraries, addons and progress stay connected through ARVIO Cloud.
        </p>

        <div className="paywall-benefits" aria-label="ARVIO Web benefits">
          <span><Check size={15} /> Same profiles, libraries and watch progress</span>
          <span><Check size={15} /> Download sources directly to your device</span>
          <span><Check size={15} /> Browser playback and one-click VLC</span>
          <span><Check size={15} /> Android and TV app remains completely free</span>
        </div>

        <div className="paywall-price">
          <span className="paywall-amount">$2.99</span>
          <span className="paywall-period">/ month</span>
        </div>

        <a
          className="paywall-primary"
          href={kofiSubscribeUrl()}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => { void trackPremiumEvent(authClient, "checkout_opened"); }}
        >
          <BadgeCheck size={18} /> Subscribe on Ko-fi <ExternalLink size={15} />
        </a>

        {SHOW_TRIAL && trialAvailable && !expired && (
          <button type="button" className="paywall-trial" onClick={() => void beginTrial()} disabled={busy !== null}>
            {busy === "trial" ? <Loader2 className="paywall-spinner" size={16} /> : <Sparkles size={16} />}
            {isSignedIn ? `Start ${trialDays}-day free trial` : `Connect to Cloud for ${trialDays}-day trial`}
          </button>
        )}

        <button type="button" className="paywall-link-toggle" onClick={() => setLinkOpen((v) => !v)}>
          Already subscribed? Link your Ko-fi email
        </button>

        {linkOpen && (
          <div className="paywall-link-row">
            <input
              type="email"
              placeholder="Your Ko-fi / PayPal email"
              value={kofiEmail}
              onChange={(e) => setKofiEmail(e.target.value)}
            />
            <button type="button" onClick={() => void link()} disabled={busy !== null || !kofiEmail.trim()}>
              {busy === "link" ? <Loader2 className="paywall-spinner" size={16} /> : "Link"}
            </button>
          </div>
        )}

        {error && <p className="paywall-error">{error}</p>}

        <p className="paywall-proof">10,000+ users · 10+ contributors · open source</p>

        {isSignedIn && (
          <button type="button" className="paywall-signout" onClick={onSignOut}>
            <LogOut size={15} /> Sign out
          </button>
        )}
      </div>
    </main>
  );
}
