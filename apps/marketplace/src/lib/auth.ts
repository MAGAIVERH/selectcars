import { betterAuth } from "better-auth";
import { organization, jwt } from "better-auth/plugins";
import { getPool } from "@selectcars/db";
import { dealershipRoleSchema, type DealershipRole } from "@selectcars/shared";

/**
 * Better Auth server instance. This app is the identity issuer for the whole system.
 *
 * A tenant is an `organization` (organization plugin), so the active org id is the
 * `tenant_id` used by RLS. See docs/adr/001-rls-multi-tenancy.md. Auth tables are
 * owned by the connecting `postgres` role and are intentionally not under RLS.
 *
 * The `jwt` plugin publishes a JWKS at `/api/auth/jwks` and mints short-lived access
 * tokens at `/api/auth/token`. The Fastify API verifies those tokens with the public
 * key: no shared secret, no coupling to the session schema. See ADR 002.
 */

/** The caller's role in their active dealership, read at token-mint time. */
async function getActiveRole(
  userId: string,
  organizationId: string,
): Promise<DealershipRole | null> {
  const result = await getPool().query<{ role: string }>(
    'select "role" from "member" where "userId" = $1 and "organizationId" = $2 limit 1',
    [userId, organizationId],
  );

  const raw = result.rows[0]?.role;
  if (!raw) return null;

  // Better Auth's organization plugin ships owner/admin/member. Map them onto the
  // SELECTCARS role set, which is what the permission model is written against.
  const normalized = raw === "admin" ? "manager" : raw === "member" ? "salesperson" : raw;
  const parsed = dealershipRoleSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: getPool(),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    session: {
      create: {
        // Carry the user's active tenant on the session so RLS has a tenant id.
        before: async (session) => {
          const result = await getPool().query<{ organizationId: string }>(
            'select "organizationId" from "member" where "userId" = $1 order by "createdAt" asc limit 1',
            [session.userId],
          );
          return {
            data: { ...session, activeOrganizationId: result.rows[0]?.organizationId ?? null },
          };
        },
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  plugins: [
    organization(),
    jwt({
      jwt: {
        // Short-lived: a revoked membership stops mattering within minutes, and the API
        // stays stateless (no session lookup on the hot path).
        expirationTime: "5m",
        definePayload: async ({ user, session }) => {
          const activeOrganizationId =
            typeof session.activeOrganizationId === "string" ? session.activeOrganizationId : null;

          return {
            email: user.email,
            name: user.name,
            activeOrganizationId,
            role: activeOrganizationId ? await getActiveRole(user.id, activeOrganizationId) : null,
          };
        },
      },
    }),
  ],
});
