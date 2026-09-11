export const streamnetBrandTheme = {
  brand: {
    name: "StreamNet",
    accent: "#5EEAD4",
    accentStrong: "#2DD4BF",
    background: "#0B1020",
    surface: "#121A2B",
    surfaceAlt: "#182336",
    textPrimary: "#F3F4F6",
    textSecondary: "#A5B4C5",
    textMuted: "#7A889A",
    border: "#253247",
    focusRing: "#7DD3FC",
  },
  player: {
    controlsBackground: "rgba(11, 16, 32, 0.78)",
    overlayOpacity: 0.9,
    progressAccent: "#5EEAD4",
  },
  status: {
    success: "#34D399",
    warn: "#FBBF24",
    error: "#F87171",
    info: "#60A5FA",
  },
} as const;

export type StreamNetBrandTheme = typeof streamnetBrandTheme;
