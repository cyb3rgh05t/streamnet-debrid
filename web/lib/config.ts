function envValue(value: string | undefined, fallback = "") {
  return value && !value.startsWith("$") && !value.includes("****")
    ? value
    : fallback;
}

const streamnetBackendUrl = envValue(
  process.env.STREAMNET_BACKEND_URL,
  "https://auth.mystreamnet.club",
).replace(/\/+$/, "");

export const config = {
  selfHosted: true,
  sportsMetadataUrl: process.env.NEXT_PUBLIC_SPORTS_METADATA_URL ?? "",
  backendUrl: streamnetBackendUrl,
  streamnetTvXtreamUrl: envValue(
    process.env.NEXT_PUBLIC_STREAMNET_TV_XTREAM_URL,
    "https://xui.streamnet.live",
  ).replace(/\/+$/, ""),
  mediaResolverUrl: envValue(
    process.env.NEXT_PUBLIC_STREAMNET_MEDIA_RESOLVER_URL,
    "",
  ).replace(/\/+$/, ""),
  resolverUrl: envValue(process.env.NEXT_PUBLIC_ARVIO_RESOLVER_URL, ""),
  traktClientId: process.env.NEXT_PUBLIC_TRAKT_CLIENT_ID ?? "",
  // OAuth secrets belong only on the server, never in the browser bundle.
  traktClientSecret: "",
  simklClientId:
    process.env.NEXT_PUBLIC_SIMKL_CLIENT_ID ||
    process.env.SIMKL_CLIENT_ID ||
    "",
  imageBase: "https://image.tmdb.org/t/p/w780",
  backdropBase: "https://image.tmdb.org/t/p/w1280",
  backdropOriginal: "https://image.tmdb.org/t/p/original",
};

export function hasCloudBackendConfig() {
  return Boolean(config.backendUrl && config.backendUrl.startsWith("http"));
}

export function hasResolverConfig() {
  return (
    config.resolverUrl.startsWith("https://") ||
    config.resolverUrl.startsWith("http://localhost:")
  );
}

export function hasTraktConfig() {
  return (
    hasCloudBackendConfig() ||
    (config.traktClientId.length > 10 && !config.traktClientId.startsWith("__"))
  );
}

export function hasSimklConfig() {
  return (
    hasCloudBackendConfig() ||
    (config.simklClientId.length > 10 && !config.simklClientId.startsWith("__"))
  );
}

export function getAuthPortalUrl(): string {
  return config.backendUrl;
}
