"use client";

import { ArrowLeft, Info, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { IMDB_LOGO } from "@/lib/serviceLogos";
import { genreNamesFromIds, getCardMeta, getLogoUrl } from "@/lib/tmdb";
import { getImdbRating } from "@/lib/imdbRatings";
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
  DECADE: "Decades",
  FEATURED: "Featured",
};

function isCollectionCatalog(catalog: CatalogConfig) {
  return String(catalog.kind ?? "").toUpperCase() === "COLLECTION";
}

export function HomeScreen() {
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
  const homeCatalogEntries = useMemo(() => {
    const groups = new Map<string, CatalogConfig[]>();
    catalogConfigs.filter(isCollectionCatalog).forEach((catalog) => {
      const group = String(catalog.collectionGroup ?? "FEATURED").toUpperCase();
      groups.set(group, [...(groups.get(group) ?? []), catalog]);
    });
    const renderedGroups = new Set<string>();
    const entries: Array<
      | { type: "catalog"; catalog: CatalogConfig }
      | { type: "group"; group: string; catalogs: CatalogConfig[] }
    > = [];
    catalogConfigs.forEach((catalog) => {
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
    if (heroPool.length < 2) return undefined;
    let index = 0;
    if (!userInteractedHero.current) setHeroPreview(heroPool[0]);
    const timer = window.setInterval(() => {
      if (userInteractedHero.current) return;
      index = (index + 1) % heroPool.length;
      setHeroPreview(heroPool[index]);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [heroPool, setHeroPreview]);

  // Synchronize hero changes so all content (logo, text, metadata, backdrop) updates together.
  useEffect(() => {
    if (!hero) {
      setDisplayHero(null);
      setHeroLogo(null);
      return;
    }

    let active = true;

    // Fast path: if no hero is currently displayed, show it immediately so there is no blank screen on first load
    if (!displayHero) {
      setDisplayHero(hero);
      void getLogoUrl({ mediaType: hero.mediaType, id: hero.id })
        .then((url) => {
          if (active) setHeroLogo(url);
        })
        .catch(() => undefined);
      return;
    }

    // Normal path: fetch the logo in the background first, then swap all content together
    void getLogoUrl({ mediaType: hero.mediaType, id: hero.id })
      .then((url) => {
        if (!active) return;
        setHeroLogo(url);
        setDisplayHero(hero);
      })
      .catch(() => {
        if (!active) return;
        setHeroLogo(null);
        setDisplayHero(hero);
      });

    return () => {
      active = false;
    };
  }, [hero, displayHero]);

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
            backgroundImage: displayHero.backdrop
              ? `url(${displayHero.backdrop})`
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
                return desc.length > 150 ? desc.slice(0, 150) + "..." : desc;
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
        <section className="collection-browser">
          <button
            type="button"
            className="collection-back"
            onClick={() => setOpenCollection(null)}
          >
            <ArrowLeft size={20} />
            {localize(settings.uiLanguage, "Zurück", "Back")}
          </button>
          <LazyRail
            catalog={openCollection}
            eager
            onOpen={openDetails}
            onFocus={onCardFocus}
          />
        </section>
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
                  {entry.catalogs.map((catalog) => (
                    <button
                      type="button"
                      className="collection-tile"
                      key={catalog.id}
                      onClick={() => setOpenCollection(catalog)}
                    >
                      <span className="collection-art">
                        {catalog.collectionCoverImageUrl && (
                          <img
                            src={catalog.collectionCoverImageUrl}
                            alt=""
                            loading="lazy"
                          />
                        )}
                      </span>
                      {!catalog.collectionHideTitle && (
                        <strong>{catalog.title || catalog.name}</strong>
                      )}
                    </button>
                  ))}
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
