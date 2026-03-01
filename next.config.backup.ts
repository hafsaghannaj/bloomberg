import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // For iOS build: run `npm run ios:build` which sets output: export
  // For dev/browser: no output setting needed (uses API routes)
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
