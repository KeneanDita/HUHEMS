import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent incorrect monorepo root inference when other lockfiles exist.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
