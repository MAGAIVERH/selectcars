import { Pool } from "pg";

let pool: Pool | undefined;

/**
 * Lazily created singleton pg Pool.
 *
 * Reads DATABASE_URL (the Supabase session pooler URL) at first use, so the
 * caller only needs the env var present by the time a query runs, not at import.
 */
export function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.SELECTCARS_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "SELECTCARS_DATABASE_URL is not set (expected the Supabase session pooler URL).",
    );
  }

  pool = new Pool({
    connectionString,
    // Supabase requires TLS. The pooler presents a valid cert, but we skip strict
    // verification locally to avoid bundling the Supabase CA into dev tooling.
    ssl: { rejectUnauthorized: false },
    max: 10,
  });

  return pool;
}
