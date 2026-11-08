import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  // Internal packages ship TypeScript source, so Next compiles them as part of
  // the app instead of requiring a build step before dev.
  transpilePackages: ["@loopnote/schemas"],
};

export default nextConfig;
