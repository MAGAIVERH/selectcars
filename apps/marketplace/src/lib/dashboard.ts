import { getPool } from "@selectcars/db";

/** The dealership the signed-in user is acting for, with their role in it. */
export type ActiveDealership = { name: string; role: string };

/**
 * Resolve the active dealership's name and the caller's role, for the dashboard chrome.
 * The tenant id itself comes from the session; this only adds the human-readable label.
 */
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
