"use client";

import {
  Bookmark,
  CheckCheck,
  Clock,
  ListVideo,
  LoaderCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MediaCard } from "@/components/media/MediaCard";
import { useApp } from "@/lib/store";
import type { MediaItem } from "@/lib/types";
import {
  LIBRARY_SORT_OPTIONS,
  compareLibraryItems,
  type LibrarySort,
} from "@/lib/librarySort";
import { localize, translateUiText } from "@/lib/i18n";

const builtins = {
  trakt: [
    { id: "watchlist", name: "Watchlist" },
    { id: "collection", name: "Collection" },
    { id: "watched", name: "Watched" },
  ],
  simkl: [
    { id: "plantowatch", name: "Plan to Watch" },
    { id: "watching", name: "Watching" },
    { id: "completed", name: "Completed" },
    { id: "hold", name: "On Hold" },
    { id: "dropped", name: "Dropped" },
  ],
};
const cache = new Map<string, MediaItem[]>();

export function TrackerLibrary({ provider }: { provider: "trakt" | "simkl" }) {
  const {
    auth,
    activeProfile,
    loadTrackerLibrary,
    loadTraktLists,
    settings,
    openDetails,
  } = useApp();
  const [lists, setLists] = useState(builtins[provider]);
  const [source, setSource] = useState(builtins[provider][0].id);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<LibrarySort>("added");
  const [count, setCount] = useState(60);
  const generation = useRef(0);
  const scope = `${auth?.userId ?? "local"}:${activeProfile?.id}:${provider}`;
  useEffect(() => {
    let active = true;
    setLists(builtins[provider]);
    setListError("");
    if (provider === "trakt")
      void loadTraktLists()
        .then((rows) => {
          if (active)
            setLists([
              ...builtins.trakt,
              ...rows.map((list) => ({ ...list, id: `list:${list.id}` })),
            ]);
        })
        .catch(() => {
          if (active)
            setListError(
              localize(
                settings.uiLanguage,
                "Eigene Listen konnten nicht geladen werden.",
                "Custom lists could not be loaded.",
              ),
            );
        });
    return () => {
      active = false;
    };
  }, [loadTraktLists, provider, scope, retry]);
  useEffect(() => {
    const id = ++generation.current;
    const key = `${scope}:${source}`;
    setItems(cache.get(key) ?? []);
    setLoading(true);
    setError("");
    setCount(60);
    void loadTrackerLibrary(provider, source)
      .then((rows) => {
        if (generation.current !== id) return;
        if (cache.size > 30) cache.delete(cache.keys().next().value!);
        cache.set(key, rows);
        setItems(rows);
      })
      .catch((reason) => {
        if (generation.current === id)
          setError(
            reason instanceof Error
              ? reason.message
              : localize(
                  settings.uiLanguage,
                  "Die Mediathek ist vorübergehend nicht verfügbar.",
                  "Library temporarily unavailable.",
                ),
          );
      })
      .finally(() => {
        if (generation.current === id) setLoading(false);
      });
    return () => {
      generation.current++;
    };
  }, [scope, source, provider, retry, loadTrackerLibrary]);
  const visible = useMemo(
    () =>
      [...items]
        .filter((item) =>
          item.title.toLowerCase().includes(query.toLowerCase()),
        )
        .sort((a, b) => compareLibraryItems(a, b, sort)),
    [items, query, sort],
  );
  const selected = translateUiText(
    settings.uiLanguage,
    lists.find((list) => list.id === source)?.name ?? "Library",
  );
  return (
    <div className="library-workspace has-library-sidebar tracker-workspace">
      <aside
        className="library-sidebar"
        aria-label={`${provider} ${localize(settings.uiLanguage, "Listen", "lists")}`}
      >
        <strong className="library-sidebar-server">
          {provider === "trakt" ? "Trakt" : "Simkl"}
        </strong>
        <span className="library-sidebar-label">
          {translateUiText(settings.uiLanguage, "Libraries")}
        </span>
        <div
          role="tablist"
          aria-label={localize(
            settings.uiLanguage,
            "Tracker-Mediathek",
            "Tracker library",
          )}
        >
          {lists.map((list) => (
            <button
              role="tab"
              aria-selected={source === list.id}
              className={source === list.id ? "is-active" : ""}
              key={list.id}
              onClick={() => setSource(list.id)}
            >
              {list.id === "watching" ? (
                <Clock size={17} />
              ) : list.id === "completed" || list.id === "watched" ? (
                <CheckCheck size={17} />
              ) : (
                <ListVideo size={17} />
              )}
              <span>{translateUiText(settings.uiLanguage, list.name)}</span>
            </button>
          ))}
        </div>
        {listError && (
          <button
            className="secondary"
            onClick={() => setRetry((value) => value + 1)}
          >
            {localize(
              settings.uiLanguage,
              "Listen erneut laden",
              "Retry lists",
            )}
          </button>
        )}
      </aside>
      <section className="library-main" aria-label={selected}>
        <label className="library-mobile-select">
          <ListVideo size={17} />
          <select
            aria-label={localize(
              settings.uiLanguage,
              "Tracker-Mediathek",
              "Tracker library",
            )}
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {translateUiText(settings.uiLanguage, list.name)}
              </option>
            ))}
          </select>
        </label>
        <div className="library-toolbar">
          <div className="tracker-library-title">
            <strong>{selected}</strong>
            <span>
              {visible.length.toLocaleString()}{" "}
              {localize(settings.uiLanguage, "Titel", "titles")}
            </span>
          </div>
          <label className="library-search">
            <Search size={17} />
            <input
              aria-label={localize(
                settings.uiLanguage,
                "Mediathek durchsuchen",
                "Search library",
              )}
              placeholder={localize(
                settings.uiLanguage,
                "Mediathek durchsuchen",
                "Search library",
              )}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCount(60);
              }}
            />
          </label>
          <select
            className="watchlist-sort"
            aria-label={localize(
              settings.uiLanguage,
              "Titel sortieren",
              "Sort titles",
            )}
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as LibrarySort);
              setCount(60);
            }}
          >
            {LIBRARY_SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {translateUiText(settings.uiLanguage, label)}
              </option>
            ))}
          </select>
          <button
            className="library-refresh"
            aria-label={localize(
              settings.uiLanguage,
              "Mediathek aktualisieren",
              "Refresh library",
            )}
            title={localize(
              settings.uiLanguage,
              "Mediathek aktualisieren",
              "Refresh library",
            )}
            disabled={loading}
            onClick={() => setRetry((value) => value + 1)}
          >
            <RefreshCw size={17} />
          </button>
        </div>
        {error && (
          <div className="library-error" role="alert">
            <span>{error}</span>
            <button
              className="secondary"
              onClick={() => setRetry((value) => value + 1)}
            >
              {translateUiText(settings.uiLanguage, "Retry")}
            </button>
          </div>
        )}
        {loading && !items.length ? (
          <div
            className="library-loading"
            aria-label={localize(
              settings.uiLanguage,
              "Mediathek wird geladen",
              "Loading library",
            )}
          >
            <LoaderCircle size={30} />
          </div>
        ) : !visible.length && !error ? (
          <div className="watchlist-empty">
            <Bookmark size={36} />
            <p>
              {translateUiText(
                settings.uiLanguage,
                query ? "No matching titles" : "Nothing here yet",
              )}
            </p>
          </div>
        ) : (
          <div className="grid-results library-grid">
            {visible.slice(0, count).map((item) => (
              <MediaCard
                key={`${item.mediaType}:${item.id}`}
                item={item}
                onOpen={openDetails}
                posterMode={settings.cardLayoutMode === "poster"}
              />
            ))}
          </div>
        )}
        {loading && items.length > 0 && (
          <div
            className="library-refreshing-indicator"
            aria-label={localize(
              settings.uiLanguage,
              "Mediathek wird aktualisiert",
              "Refreshing library",
            )}
          >
            <LoaderCircle size={22} />
          </div>
        )}
        {visible.length > count && (
          <button
            className="secondary library-more"
            onClick={() => setCount((value) => value + 60)}
          >
            {translateUiText(settings.uiLanguage, "Load more")}
          </button>
        )}
      </section>
    </div>
  );
}
