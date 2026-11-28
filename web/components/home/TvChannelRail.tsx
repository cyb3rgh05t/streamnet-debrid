"use client";

import { useEffect, useMemo, useRef } from "react";
import { ChannelLogo } from "@/components/livetv/ChannelLogo";
import { RailScroller } from "@/components/media/RailScroller";
import { localize } from "@/lib/i18n";
import {
  channelIdentityIndex,
  hiddenChannelIdSet,
  normalizeTvSession,
  resolveChannelReferences,
} from "@/lib/iptvSession";
import { useApp } from "@/lib/store";

const MAX_CHANNELS = 30;

export type HomeTvRailKind = "favorite_tv" | "recent_tv";

/** Home rail with the user's favorite or most recently watched Live TV channels. */
export function TvChannelRail({ kind }: { kind: HomeTvRailKind }) {
  const { iptvSnapshot, settings, playChannel, refreshIptv } = useApp();
  const language = settings.uiLanguage;
  const allChannels = iptvSnapshot.allChannels ?? iptvSnapshot.channels;
  const references = useMemo(
    () =>
      kind === "favorite_tv"
        ? settings.favoriteChannelIds
        : [...normalizeTvSession(settings.iptvTvSession).recentChannelIds].reverse(),
    [kind, settings.favoriteChannelIds, settings.iptvTvSession],
  );

  // The channel list is only loaded once Live TV was opened; saved channels need it to be resolved.
  const requested = useRef(false);
  useEffect(() => {
    if (
      requested.current ||
      !references.length ||
      allChannels.length ||
      !settings.iptvPlaylists.some((playlist) => playlist.enabled && playlist.m3uUrl.trim())
    )
      return;
    requested.current = true;
    void refreshIptv();
  }, [allChannels.length, references.length, refreshIptv, settings.iptvPlaylists]);

  const channels = useMemo(() => {
    const index = channelIdentityIndex(allChannels);
    const hidden = hiddenChannelIdSet(settings.hiddenChannelIds ?? [], index);
    return resolveChannelReferences(references, index)
      .filter((channel) => !hidden.has(channel.id))
      .slice(0, MAX_CHANNELS);
  }, [allChannels, references, settings.hiddenChannelIds]);

  if (!channels.length) return null;
  const title =
    kind === "favorite_tv"
      ? localize(language, "TV-Favoriten", "Favorite TV")
      : localize(language, "Zuletzt gesehene Sender", "Recently Watched TV");
  return (
    <section className="rail">
      <div className="rail-head">
        <h3>{title}</h3>
      </div>
      <RailScroller className="rail-strip" ariaLabel={title}>
        {channels.map((channel) => {
          const now = iptvSnapshot.nowNext[channel.id]?.now;
          return (
            <button
              type="button"
              key={channel.id}
              className="media-card tv-channel-card"
              onClick={() => playChannel(channel)}
              title={channel.name}
            >
              <span className="poster tv-channel-poster">
                <span className="tv-channel-logo">
                  <ChannelLogo channel={channel} size={44} />
                </span>
              </span>
              <span className="tv-channel-copy">
                <strong>{channel.name}</strong>
                <small>{now?.title || channel.group || "Live TV"}</small>
              </span>
            </button>
          );
        })}
      </RailScroller>
    </section>
  );
}
