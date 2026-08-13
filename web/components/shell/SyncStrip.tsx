"use client";

import { Cloud } from "lucide-react";
import { useApp } from "@/lib/store";

export function SyncStrip() {
  const { busy, auth, traktConnected, simklConnected, mdblistConnected } = useApp();
  const syncLabel = traktConnected ? "Trakt On" : simklConnected ? "Simkl On" : mdblistConnected ? "MDBList On" : "Sync Off";
  return (
    <div className="sync-strip" aria-hidden={!busy}>
      <Cloud size={16} />
      <span>{busy || (auth ? "Cloud online" : "Cloud offline")}</span>
      <span>{syncLabel}</span>
    </div>
  );
}
