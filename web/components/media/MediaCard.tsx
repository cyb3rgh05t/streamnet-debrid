"use client";

import { BadgeCheck, Clapperboard } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { accentColor } from "@/lib/accent";
import {
  continueWatchingProgressPercent,
  shouldShowContinueWatchingProgress,
} from "@/lib/continueWatching";
import { useApp } from "@/lib/store";
import { getLogoUrl, prefetchDetails, resolveTmdbId } from "@/lib/tmdb";
import type { MediaItem } from "@/lib/types";
import { localize, type UiLanguage } from "@/lib/i18n";

function formatReleaseDate(
  raw: string | null | undefined,
  language: UiLanguage,
): string {
  if (!raw) return "";
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 4);
  try {
    return new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return raw;
  }
}

function formatRuntime(
  minutesRaw: string | number | null | undefined,
  language: UiLanguage,
): string {
  const minutes =
    typeof minutesRaw === "string"
      ? Number(minutesRaw.replace(/\D/g, ""))
      : minutesRaw;
  if (!minutes || !Number.isFinite(minutes)) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hour = localize(language, "Std.", "h");
  const minute = localize(language, "Min.", "m");
  return h > 0
    ? m > 0
      ? `${h} ${hour} ${m} ${minute}`
      : `${h} ${hour}`
    : `${m} ${minute}`;
}

