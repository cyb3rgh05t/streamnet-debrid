import type { EpisodeInfo, MediaItem, MediaType } from "../types";

export type MetadataProviderId = "tmdb" | "tvdb" | "anilist" | "kitsu" | "mal" | "omdb";
export type MetadataMediaType = MediaType | "anime";
export type MetadataLookupIds = Partial<Record<MetadataProviderId, string | number | null>>;
export type MetadataLookup = string | number | MetadataLookupIds;

export interface MetadataResolver {
  id: MetadataProviderId;
  name: string;
  supportedTypes: MetadataMediaType[];

  getDetails(id: string | number, mediaType: MetadataMediaType, options?: ProviderPriorityConfig): Promise<MediaItem | null>;
  getEpisodes?(id: string | number, seasonNumber?: number, options?: ProviderPriorityConfig): Promise<EpisodeInfo[]>;
  search(query: string, mediaType: MetadataMediaType, options?: ProviderPriorityConfig): Promise<MediaItem[]>;
}


export interface ProviderPriorityConfig {
  movieProviders: MetadataProviderId[];
  tvProviders: MetadataProviderId[];
  animeProviders: MetadataProviderId[];
  customTmdbApiKey?: string;
  customTvdbApiKey?: string;
  customTvdbUserPin?: string;
}
