import type { MediaItem } from "../types";
import type { MetadataMediaType, MetadataResolver } from "./types";

const ANILIST_GRAPHQL_ENDPOINT = "https://graphql.anilist.co";

const MEDIA_QUERY = `
query ($id: Int, $search: String) {
  Media(id: $id, search: $search, type: ANIME) {
    id
    idMal
    title {
      romaji
      english
      native
    }
    description
    bannerImage
    coverImage {
      extraLarge
      large
      medium
      color
    }
    format
    status
    episodes
    duration
    averageScore
    popularity
    genres
    season
    seasonYear
    studios(isMain: true) {
      nodes {
        id
        name
      }
    }
  }
}
`;

const SEARCH_QUERY = `
query ($search: String) {
  Page(page: 1, perPage: 20) {
    media(search: $search, type: ANIME) {
      id
      idMal
      title {
        romaji
        english
        native
      }
      description
      bannerImage
      coverImage {
        large
        medium
      }
      averageScore
      seasonYear
      episodes
    }
  }
}
`;

function mapAniListToMediaItem(media: any): MediaItem {
  const title = media.title?.english || media.title?.romaji || media.title?.native || "Untitled Anime";
  const poster = media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || null;
  const rating = media.averageScore ? (media.averageScore / 10).toFixed(1) : undefined;

  return {
    id: media.id,
    anilistId: media.id,
    title,
    subtitle: media.title?.romaji !== title ? media.title?.romaji : undefined,
    overview: media.description ? media.description.replace(/<[^>]*>?/gm, "") : "",
    year: media.seasonYear ? String(media.seasonYear) : undefined,
    rating,
    duration: media.duration ? `${media.duration}m` : undefined,
    mediaType: "tv",
    isAnime: true,
    image: poster ?? undefined,
    backdrop: media.bannerImage ?? poster ?? null,
    badge: media.format ?? "ANIME",
    genres: media.genres ?? [],
    status: media.status,
    numberOfEpisodes: media.episodes ?? null
  };
}

export const aniListResolver: MetadataResolver = {
  id: "anilist",
  name: "AniList",
  supportedTypes: ["anime"],

  async getDetails(id: string | number, _mediaType?: MetadataMediaType): Promise<MediaItem | null> {
    try {
      const isNumeric = !isNaN(Number(id));
      const variables = isNumeric ? { id: Number(id) } : { search: String(id) };

      const res = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: MEDIA_QUERY, variables })
      });

      if (!res.ok) return null;
      const json = await res.json();
      if (!json.data?.Media) return null;

      return mapAniListToMediaItem(json.data.Media);
    } catch {
      return null;
    }
  },

  async search(query: string, _mediaType?: MetadataMediaType): Promise<MediaItem[]> {
    try {
      const res = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: SEARCH_QUERY, variables: { search: query } })
      });

      if (!res.ok) return [];
      const json = await res.json();
      const items = json.data?.Page?.media ?? [];
      return items.map(mapAniListToMediaItem);
    } catch {
      return [];
    }
  }
};
