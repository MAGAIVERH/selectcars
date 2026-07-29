import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { z } from "zod";

// Secrets live in the repo-root .env (single source of truth) for local dev. In
// containers and in production the platform injects real environment variables instead.
const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, "../../../.env") });

/**
 * An optional setting, where **an empty value means "not set"**.
 *
 * `.optional()` alone only accepts `undefined`, and env files do not deal in undefined: a
 * variable that is present but blank (`SUPABASE_SERVICE_ROLE_KEY=`) arrives as `""`. Without
 * this, a placeholder line someone left in `.env` fails validation and the API refuses to
 * boot, which is the opposite of the graceful degradation the optional settings exist for.
 * Learned the hard way: an empty key took the whole service down.
 */
function optionalConfig<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => (value === "" ? undefined : value), schema.optional());
}

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

    /**
     * Photo storage (Supabase Storage). Optional on purpose: without it the API still boots
     * and everything except uploading a photo works, and the photo endpoints answer 503
     * naming what is missing. Refusing to boot would take the marketplace down over one
     * feature.
     *
     * The service-role key bypasses RLS, so it lives only here, in the API process. It is
     * never sent to a browser: the browser receives a signed ticket for one object instead.
     */
    SUPABASE_URL: optionalConfig(z.string().url()),
    SUPABASE_SERVICE_ROLE_KEY: optionalConfig(z.string().min(20)),
    SUPABASE_STORAGE_BUCKET: z.string().default("vehicle-photos"),

    /**
     * The queue. Insights are computed by a worker off this Redis, never inside a request.
     * Optional like storage: without it the API still serves everything else and the insight
     * endpoints answer 503 naming what is missing.
     */
    REDIS_URL: optionalConfig(z.string().url()),

    /**
     * The language model that writes the sentence over an insight's numbers.
     *
     * Off by default, and the feature works without it: the arithmetic and the headline are
     * computed either way, and `narrative` simply stays null. This is the project's rule for
     * anything expensive or key-bound: a demo must work with it switched off.
     */
    ENABLE_AI_INSIGHTS: z
      .union([z.literal("true"), z.literal("false")])
      .default("false")
      .transform((value) => value === "true"),
    ANTHROPIC_API_KEY: optionalConfig(z.string().min(10)),
  })
  .transform((cfg) => ({
    ...cfg,
    jwksUrl: cfg.AUTH_JWKS_URL ?? `${cfg.AUTH_ISSUER_URL}/api/auth/jwks`,
  }));

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
