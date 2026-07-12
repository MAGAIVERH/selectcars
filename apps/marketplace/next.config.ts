import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compile the workspace TS packages (they ship raw .ts, no build step).
  transpilePackages: ["@selectcars/shared", "@selectcars/ui"],
  images: {
    // Local showroom photos are already web-sized (~250KB, ~750px wide), so the
    // optimizer adds no real benefit and its cold-start pass under Turbopack dev
    // was intermittently failing to serve some images. Serve them as-is instead.
    unoptimized: true,
  },
};

export default nextConfig;
