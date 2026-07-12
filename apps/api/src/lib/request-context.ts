import type { FastifyRequest } from "fastify";
import type { AuthenticatedUser } from "@selectcars/shared";

/** An authenticated caller who also has an active tenant. */
export type TenantContext = AuthenticatedUser & { tenantId: string };

/**
 * Narrow `request.auth` after the `authenticate` hook has run.
 *
 * The hook guarantees this, but Fastify's decorator typing cannot express "this hook ran",
 * so without a helper every route ends up sprinkled with `!`. Throwing here is a
 * programmer error (a route wired without the hook), not a request error.
 */
export function requireAuth(request: FastifyRequest): AuthenticatedUser {
  const auth = request.auth;
  if (!auth) {
    throw new Error("Route is missing the `authenticate` hook: request.auth is not set.");
  }
  return auth;
}

/** Same, for routes behind `requireTenant`, where the tenant id is guaranteed too. */
export function requireTenantContext(request: FastifyRequest): TenantContext {
  const auth = requireAuth(request);
  if (!auth.tenantId) {
    throw new Error("Route is missing the `requireTenant` hook: no tenant on request.auth.");
  }
  return { ...auth, tenantId: auth.tenantId };
}
