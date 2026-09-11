import type { EpisodeInfo, MediaItem } from "../types";
import { aniListResolver } from "./anilist";
import { tvdbResolver } from "./tvdb";
import { tmdbResolver } from "./tmdbResolver";
import type { MetadataLookup, MetadataMediaType, MetadataProviderId, MetadataResolver, ProviderPriorityConfig } from "./types";

export class MetadataDispatcher {
  private static resolvers: Record<string, MetadataResolver> = {
    anilist: aniListResolver,
    tvdb: tvdbResolver,
    tmdb: tmdbResolver
  };

  static registerResolver(resolver: MetadataResolver) {
    this.resolvers[resolver.id] = resolver;
  }

  static getPriorityList(type: MetadataMediaType, config?: ProviderPriorityConfig): MetadataProviderId[] {
    if (type === "anime") {
      return config?.animeProviders ?? ["anilist", "tvdb", "tmdb"];
    }
    if (type === "tv") {
      return config?.tvProviders ?? ["tvdb", "tmdb"];
    }
    return config?.movieProviders ?? ["tmdb"];
  }

  static async getDetails(
    lookup: MetadataLookup,
    type: MetadataMediaType,
    config?: ProviderPriorityConfig
  ): Promise<MediaItem | null> {
    const priority = this.getPriorityList(type, config);

    for (const providerId of priority) {
      const resolver = this.resolvers[providerId];
      if (!resolver || !resolver.supportedTypes.includes(type)) continue;

      const id = typeof lookup === "object" ? lookup[providerId] : lookup;
      if (id == null || id === "") continue;
      const result = await resolver.getDetails(id, type, config).catch(() => null);
      if (result) {
        return result;
      }
    }
    return null;
  }

  static async getEpisodes(
    lookup: MetadataLookup,
    type: MetadataMediaType,
    seasonNumber = 1,
    config?: ProviderPriorityConfig
  ): Promise<EpisodeInfo[]> {
    const priority = this.getPriorityList(type, config);

    for (const providerId of priority) {
      const resolver = this.resolvers[providerId];
      if (!resolver || !resolver.getEpisodes || !resolver.supportedTypes.includes(type)) continue;

      const id = typeof lookup === "object" ? lookup[providerId] : lookup;
      if (id == null || id === "") continue;
      const episodes = await resolver.getEpisodes(id, seasonNumber, config).catch(() => []);
      if (episodes && episodes.length > 0) {
        return episodes;
      }
    }
    return [];
  }

  static async search(
    query: string,
    type: MetadataMediaType,
    config?: ProviderPriorityConfig
  ): Promise<MediaItem[]> {
    const priority = this.getPriorityList(type, config);

    for (const providerId of priority) {
      const resolver = this.resolvers[providerId];
      if (!resolver || !resolver.supportedTypes.includes(type)) continue;

      const results = await resolver.search(query, type, config).catch(() => []);
      if (results && results.length > 0) {
        return results;
      }
    }

    return [];
  }
}
