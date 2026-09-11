import type { EpisodeInfo, MediaItem } from "../types";
import { getBasicItem, getSeasonEpisodes, searchMedia } from "../tmdb";
import type { MetadataMediaType, MetadataResolver, ProviderPriorityConfig } from "./types";

export const tmdbResolver: MetadataResolver = {
  id: "tmdb",
  name: "TMDB",
  supportedTypes: ["movie", "tv", "anime"],

  async getDetails(id: string | number, mediaType?: MetadataMediaType, _options?: ProviderPriorityConfig): Promise<MediaItem | null> {
    const numericId = Number(id);
    if (isNaN(numericId) || numericId <= 0) return null;

    const targetType = mediaType === "movie" ? "movie" : "tv";
    return getBasicItem(targetType, numericId).catch(() => null);
  },

  async getEpisodes(id: string | number, seasonNumber = 1, _options?: ProviderPriorityConfig): Promise<EpisodeInfo[]> {
    const numericId = Number(id);
    if (isNaN(numericId) || numericId <= 0) return [];
    return getSeasonEpisodes(numericId, seasonNumber).catch(() => []);
  },

  async search(query: string, _mediaType?: MetadataMediaType, _options?: ProviderPriorityConfig): Promise<MediaItem[]> {
    return searchMedia(query).catch(() => []);
  }
};
