import { streamnetBrandTheme } from "../theme/branding";

export interface StreamNetWebPlayerConfig {
  appName: string;
  backendBaseUrl: string;
  cloudSyncBaseUrl: string;
  defaultProfileId?: string;
  theme?: typeof streamnetBrandTheme;
  enableCloudSync?: boolean;
  enableDebugLogging?: boolean;
}

export const defaultStreamNetWebPlayerConfig: StreamNetWebPlayerConfig = {
  appName: "StreamNet",
  backendBaseUrl: "https://auth.mystreamnet.club",
  cloudSyncBaseUrl: "https://auth.mystreamnet.club",
  defaultProfileId: undefined,
  theme: streamnetBrandTheme,
  enableCloudSync: true,
  enableDebugLogging: false,
};

export function resolveStreamNetWebPlayerConfig(
  config: Partial<StreamNetWebPlayerConfig> = {},
): StreamNetWebPlayerConfig {
  return {
    ...defaultStreamNetWebPlayerConfig,
    ...config,
    theme: config.theme ?? defaultStreamNetWebPlayerConfig.theme,
  };
}
