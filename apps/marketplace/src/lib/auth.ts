import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { getPool } from "@selectcars/db";

/**
 * Better Auth server instance.
 *
 * A tenant is an `organization` (organization plugin), so the active org id is the
 * `tenant_id` used by RLS. See docs/adr/001-rls-multi-tenancy.md. Auth tables are
 * owned by the connecting `postgres` role and are intentionally not under RLS.
 */
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
  plugins: [organization()],
});
