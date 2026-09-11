"use client";

import { LoaderCircle, Search } from "lucide-react";
import { useApp } from "@/lib/store";
import { localize } from "@/lib/i18n";
import { MediaCard } from "@/components/media/MediaCard";

export function SearchScreen() {
  const { query, setQuery, results, openDetails, settings, searchState } =
    useApp();
  const posterMode = settings.cardLayoutMode === "poster";
  return (
    // has-search-hero mirrors the CSS :has(.search-hero) rules for TV
    // browsers whose engines predate :has() support (Tizen/webOS).
    <div
      className={`screen has-search-hero ${posterMode ? "poster-results" : ""}`}
    >
      <section className="search-hero">
        <span className="search-icon-shell">
          <Search size={28} />
        </span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
          placeholder={localize(
            settings.uiLanguage,
            "Filme und Serien suchen",
            "Search movies and series",
          )}
          aria-label={localize(
            settings.uiLanguage,
            "Filme und Serien suchen",
            "Search movies and series",
          )}
        />
      </section>
      {searchState === "loading" && (
        <div className="search-status" role="status">
          <LoaderCircle size={20} />{" "}
          {localize(settings.uiLanguage, "Suche läuft", "Searching")}
        </div>
      )}
      {searchState === "error" && (
        <div className="library-error" role="alert">
          {localize(
            settings.uiLanguage,
            "Die Suche ist vorübergehend nicht verfügbar. Bitte versuche es erneut.",
            "Search is temporarily unavailable. Please try again.",
          )}
        </div>
      )}
      {query.trim() && searchState === "idle" && !results.length && (
        <div className="watchlist-empty">
          <Search size={34} />
          <p>
            {localize(
              settings.uiLanguage,
              "Keine passenden Titel",
              "No matching titles",
            )}
          </p>
        </div>
      )}
      <div className="grid-results">
        {results.map((item) => (
          <MediaCard
            key={`${item.mediaType}-${item.id}`}
            item={item}
            onOpen={openDetails}
            posterMode={posterMode}
          />
        ))}
      </div>
    </div>
  );
}
