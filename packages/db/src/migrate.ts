import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { readdirSync, readFileSync } from "node:fs";
import { Pool } from "pg";
import { assertSelectcarsDatabase } from "./guard";

const here = dirname(fileURLToPath(import.meta.url));
// Secrets live in the repo-root .env (single source of truth for local dev).
loadEnv({ path: resolve(here, "../../../.env") });

async function main(): Promise<void> {
  const connectionString = process.env.SELECTCARS_DATABASE_URL;
  if (!connectionString) throw new Error("SELECTCARS_DATABASE_URL is not set.");

  // Refuse to touch anything that is not this project's Supabase database, and say out
  // loud where we are about to write. A migration that lands in the wrong database is not
  // an error to recover from: it is one to never make.
  const target = assertSelectcarsDatabase(connectionString);
  console.log(`target: ${target.user}@${target.host}/${target.database}\n`);

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();
  try {
    await client.query(`create table if not exists public._migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )`);

    const migrationsDir = resolve(here, "../migrations");
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const applied = await client.query("select 1 from public._migrations where name = $1", [
        file,
      ]);
      if (applied.rowCount) {
        console.log(`skip   ${file}`);
        continue;
      }

      const sql = readFileSync(join(migrationsDir, file), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into public._migrations (name) values ($1)", [file]);
        await client.query("commit");
        console.log(`apply  ${file}`);
      } catch (err) {
        await client.query("rollback");
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
      }
    }
    console.log("migrations up to date.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
