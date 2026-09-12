export const ACCENTS: Record<string, string> = {
  orange: "#e5a209",
  arctic: "#f2f2f2",
  green: "#32c76f",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  red: "#e50914",
};

export function accentColor(value: string): string {
  return ACCENTS[value] ?? ACCENTS.orange;
}

export function accentProfileColor(value: string): number {
  return (0xff000000 | Number.parseInt(accentColor(value).slice(1), 16)) >>> 0;
}
