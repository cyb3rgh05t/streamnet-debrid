"use client";

import {
  ArrowDown,
  ArrowUp,
  PanelLeft,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  History,
  LayoutGrid,
  List,
  ListVideo,
  Play,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trophy,
  Tv,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { externalLaunchMode, openExternalPlayer } from "@/lib/externalPlayers";
import {
  accessibleChannels,
  groupKey,
  loadXtreamCatchup,
  type CatchupProgram,
} from "@/lib/iptv";
import { config } from "@/lib/config";
import { buildStreamNetTvPlaylist } from "@/lib/streamnetTv";
import { formatTime24Hour } from "@/lib/dateTime";
import { VirtualList } from "@/components/ui/VirtualList";
import { SportsGuidePane } from "@/components/livetv/SportsGuidePane";
import { ChannelLogo } from "@/components/livetv/ChannelLogo";
import {
  channelIdentityIndex,
  normalizeTvSession,
  resolveChannelReferences,
} from "@/lib/iptvSession";
import { IPTV_SNAPSHOT_TTL_MS, iptvPlaylistSignature } from "@/lib/iptv";
import { loadStored, saveStored } from "@/lib/storage";
import { useApp } from "@/lib/store";
import { localize } from "@/lib/i18n";
import type { IptvChannel, IptvProgram, IptvSnapshot } from "@/lib/types";

const LAST_CHANNEL_KEY = "arvio.web.livetv.lastChannel";
const GUIDE_BATCH_DELAY_MS = 500;
const GUIDE_WINDOW_HOURS = 12;
const GUIDE_PX_PER_MIN = 6;
const rowKey = (item: { id: string }) => item.id;

function fmtTime(ms: number): string {
  try {
    return formatTime24Hour(ms);
  } catch {
    return "";
  }
}

function groupLabel(group: string, language: "de" | "en") {
  return (
    group.trim() || localize(language, "Nicht kategorisiert", "Uncategorized")
  );
}

export function LiveTvScreen() {
  const {
    iptvSnapshot,
    settings,
    setSettings,
    playChannel,
    recordChannelPlayback,
    playCatchup,
    setToast,
    refreshIptv,
    loadIptvGuide,
    busy,
    auth,
    activeProfile,
    activeChannel,
    addons,
  } = useApp();
  const lastChannelKey = `${LAST_CHANNEL_KEY}:${auth?.userId ?? "local"}:${activeProfile?.id ?? "local"}`;
  const listRef = useRef<HTMLElement>(null);
  const pointerNavigation = useRef(false);

  // Open a channel straight in VLC/Infuse from the detail panel — the reliable
  // path for the many IPTV providers whose plain-HTTP streams a secure web page
  // can't play, without first waiting for the in-browser attempt to fail.
  const openChannelExternally = useCallback(
    (channel: IptvChannel, player: "vlc" | "infuse") => {
      setToast(
        player === "infuse"
          ? localize(
              settings.uiLanguage,
              "Wird in Infuse geöffnet ...",
              "Opening in Infuse...",
            )
          : externalLaunchMode("vlc") === "playlist"
            ? localize(
                settings.uiLanguage,
                "VLC-Wiedergabeliste gespeichert. Öffne sie zur Wiedergabe in deinen Downloads.",
                "VLC playlist saved — open it from your downloads to play.",
              )
            : localize(
                settings.uiLanguage,
                "Wird in VLC geöffnet ...",
                "Opening in VLC...",
              ),
      );
      openExternalPlayer(
        player,
        {
          source: channel.name,
          addonName: "Live TV",
          quality: "Live",
          size: "",
          url: channel.streamUrl,
          description: channel.group,
        },
        channel.name,
        settings.defaultSubtitle,
      );
      recordChannelPlayback(channel);
    },
    [setToast, settings.defaultSubtitle, recordChannelPlayback],
  );

  const playlists = settings.iptvPlaylists;
  const favorites = settings.favoriteChannelIds;
  const favoriteGroups = settings.favoriteGroupIds;
  const hiddenGroups = settings.hiddenGroupIds;

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [epgUrl, setEpgUrl] = useState("");
  const [streamNetUser, setStreamNetUser] = useState("");
  const [streamNetPassword, setStreamNetPassword] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  // Re-open Live TV where the user left off (requested: "start at the last
  // channel you left"). Persisted per device; falls back to the first channel
  // when that channel is gone from the current playlists.
  // Restore local state in the effect below, after server/client markup agrees.
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    null,
  );
  const [managing, setManaging] = useState(false);
  const [view, setView] = useState<"list" | "guide">("guide");
  const [groupsOpen, setGroupsOpen] = useState(true);
  const [provider, setProvider] = useState("all");
  const [catchup, setCatchup] = useState<{
    channelId: string;
    programs: CatchupProgram[];
    loading: boolean;
  } | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const tvSession = useMemo(
    () => normalizeTvSession(settings.iptvTvSession),
    [settings.iptvTvSession],
  );

  const allChannels = iptvSnapshot.allChannels ?? iptvSnapshot.channels;
  const providerChannels = useMemo(
    () =>
      provider === "all"
        ? allChannels
        : allChannels.filter((ch) => ch.id.startsWith(`${provider}:`)),
    [allChannels, provider],
  );
  const channels = useMemo(
    () =>
      accessibleChannels(providerChannels, [
        ...hiddenGroups,
        ...(settings.lockedIptvGroupIds ?? []),
      ]),
    [providerChannels, hiddenGroups, settings.lockedIptvGroupIds],
  );
  const groups = useMemo(() => {
    const result: Record<string, IptvChannel[]> = {};
    for (const channel of channels)
      (result[groupKey(channel)] ??= []).push(channel);
    return result;
  }, [channels]);
  const channelById = useMemo(() => channelIdentityIndex(channels), [channels]);
  const enabledPlaylists = useMemo(
    () =>
      playlists.filter(
        (playlist) => playlist.enabled && playlist.m3uUrl.trim(),
      ),
    [playlists],
  );
  useEffect(() => {
    if (
      provider !== "all" &&
      !enabledPlaylists.some((playlist) => playlist.id === provider)
    )
      setProvider("all");
  }, [enabledPlaylists, provider]);
  const favoriteChannels = useMemo(
    () => resolveChannelReferences(favorites, channelById),
    [favorites, channelById],
  );
  const favoriteIds = useMemo(
    () => new Set(favoriteChannels.map((channel) => channel.id)),
    [favoriteChannels],
  );
  const recentChannels = useMemo(
    () =>
      resolveChannelReferences(
        [...tvSession.recentChannelIds].reverse(),
        channelById,
      ),
    [tvSession, channelById],
  );
  const isLoadingTv = Boolean(
    busy &&
    (busy.toLowerCase().includes("syncing") ||
      busy.toLowerCase().includes("loading tv")),
  );
  const hasWarnings = Boolean(iptvSnapshot.playlistWarnings?.length);
  const resolvingSavedChannels =
    !iptvSnapshot.identitiesLoaded &&
    Boolean(allChannels.length) &&
    (favorites.length > favoriteChannels.length ||
      tvSession.recentChannelIds.length > recentChannels.length);
  // Same helper the store stamps onto the snapshot, so both sides agree on when
  // a cached channel list still matches the configured playlists.
  const playlistSignature = iptvPlaylistSignature(playlists);

  // Re-entering Live TV used to rebuild the whole snapshot every time — with a
  // large provider that is ~139k channels re-parsed and re-grouped on each
  // visit, measured at ~3.3s with ZERO network calls (the playlist text itself
  // is already cached). Reuse the snapshot that is still in memory and only
  // rebuild when the playlists actually changed, or when it has gone stale.
  useEffect(() => {
    if (!playlists.length) return;
    const snapshotMatchesPlaylists =
      iptvSnapshot.channels.length > 0 &&
      iptvSnapshot.signature === playlistSignature;
    const age = Date.now() - (iptvSnapshot.loadedAt ?? 0);
    if (snapshotMatchesPlaylists && age < IPTV_SNAPSHOT_TTL_MS) return;
    void refreshIptv();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistSignature, refreshIptv, playlists.length]);

  const categories = useMemo(() => {
    const orderMap = new Map(
      settings.groupOrder.map((id, index) => [id, index]),
    );
    const groupRank = (group: string, items: IptvChannel[]) => {
      const keyed = items[0] ? groupKey(items[0]) : group;
      return (
        orderMap.get(keyed) ?? orderMap.get(group) ?? Number.MAX_SAFE_INTEGER
      );
    };
    const sortMode = settings.iptvSortOrder ?? "provider";
    const groupRows = Object.entries(groups)
      .map(([group, items]) => ({
        id: `group:${group}`,
        label: groupLabel(items[0]?.group ?? group, settings.uiLanguage),
        count: items.length,
        favorite:
          favoriteGroups.includes(group) ||
          Boolean(items[0] && favoriteGroups.includes(groupKey(items[0]))),
        hidden:
          hiddenGroups.includes(group) ||
          Boolean(items[0] && hiddenGroups.includes(groupKey(items[0]))),
        rank: groupRank(group, items),
      }))
      .filter((group) => !group.hidden)
      .sort((a, b) => {
        if (Number(b.favorite) !== Number(a.favorite))
          return Number(b.favorite) - Number(a.favorite);
        if (a.rank !== b.rank) return a.rank - b.rank;
        if (sortMode === "name") return a.label.localeCompare(b.label);
        if (sortMode === "number")
          return b.count - a.count || a.label.localeCompare(b.label);
        return 0;
      });
    return [
      {
        id: "favorites",
        label: localize(settings.uiLanguage, "Favoriten", "Favorites"),
        count: favoriteChannels.length,
        favorite: true,
        hidden: false,
      },
      {
        id: "recent",
        label: localize(
          settings.uiLanguage,
          "Zuletzt angesehen",
          "Recently Watched",
        ),
        count: recentChannels.length,
        favorite: false,
        hidden: false,
      },
      {
        id: "all",
        label: localize(settings.uiLanguage, "Alle Sender", "All Channels"),
        count: channels.length,
        favorite: false,
        hidden: false,
      },
      {
        id: "sports",
        label: localize(settings.uiLanguage, "Sport", "Sports"),
        count: 0,
        favorite: false,
        hidden: false,
      },
      ...groupRows,
    ];
  }, [
    channels.length,
    favoriteChannels.length,
    recentChannels.length,
    favoriteGroups,
    groups,
    hiddenGroups,
    settings.groupOrder,
    settings.iptvSortOrder,
    settings.uiLanguage,
  ]);

  const visibleChannels = useMemo(() => {
    const base =
      activeCategory === "favorites"
        ? favoriteChannels
        : activeCategory === "recent"
          ? recentChannels
          : activeCategory.startsWith("group:")
            ? (groups[activeCategory.slice(6)] ?? [])
            : channels;
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? base.filter(
          (channel) =>
            channel.name.toLowerCase().includes(needle) ||
            channel.group.toLowerCase().includes(needle) ||
            channel.tvgId?.toLowerCase().includes(needle),
        )
      : base;
    const sortMode = settings.iptvSortOrder ?? "provider";
    if (activeCategory === "favorites" || activeCategory === "recent")
      return filtered;
    if (sortMode === "number") {
      return [...filtered].sort((a, b) => {
        const numA = a.number
          ? parseInt(a.number, 10)
          : Number.MAX_SAFE_INTEGER;
        const numB = b.number
          ? parseInt(b.number, 10)
          : Number.MAX_SAFE_INTEGER;
        if (numA !== numB) return numA - numB;
        return a.name.localeCompare(b.name);
      });
    }
    if (sortMode === "name") {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }
    return filtered;
  }, [
    activeCategory,
    channels,
    favoriteChannels,
    recentChannels,
    groups,
    query,
    settings.iptvSortOrder,
  ]);

  useEffect(() => {
    if (!categories.some((category) => category.id === activeCategory))
      setActiveCategory("all");
  }, [categories, activeCategory]);
  const renderedChannels = visibleChannels;
  const selectedChannel =
    channelById.get(selectedChannelId ?? "") ?? renderedChannels[0] ?? null;
  const selectedGuide = selectedChannel
    ? iptvSnapshot.nowNext[selectedChannel.id]
    : undefined;

  // Restore the last played channel, not every row crossed while browsing.
  useEffect(() => {
    setSelectedChannelId(
      tvSession.lastChannelId ||
        loadStored<string | null>(lastChannelKey, null),
    );
  }, [lastChannelKey, tvSession.lastChannelId]);
  const watchChannel = useCallback(
    (channel: IptvChannel) => {
      setSelectedChannelId(channel.id);
      saveStored(lastChannelKey, channel.id);
      if (activeChannel?.id === channel.id) {
        window.dispatchEvent(new Event("arvio:expand-live-player"));
        return;
      }
      playChannel(channel);
      setGroupsOpen(false);
    },
    [lastChannelKey, playChannel, activeChannel?.id],
  );

  // Catch-up listings for the selected channel (channels the panel archives).
  useEffect(() => {
    if (
      !archiveOpen ||
      !selectedChannel?.catchupDays ||
      selectedChannel.catchupType !== "xtream"
    ) {
      setCatchup(null);
      return undefined;
    }
    let active = true;
    setCatchup({ channelId: selectedChannel.id, programs: [], loading: true });
    const timer = window.setTimeout(() => {
      void loadXtreamCatchup(settings.iptvPlaylists, selectedChannel)
        .then((programs) => {
          if (active)
            setCatchup({
              channelId: selectedChannel.id,
              programs,
              loading: false,
            });
        })
        .catch(() => {
          if (active)
            setCatchup({
              channelId: selectedChannel.id,
              programs: [],
              loading: false,
            });
        });
    }, 400);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannel?.id, archiveOpen]);
  useEffect(() => setArchiveOpen(false), [selectedChannel?.id]);

  // Guide loads lazily for rows as they scroll into view, batched so a fast
  // scroll doesn't fire hundreds of EPG requests.
  const guideQueueRef = useRef(new Map<string, IptvChannel>());
  const guideTimerRef = useRef<number | null>(null);
  const requestGuide = useCallback(
    (channel: IptvChannel) => {
      if (
        iptvSnapshot.nowNext[channel.id]?.now &&
        iptvSnapshot.nowNext[channel.id]!.now!.endUtcMillis > Date.now()
      )
        return;
      guideQueueRef.current.set(channel.id, channel);
      if (guideTimerRef.current) return;
      guideTimerRef.current = window.setTimeout(() => {
        guideTimerRef.current = null;
        const batch = Array.from(guideQueueRef.current.values());
        guideQueueRef.current.clear();
        if (batch.length) void loadIptvGuide(batch);
      }, GUIDE_BATCH_DELAY_MS);
    },
    [iptvSnapshot.nowNext, loadIptvGuide],
  );

  useEffect(
    () => () => {
      if (guideTimerRef.current) window.clearTimeout(guideTimerRef.current);
      // Effect replay/remount must not leave a cancelled timer blocking future batches.
      guideTimerRef.current = null;
      guideQueueRef.current.clear();
    },
    [playlistSignature, lastChannelKey],
  );

  useEffect(() => {
    if (selectedChannel) requestGuide(selectedChannel);
  }, [selectedChannel, requestGuide]);

  const toggleFavorite = (channelId: string) =>
    setSettings({
      ...settings,
      favoriteChannelIds: favoriteIds.has(channelId)
        ? favorites.filter((id) => channelById.get(id)?.id !== channelId)
        : [channelById.get(channelId)?.cloudId ?? channelId, ...favorites],
    });

  const moveFavorite = (id: string, direction: number) => {
    const index = favorites.findIndex(
      (reference) => channelById.get(reference)?.id === id,
    );
    const next = index + direction;
    if (index < 0 || next < 0 || next >= favorites.length) return;
    const ordered = [...favorites];
    [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
    setSettings({ ...settings, favoriteChannelIds: ordered });
  };

  const toggleGroupFavorite = (group: string) => {
    const first = groups[group]?.[0];
    const id = first ? groupKey(first) : group;
    setSettings({
      ...settings,
      favoriteGroupIds: favoriteGroups.includes(id)
        ? favoriteGroups.filter((item) => item !== id)
        : [id, ...favoriteGroups],
    });
  };

  const toggleHiddenGroup = (group: string) => {
    const first = groups[group]?.[0];
    const id = first ? groupKey(first) : group;
    setSettings({
      ...settings,
      hiddenGroupIds: hiddenGroups.includes(id)
        ? hiddenGroups.filter((item) => item !== id)
        : [id, ...hiddenGroups],
    });
  };

  const addPlaylist = () => {
    if (!url.trim()) {
      setToast(
        localize(
          settings.uiLanguage,
          "Gib zuerst eine M3U- oder Xtream-URL ein.",
          "Enter an M3U or Xtream URL first.",
        ),
      );
      return;
    }
    setSettings({
      ...settings,
      iptvPlaylists: [
        {
          id: crypto.randomUUID(),
          name: name.trim() || "Playlist",
          m3uUrl: url.trim(),
          epgUrl: epgUrl.trim(),
          enabled: true,
        },
        ...playlists,
      ],
    });
    setName("");
    setUrl("");
    setEpgUrl("");
    setManaging(false);
  };

  const saveStreamNetTv = () => {
    const username = streamNetUser.trim();
    const password = streamNetPassword.trim();
    if (!username || !password) {
      setToast(
        localize(
          settings.uiLanguage,
          "Gib deinen Xtream-Codes-Benutzernamen und dein Passwort ein.",
          "Enter your Xtream Codes username and password.",
        ),
      );
      return;
    }
    const preset = buildStreamNetTvPlaylist(
      config.streamnetTvXtreamUrl,
      username,
      password,
    );
    setSettings({
      ...settings,
      iptvPlaylists: [
        preset,
        ...playlists.filter((playlist) => playlist.id !== preset.id),
      ],
    });
    setToast(
      localize(
        settings.uiLanguage,
        "STREAMNET TV wurde gespeichert.",
        "STREAMNET TV was saved.",
      ),
    );
    setManaging(false);
  };

  const activeCategoryLabel =
    categories.find((category) => category.id === activeCategory)?.label ??
    localize(settings.uiLanguage, "Alle Sender", "All Channels");
  const renderCategory = (category: (typeof categories)[number]) => (
    <button
      type="button"
      className={activeCategory === category.id ? "is-active" : ""}
      title={category.label}
      onClick={() => {
        setActiveCategory(category.id);
        setSelectedChannelId(null);
        if (window.matchMedia("(max-width: 760px)").matches)
          setGroupsOpen(false);
      }}
    >
      {category.id === "favorites" ? (
        <Star size={20} />
      ) : category.id === "recent" ? (
        <History size={20} />
      ) : category.id === "sports" ? (
        <Trophy size={20} />
      ) : (
        <LayoutGrid size={20} />
      )}
      <span>{category.label}</span>
      {category.id !== "sports" && (
        <em>
          {resolvingSavedChannels &&
          ["favorites", "recent"].includes(category.id) &&
          !category.count ? (
            <RefreshCw
              size={14}
              className="is-spinning"
              aria-label={localize(
                settings.uiLanguage,
                "Gespeicherte Sender werden geladen",
                "Loading saved channels",
              )}
            />
          ) : (
            category.count.toLocaleString()
          )}
        </em>
      )}
    </button>
  );

  return (
    <div
      className="screen livetv-shell"
      onPointerDownCapture={() => {
        pointerNavigation.current = true;
      }}
      onKeyDownCapture={() => {
        pointerNavigation.current = false;
      }}
    >
      {channels.length === 0 && (
        <header className="livetv-topbar">
          <div className="livetv-heading">
            <h2>{localize(settings.uiLanguage, "Live-TV", "Live TV")}</h2>
            <span>
              {localize(
                settings.uiLanguage,
                "Keine Sender geladen",
                "No channels loaded",
              )}
            </span>
          </div>
          <div className="livetv-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={localize(
                settings.uiLanguage,
                "Sender suchen",
                "Search channels",
              )}
              aria-label={localize(
                settings.uiLanguage,
                "Sender suchen",
                "Search channels",
              )}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={localize(
                  settings.uiLanguage,
                  "Suche löschen",
                  "Clear search",
                )}
              >
                <X size={15} />
              </button>
            )}
          </div>
          <div className="livetv-topbar-actions">
            <button
              type="button"
              className="livetv-chipbtn"
              title={localize(
                settings.uiLanguage,
                "Kategorien ein-/ausblenden",
                "Toggle categories",
              )}
              aria-label={localize(
                settings.uiLanguage,
                "Kategorien ein-/ausblenden",
                "Toggle categories",
              )}
              aria-expanded={groupsOpen}
              onClick={() => setGroupsOpen(!groupsOpen)}
            >
              <PanelLeft size={18} />
            </button>
            {enabledPlaylists.length > 1 && (
              <select
                aria-label={localize(
                  settings.uiLanguage,
                  "Wiedergabelistenanbieter",
                  "Playlist provider",
                )}
                value={provider}
                onChange={(event) => {
                  setProvider(event.target.value);
                  setActiveCategory("all");
                }}
              >
                <option value="all">
                  {localize(
                    settings.uiLanguage,
                    "Alle Wiedergabelisten",
                    "All playlists",
                  )}
                </option>
                {enabledPlaylists.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              className="livetv-chipbtn"
              onClick={() => setManaging((value) => !value)}
              aria-expanded={managing}
            >
              <ListVideo size={17} />{" "}
              {localize(settings.uiLanguage, "Wiedergabelisten", "Playlists")}
            </button>
            <button
              type="button"
              className="livetv-chipbtn"
              onClick={() => void refreshIptv()}
              disabled={isLoadingTv}
              aria-label={localize(
                settings.uiLanguage,
                "Sender aktualisieren",
                "Refresh channels",
              )}
            >
              <RefreshCw
                size={17}
                className={isLoadingTv ? "is-spinning" : ""}
              />{" "}
              {isLoadingTv
                ? localize(
                    settings.uiLanguage,
                    "Wird aktualisiert",
                    "Refreshing",
                  )
                : localize(settings.uiLanguage, "Aktualisieren", "Refresh")}
            </button>
          </div>
        </header>
      )}

      {managing && (
        <section className="livetv-manage">
          <section className="streamnet-tv-preset">
            <div className="streamnet-tv-preset-head">
              <strong>STREAMNET TV</strong>
              <span>
                {localize(settings.uiLanguage, "Vordefiniert", "Preset")}
              </span>
            </div>
            <p>
              {localize(
                settings.uiLanguage,
                "Gib nur deine Xtream-Codes-Zugangsdaten ein. Die Serveradresse ist bereits hinterlegt.",
                "Enter only your Xtream Codes credentials. The server address is already configured.",
              )}
            </p>
            <div className="streamnet-tv-credentials">
              <input
                value={streamNetUser}
                onChange={(event) => setStreamNetUser(event.target.value)}
                placeholder={localize(
                  settings.uiLanguage,
                  "Benutzername",
                  "Username",
                )}
                autoComplete="username"
              />
              <input
                value={streamNetPassword}
                onChange={(event) => setStreamNetPassword(event.target.value)}
                placeholder={localize(
                  settings.uiLanguage,
                  "Passwort",
                  "Password",
                )}
                type="password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="primary"
                onClick={saveStreamNetTv}
              >
                {localize(
                  settings.uiLanguage,
                  "Zugang speichern",
                  "Save access",
                )}
              </button>
            </div>
          </section>
          {hiddenGroups.length > 0 && (
            <div className="hidden-groups">
              <strong>
                {localize(
                  settings.uiLanguage,
                  "Ausgeblendete Kategorien",
                  "Hidden categories",
                )}
              </strong>
              {hiddenGroups.map((group) => (
                <button
                  type="button"
                  key={group}
                  className="secondary"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      hiddenGroupIds: hiddenGroups.filter((id) => id !== group),
                    })
                  }
                >
                  <Eye size={16} />
                  {group.includes("|")
                    ? group.slice(group.indexOf("|") + 1)
                    : group}
                </button>
              ))}
            </div>
          )}
          {playlists.map((playlist) => (
            <div className="livetv-manage-row" key={playlist.id}>
              <button
                type="button"
                className={`livetv-switch ${playlist.enabled ? "is-on" : ""}`}
                onClick={() =>
                  setSettings({
                    ...settings,
                    iptvPlaylists: playlists.map((p) =>
                      p.id === playlist.id ? { ...p, enabled: !p.enabled } : p,
                    ),
                  })
                }
                aria-label={
                  playlist.enabled
                    ? `${localize(settings.uiLanguage, "Deaktivieren", "Disable")} ${playlist.name}`
                    : `${localize(settings.uiLanguage, "Aktivieren", "Enable")} ${playlist.name}`
                }
              />
              <span className="livetv-manage-name">
                <strong>{playlist.name}</strong>
                <em>
                  {playlist.epgUrl || playlist.epgUrls?.length
                    ? localize(
                        settings.uiLanguage,
                        "Wiedergabeliste + EPG",
                        "Playlist + EPG",
                      )
                    : localize(
                        settings.uiLanguage,
                        "Wiedergabeliste",
                        "Playlist",
                      )}
                </em>
              </span>
              <button
                type="button"
                className="livetv-manage-remove"
                onClick={() =>
                  setSettings({
                    ...settings,
                    iptvPlaylists: playlists.filter(
                      (p) => p.id !== playlist.id,
                    ),
                  })
                }
                aria-label={`${localize(settings.uiLanguage, "Entfernen", "Remove")} ${playlist.name}`}
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <div className="livetv-manage-add">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={localize(settings.uiLanguage, "Name", "Name")}
              aria-label={localize(
                settings.uiLanguage,
                "Name der Wiedergabeliste",
                "Playlist name",
              )}
            />
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={localize(
                settings.uiLanguage,
                "M3U-/Xtream-URL (oder Host Benutzer Passwort)",
                "M3U / Xtream URL (or host user pass)",
              )}
              aria-label={localize(
                settings.uiLanguage,
                "URL der Wiedergabeliste",
                "Playlist URL",
              )}
            />
            <input
              value={epgUrl}
              onChange={(event) => setEpgUrl(event.target.value)}
              placeholder={localize(
                settings.uiLanguage,
                "EPG-URL (optional)",
                "EPG URL (optional)",
              )}
              aria-label={localize(settings.uiLanguage, "EPG-URL", "EPG URL")}
            />
            <button type="button" className="primary" onClick={addPlaylist}>
              <Plus size={17} />{" "}
              {localize(settings.uiLanguage, "Hinzufügen", "Add")}
            </button>
          </div>
        </section>
      )}

      {hasWarnings && (
        <div className="livetv-warning">
          <strong>
            {localize(
              settings.uiLanguage,
              "Problem mit der Wiedergabeliste",
              "Playlist problem",
            )}
          </strong>
          <span>{iptvSnapshot.playlistWarnings?.[0]}</span>
        </div>
      )}

      {!playlists.length && !channels.length && !managing && (
        <section className="livetv-empty">
          <Tv size={44} />
          <h3>
            {localize(
              settings.uiLanguage,
              "IPTV-Wiedergabeliste hinzufügen",
              "Add your IPTV playlist",
            )}
          </h3>
          <p>
            {localize(
              settings.uiLanguage,
              "Füge einen M3U-Link oder Xtream-Zugangsdaten ein. Wiedergabelisten werden über StreamNet Cloud synchronisiert",
              "Paste an M3U link or Xtream credentials. Playlists are synchronized through StreamNet Cloud",
            )}
            {auth
              ? ""
              : localize(
                  settings.uiLanguage,
                  " sobald du dich anmeldest",
                  " once you sign in",
                )}
            .
          </p>
          <button
            type="button"
            className="primary"
            onClick={() => setManaging(true)}
          >
            <Plus size={18} />{" "}
            {localize(
              settings.uiLanguage,
              "Wiedergabeliste hinzufügen",
              "Add playlist",
            )}
          </button>
        </section>
      )}

      {channels.length > 0 && (
        <div
          className={`livetv-columns tv-guide-workspace ${activeCategory === "sports" ? "sports-active" : ""} ${groupsOpen ? "" : "groups-collapsed"}`}
        >
          {groupsOpen && (
            <button
              className="tv-drawer-scrim"
              type="button"
              aria-label={localize(
                settings.uiLanguage,
                "Kategorien schließen",
                "Close categories",
              )}
              onClick={() => setGroupsOpen(false)}
            />
          )}
          <nav
            className="livetv-cats"
            aria-label={localize(
              settings.uiLanguage,
              "Senderkategorien",
              "Channel categories",
            )}
            inert={!groupsOpen}
            onKeyDown={(event) => {
              if (
                event.key === "ArrowRight" &&
                !(event.target as HTMLElement).matches("input, select")
              ) {
                const first =
                  listRef.current?.querySelector<HTMLElement>(
                    ".is-selected .livetv-guide-channel, .is-selected .livetv-row-main",
                  ) ??
                  listRef.current?.querySelector<HTMLElement>(
                    "[data-virtual-index] button, .tv-event-card",
                  );
                if (first) {
                  event.preventDefault();
                  event.stopPropagation();
                  first.focus({ preventScroll: true });
                }
              }
            }}
          >
            <select
              aria-label={localize(
                settings.uiLanguage,
                "Anbieter der Wiedergabeliste",
                "Playlist provider",
              )}
              value={provider}
              onChange={(event) => {
                setProvider(event.target.value);
                setActiveCategory("all");
              }}
            >
              <option value="all">
                {localize(
                  settings.uiLanguage,
                  "Alle Wiedergabelisten",
                  "All playlists",
                )}
              </option>
              {enabledPlaylists.map((playlist) => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.name}
                </option>
              ))}
            </select>
            <div className="livetv-search">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={localize(
                  settings.uiLanguage,
                  "Sender suchen",
                  "Search channels",
                )}
                aria-label={localize(
                  settings.uiLanguage,
                  "Sender suchen",
                  "Search channels",
                )}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={localize(
                    settings.uiLanguage,
                    "Suche löschen",
                    "Clear search",
                  )}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="tv-sidebar-destinations">
              {categories
                .filter((category) => !category.id.startsWith("group:"))
                .map((category) => (
                  <div key={category.id}>{renderCategory(category)}</div>
                ))}
            </div>
            <div className="tv-sidebar-group-heading">
              <span>
                {localize(settings.uiLanguage, "Kategorien", "Categories")}
              </span>
              <button
                type="button"
                title={localize(
                  settings.uiLanguage,
                  "Wiedergabelisten verwalten",
                  "Manage playlists",
                )}
                aria-label={localize(
                  settings.uiLanguage,
                  "Wiedergabelisten verwalten",
                  "Manage playlists",
                )}
                onClick={() => setManaging((value) => !value)}
                aria-expanded={managing}
              >
                <ListVideo size={18} />
              </button>
              <button
                type="button"
                title={localize(
                  settings.uiLanguage,
                  "Sender aktualisieren",
                  "Refresh channels",
                )}
                aria-label={localize(
                  settings.uiLanguage,
                  "Sender aktualisieren",
                  "Refresh channels",
                )}
                disabled={isLoadingTv}
                onClick={() => void refreshIptv()}
              >
                <RefreshCw
                  size={16}
                  className={isLoadingTv ? "is-spinning" : ""}
                />
              </button>
            </div>
            <VirtualList
              items={categories.filter((category) =>
                category.id.startsWith("group:"),
              )}
              estimate={56}
              itemKey={rowKey}
              label={localize(settings.uiLanguage, "Kategorien", "Categories")}
              renderItem={renderCategory}
            />
          </nav>

          <main
            ref={listRef}
            className="livetv-list"
            aria-label={activeCategoryLabel}
            onFocusCapture={(event) => {
              if (
                !pointerNavigation.current &&
                (event.target as HTMLElement).closest(
                  ".livetv-guide-channel, .livetv-guide-block, .livetv-row-main, .tv-event-card",
                )
              )
                setGroupsOpen(false);
            }}
            onKeyDown={(event) => {
              if ((event.target as HTMLElement).closest("dialog")) return;
              if (
                event.key === "Escape" ||
                (event.key === "ArrowLeft" &&
                  !(event.target as HTMLElement).closest(".livetv-guide-block"))
              ) {
                if (!groupsOpen) {
                  event.preventDefault();
                  event.stopPropagation();
                  setGroupsOpen(true);
                  requestAnimationFrame(() =>
                    document
                      .querySelector<HTMLElement>(
                        ".livetv-cats button.is-active",
                      )
                      ?.focus(),
                  );
                }
              }
            }}
          >
            {activeCategory === "sports" ? (
              <SportsGuidePane
                key={activeProfile?.id ?? "local"}
                channels={channels}
                guide={iptvSnapshot.nowNext}
                addons={addons}
                providerNames={Object.fromEntries(
                  playlists.map((playlist) => [playlist.id, playlist.name]),
                )}
                onPlay={watchChannel}
                onEnter={() => {
                  if (!pointerNavigation.current) setGroupsOpen(false);
                }}
                onOpenCategories={() => {
                  setGroupsOpen(true);
                  requestAnimationFrame(() =>
                    document
                      .querySelector<HTMLElement>(
                        ".livetv-cats button.is-active",
                      )
                      ?.focus(),
                  );
                }}
              />
            ) : (
              <>
                <div className="livetv-list-head">
                  <button
                    type="button"
                    className="livetv-chipbtn"
                    title={localize(
                      settings.uiLanguage,
                      "Kategorien ein-/ausblenden",
                      "Toggle categories",
                    )}
                    aria-label={localize(
                      settings.uiLanguage,
                      "Kategorien ein-/ausblenden",
                      "Toggle categories",
                    )}
                    aria-expanded={groupsOpen}
                    onClick={() => setGroupsOpen(!groupsOpen)}
                  >
                    <PanelLeft size={20} />
                  </button>
                  <h3>{activeCategoryLabel}</h3>
                  <span>{visibleChannels.length.toLocaleString()}</span>
                  <div
                    className="livetv-view-toggle"
                    role="tablist"
                    aria-label={localize(
                      settings.uiLanguage,
                      "Senderansicht",
                      "Channel view",
                    )}
                  >
                    <button
                      type="button"
                      className={view === "list" ? "is-active" : ""}
                      onClick={() => setView("list")}
                      title={localize(
                        settings.uiLanguage,
                        "Listenansicht",
                        "List view",
                      )}
                      aria-label={localize(
                        settings.uiLanguage,
                        "Listenansicht",
                        "List view",
                      )}
                    >
                      <List size={18} />
                    </button>
                    <button
                      type="button"
                      className={view === "guide" ? "is-active" : ""}
                      onClick={() => setView("guide")}
                      title={localize(
                        settings.uiLanguage,
                        "Programmübersicht",
                        "Guide view",
                      )}
                      aria-label={localize(
                        settings.uiLanguage,
                        "Programmübersicht",
                        "Guide view",
                      )}
                    >
                      <LayoutGrid size={18} />
                    </button>
                  </div>
                  {activeCategory.startsWith("group:") && (
                    <div className="livetv-group-actions">
                      <button
                        type="button"
                        onClick={() =>
                          toggleGroupFavorite(activeCategory.slice(6))
                        }
                        aria-label={localize(
                          settings.uiLanguage,
                          "Diese Kategorie favorisieren",
                          "Favorite this category",
                        )}
                      >
                        <Star size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          toggleHiddenGroup(activeCategory.slice(6))
                        }
                        aria-label={localize(
                          settings.uiLanguage,
                          "Diese Kategorie ausblenden",
                          "Hide this category",
                        )}
                      >
                        {hiddenGroups.includes(activeCategory.slice(6)) ? (
                          <Eye size={15} />
                        ) : (
                          <EyeOff size={15} />
                        )}
                      </button>
                    </div>
                  )}
                </div>
                {renderedChannels.length === 0 && (
                  <div className="livetv-list-empty">
                    <Search size={28} />
                    <p>
                      {resolvingSavedChannels &&
                      ["favorites", "recent"].includes(activeCategory)
                        ? localize(
                            settings.uiLanguage,
                            "Gespeicherte Sender werden geladen ...",
                            "Loading saved channels...",
                          )
                        : localize(
                            settings.uiLanguage,
                            `Keine Sender entsprechen ${query.trim() ? `„${query.trim()}“` : "dieser Kategorie"}.`,
                            `No channels match ${query.trim() ? `"${query.trim()}"` : "this category"}.`,
                          )}
                    </p>
                    {query.trim() && (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setQuery("")}
                      >
                        {localize(
                          settings.uiLanguage,
                          "Suche löschen",
                          "Clear search",
                        )}
                      </button>
                    )}
                  </div>
                )}
                {view === "list" ? (
                  <div className="livetv-rows">
                    <VirtualList
                      key={`${provider}:${activeCategory}:${query}`}
                      items={renderedChannels}
                      itemKey={rowKey}
                      label="Channels"
                      estimate={86}
                      renderItem={(channel) => (
                        <ChannelRow
                          key={channel.id}
                          channel={channel}
                          guide={iptvSnapshot.nowNext[channel.id]}
                          favorite={favoriteIds.has(channel.id)}
                          selected={selectedChannel?.id === channel.id}
                          onFocus={() => setSelectedChannelId(channel.id)}
                          onVisible={() => requestGuide(channel)}
                          onPlay={() => watchChannel(channel)}
                          onToggleFavorite={() => toggleFavorite(channel.id)}
                        />
                      )}
                    />
                  </div>
                ) : (
                  <GuideGrid
                    key={`${provider}:${activeCategory}:${query}`}
                    channels={renderedChannels}
                    favorites={favoriteIds}
                    nowNext={iptvSnapshot.nowNext}
                    selectedId={selectedChannel?.id ?? null}
                    onFocus={(channel) => setSelectedChannelId(channel.id)}
                    onVisible={requestGuide}
                    onPlay={watchChannel}
                    onCatchup={playCatchup}
                  />
                )}
              </>
            )}
          </main>

          {activeCategory !== "sports" && (
            <aside
              className="livetv-detail"
              aria-label={localize(
                settings.uiLanguage,
                "Senderdetails",
                "Channel details",
              )}
            >
              {selectedChannel ? (
                <>
                  <div
                    id="live-tv-player-dock"
                    className={`livetv-detail-art ${activeChannel ? "has-live-playback" : ""}`}
                    aria-label={localize(
                      settings.uiLanguage,
                      "Live-Player",
                      "Live player",
                    )}
                  >
                    <ChannelLogo channel={selectedChannel} size={48} />
                    {!activeChannel && (
                      <button
                        type="button"
                        className="livetv-preview-play"
                        aria-label={`${selectedChannel.name} ${localize(settings.uiLanguage, "abspielen", "play")}`}
                        title={`${selectedChannel.name} ${localize(settings.uiLanguage, "abspielen", "play")}`}
                        onClick={() => watchChannel(selectedChannel)}
                      >
                        <Play size={28} fill="currentColor" />
                      </button>
                    )}
                  </div>
                  <p className="livetv-detail-group">
                    {selectedChannel.group || "Live TV"}
                  </p>
                  <div className="livetv-channel-identity">
                    <div className="tv-identity-logo">
                      <ChannelLogo channel={selectedChannel} size={28} />
                    </div>
                    <span>
                      {selectedChannel.name}
                      {selectedChannel.qualityLabel
                        ? ` · ${selectedChannel.qualityLabel}`
                        : ""}
                    </span>
                  </div>
                  <h2>{selectedGuide?.now?.title || selectedChannel.name}</h2>
                  {selectedGuide?.now?.title ? (
                    <div className="livetv-program">
                      <div className="livetv-program-head">
                        <em>
                          {fmtTime(selectedGuide.now.startUtcMillis)} –{" "}
                          {fmtTime(selectedGuide.now.endUtcMillis)}
                        </em>
                      </div>
                      {selectedGuide.now.description && (
                        <p>{selectedGuide.now.description}</p>
                      )}
                    </div>
                  ) : (
                    <p className="livetv-detail-empty">
                      {localize(
                        settings.uiLanguage,
                        "Keine Programmdaten für diesen Sender.",
                        "No guide data for this channel.",
                      )}
                    </p>
                  )}
                  {selectedGuide?.next?.title && (
                    <div className="livetv-program is-next">
                      <div className="livetv-program-head">
                        <span>
                          {localize(
                            settings.uiLanguage,
                            "ALS NÄCHSTES",
                            "NEXT",
                          )}
                        </span>
                        <em>{fmtTime(selectedGuide.next.startUtcMillis)}</em>
                      </div>
                      <strong>{selectedGuide.next.title}</strong>
                    </div>
                  )}
                  <div className="livetv-detail-actions">
                    {favoriteIds.has(selectedChannel.id) && (
                      <>
                        <button
                          className="secondary livetv-action-icon"
                          type="button"
                          title={localize(
                            settings.uiLanguage,
                            "Favoriten nach oben verschieben",
                            "Move favorite up",
                          )}
                          aria-label={localize(
                            settings.uiLanguage,
                            "Favoriten nach oben verschieben",
                            "Move favorite up",
                          )}
                          disabled={
                            channelById.get(favorites[0])?.id ===
                            selectedChannel.id
                          }
                          onClick={() => moveFavorite(selectedChannel.id, -1)}
                        >
                          <ArrowUp size={17} />
                        </button>
                        <button
                          className="secondary livetv-action-icon"
                          type="button"
                          title={localize(
                            settings.uiLanguage,
                            "Favoriten nach unten verschieben",
                            "Move favorite down",
                          )}
                          aria-label={localize(
                            settings.uiLanguage,
                            "Favoriten nach unten verschieben",
                            "Move favorite down",
                          )}
                          disabled={
                            channelById.get(favorites[favorites.length - 1])
                              ?.id === selectedChannel.id
                          }
                          onClick={() => moveFavorite(selectedChannel.id, 1)}
                        >
                          <ArrowDown size={17} />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="primary"
                      onClick={() => watchChannel(selectedChannel)}
                    >
                      <Play size={17} fill="currentColor" />{" "}
                      {localize(settings.uiLanguage, "Ansehen", "Watch")}
                    </button>
                    <button
                      type="button"
                      className="secondary livetv-action-secondary"
                      onClick={() =>
                        openChannelExternally(selectedChannel, "vlc")
                      }
                    >
                      <ExternalLink size={17} /> VLC
                    </button>
                    <button
                      type="button"
                      className={
                        favoriteIds.has(selectedChannel.id)
                          ? "secondary livetv-action-icon is-active"
                          : "secondary livetv-action-icon"
                      }
                      aria-label={
                        favoriteIds.has(selectedChannel.id)
                          ? localize(
                              settings.uiLanguage,
                              "Ausgewählten Favoriten entfernen",
                              "Remove selected favorite",
                            )
                          : localize(
                              settings.uiLanguage,
                              "Ausgewählten Favoriten hinzufügen",
                              "Add selected favorite",
                            )
                      }
                      title={
                        favoriteIds.has(selectedChannel.id)
                          ? localize(
                              settings.uiLanguage,
                              "Favorit entfernen",
                              "Remove favorite",
                            )
                          : localize(
                              settings.uiLanguage,
                              "Favorit hinzufügen",
                              "Add favorite",
                            )
                      }
                      onClick={() => toggleFavorite(selectedChannel.id)}
                    >
                      <Star
                        size={17}
                        fill={
                          favoriteIds.has(selectedChannel.id)
                            ? "currentColor"
                            : "none"
                        }
                      />
                    </button>
                    {Boolean(selectedChannel.catchupDays) && (
                      <button
                        type="button"
                        className="secondary"
                        aria-label={localize(
                          settings.uiLanguage,
                          "Catch-up-Archiv anzeigen",
                          "Show catch-up archive",
                        )}
                        aria-expanded={archiveOpen}
                        onClick={() => setArchiveOpen((value) => !value)}
                      >
                        <History size={17} /> Catch-up
                      </button>
                    )}
                  </div>
                  {archiveOpen && catchup?.channelId === selectedChannel.id && (
                    <div className="livetv-catchup">
                      <p className="livetv-catchup-head">
                        <History size={14} /> Catch-up
                        {selectedChannel.catchupDays
                          ? ` · ${selectedChannel.catchupDays} ${localize(settings.uiLanguage, "Tage Archiv", "days archive")}`
                          : ""}
                      </p>
                      {catchup.loading && (
                        <p className="livetv-detail-empty">
                          {localize(
                            settings.uiLanguage,
                            "Archiv wird geladen ...",
                            "Loading archive...",
                          )}
                        </p>
                      )}
                      {!catchup.loading && !catchup.programs.length && (
                        <p className="livetv-detail-empty">
                          {localize(
                            settings.uiLanguage,
                            "Kein Archiv verfügbar.",
                            "No archive available.",
                          )}
                        </p>
                      )}
                      {catchup.programs.map((program) => (
                        <button
                          type="button"
                          key={`${program.startUtcMillis}`}
                          className="livetv-catchup-row"
                          onClick={() => playCatchup(selectedChannel, program)}
                        >
                          <CalendarClock size={14} />
                          <span>
                            <strong>{program.title}</strong>
                            <em>
                              {formatTime24Hour(program.startUtcMillis, [], {
                                weekday: "short",
                              })}
                            </em>
                          </span>
                          <Play size={13} fill="currentColor" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="livetv-detail-empty-state">
                  <Tv size={44} />
                  <p>
                    {localize(
                      settings.uiLanguage,
                      "Wähle einen Sender aus, um das Programm zu sehen.",
                      "Select a channel to see the guide.",
                    )}
                  </p>
                </div>
              )}
            </aside>
          )}
        </div>
      )}

      {playlists.length > 0 && !channels.length && !hasWarnings && (
        <section className="livetv-empty">
          <ChevronDown size={36} className={isLoadingTv ? "is-spinning" : ""} />
          <h3>
            {isLoadingTv
              ? localize(
                  settings.uiLanguage,
                  "Sender werden geladen ...",
                  "Loading channels...",
                )
              : localize(
                  settings.uiLanguage,
                  "Noch keine Sender",
                  "No channels yet",
                )}
          </h3>
          <p>
            {isLoadingTv
              ? localize(
                  settings.uiLanguage,
                  "Große Wiedergabelisten können einige Sekunden benötigen.",
                  "Big playlists can take a few seconds.",
                )
              : localize(
                  settings.uiLanguage,
                  "Aktualisiere die Liste oder prüfe die Wiedergabelistendaten bei deinem Anbieter.",
                  "Refresh, or double-check the playlist details with your provider.",
                )}
          </p>
        </section>
      )}
    </div>
  );
}

function LoadMoreSentinel({ onLoadMore }: { onLoadMore: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadMore]);
  return <div ref={ref} className="livetv-sentinel" aria-hidden="true" />;
}

// Timeline guide: channels down, time across (now → +4h), programme blocks
// positioned by their real start/end times. EPG loads lazily per visible row.
function GuideGrid({
  channels,
  favorites,
  nowNext,
  selectedId,
  onFocus,
  onVisible,
  onPlay,
  onCatchup,
}: {
  channels: IptvChannel[];
  favorites: Set<string>;
  nowNext: IptvSnapshot["nowNext"];
  selectedId: string | null;
  onFocus: (channel: IptvChannel) => void;
  onVisible: (channel: IptvChannel) => void;
  onPlay: (channel: IptvChannel) => void;
  onCatchup: (channel: IptvChannel, program: IptvProgram) => void;
}) {
  const { settings } = useApp();
  const [clock, setClock] = useState(0);
  const [manualStart, setManualStart] = useState<number | null>(null);
  const currentStart = Math.floor(clock / 1_800_000) * 1_800_000;
  const windowStart = manualStart ?? currentStart;
  const windowEnd = windowStart + GUIDE_WINDOW_HOURS * 60 * 60 * 1000;
  const totalWidth = GUIDE_WINDOW_HOURS * 60 * GUIDE_PX_PER_MIN;
  const ticks = Array.from(
    { length: GUIDE_WINDOW_HOURS * 2 },
    (_, index) => windowStart + index * 30 * 60 * 1000,
  );
  useEffect(() => {
    setClock(Date.now());
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const nowOffset = ((clock - windowStart) / 60000) * GUIDE_PX_PER_MIN;
  if (!clock)
    return (
      <div
        className="livetv-guide"
        aria-busy="true"
        aria-label={localize(
          settings.uiLanguage,
          "Programmübersicht",
          "Programme guide",
        )}
      />
    );

  return (
    <div
      className="livetv-guide"
      role="grid"
      aria-label={localize(
        settings.uiLanguage,
        "Programmübersicht",
        "Programme guide",
      )}
    >
      <div
        className="guide-window-controls"
        role="group"
        aria-label={localize(
          settings.uiLanguage,
          "Zeitraum der Programmübersicht",
          "Guide time window",
        )}
      >
        <button
          type="button"
          title={localize(
            settings.uiLanguage,
            "Vorherige zwölf Stunden",
            "Previous twelve hours",
          )}
          aria-label={localize(
            settings.uiLanguage,
            "Vorherige zwölf Stunden",
            "Previous twelve hours",
          )}
          disabled={windowStart <= currentStart - 48 * 3_600_000}
          onClick={() => setManualStart(windowStart - 12 * 3_600_000)}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          className="guide-now"
          onClick={() => {
            setClock(Date.now());
            setManualStart(null);
          }}
        >
          {localize(settings.uiLanguage, "Jetzt", "Now")}
        </button>
        <button
          type="button"
          title={localize(
            settings.uiLanguage,
            "Nächste zwölf Stunden",
            "Next twelve hours",
          )}
          aria-label={localize(
            settings.uiLanguage,
            "Nächste zwölf Stunden",
            "Next twelve hours",
          )}
          disabled={windowStart >= currentStart + 44 * 3_600_000}
          onClick={() => setManualStart(windowStart + 12 * 3_600_000)}
        >
          <ChevronRight size={18} />
        </button>
        <span aria-live="polite">
          {new Intl.DateTimeFormat([], {
            weekday: "short",
            day: "numeric",
            month: "short",
          }).format(windowStart)}{" "}
          · {fmtTime(windowStart)}–{fmtTime(windowEnd)}
        </span>
      </div>
      <VirtualList
        items={channels}
        itemKey={rowKey}
        label="Guide channels"
        className="tv-guide-grid"
        contentWidth={`calc(${totalWidth}px + var(--guide-channel-width))`}
        preserveHorizontalFocus
        estimate={62}
        header={
          <div className="livetv-guide-timebar">
            <span className="livetv-guide-corner" />
            <div
              className="livetv-guide-ticks"
              style={{ width: `${totalWidth}px` }}
            >
              {ticks.map((tick) => (
                <span
                  key={tick}
                  style={{ width: `${30 * GUIDE_PX_PER_MIN}px` }}
                >
                  {fmtTime(tick)}
                </span>
              ))}
              {nowOffset >= 0 && nowOffset <= totalWidth && (
                <i
                  className="livetv-guide-nowline"
                  style={{ left: `${nowOffset}px` }}
                >
                  <b>{fmtTime(clock)}</b>
                </i>
              )}
            </div>
          </div>
        }
        renderItem={(channel) => (
          <GuideRow
            key={channel.id}
            channel={channel}
            favorite={favorites.has(channel.id)}
            guide={nowNext[channel.id]}
            selected={selectedId === channel.id}
            windowStart={windowStart}
            windowEnd={windowEnd}
            totalWidth={totalWidth}
            nowOffset={nowOffset}
            onFocus={() => onFocus(channel)}
            onVisible={() => onVisible(channel)}
            onPlay={() => onPlay(channel)}
            onCatchup={(program) => onCatchup(channel, program)}
          />
        )}
      />
    </div>
  );
}

function GuideRow({
  channel,
  favorite,
  guide,
  selected,
  windowStart,
  windowEnd,
  totalWidth,
  nowOffset,
  onFocus,
  onVisible,
  onPlay,
  onCatchup,
}: {
  channel: IptvChannel;
  favorite: boolean;
  guide?: IptvSnapshot["nowNext"][string];
  selected: boolean;
  windowStart: number;
  windowEnd: number;
  totalWidth: number;
  nowOffset: number;
  onFocus: () => void;
  onVisible: () => void;
  onPlay: () => void;
  onCatchup: (program: IptvProgram) => void;
}) {
  const { settings } = useApp();
  const rowRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = rowRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onVisible();
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id]);

  const programs = useMemo(() => {
    const all = [
      ...(guide?.recent ?? []),
      guide?.now,
      guide?.next,
      ...(guide?.upcoming ?? []),
    ].filter((program): program is NonNullable<typeof program> =>
      Boolean(program),
    );
    const seen = new Set<number>();
    return all
      .filter(
        (program) =>
          program.endUtcMillis > windowStart &&
          program.startUtcMillis < windowEnd,
      )
      .filter((program) =>
        seen.has(program.startUtcMillis)
          ? false
          : (seen.add(program.startUtcMillis), true),
      );
  }, [guide, windowStart, windowEnd]);

  return (
    // onFocus mirrors ChannelRow: React's bubbling focus from the inner
    // channel button keeps the details pane in sync for D-pad/remote users.
    <div
      ref={rowRef}
      className={`livetv-guide-row ${selected ? "is-selected" : ""}`}
      onMouseEnter={onFocus}
      onFocus={onFocus}
      role="row"
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        const buttons = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
        );
        const index = buttons.indexOf(event.target as HTMLButtonElement);
        const next = buttons[index + (event.key === "ArrowRight" ? 1 : -1)];
        if (next) {
          event.preventDefault();
          event.stopPropagation();
          next.focus();
        }
      }}
    >
      <button
        type="button"
        className="livetv-guide-channel"
        onClick={onPlay}
        title={channel.name}
      >
        <small className="tv-guide-channel-number">{channel.number}</small>
        <span className="livetv-row-logo">
          <ChannelLogo channel={channel} size={16} />
        </span>
        <strong>{channel.name}</strong>
        {favorite && (
          <Star
            size={15}
            fill="currentColor"
            aria-label={localize(settings.uiLanguage, "Favorit", "Favorite")}
          />
        )}
      </button>
      <div className="livetv-guide-lane" style={{ width: `${totalWidth}px` }}>
        {programs.map((program) => {
          const left = Math.max(
            0,
            ((program.startUtcMillis - windowStart) / 60000) * GUIDE_PX_PER_MIN,
          );
          const right = Math.min(
            totalWidth,
            ((program.endUtcMillis - windowStart) / 60000) * GUIDE_PX_PER_MIN,
          );
          const live =
            Date.now() >= program.startUtcMillis &&
            Date.now() < program.endUtcMillis;
          const archived =
            program.endUtcMillis <= Date.now() &&
            Boolean(
              channel.catchupDays &&
              Date.now() - program.startUtcMillis <=
                channel.catchupDays * 86_400_000,
            );
          return (
            <button
              type="button"
              key={program.startUtcMillis}
              className={`livetv-guide-block ${live ? "is-live" : ""}`}
              style={{
                left: `${left}px`,
                width: `${Math.max(14, right - left - 2)}px`,
              }}
              aria-disabled={!live && !archived}
              onClick={() => {
                if (live) onPlay();
                else if (archived) onCatchup(program);
              }}
              title={`${program.title} · ${fmtTime(program.startUtcMillis)}–${fmtTime(program.endUtcMillis)} · ${live ? "Live" : archived ? "Catch-up" : program.startUtcMillis > Date.now() ? localize(settings.uiLanguage, "Demnächst", "Upcoming") : localize(settings.uiLanguage, "Archiv nicht verfügbar", "Archive unavailable")}`}
            >
              <strong>{program.title}</strong>
              <small>
                {fmtTime(program.startUtcMillis)} -{" "}
                {fmtTime(program.endUtcMillis)}
              </small>
            </button>
          );
        })}
        {programs.length === 0 && (
          <span className="livetv-guide-empty">
            {localize(
              settings.uiLanguage,
              "Keine Programmdaten",
              "No guide data",
            )}
          </span>
        )}
        {nowOffset >= 0 && nowOffset <= totalWidth && (
          <i
            className="livetv-guide-nowline"
            style={{ left: `${nowOffset}px` }}
          />
        )}
      </div>
    </div>
  );
}

