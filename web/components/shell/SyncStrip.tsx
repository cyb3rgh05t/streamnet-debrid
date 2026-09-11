"use client";

import { Cloud } from "lucide-react";
import { useApp } from "@/lib/store";
import { localize } from "@/lib/i18n";

export function SyncStrip() {
  const {
    settings,
    busy,
    auth,
    traktConnected,
    simklConnected,
    mdblistConnected,
  } = useApp();
  const syncLabel = traktConnected
    ? localize(settings.uiLanguage, "Trakt aktiv", "Trakt On")
    : simklConnected
      ? localize(settings.uiLanguage, "Simkl aktiv", "Simkl On")
      : mdblistConnected
        ? localize(settings.uiLanguage, "MDBList aktiv", "MDBList On")
        : localize(settings.uiLanguage, "Synchronisierung aus", "Sync Off");
  return (
    <div className="sync-strip" aria-hidden={!busy}>
      <Cloud size={16} />
      <span>
        {busy ||
          (auth
            ? localize(settings.uiLanguage, "Cloud online", "Cloud online")
            : localize(settings.uiLanguage, "Cloud offline", "Cloud offline"))}
      </span>
      <span>{syncLabel}</span>
    </div>
  );
}
