import type { IptvChannel, IptvSnapshot, IptvTvSession } from "./types";

export function isCurrentIptvSnapshot(snapshot: IptvSnapshot, scopeKey: string, signature: string) {
  return snapshot.scopeKey === scopeKey && snapshot.signature === signature;
}

export function normalizeTvSession(value: unknown): IptvTvSession {
  let raw = value;
  if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch { raw = null; } }
  const session = (raw && typeof raw === "object" ? raw : {}) as Partial<IptvTvSession>;
  return {
    lastChannelId: typeof session.lastChannelId === "string" ? session.lastChannelId : "",
    lastGroupName: typeof session.lastGroupName === "string" ? session.lastGroupName : "",
    lastFocusedZone: typeof session.lastFocusedZone === "string" ? session.lastFocusedZone : "GUIDE",
    lastOpenedAt: Number.isFinite(session.lastOpenedAt) ? Math.max(0, session.lastOpenedAt!) : 0,
    recentChannelIds: [...new Set(Array.isArray(session.recentChannelIds)
      ? session.recentChannelIds.filter((id): id is string => typeof id === "string" && Boolean(id.trim())) : [])].slice(-40)
  };
}

export function channelIdentityIndex(channels: IptvChannel[]): Map<string, IptvChannel> {
  const index = new Map<string, IptvChannel>();
  for (const channel of channels) {
    index.set(channel.id, channel);
    if (channel.cloudId) index.set(channel.cloudId, channel);
    for (const alias of channel.syncAliases ?? []) index.set(alias, channel);
  }
  return index;
}

export function resolveChannelReferences(ids: string[], index: Map<string, IptvChannel>): IptvChannel[] {
  const seen = new Set<string>();
  return ids.flatMap(id => {
    const channel = index.get(id);
    if (!channel || seen.has(channel.id)) return [];
    seen.add(channel.id);
    return [channel];
  });
}

/** Reference under which a channel is stored in cloud settings (shared with the Android app). */
export function channelPreferenceId(channel: IptvChannel): string {
  return channel.cloudId || channel.id;
}

export function hiddenChannelIdSet(refs: string[], index: Map<string, IptvChannel>): Set<string> {
  return new Set(resolveChannelReferences(refs, index).map(channel => channel.id));
}

/**
 * Drops hidden channels and, when `applyOrder` is set, lists channels with a saved rank first in that
 * order. Unranked channels keep their incoming order behind them.
 */
export function applyChannelPreferences(
  channels: IptvChannel[],
  hidden: Set<string>,
  order: string[],
  applyOrder: boolean,
  index: Map<string, IptvChannel>
): IptvChannel[] {
  const visible = hidden.size ? channels.filter(channel => !hidden.has(channel.id)) : channels;
  if (!applyOrder || !order.length || visible.length < 2) return visible;
  const rank = new Map<string, number>();
  order.forEach((ref, position) => {
    const channel = index.get(ref);
    if (channel && !rank.has(channel.id)) rank.set(channel.id, position);
  });
  if (!visible.some(channel => rank.has(channel.id))) return visible;
  const unranked = Number.MAX_SAFE_INTEGER;
  return [...visible].sort((a, b) => (rank.get(a.id) ?? unranked) - (rank.get(b.id) ?? unranked));
}

export type ChannelMove = "up" | "down" | "top";

/**
 * Moves one channel inside the list the user currently sees (in display order) and returns the new
 * saved order. Only the channels up to the moved position are re-ranked, at the front of the saved
 * list: ranked channels are shown first, so the visible sequence becomes the moved one.
 */
export function reorderChannelOrder(saved: string[], visibleRefs: string[], ref: string, move: ChannelMove): string[] {
  const visible = [...new Set(visibleRefs.filter(Boolean))];
  const position = visible.indexOf(ref);
  const normalized = [...new Set(saved.filter(Boolean))];
  if (position < 0) return normalized;
  let prefix: string[];
  if (move === "up" && position > 0) prefix = [...visible.slice(0, position - 1), ref, visible[position - 1]];
  else if (move === "down" && position < visible.length - 1) prefix = [...visible.slice(0, position), visible[position + 1], ref];
  else if (move === "top" && position > 0) prefix = [ref];
  else return normalized;
  const prefixSet = new Set(prefix);
  return [...prefix, ...normalized.filter(id => !prefixSet.has(id))];
}

export function recordTvPlayback(value: unknown, channel: IptvChannel, now = Date.now()): IptvTvSession {
  const session = normalizeTvSession(value);
  const id = channel.cloudId || channel.id;
  const aliases = new Set([channel.id, id, ...(channel.syncAliases ?? [])]);
  return { ...session, lastChannelId: id, lastGroupName: channel.group, lastFocusedZone: "GUIDE", lastOpenedAt: now,
    recentChannelIds: [...session.recentChannelIds.filter(previous => !aliases.has(previous)), id].slice(-40) };
}

export function mergeTvSessions(remote: unknown, local: unknown): IptvTvSession {
  const a = normalizeTvSession(remote), b = normalizeTvSession(local);
  const [older, newer] = a.lastOpenedAt > b.lastOpenedAt ? [b, a] : [a, b];
  // Preserve plays made on another device while this browser was offline.
  return { ...newer, recentChannelIds: [...older.recentChannelIds.filter(id => !newer.recentChannelIds.includes(id)),
    ...newer.recentChannelIds].slice(-40) };
}