function ChannelRow({
  channel,
  guide,
  favorite,
  selected,
  onFocus,
  onVisible,
  onPlay,
  onToggleFavorite,
}: {
  channel: IptvChannel;
  guide?: IptvSnapshot["nowNext"][string];
  favorite: boolean;
  selected: boolean;
  onFocus: () => void;
  onVisible: () => void;
  onPlay: () => void;
  onToggleFavorite: () => void;
}) {
  const rowRef = useRef<HTMLElement | null>(null);
  const now = guide?.now;
  const next = guide?.next ?? guide?.later ?? guide?.upcoming?.[0];
  const progress = now
    ? Math.min(
        100,
        Math.max(
          0,
          ((Date.now() - now.startUtcMillis) /
            (now.endUtcMillis - now.startUtcMillis)) *
            100,
        ),
      )
    : 0;

  useEffect(() => {
    const el = rowRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onVisible();
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id]);

  return (
    <article
      ref={rowRef}
      className={`livetv-row ${selected ? "is-selected" : ""}`}
      onMouseEnter={onFocus}
      onFocus={onFocus}
    >
      <button type="button" className="livetv-row-main" onClick={onPlay}>
        <span className="livetv-row-logo">
          <ChannelLogo channel={channel} size={20} />
        </span>
        <span className="livetv-row-copy">
          <span className="livetv-row-title">
            <strong>{channel.name}</strong>
            {channel.qualityLabel && (
              <i className="livetv-quality">{channel.qualityLabel}</i>
            )}
          </span>
          {now?.title ? (
            <span className="livetv-row-now">
              <em>{now.title}</em>
              <span className="livetv-progress">
                <span style={{ width: `${progress}%` }} />
              </span>
            </span>
          ) : (
            <span className="livetv-row-now">
              <em className="is-muted">{channel.group || "Live TV"}</em>
            </span>
          )}
          {next?.title && (
            <small>
              {fmtTime(next.startUtcMillis)} · {next.title}
            </small>
          )}
        </span>
        <span className="livetv-row-play">
          <Play size={16} fill="currentColor" />
        </span>
      </button>
      <button
        type="button"
        className={`livetv-row-star ${favorite ? "is-active" : ""}`}
        onClick={onToggleFavorite}
        aria-label={favorite ? "Remove favorite" : "Add favorite"}
      >
        <Star size={17} fill={favorite ? "currentColor" : "none"} />
      </button>
    </article>
  );
}
