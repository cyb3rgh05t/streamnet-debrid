type GenreFanartEntry = {
  id?: number;
  name?: string;
  backdrops?: string[];
};

const tones: Record<string, [string, string]> = {
  red: ["991B1B", "FCA5A5"],
  darkred: ["1F2937", "F87171"],
  blue: ["032541", "01B4E4"],
  lightblue: ["1F2937", "60A5FA"],
  darkblue: ["1F2937", "2864D2"],
  orange: ["92400E", "FCD34D"],
  darkorange: ["552C01", "D47C1D"],
  green: ["087D29", "21CB51"],
  lightgreen: ["065F46", "6EE7B7"],
  purple: ["5B21B6", "C4B5FD"],
  darkpurple: ["480C8B", "A96BEF"],
  yellow: ["777E0D", "E4ED55"],
  pink: ["9D174D", "F9A8D4"],
  black: ["1F2937", "D1D5DB"],
};

const toneByGenreId: Record<number, string> = {
  28: "red",
  12: "darkpurple",
  16: "blue",
  35: "orange",
  80: "darkblue",
  99: "lightgreen",
  18: "pink",
  10751: "yellow",
  14: "lightblue",
  36: "orange",
  27: "black",
  10402: "blue",
  9648: "purple",
  10749: "pink",
  878: "lightblue",
  10770: "red",
  53: "black",
  10752: "darkred",
  37: "orange",
  10759: "darkpurple",
  10762: "blue",
  10763: "black",
  10764: "darkorange",
  10765: "lightblue",
  10766: "pink",
  10767: "lightgreen",
  10768: "darkred",
};

export async function loadGenreFanart(
  mediaType: "movie" | "tv",
  language: string,
): Promise<Map<number, string>> {
  const response = await fetch(
    `/api/genre-fanart/${mediaType}?language=${encodeURIComponent(language)}`,
  );
  if (!response.ok) return new Map();
  const entries = (await response.json()) as GenreFanartEntry[];
  const result = new Map<number, string>();
  for (const entry of Array.isArray(entries) ? entries : []) {
    const id = Number(entry.id ?? 0);
    const backdrops = Array.isArray(entry.backdrops) ? entry.backdrops : [];
    const path = backdrops[4] ?? backdrops.at(-1);
    if (!id || !path?.startsWith("/")) continue;
    const tone = tones[toneByGenreId[id] ?? "black"];
    result.set(
      id,
      `https://image.tmdb.org/t/p/w1280_filter(duotone,${tone[0]},${tone[1]})${path}`,
    );
  }
  return result;
}
