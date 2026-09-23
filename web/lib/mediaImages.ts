export function tmdbImageUrl(base: string, value?: string | null) {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `${base}${value.startsWith("/") ? value : `/${value}`}`;
}

export function tmdbOriginalBackdropUrl(value?: string | null) {
  if (!value) return "";
  return value.replace(
    /https?:\/\/image\.tmdb\.org\/t\/p\/w\d+/i,
    "https://image.tmdb.org/t/p/original",
  );
}
