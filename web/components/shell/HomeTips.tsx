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
    selected,
    activeProfile,
    addons,
    addonsReady,
    cloudProfilesHydrated,
    settings,
    setSection,
    requestSettingsSection,
  } = useApp();
  const [state, setState] = useState<HomeTipsState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(loadStored<HomeTipsState>(HOME_TIPS_KEY, { dismissed: [], hidden: false }));
  }, []);

  const onHome = view === "app" && section === "home" && !selected && Boolean(activeProfile);

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
      title: localize(lang, "Mach Home zu deinem Home", "Make Home yours"),
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

  const dismiss = () => update({ ...state, dismissed: [...state.dismissed, tip] });
  const open = () => {
    dismiss();
    if (tip === "addons") {
      setSection("addons");
      return;
    }
    requestSettingsSection(
      tip === "rows" ? "catalogs" : tip === "live_tv" ? "tv" : "accounts",
    );
    setSection("settings");
  };

  return (
    <aside className="home-tip" role="note" aria-live="polite">
      <button
        type="button"
        className="home-tip-close"
        onClick={dismiss}
        aria-label={localize(lang, "Tipp schließen", "Close tip")}
        title={localize(lang, "Tipp schließen", "Close tip")}
      >
        <X size={16} />
      </button>
      <div className="home-tip-heading">
        <Lightbulb size={18} aria-hidden="true" />
        <strong>{copy[tip].title}</strong>
      </div>
      <p>{copy[tip].text}</p>
      <div className="home-tip-actions">
        <button type="button" className="primary" onClick={open}>
          {localize(lang, "Zeig mir wie", "Show me")}
        </button>
        <button
          type="button"
          className="home-tip-hide"
          onClick={() => update({ ...state, hidden: true })}
        >
          {localize(lang, "Alle Tipps ausblenden", "Hide all tips")}
        </button>
      </div>
    </aside>
  );
}
