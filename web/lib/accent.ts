export const ACCENTS: Record<string, string> = {
  White: "#ffffff",
  Red: "#ff4444",
  Orange: "#ff8800",
  Yellow: "#ffdd44",
  Green: "#44cc44",
  Blue: "#4488ff",
  Indigo: "#6644cc",
  Violet: "#bb44cc",
};

const LEGACY_ACCENT_NAMES: Record<string, string> = {
  white: "White",
  red: "Red",
  orange: "Orange",
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
  indigo: "Indigo",
  violet: "Violet",
  purple: "Violet",
  arctic: "White",
  gold: "Orange",
};

export function normalizeAccentName(value: unknown): string {
  const raw = String(value ?? "").trim();
  return ACCENTS[raw]
    ? raw
    : (LEGACY_ACCENT_NAMES[raw.toLowerCase()] ?? "Orange");
}

export function accentColor(value: string): string {
  return ACCENTS[normalizeAccentName(value)] ?? ACCENTS.Orange;
}

export function accentProfileColor(value: string): number {
  return (0xff000000 | Number.parseInt(accentColor(value).slice(1), 16)) >>> 0;
}
