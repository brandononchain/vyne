import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Railway / Docker deployments — bundles everything
  // into .next/standalone so `node server.js` works without node_modules.
  output: "standalone",
};

export default nextConfig;
