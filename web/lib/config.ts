import { readPublicConfig, type PublicConfig } from "./publicConfig";

function envValue(value: string | undefined, fallback = "") {
  return value && !value.startsWith("$") && !value.includes("****")
    ? value
    : fallback;
}

const streamnetBackendUrl = envValue(
  process.env.STREAMNET_BACKEND_URL,
  "https://auth.mystreamnet.club",
).replace(/\/+$/, "");

// The server reads its environment; the browser gets the same values from the page (app/layout.tsx).
const runtime: PublicConfig =
  typeof window === "undefined"
    ? readPublicConfig(process.env)
    : { ...readPublicConfig({}), ...window.__STREAMNET_CONFIG__ };

export const config = {
  selfHosted: true,
  sportsMetadataUrl: runtime.sportsMetadataUrl,
  backendUrl: streamnetBackendUrl,
  streamnetTvXtreamUrl: runtime.streamnetTvXtreamUrl,
  mediaResolverUrl: runtime.mediaResolverUrl,
  resolverUrl: runtime.resolverUrl,
  traktClientId: runtime.traktClientId,
  // OAuth secrets belong only on the server, never in the browser bundle.
  traktClientSecret: "",
  simklClientId: runtime.simklClientId,
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
