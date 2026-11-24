/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  output: "standalone",
  // Build facts shown in the app and used by the update check; the value is fixed when the image is built.
  env: {
    BUILD_STAMP: process.env.BUILD_STAMP ?? "",
    APK_VERSION: process.env.APK_VERSION ?? "",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "**" },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        os: false,
        path: false,
        zlib: false,
        http: false,
        https: false,
        stream: false,
        crypto: false,
        perf_hooks: false,
      };
    }
    return config;
  },
};

export default nextConfig;
