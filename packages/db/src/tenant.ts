import type { PoolClient } from "pg";
import { getPool } from "./pool";

/**
 * Non-bypass Postgres role that all tenant-scoped business queries run as.
 * The connecting role (`postgres`) has `rolbypassrls`, so it must drop into this
 * role for Row-Level Security to actually apply. See docs/adr/001-rls-multi-tenancy.md.
 */
export const APP_ROLE = "selectcars_app";

/**
 * Non-bypass role used for anonymous, public marketplace reads. It has no tenant context
 * and is granted only what a buyer may see: `active` listings, select-only.
 */
export const PUBLIC_ROLE = "selectcars_public";

/** Who is acting, and on behalf of which tenant. Both are set as transaction-local GUCs. */
export type TenantScope = {
  tenantId: string;
  /** User id of the caller, recorded by the audit trigger. Omit for system jobs. */
  actorUserId?: string | null;
};

/**
 * Run `fn` inside a transaction bound to a single tenant.
 *
 * It drops privileges to {@link APP_ROLE} and sets `app.current_tenant` (read by every
 * RLS policy) and `app.current_actor` (read by the audit trigger), so every query inside
 * sees only rows for this tenant. Cross-tenant reads return nothing and cross-tenant
 * writes fail the RLS `WITH CHECK`, at the database.
 *
 * Accepts either a bare tenant id or a {@link TenantScope}: without an actor, mutations
 * are still audited, just without attribution.
 */
/**
 * Run `fn` as the anonymous public role: the marketplace's read path.
 *
 * There is no tenant here, by design: a buyer browses across every dealership. Safety comes
 * from the role instead. {@link PUBLIC_ROLE} can only `select`, and its RLS policy admits
 * only `status = 'active'` rows, so a careless public query still cannot expose a draft or
 * a sold car. The marketplace is the surface an attacker reaches without credentials, so it
 * gets the narrowest role in the system.
 */
export async function withPublic<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query(`set local role ${PUBLIC_ROLE}`);
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

export async function withTenant<T>(
  scope: string | TenantScope,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const { tenantId, actorUserId = null } = typeof scope === "string" ? { tenantId: scope } : scope;

  if (!tenantId) {
    throw new Error("withTenant requires a tenantId (active organization id).");
  }

  const client = await getPool().connect();
  try {
    await client.query("begin");
    // Role name cannot be parameterized; APP_ROLE is a trusted constant.
    await client.query(`set local role ${APP_ROLE}`);
    await client.query("select set_config('app.current_tenant', $1, true)", [tenantId]);
    await client.query("select set_config('app.current_actor', $1, true)", [actorUserId ?? ""]);
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