function formatTimeRemaining(minutesRaw: number, language: UiLanguage): string {
  const minutes = Math.max(1, Math.ceil(minutesRaw));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const duration = [
    hours > 0 ? localize(language, `${hours} Std.`, `${hours} hr`) : "",
    remainingMinutes > 0
      ? localize(
          language,
          `${remainingMinutes} Min.`,
          `${remainingMinutes} min`,
        )
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  return localize(language, `${duration} verbleibend`, `${duration} left`);
}

// "S1 · E9 · Whisper" for a Continue Watching / Up Next card. Only shown when
// the item carries episode info (CW rails populate season/episode/title).
function formatEpisodeLine(item: MediaItem): string {
  if (item.mediaType !== "tv" || !item.seasonNumber || !item.episodeNumber)
    return "";
  const code = `S${item.seasonNumber} · E${item.episodeNumber}`;
  const title = item.episodeTitle?.trim();
  return title ? `${code} · ${title}` : code;
}

function MediaCardBase({
  item,
  onOpen,
  onFocus,
  posterMode,
  autoFocus = false,
}: {
  item: MediaItem;
  onOpen: (item: MediaItem) => void;
  onFocus?: (item: MediaItem) => void;
  posterMode?: boolean;
  autoFocus?: boolean;
}) {
  const { settings, isWatched, openContextMenu } = useApp();
  const effectivePosterMode =
    posterMode ?? settings.cardLayoutMode === "poster";
  const [loadedArtwork, setLoadedArtwork] = useState("");
  const [failedArtwork, setFailedArtwork] = useState("");
  const hasPlaybackTiming =
    Number.isFinite(item.resumePositionSeconds) &&
    Number.isFinite(item.durationSeconds) &&
    (item.durationSeconds ?? 0) > 0;
  const progress = continueWatchingProgressPercent(
    item.resumePositionSeconds ?? 0,
    item.durationSeconds ?? 0,
    (item.progress ?? 0) / 100,
  );
  const storedWatched = isWatched(item);
  // "Up next" rows carry SERIES completion (how far through the show you are),
  // not progress into the episode on the card — a 40% bar under "Up next S2 E5"
  // reads as "you're 40% into that episode", which is wrong. Those rows get the
  // "Up next" chip instead; the bar stays for genuinely resumable items.
  const isUpNext = item.timeRemainingLabel === "Up next";
  const showProgress = shouldShowContinueWatchingProgress(progress, isUpNext);
  const isContinueWatchingCard =
    isUpNext || showProgress || Boolean(item.timeRemainingLabel);
  const watched = storedWatched && !isContinueWatchingCard;
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickUntil = useRef(0);
  // CW/up-next items from Trakt arrive with no artwork, and a hydration that hit
  // a network/429 error leaves image+backdrop empty — the card renders grey while
  // the (separately cached) logo shows. Back-fill artwork lazily from TMDB.
  const [fallbackArt, setFallbackArt] = useState<{
    image: string;
    backdrop: string | null;
  } | null>(null);
  const image = item.image || fallbackArt?.image || "";
  const backdrop = item.backdrop || fallbackArt?.backdrop || "";
  const episodeArtwork = isContinueWatchingCard ? item.episodeStill || "" : "";
  const artwork = effectivePosterMode
    ? image || backdrop
    : item.mediaType === "tv" && isContinueWatchingCard
      ? backdrop || episodeArtwork || image
      : episodeArtwork || backdrop || image;
  const imgLoaded = Boolean(artwork && loadedArtwork === artwork);
  const imgFailed = Boolean(artwork && failedArtwork === artwork);
  const year =
    item.releaseDate?.slice(0, 4) ||
    item.year ||
    (item.mediaType === "tv"
      ? localize(settings.uiLanguage, "Serie", "Series")
      : localize(settings.uiLanguage, "Film", "Movie"));
  const directMetadataId =
    item.tmdbId && item.tmdbId > 0
      ? item.tmdbId
      : !item.isHomeServer && item.id > 0
        ? item.id
        : null;
  const [metadataId, setMetadataId] = useState<number | null>(directMetadataId);
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    if (autoFocus) buttonRef.current?.focus({ preventScroll: true });
  }, [autoFocus, item.id, item.mediaType]);

  useEffect(() => {
    let active = true;
    setMetadataId(directMetadataId);
    if (directMetadataId || !item.isHomeServer)
      return () => {
        active = false;
      };
    void resolveTmdbId(item).then((id) => {
      if (active) setMetadataId(id);
    });
    return () => {
      active = false;
    };
  }, [
    directMetadataId,
    item.homeServerId,
    item.homeServerItemId,
    item.imdbId,
    item.isHomeServer,
    item.mediaType,
  ]);

  useEffect(() => {
    let active = true;
    setLogo(null);
    if (!metadataId)
      return () => {
        active = false;
      };

    void getLogoUrl({ mediaType: item.mediaType, id: metadataId }).then(
      (url) => {
        if (active) setLogo(url);
      },
    );
    return () => {
      active = false;
    };
  }, [item.mediaType, metadataId]);

  useEffect(
    () => () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    },
    [],
  );

  const triggerContextMenu = (posX?: number, posY?: number) => {
    openContextMenu({
      item,
      isContinueWatching: isContinueWatchingCard,
      position:
        posX !== undefined && posY !== undefined ? { x: posX, y: posY } : null,
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerContextMenu(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    const touch = e.touches[0];
    const posX = touch?.clientX ?? 0;
    const posY = touch?.clientY ?? 0;
    longPressTimer.current = setTimeout(() => {
      suppressClickUntil.current = Date.now() + 750;
      triggerContextMenu(posX, posY);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (Date.now() < suppressClickUntil.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onOpen(item);
  };

  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      prefetchDetails(item);
      onFocus?.(item);
    }, 120);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  const mappedSubtitle =
    item.subtitle === "TV Series"
      ? localize(settings.uiLanguage, "Fernsehserie", "TV Series")
      : item.subtitle === "Movie"
        ? localize(settings.uiLanguage, "Film", "Movie")
        : item.subtitle === "Untitled"
          ? localize(settings.uiLanguage, "Ohne Titel", "Untitled")
          : item.subtitle;
  const dateLabel =
    formatReleaseDate(item.releaseDate, settings.uiLanguage) ||
    mappedSubtitle ||
    year;
  const timedRemainingMinutes = hasPlaybackTiming
    ? Math.max(
        0,
        ((item.durationSeconds ?? 0) - (item.resumePositionSeconds ?? 0)) / 60,
      )
    : 0;
  const timeRemainingLabel = isUpNext
    ? localize(settings.uiLanguage, "Als Nächstes", "Up next")
    : timedRemainingMinutes > 0
      ? formatTimeRemaining(timedRemainingMinutes, settings.uiLanguage)
      : item.timeRemainingLabel?.replace(/^(\d+)m left$/, (_, minutes) =>
          formatTimeRemaining(Number(minutes), settings.uiLanguage),
        );
  const runtimeLabel = formatRuntime(item.duration, settings.uiLanguage);
  const episodeLine = formatEpisodeLine(item);

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`media-card ${effectivePosterMode ? "is-poster" : ""}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={() => {
        prefetchDetails(item);
        onFocus?.(item);
      }}
    >
      <div
        className={`poster ${artwork && !imgLoaded && !imgFailed ? "is-loading" : ""}`}
      >
        {artwork && !imgFailed ? (
          <img
            key={artwork}
            src={artwork}
            alt=""
            loading="lazy"
            decoding="async"
            onLoad={() => setLoadedArtwork(artwork)}
            onError={() => setFailedArtwork(artwork)}
            className={`poster-art ${imgLoaded ? "is-loaded" : ""}`}
          />
        ) : (
          <Clapperboard size={42} />
        )}
        {logo && !effectivePosterMode && (
          <img
            className="card-logo"
            src={logo}
            alt=""
            loading="lazy"
            decoding="async"
          />
        )}
        {watched && (
          <span
            className="watched-badge"
            aria-label={localize(settings.uiLanguage, "Gesehen", "Watched")}
          >
            <BadgeCheck size={13} />
          </span>
        )}
        {timeRemainingLabel && (
          <span className="cw-badge top-right">{timeRemainingLabel}</span>
        )}
        {showProgress && (
          <span className="cw-progress">
            <span
              style={{
                width: `${progress}%`,
                backgroundColor: accentColor(settings.accentColor),
              }}
            />
          </span>
        )}
      </div>
      <strong>{item.title}</strong>
      {episodeLine ? (
        <div className="card-episode-line">
          {isUpNext && (
            <span className="card-upnext">
              {localize(settings.uiLanguage, "Als Nächstes", "Up next")}
            </span>
          )}
          <span className="card-episode">{episodeLine}</span>
        </div>
      ) : (
        <div className="card-meta-row">
          <span className="card-date">{dateLabel}</span>
          {runtimeLabel && <span className="card-runtime">{runtimeLabel}</span>}
        </div>
      )}
    </button>
  );
}

// Rails mount hundreds of cards; without memoization every parent re-render
// (hero rotation, hover, etc.) re-renders all of them, which is the main cause
// of vertical-scroll jank. Re-render only when the item or display mode change.
export const MediaCard = memo(
  MediaCardBase,
  (prev, next) =>
    prev.item === next.item &&
    prev.posterMode === next.posterMode &&
    prev.autoFocus === next.autoFocus &&
    prev.onOpen === next.onOpen &&
    prev.onFocus === next.onFocus,
);
