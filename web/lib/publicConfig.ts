// Settings the browser needs. They are read from the server environment on every request and handed
// to the page (see app/layout.tsx), so changing the .env needs a restart, not a rebuild.
export interface PublicConfig {
  sportsMetadataUrl: string;
  streamnetTvXtreamUrl: string;
  mediaResolverUrl: string;
  resolverUrl: string;
  traktClientId: string;
  simklClientId: string;
}

declare global {
  interface Window {
    __STREAMNET_CONFIG__?: Partial<PublicConfig>;
  }
}

function envValue(value: string | undefined, fallback = "") {
  return value && !value.startsWith("$") && !value.includes("****")
    ? value
    : fallback;
}

export function readPublicConfig(
  env: Record<string, string | undefined>,
): PublicConfig {
  return {
    sportsMetadataUrl: env.SPORTS_METADATA_URL ?? "",
    streamnetTvXtreamUrl: envValue(
      env.STREAMNET_TV_XTREAM_URL,
      "https://xyzxyz.streamnet.live",
    ).replace(/\/+$/, ""),
    mediaResolverUrl: envValue(
      env.STREAMNET_MEDIA_RESOLVER_URL,
      "https://resolve.streamnet.live",
    ).replace(/\/+$/, ""),
    resolverUrl: envValue(env.ARVIO_RESOLVER_URL, ""),
    traktClientId: env.TRAKT_CLIENT_ID ?? "",
    simklClientId: env.SIMKL_CLIENT_ID ?? "",
  };
}

// Safe inside an inline <script>: "<" cannot close the tag and the line separators cannot end the string.
export function serializePublicConfig(config: PublicConfig): string {
  return JSON.stringify(config)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
