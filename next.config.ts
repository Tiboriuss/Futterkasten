import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  // Use relative URLs for assets to work with HA Ingress
  assetPrefix: ".",
};

export default nextConfig;
