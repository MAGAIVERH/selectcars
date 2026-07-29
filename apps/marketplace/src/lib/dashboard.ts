import { getPool } from "@selectcars/db";
import type { TeamMember } from "@selectcars/shared";

/** The dealership the signed-in user is acting for, with their role in it. */
export type ActiveDealership = { name: string; role: string };

/**
 * Resolve the active dealership's name and the caller's role, for the dashboard chrome.
 * The tenant id itself comes from the session; this only adds the human-readable label.
 */
/**
 * Everyone in the dealership, for assigning leads.
 *
 * Read straight from the database rather than through the API, like the dealership name
 * above: members live in the auth tables, where the API's `selectcars_app` role holds no
 * grant on purpose. So the API returns the assignee's **id**, and this app, which is the
 * identity issuer and already owns those tables, turns ids into names.
 */
export async function getTeamMembers(organizationId: string): Promise<TeamMember[]> {
  const result = await getPool().query<TeamMember>(
    `select m."userId" as "userId", u."name" as name, m."role" as role
       from "member" m
       join "user" u on u."id" = m."userId"
      where m."organizationId" = $1
      order by
        case m."role" when 'owner' then 0 when 'manager' then 1 when 'salesperson' then 2 else 3 end,
        u."name"`,
    [organizationId],
  );
  return result.rows;
}

export async function getActiveDealership(
  userId: string,
  organizationId: string,
): Promise<ActiveDealership | null> {
  const result = await getPool().query<ActiveDealership>(
    `select o."name", m."role"
       from "member" m
       join "organization" o on o."id" = m."organizationId"
      where m."userId" = $1 and m."organizationId" = $2
      limit 1`,
    [userId, organizationId],
  );
  return result.rows[0] ?? null;
}
