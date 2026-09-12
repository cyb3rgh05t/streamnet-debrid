"use client";

import { ArrowLeft, Info, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { IMDB_LOGO } from "@/lib/serviceLogos";
import { genreNamesFromIds, getCardMeta, getLogoUrl } from "@/lib/tmdb";
import { getImdbRating } from "@/lib/imdbRatings";
import { loadGenreFanart } from "@/lib/genreFanart";
import { useApp } from "@/lib/store";
import { LazyRail } from "@/components/media/LazyRail";
import { MediaRail } from "@/components/media/MediaRail";
import type { CatalogConfig, Category, MediaItem } from "@/lib/types";
import { localize, t, translateUiText } from "@/lib/i18n";
import { RailScroller } from "@/components/media/RailScroller";

const collectionGroupTitles: Record<string, string> = {
  SERVICE: "Services",
  FRANCHISE: "Franchises",
  STUDIO: "Studios",
  NETWORK: "Networks",
  MOVIE_GENRE: "Movie Genres",
  TV_GENRE: "TV Genres",
  GENRE: "Genres",
};

const settingsOnlyCatalogIds = new Set([
  "recent_tv",
  "favorite_tv",
  "recently_watched_movies",
  "recently_watched_series",
]);

function isCollectionCatalog(catalog: CatalogConfig) {
  return String(catalog.kind ?? "").toUpperCase() === "COLLECTION";
}

function sourceSupportsMediaType(
  source: NonNullable<CatalogConfig["collectionSources"]>[number],
  mediaType: MediaItem["mediaType"],
) {
  const declared = String(source.mediaType ?? "")
    .trim()
    .toLowerCase();
  if (["all", "any", "both", "mixed"].includes(declared)) return true;
  if (declared) {
    return mediaType === "movie"
      ? declared === "movie" || declared === "film"
      : ["series", "tv", "show", "anime"].includes(declared);
  }
  return (
    mediaType === "movie" ||
    String(source.kind).toUpperCase() !== "TMDB_COLLECTION"
  );
}

function catalogForMediaType(
  catalog: CatalogConfig,
  mediaType: MediaItem["mediaType"],
): CatalogConfig {
  return {
    ...catalog,
    id: `${catalog.id}:${mediaType}`,
    mediaType,
    collectionSources: catalog.collectionSources
      ?.filter((source) => sourceSupportsMediaType(source, mediaType))
      .map((source) => {
        const declared = String(source.mediaType ?? "")
          .trim()
          .toLowerCase();
        return ["all", "any", "both", "mixed"].includes(declared)
          ? { ...source, mediaType }
          : source;
      }),
  };
}

function CollectionBrowser({
  catalog,
  onBack,
  onOpen,
  onHero,
}: {
  catalog: CatalogConfig;
  onBack: () => void;
  onOpen: (item: MediaItem) => void;
  onHero: (item: MediaItem) => void;
}) {
  const { settings } = useApp();
  const movieCatalog = useMemo(
    () => catalogForMediaType(catalog, "movie"),
    [catalog],
  );
  const seriesCatalog = useMemo(
    () => catalogForMediaType(catalog, "tv"),
    [catalog],
  );
  const supportsMovies = Boolean(movieCatalog.collectionSources?.length);
  const supportsSeries =
    String(catalog.collectionGroup ?? "").toUpperCase() === "NETWORK" ||
    Boolean(seriesCatalog.collectionSources?.length);
  const [mediaType, setMediaType] = useState<MediaItem["mediaType"]>(
    supportsMovies ? "movie" : "tv",
  );
  const activeCatalog = mediaType === "movie" ? movieCatalog : seriesCatalog;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [catalog.id]);

  return (
    <section className="collection-browser">
      <button type="button" className="collection-back" onClick={onBack}>
        <ArrowLeft size={20} />
        {localize(settings.uiLanguage, "Zurück", "Back")}
      </button>
      {supportsMovies && supportsSeries && (
        <div className="collection-tabs" role="tablist">
          <button
            type="button"
            className={mediaType === "movie" ? "is-active" : ""}
            onClick={() => setMediaType("movie")}
          >
            {localize(settings.uiLanguage, "Filme", "Movies")}
          </button>
          <button
            type="button"
            className={mediaType === "tv" ? "is-active" : ""}
            onClick={() => setMediaType("tv")}
          >
            {localize(settings.uiLanguage, "Serien", "Series")}
          </button>
        </div>
      )}
      <LazyRail
        key={activeCatalog.id}
        catalog={activeCatalog}
        eager
        mediaTypeFilter={mediaType}
        focusFirstItem
        onOpen={onOpen}
        onFocus={onHero}
        onLoaded={(row) => {
          const first = row.items[0];
          if (first) onHero(first);
        }}
      />
    </section>
  );
}

