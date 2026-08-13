"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { MediaCard } from "@/components/media/MediaCard";
import type { MediaItem } from "@/lib/types";

type WatchlistSort = "added" | "rating" | "title";
type WatchlistFilter = "all" | "movie" | "tv";

// Built-in sources always available; custom Trakt lists are appended.
const BUILTIN_SOURCES = [
  { value: "watchlist", label: "Watchlist" },
  { value: "collection", label: "Collection" }
] as const;

export function WatchlistScreen() {
  const { watchlist, traktConnected, simklConnected, mdblistConnected, openDetails, settings, loadTraktLists, loadTraktListItems } = useApp();
  const [sort, setSort] = useState<WatchlistSort>("added");
  const [filter, setFilter] = useState<WatchlistFilter>("all");
  const [source, setSource] = useState("watchlist");
  const [customLists, setCustomLists] = useState<Array<{ id: string; name: string }>>([]);
  const [serverLibraries, setServerLibraries] = useState<Array<{ value: string; label: string }>>([]);
  const [sourceItems, setSourceItems] = useState<MediaItem[] | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const posterMode = settings.cardLayoutMode === "poster";
  const requestRef = useRef(0);
  const homeServers = settings.homeServers;

  // Populate the custom-list options once Trakt is connected.
  useEffect(() => {
    if (!traktConnected) return;
    let active = true;
    void loadTraktLists().then((lists) => { if (active) setCustomLists(lists); }).catch(() => undefined);
    return () => { active = false; };
  }, [traktConnected, loadTraktLists]);

  // Populate home-server library options.
  useEffect(() => {
    if (!homeServers?.some((s) => s.enabled && s.url)) {
      setServerLibraries([]);
      return;
    }
    let active = true;
    void (async () => {
      const { listHomeServerLibraries } = await import("@/lib/homeserver");
      const libs = await listHomeServerLibraries(homeServers).catch(() => []);
      if (active) setServerLibraries(libs);
    })();
    return () => { active = false; };
  }, [homeServers]);

  // "watchlist" uses the store's already-synced list; other sources are fetched
  // on demand and held in sourceItems.
  useEffect(() => {
    if (source === "watchlist") {
      setSourceItems(null);
      return;
    }
    const reqId = ++requestRef.current;
    setSourceLoading(true);
    const load = source.startsWith("hslib:")
      ? (async () => {
          const { loadHomeServerLibraryItems } = await import("@/lib/homeserver");
          return loadHomeServerLibraryItems(homeServers ?? [], source);
        })()
      : loadTraktListItems(source);
    void load
      .then((result) => { if (reqId === requestRef.current) setSourceItems(result); })
      .catch(() => { if (reqId === requestRef.current) setSourceItems([]); })
      .finally(() => { if (reqId === requestRef.current) setSourceLoading(false); });
  }, [source, loadTraktListItems, homeServers]);

  const activeList = source === "watchlist" ? watchlist : (sourceItems ?? []);

  const items = useMemo(() => {
    const filtered = filter === "all" ? activeList : activeList.filter((item) => item.mediaType === filter);
    return [...filtered].sort((a, b) => {
      if (sort === "rating") return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      if (sort === "title") return a.title.localeCompare(b.title);
      // "Recently added" — newest listed_at (added date) first, like Trakt.
      return (b.activityAt ?? 0) - (a.activityAt ?? 0);
    });
  }, [activeList, sort, filter]);

  return (
    <div className={`screen has-section-heading ${posterMode ? "poster-results" : ""}`}>
      <section className="section-heading watchlist-heading">
        <div>
          <p className="eyebrow">
            {traktConnected
              ? "Synced with your Trakt account"
              : simklConnected
                ? "Synced with your Simkl account"
                : mdblistConnected
                  ? "Synced with your MDBList account"
                  : "Connect Trakt, Simkl, or MDBList in Settings to sync"}
          </p>
          <h2>Watchlist</h2>
        </div>
        <div className="watchlist-toolbar">
          {(customLists.length > 0 || serverLibraries.length > 0 || source !== "watchlist") && (
            <select
              className="watchlist-source"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              aria-label="Choose list"
            >
              {traktConnected && BUILTIN_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              {!traktConnected && <option value="watchlist">Watchlist</option>}
              {customLists.length > 0 && (
                <optgroup label="Trakt lists">
                  {customLists.map((list) => <option key={list.id} value={`list:${list.id}`}>{list.name}</option>)}
                </optgroup>
              )}
              {serverLibraries.length > 0 && (
                <optgroup label="Home server">
                  {serverLibraries.map((lib) => <option key={lib.value} value={lib.value}>{lib.label}</option>)}
                </optgroup>
              )}
            </select>
          )}
          <div className="watchlist-pills" role="group" aria-label="Filter watchlist">
            {([["all", "All"], ["movie", "Movies"], ["tv", "Series"]] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`watchlist-pill ${filter === value ? "is-active" : ""}`}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            className="watchlist-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as WatchlistSort)}
            aria-label="Sort watchlist"
          >
            <option value="added">Recently added</option>
            <option value="rating">Highest rated</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </section>
      {sourceLoading && items.length === 0 ? (
        <div className="watchlist-empty">
          <p>Loading…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="watchlist-empty">
          <p>{source === "watchlist"
            ? `Nothing saved${filter === "all" ? " yet" : " in this category"}.`
            : `This list is empty${filter === "all" ? "" : " in this category"}.`}</p>
          {source === "watchlist" && <span>Add movies and series from their detail pages and they will show up here on every device.</span>}
        </div>
      ) : (
        <div className="grid-results">
          {items.map((item) => <MediaCard key={`${item.mediaType}-${item.id}`} item={item} onOpen={openDetails} posterMode={posterMode} />)}
        </div>
      )}
    </div>
  );
}
