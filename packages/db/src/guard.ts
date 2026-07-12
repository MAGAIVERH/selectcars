/**
 * Target guard.
 *
 * SELECTCARS talks to exactly one database: its Supabase project. This machine also has
 * other projects with other databases (a Neon instance, among others), and a generic
 * `DATABASE_URL` exported in the shell once caused a migration to run against the wrong
 * one. Renaming the variable removed that specific collision; this guard removes the
 * whole class of mistake.
 *
 * Nothing that writes to the database may run without passing through here first.
 */

/** The only host family this project is ever allowed to write to. */
const ALLOWED_HOST_PATTERN = /(^|\.)supabase\.(co|com)$/i;

export type ConnectionTarget = {
  host: string;
  database: string;
  user: string;
};

/** Parse a connection string without leaking the password into logs or errors. */
export function describeTarget(connectionString: string): ConnectionTarget {
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    database: url.pathname.replace(/^\//, ""),
    user: decodeURIComponent(url.username),
  };
}

/**
 * Throw unless `connectionString` points at this project's Supabase database.
 *
 * Call this before opening any connection that can write. It is deliberately a hard
 * failure, not a warning: a migration pointed at the wrong database is not something to
 * recover from at runtime.
 */
export function assertSelectcarsDatabase(connectionString: string): ConnectionTarget {
  const target = describeTarget(connectionString);

  if (!ALLOWED_HOST_PATTERN.test(target.host)) {
    throw new Error(
      [
        "Refusing to run against a non-SELECTCARS database.",
        `  host:     ${target.host}`,
        `  database: ${target.database}`,
        "",
        "SELECTCARS only ever writes to its Supabase project. This host is something else",
        "(another project's database, most likely). Check SELECTCARS_DATABASE_URL.",
      ].join("\n"),
    );
  }

  return target;
}