export function HomeScreen({ resetKey = 0 }: { resetKey?: number }) {
  const {
    hero,
    categories,
    catalogConfigs,
    homeServerRows,
    continueWatching,
    openDetails,
    setHeroPreview,
    settings,
  } = useApp();
  const posterMode = settings.cardLayoutMode === "poster";
  const [openCollection, setOpenCollection] = useState<CatalogConfig | null>(
    null,
  );

  useEffect(() => {
    setOpenCollection(null);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [resetKey]);
  const [genreFanart, setGenreFanart] = useState<Map<string, string>>(
    new Map(),
  );

  useEffect(() => {
    const needsMovieGenres = catalogConfigs.some(
      (catalog) =>
        String(catalog.collectionGroup).toUpperCase() === "MOVIE_GENRE",
    );
    const needsTvGenres = catalogConfigs.some(
      (catalog) => String(catalog.collectionGroup).toUpperCase() === "TV_GENRE",
    );
    if (!needsMovieGenres && !needsTvGenres) return;
    let active = true;
    void Promise.all([
      needsMovieGenres
        ? loadGenreFanart("movie", settings.language)
        : Promise.resolve(new Map<number, string>()),
      needsTvGenres
        ? loadGenreFanart("tv", settings.language)
        : Promise.resolve(new Map<number, string>()),
    ]).then(([movies, series]) => {
      if (!active) return;
      const next = new Map<string, string>();
      movies.forEach((url, id) => next.set(`MOVIE_GENRE:${id}`, url));
      series.forEach((url, id) => next.set(`TV_GENRE:${id}`, url));
      setGenreFanart(next);
    });
    return () => {
      active = false;
    };
  }, [catalogConfigs, settings.language]);
  const homeCatalogEntries = useMemo(() => {
    const visibleCatalogs = catalogConfigs.filter(
      (catalog) => !settingsOnlyCatalogIds.has(catalog.id),
    );
    const groups = new Map<string, CatalogConfig[]>();
    visibleCatalogs.filter(isCollectionCatalog).forEach((catalog) => {
      const group = String(catalog.collectionGroup ?? "FEATURED").toUpperCase();
      groups.set(group, [...(groups.get(group) ?? []), catalog]);
    });
    const renderedGroups = new Set<string>();
    const entries: Array<
      | { type: "catalog"; catalog: CatalogConfig }
      | { type: "group"; group: string; catalogs: CatalogConfig[] }
    > = [];
    visibleCatalogs.forEach((catalog) => {
      const kind = String(catalog.kind ?? "").toUpperCase();
      if (kind === "COLLECTION") return;
      if (kind === "COLLECTION_RAIL") {
        const group = String(
          catalog.collectionGroup ?? "FEATURED",
        ).toUpperCase();
        const catalogs = groups.get(group) ?? [];
        if (catalogs.length) {
          entries.push({ type: "group", group, catalogs });
          renderedGroups.add(group);
        }
        return;
      }
      entries.push({ type: "catalog", catalog });
    });
    groups.forEach((catalogs, group) => {
      if (!renderedGroups.has(group))
        entries.push({ type: "group", group, catalogs });
    });
    return entries;
  }, [catalogConfigs]);

  // The eager rails (trending/popular/provider lists) overlap heavily; keep each
  // title in the first rail it appears in and trim repeats from later rails,
  // unless doing so would hollow a rail out.
  const dedupedCategories = useMemo(() => {
    const seen = new Set<string>();
    return categories.map((category) => {
      const kept = category.items.filter(
        (item) => !seen.has(`${item.mediaType}-${item.id}`),
      );
      const items =
        kept.length >= Math.min(8, category.items.length)
          ? kept
          : category.items;
      items.forEach((item) => seen.add(`${item.mediaType}-${item.id}`));
      return items === category.items ? category : { ...category, items };
    });
  }, [categories]);
  const [heroLogo, setHeroLogo] = useState<string | null>(null);
  const [displayHero, setDisplayHero] = useState<MediaItem | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seededHero = useRef(false);
  const userInteractedHero = useRef(false);

  useEffect(
    () => () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    },
    [],
  );

  // Showcase titles for the rotating hero, collected from the first rails as
  // they load (trending rails arrive lazily, so we accumulate here).
  const [heroPoolRows, setHeroPoolRows] = useState<MediaItem[]>([]);

  const seedHeroFromRow = (row: Category) => {
    // Feed the first couple of catalog rows into the hero rotation pool.
    setHeroPoolRows((prev) => {
      if (prev.length >= 12) return prev;
      const seen = new Set(prev.map((i) => `${i.mediaType}-${i.id}`));
      const additions = row.items
        .filter(
          (item) => item.backdrop && !seen.has(`${item.mediaType}-${item.id}`),
        )
        .slice(0, 8);
      return additions.length ? [...prev, ...additions].slice(0, 12) : prev;
    });
    if (seededHero.current || continueWatching.length) return;
    const first = row.items[0];
    if (first) {
      seededHero.current = true;
      setHeroPreview(first);
    }
  };

  const heroPool = heroPoolRows;

  // Auto-advance the hero every 8s until the user hovers a card (which pins the
  // hero to whatever they're pointing at and stops the carousel).
  useEffect(() => {
    if (openCollection || heroPool.length < 2) return undefined;
    let index = 0;
    if (!userInteractedHero.current) setHeroPreview(heroPool[0]);
    const timer = window.setInterval(() => {
      if (userInteractedHero.current) return;
      index = (index + 1) % heroPool.length;
      setHeroPreview(heroPool[index]);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [heroPool, openCollection, setHeroPreview]);

  // Show the selected item immediately, then hydrate its logo and wide artwork
  // together so a delayed logo response cannot overwrite the fetched backdrop.
  useEffect(() => {
    if (!hero) {
      setDisplayHero(null);
      setHeroLogo(null);
      return undefined;
    }

    let active = true;
    setDisplayHero(hero);
    setHeroLogo(null);
    void Promise.all([
      getLogoUrl({ mediaType: hero.mediaType, id: hero.id }).catch(() => null),
      hero.id > 0 && !hero.isHomeServer
        ? getCardMeta({ mediaType: hero.mediaType, id: hero.id }).catch(
            () => null,
          )
        : Promise.resolve(null),
    ]).then(([logo, meta]) => {
      if (!active) return;
      setHeroLogo(logo);
      setDisplayHero({
        ...hero,
        backdrop: hero.backdrop || meta?.backdrop || null,
        image: hero.image || meta?.image || "",
        certification: hero.certification || meta?.certification || null,
      });
    });

    return () => {
      active = false;
    };
  }, [hero, settings.uiLanguage]);

  const onCardFocus = (item: MediaItem) => {
    userInteractedHero.current = true;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHeroPreview(item), 220);
  };

  const heroGenres = (
    displayHero?.genres?.length
      ? displayHero.genres
      : genreNamesFromIds(displayHero?.genreIds)
  ).slice(0, 3);

  // Real IMDb rating for the hero (Cinemeta by imdb id) — TMDB's vote_average
  // is a different score and must not sit under an IMDb badge. The imdb id
  // rides along on the cached per-card TMDB call.
  const [heroImdbRating, setHeroImdbRating] = useState<string | null>(null);
  useEffect(() => {
    setHeroImdbRating(null);
    if (!displayHero || displayHero.id <= 0 || displayHero.isHomeServer)
      return undefined;
    let active = true;
    void (async () => {
      const imdbId =
        displayHero.imdbId ??
        (
          await getCardMeta({
            mediaType: displayHero.mediaType,
            id: displayHero.id,
          }).catch(() => null)
        )?.imdbId;
      if (!active || !imdbId) return;
      const rating = await getImdbRating(displayHero.mediaType, imdbId).catch(
        () => null,
      );
      if (active && rating) setHeroImdbRating(rating);
    })();
    return () => {
      active = false;
    };
  }, [
    displayHero?.id,
    displayHero?.mediaType,
    displayHero?.imdbId,
    displayHero?.isHomeServer,
  ]);
  const metaBits = [
    displayHero?.mediaType === "tv"
      ? localize(settings.uiLanguage, "Serie", "Series")
      : localize(settings.uiLanguage, "Film", "Movie"),
    displayHero?.releaseDate?.slice(0, 4) || displayHero?.year || null,
    displayHero?.duration || null,
    settings.showCertification ? displayHero?.certification : null,
    ...heroGenres,
  ].filter(Boolean);

  return (
    // has-hero mirrors the CSS :has(.hero) padding rule for TV browsers whose
    // engines predate :has() support (Tizen/webOS).
    <div className={displayHero ? "screen has-hero" : "screen"}>
      {displayHero && (
        <section
          className="hero home-hero"
          style={{
            backgroundImage:
              displayHero.backdrop || displayHero.image
                ? `url(${displayHero.backdrop || displayHero.image})`
                : undefined,
          }}
        >
          <div className="hero-copy">
            <div className="hero-title">
              {heroLogo ? (
                <img
                  className="hero-logo"
                  src={heroLogo}
                  alt={displayHero.title}
                />
              ) : (
                <h2>{displayHero.title}</h2>
              )}
            </div>
            <div className="hero-meta">
              {heroImdbRating && (
                <span className="hero-imdb">
                  <img src={IMDB_LOGO} alt="IMDb" />
                  <b>{heroImdbRating}</b>
                </span>
              )}
              {metaBits.map((bit) => (
                <span key={String(bit)}>{bit}</span>
              ))}
            </div>
            <p>
              {(() => {
                const desc =
                  displayHero.overview ||
                  displayHero.subtitle ||
                  (settings.uiLanguage === "de"
                    ? "Setze deine StreamNet-Mediathek fort."
                    : "Continue from your StreamNet library.");
                return desc;
              })()}
            </p>
            <div className="hero-actions">
              <button
                type="button"
                className="primary"
                onClick={() => openDetails(displayHero)}
              >
                <Play size={20} fill="currentColor" />{" "}
                {t(settings.uiLanguage, "play")}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => openDetails(displayHero)}
              >
                <Info size={20} /> {t(settings.uiLanguage, "moreInfo")}
              </button>
            </div>
          </div>
        </section>
      )}
      {openCollection ? (
        <CollectionBrowser
          catalog={openCollection}
          onBack={() => setOpenCollection(null)}
          onOpen={openDetails}
          onHero={setHeroPreview}
        />
      ) : (
        <>
          {dedupedCategories.map((category) => (
            <MediaRail
              key={category.id}
              category={category}
              onOpen={openDetails}
              onFocus={onCardFocus}
              posterMode={posterMode}
            />
          ))}
          {homeServerRows.map((category) => (
            <MediaRail
              key={category.id}
              category={category}
              onOpen={openDetails}
              onFocus={onCardFocus}
              posterMode={posterMode}
            />
          ))}
          {homeCatalogEntries.map((entry, index) =>
            entry.type === "group" ? (
              <section
                className="rail collection-picker"
                key={`group-${entry.group}`}
              >
                <div className="rail-head">
                  <h3>
                    {translateUiText(
                      settings.uiLanguage,
                      collectionGroupTitles[entry.group] ?? entry.group,
                    )}
                  </h3>
                </div>
                <RailScroller
                  className="rail-strip collection-strip"
                  ariaLabel={entry.group}
                >
                  {entry.catalogs.map((catalog) => {
                    const isGenreTile = ["MOVIE_GENRE", "TV_GENRE"].includes(
                      entry.group,
                    );
                    const title = catalog.title || catalog.name;
                    return (
                      <button
                        type="button"
                        className={`collection-tile ${isGenreTile ? "is-genre" : ""}`}
                        key={catalog.id}
                        onClick={() => setOpenCollection(catalog)}
                      >
                        <span className="collection-art">
                          {(() => {
                            const genreId = catalog.collectionSources?.find(
                              (source) => source.tmdbGenreId,
                            )?.tmdbGenreId;
                            const artwork =
                              (genreId
                                ? genreFanart.get(`${entry.group}:${genreId}`)
                                : null) ?? catalog.collectionCoverImageUrl;
                            return artwork ? (
                              <img src={artwork} alt="" loading="lazy" />
                            ) : null;
                          })()}
                          {isGenreTile && !catalog.collectionHideTitle && (
                            <strong className="collection-genre-title">
                              {translateUiText(settings.uiLanguage, title)}
                            </strong>
                          )}
                        </span>
                        {!isGenreTile && !catalog.collectionHideTitle && (
                          <strong>{title}</strong>
                        )}
                      </button>
                    );
                  })}
                </RailScroller>
              </section>
            ) : (
              <LazyRail
                key={entry.catalog.id}
                catalog={entry.catalog}
                eager={index < 2}
                onOpen={openDetails}
                onFocus={onCardFocus}
                onLoaded={seedHeroFromRow}
              />
            ),
          )}
        </>
      )}
    </div>
  );
}
