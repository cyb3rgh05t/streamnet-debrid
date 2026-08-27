export const preferredCatalogOrder = [
  "continue_watching",
  "recent_tv",
  "favorite_tv",
  "collection_rail_service",
  "collection_rail_franchise",
  "trending_movies",
  "top10_movies_today",
  "top_movies_week",
  "collection_rail_movie_genre",
  "trending_tv",
  "top10_shows_today",
  "collection_rail_tv_genre",
  "trending_anime",
  "coming_soon",
  "just_added",
];

const preferredRank = new Map(
  preferredCatalogOrder.map((catalogId, index) => [catalogId, index]),
);

function isAddonCatalog(catalog) {
  return (
    String(catalog?.sourceType || "").toUpperCase() === "ADDON" ||
    String(catalog?.id || "").startsWith("addon_")
  );
}

export function reorderCatalogs(catalogs) {
  return catalogs
    .map((catalog, index) => ({ catalog, index }))
    .sort((left, right) => {
      const leftRank = preferredRank.get(left.catalog?.id);
      const rightRank = preferredRank.get(right.catalog?.id);
      const leftGroup = leftRank !== undefined ? 0 : isAddonCatalog(left.catalog) ? 2 : 1;
      const rightGroup = rightRank !== undefined ? 0 : isAddonCatalog(right.catalog) ? 2 : 1;
      if (leftGroup !== rightGroup) return leftGroup - rightGroup;
      if (leftGroup === 0 && leftRank !== rightRank) return leftRank - rightRank;
      return left.index - right.index;
    })
    .map(({ catalog }) => catalog);
}

export function reorderCatalogsByProfile(payload, updatedAtMillis) {
  const catalogsByProfile = payload?.catalogsByProfile;
  if (!catalogsByProfile || typeof catalogsByProfile !== "object") return [];

  const timestamps =
    payload.catalogsUpdatedAtByProfile &&
    typeof payload.catalogsUpdatedAtByProfile === "object"
      ? payload.catalogsUpdatedAtByProfile
      : {};
  const changes = [];

  for (const [profileId, catalogs] of Object.entries(catalogsByProfile)) {
    if (!Array.isArray(catalogs)) continue;
    const reordered = reorderCatalogs(catalogs);
    const before = catalogs.map((catalog) => String(catalog?.id || ""));
    const after = reordered.map((catalog) => String(catalog?.id || ""));
    if (before.every((catalogId, index) => catalogId === after[index])) continue;
    catalogsByProfile[profileId] = reordered;
    timestamps[profileId] = updatedAtMillis;
    changes.push({ profileId, before, after });
  }

  if (changes.length > 0) payload.catalogsUpdatedAtByProfile = timestamps;
  return changes;
}