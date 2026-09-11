import type { EpisodeInfo, MediaItem } from "../types";
import type { MetadataMediaType, MetadataResolver, ProviderPriorityConfig } from "./types";


const TVDB_API_BASE = "https://api4.thetvdb.com/v4";

let cachedKey: string | null = null;
let cachedPin: string | null = null;
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getTvdbToken(apiKey?: string, pin?: string): Promise<string | null> {
  const cleanKey = apiKey?.trim();
  if (!cleanKey) {
    // TVDB is disabled unless user supplies a custom API key
    return null;
  }
  const cleanPin = pin?.trim() || undefined;

  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt && cachedKey === cleanKey && cachedPin === cleanPin) {
    return cachedToken;
  }

  try {
    const res = await fetch(`${TVDB_API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: cleanKey, pin: cleanPin })
    });

    if (!res.ok) return null;
    const json = await res.json();
    if (json.data?.token) {
      cachedKey = cleanKey;
      cachedPin = cleanPin ?? null;
      cachedToken = json.data.token;
      tokenExpiresAt = now + 23 * 3600 * 1000; // Cache 23 hours
      return cachedToken;
    }
  } catch {}
  return null;
}


export const tvdbResolver: MetadataResolver = {
  id: "tvdb",
  name: "TheTVDB",
  supportedTypes: ["tv", "anime"],

  async getDetails(id: string | number, _mediaType?: MetadataMediaType, options?: ProviderPriorityConfig): Promise<MediaItem | null> {
    const token = await getTvdbToken(options?.customTvdbApiKey, options?.customTvdbUserPin);
    if (!token) return null;

    try {
      const res = await fetch(`${TVDB_API_BASE}/series/${id}/extended`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) return null;
      const json = await res.json();
      const series = json.data;
      if (!series) return null;

      return {
        id: series.id,
        title: series.name ?? "Untitled Series",
        overview: series.overview ?? "",
        year: series.firstAired ? series.firstAired.slice(0, 4) : undefined,
        rating: series.score ? String(series.score) : undefined,
        mediaType: "tv",
        image: series.image ?? undefined,
        backdrop: series.image ?? null,
        genres: (series.genres ?? []).map((g: any) => g.name),
        status: series.status?.name ?? null
      };
    } catch {
      return null;
    }
  },

  async getEpisodes(id: string | number, seasonNumber = 1, options?: ProviderPriorityConfig): Promise<EpisodeInfo[]> {
    const token = await getTvdbToken(options?.customTvdbApiKey, options?.customTvdbUserPin);
    if (!token) return [];

    try {
      const allEpisodes: any[] = [];
      let page = 0;
      let totalPages = 1;

      while (page < totalPages && page < 50) {
        const res = await fetch(`${TVDB_API_BASE}/series/${id}/episodes/default?page=${page}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) break;
        const json = await res.json();
        const pageEpisodes = Array.isArray(json.data?.episodes)
          ? json.data.episodes
          : Array.isArray(json.data)
            ? json.data
            : [];
        if (pageEpisodes.length > 0) {
          allEpisodes.push(...pageEpisodes);
        } else {
          break;
        }

        if (json.links?.next) {
          totalPages = typeof json.links.total_pages === "number" ? json.links.total_pages : page + 2;
          page += 1;
        } else {
          break;
        }
      }

      return allEpisodes
        .filter((ep: any) => ep.seasonNumber === seasonNumber)
        .map((ep: any) => ({
          id: ep.id,
          episodeNumber: ep.number ?? 0,
          seasonNumber: ep.seasonNumber ?? 0,
          name: ep.name ?? `Episode ${ep.number}`,
          overview: ep.overview ?? "",
          still: ep.image ?? undefined,
          airDate: ep.aired ?? undefined,
          runtime: ep.runtime ?? undefined
        }));
    } catch {
      return [];
    }
  },

  async search(query: string, _mediaType?: MetadataMediaType, options?: ProviderPriorityConfig): Promise<MediaItem[]> {
    const token = await getTvdbToken(options?.customTvdbApiKey, options?.customTvdbUserPin);
    if (!token) return [];

    try {
      const res = await fetch(`${TVDB_API_BASE}/search?query=${encodeURIComponent(query)}&type=series`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) return [];

      const json = await res.json();
      const results = json.data ?? [];

      return results.map((item: any) => ({
        id: Number(item.tvdb_id || item.id),
        title: item.name ?? "Untitled",
        overview: item.overview ?? "",
        year: item.year ?? "",
        mediaType: "tv",
        image: item.image_url ?? undefined
      }));
    } catch {
      return [];
    }
  }
};
