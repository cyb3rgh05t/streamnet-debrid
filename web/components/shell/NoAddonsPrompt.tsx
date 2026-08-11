"use client";

import { ExternalLink, Puzzle, Settings, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";

const ADDON_DIRECTORY_URL = "https://stremio-addons.net/";
const DISMISS_KEY_PREFIX = "arvio.web.noAddonsPrompt.v1:";

export function NoAddonsPrompt() {
  const {
    view,
    section,
    setSection,
    activeProfile,
    addons,
    addonsReady,
    closeDetails
  } = useApp();
  const [dismissal, setDismissal] = useState<{ profileId: string; dismissed: boolean } | null>(null);
  const browseRef = useRef<HTMLAnchorElement>(null);
  const profileId = activeProfile?.id ?? "";

  useEffect(() => {
    if (!profileId) {
      setDismissal(null);
      return;
    }
    let dismissed = false;
    try {
      dismissed = window.sessionStorage.getItem(`${DISMISS_KEY_PREFIX}${profileId}`) === "1";
    } catch {
      // A blocked session store should not prevent onboarding from rendering.
    }
    setDismissal({ profileId, dismissed });
  }, [profileId]);

  const visible =
    view === "app" &&
    Boolean(profileId) &&
    addonsReady &&
    addons.length === 0 &&
    section !== "addons" &&
    dismissal?.profileId === profileId &&
    !dismissal.dismissed;

  const dismiss = () => {
    if (!profileId) return;
    try {
      window.sessionStorage.setItem(`${DISMISS_KEY_PREFIX}${profileId}`, "1");
    } catch {
      // Keep the in-memory dismissal when browser storage is unavailable.
    }
    setDismissal({ profileId, dismissed: true });
  };

  useEffect(() => {
    if (!visible) return undefined;
    const focusTimer = window.setTimeout(() => browseRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [visible, profileId]);

  if (!visible) return null;

  return (
    <div className="modal-scrim no-addons-scrim" onClick={dismiss}>
      <section
        className="no-addons-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="no-addons-title"
        aria-describedby="no-addons-description"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="no-addons-close" onClick={dismiss} aria-label="Close" title="Close">
          <X size={20} />
        </button>

        <div className="no-addons-heading">
          <span className="no-addons-icon" aria-hidden="true"><Puzzle size={26} /></span>
          <div>
            <p className="eyebrow">Sources required</p>
            <h2 id="no-addons-title">Add an addon to start watching</h2>
          </div>
        </div>

        <p id="no-addons-description" className="no-addons-copy">
          ARVIO does not host or provide any media. It connects to addons you choose and configure.
          You can browse both free and paid community addons on stremio-addons.net.
        </p>
        <p className="no-addons-disclaimer">
          This is an independent third-party directory. ARVIO is not affiliated with its addons;
          availability and legality can vary by provider and location.
        </p>

        <div className="no-addons-actions">
          <button
            type="button"
            className="secondary no-addons-settings"
            onClick={() => {
              dismiss();
              closeDetails();
              setSection("addons");
            }}
          >
            <Settings size={17} /> Addon settings
          </button>
          <a
            ref={browseRef}
            className="primary no-addons-browse"
            href={ADDON_DIRECTORY_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Browse addons <ExternalLink size={16} />
          </a>
        </div>
      </section>
    </div>
  );
}
