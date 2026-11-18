// Region TMDB is asked about when listing what a streaming service offers. Mirrors the Android
// app (StreamingRegion.kt) so the choice survives cloud sync.
export const STREAMING_REGION_AUTO = "auto";

export const STREAMING_REGION_CODES = [
  "DE", "AT", "CH", "US", "GB", "FR", "NL", "BE", "ES", "IT", "PT", "PL",
  "SE", "NO", "DK", "FI", "IE", "CA", "AU", "BR", "MX", "TR",
] as const;

export function normalizeStreamingRegionSetting(raw: unknown): string {
  const value = String(raw ?? "").trim().toUpperCase();
  return (STREAMING_REGION_CODES as readonly string[]).includes(value)
    ? value
    : STREAMING_REGION_AUTO;
}

/** The user's choice, else the country of the language ("de-DE" -> "DE"), else US. */
export function effectiveStreamingRegion(setting: unknown, language: string): string {
  const chosen = normalizeStreamingRegionSetting(setting);
  if (chosen !== STREAMING_REGION_AUTO) return chosen;
  const country = String(language ?? "").split("-")[1]?.toUpperCase() ?? "";
  return /^[A-Z]{2}$/.test(country) ? country : "US";
}

export function streamingRegionDisplayName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
