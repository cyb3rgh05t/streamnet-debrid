"use client";

import { Lightbulb, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { localize } from "@/lib/i18n";
import {
  HOME_TIPS_KEY,
  selectHomeTip,
  type HomeTipId,
  type HomeTipsState,
} from "@/lib/homeTips";
import { needsPlaylistSetup } from "@/lib/playlistOnboarding";
import { useApp } from "@/lib/store";
import { loadStored, saveStored } from "@/lib/storage";

const TIP_DELAY_MS = 2500;

export function HomeTips() {
  const {
    view,
    section,
    activeProfile,
    addons,
    addonsReady,
    cloudProfilesHydrated,
    settings,
  } = useApp();
  const [state, setState] = useState<HomeTipsState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(
      loadStored<HomeTipsState>(HOME_TIPS_KEY, {
        dismissed: [],
      }),
    );
  }, []);

  const onHome = view === "app" && section === "home" && Boolean(activeProfile);

  // Wait a moment after Home appears so the tip never competes with the first paint.
  useEffect(() => {
    if (!onHome || !addonsReady || !cloudProfilesHydrated) {
      setReady(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setReady(true), TIP_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [onHome, addonsReady, cloudProfilesHydrated]);

  const update = useCallback((next: HomeTipsState) => {
    setState(next);
    saveStored(HOME_TIPS_KEY, next);
  }, []);

  const tip =
    state && ready
      ? selectHomeTip(state, {
          hasUserAddon: addons.some(
            (addon) =>
              addon.enabled !== false &&
              addon.id !== "org.stremio.opensubtitlesv3",
          ),
          hasIptvSource: !needsPlaylistSetup(settings.iptvPlaylists),
        })
      : null;

  if (!state || !tip) return null;

  const lang = settings.uiLanguage;
  const copy: Record<HomeTipId, { title: string; text: string }> = {
    rows: {
      title: localize(
        lang,
        "Personalisiere deine Startseite",
        "Customize your Home",
      ),
      text: localize(
        lang,
        "Home-Reihen ausblenden, hinzufügen und umsortieren: Einstellungen → Kataloge.",
        "Hide, add and reorder Home rows under Settings → Catalogs.",
      ),
    },
    addons: {
      title: localize(lang, "Add-ons hinzufügen", "Add addons"),
      text: localize(
        lang,
        "Installiere Stremio-Add-ons für mehr Streams und Untertitel.",
        "Install Stremio addons for more streams and subtitles.",
      ),
    },
    live_tv: {
      title: localize(lang, "Live-TV einrichten", "Set up Live TV"),
      text: localize(
        lang,
        "Trage deine Playlist unter Einstellungen → TV ein, um Live-TV mit Programmführer zu sehen.",
        "Enter your playlist under Settings → TV to watch Live TV with its guide.",
      ),
    },
    cloud: {
      title: localize(lang, "Überall dasselbe", "Same on all your devices"),
      text: localize(
        lang,
        "Mit deinem StreamNet-Konto bleiben Playlists, Add-ons und Reihen auf all deinen Geräten gleich.",
        "With your StreamNet account, playlists, addons and rows stay in sync across your devices.",
      ),
    },
  };

  const dismiss = () =>
    update({ ...state, dismissed: [...state.dismissed, tip] });

  return (
    <aside className="home-tip" role="note" aria-live="polite">
      <div className="home-tip-body">
        <span className="home-tip-label">
          <Lightbulb size={14} aria-hidden="true" />
          {localize(lang, "TIPP", "TIP")}
        </span>
        <strong>{copy[tip].title}</strong>
        <p>{copy[tip].text}</p>
      </div>
      <div className="home-tip-actions">
        <button type="button" className="home-tip-ok" onClick={dismiss}>
          {localize(lang, "Alles klar!", "Got it!")}
        </button>
      </div>
      <button
        type="button"
        className="home-tip-close"
        onClick={dismiss}
        aria-label={localize(lang, "Tipp schließen", "Close tip")}
        title={localize(lang, "Tipp schließen", "Close tip")}
      >
        <X size={18} />
      </button>
    </aside>
  );
}
