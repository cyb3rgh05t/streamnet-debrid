export interface AniZipMapping {
  anilistId?: number;
  malId?: number;
  tvdbId?: number;
  tmdbId?: number;
  imdbId?: string;
}

function numericId(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

async function fetchAniZipMappingBy(query: "anilist_id" | "themoviedb_id", id: number): Promise<AniZipMapping | null> {
  try {
    const res = await fetch(`https://api.ani.zip/mappings?${query}=${id}`);
    if (!res.ok) return null;

    const data = await res.json();
    const mappings = data.mappings;
    if (!mappings) return null;

    return {
      anilistId: numericId(mappings.anilist_id) ?? (query === "anilist_id" ? id : undefined),
      malId: numericId(mappings.mal_id),
      tvdbId: numericId(mappings.thetvdb_id),
      tmdbId: numericId(mappings.themoviedb_id) ?? (query === "themoviedb_id" ? id : undefined),
      imdbId: mappings.imdb_id,
    };
  } catch {
    return null;
  }
}

export function fetchAniZipMapping(anilistId: number): Promise<AniZipMapping | null> {
  return fetchAniZipMappingBy("anilist_id", anilistId);
}

export function fetchAniZipMappingByTmdbId(tmdbId: number): Promise<AniZipMapping | null> {
  return fetchAniZipMappingBy("themoviedb_id", tmdbId);
}
