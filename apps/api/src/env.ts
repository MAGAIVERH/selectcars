import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { z } from "zod";

// Secrets live in the repo-root .env (single source of truth) for local dev. In
// containers and in production the platform injects real environment variables instead.
const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, "../../../.env") });

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    API_PORT: z.coerce.number().int().positive().default(3333),
    API_HOST: z.string().default("0.0.0.0"),
    // Marketplace/dashboard origin allowed by CORS (also where Better Auth sessions live).
    APP_ORIGIN: z.string().url().default("http://localhost:3000"),

    /**
     * The issuer's *identity*, matched against the `iss` and `aud` claims. It is a name,
     * not an address: it must equal the marketplace's BETTER_AUTH_URL exactly, or every
     * token is rejected.
     */
    AUTH_ISSUER_URL: z.string().url().default("http://localhost:3000"),

    /**
     * Where to *fetch* the issuer's public keys. Defaults to the issuer's own address, but
     * is separate on purpose: inside Docker, `localhost` is the container itself, so the
     * API must reach the host at `host.docker.internal` while the token still claims
     * `iss: http://localhost:3000`. Conflating the two would force us to weaken the
     * `iss` check to make containers work.
     */
    AUTH_JWKS_URL: z.string().url().optional(),
  })
  .transform((cfg) => ({
    ...cfg,
    jwksUrl: cfg.AUTH_JWKS_URL ?? `${cfg.AUTH_ISSUER_URL}/api/auth/jwks`,
  }));

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
