import type { PoolClient } from "pg";
import { getPool } from "./pool";

/**
 * Non-bypass Postgres role that all tenant-scoped business queries run as.
 * The connecting role (`postgres`) has `rolbypassrls`, so it must drop into this
 * role for Row-Level Security to actually apply. See docs/adr/001-rls-multi-tenancy.md.
 */
export const APP_ROLE = "selectcars_app";

/**
 * Run `fn` inside a transaction bound to a single tenant.
 *
 * It drops privileges to {@link APP_ROLE} and sets the `app.current_tenant` GUC,
 * so every query inside sees only rows for `tenantId`. Cross-tenant reads return
 * nothing and cross-tenant writes fail the RLS `WITH CHECK`, at the database.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  if (!tenantId) {
    throw new Error("withTenant requires a tenantId (active organization id).");
  }

  const client = await getPool().connect();
  try {
    await client.query("begin");
    // Role name cannot be parameterized; APP_ROLE is a trusted constant.
    await client.query(`set local role ${APP_ROLE}`);
    await client.query("select set_config('app.current_tenant', $1, true)", [tenantId]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}
