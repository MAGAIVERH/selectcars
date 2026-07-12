import type { NextConfig } from "next";
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Monorepo: secrets live in the repo-root .env (single source of truth). Next only
// auto-loads .env from the app dir, so load the root one here for local dev. In
// production the host (Vercel) provides these as real environment variables.
const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, "../../.env") });

const nextConfig: NextConfig = {
  // Compile the workspace TS packages (they ship raw .ts, no build step).
  transpilePackages: ["@selectcars/shared", "@selectcars/ui", "@selectcars/db"],
  // Keep the native pg driver out of the server bundle.
  serverExternalPackages: ["pg"],
  images: {
    // Local showroom photos are already web-sized (~250KB, ~750px wide), so the
    // optimizer adds no real benefit and its cold-start pass under Turbopack dev
    // was intermittently failing to serve some images. Serve them as-is instead.
    unoptimized: true,
  },
};

export default nextConfig;
