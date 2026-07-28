import type { PoolClient } from "pg";
import type { DealerListing, DealerProfile, UpdateDealerProfile } from "@selectcars/shared";

/**
 * Dealer profile persistence: the public identity of a dealership.
 *
 * As in the vehicles repository, every function takes a client the caller has already
 * scoped with `withTenant` (the dealership's own team) or `withPublic` (a buyer). None of
 * the SQL below filters by tenant, because RLS does: on the public path the policy also
 * hides any dealership with nothing published, so "sellers with inventory" needs no
 * `where` clause of its own.
 */

const PROFILE_COLUMNS = `slug, display_name as name, city, state, phone, about`;

/**
 * The seller directory: every dealership a buyer can currently buy from, with how many cars
 * it has live.
 *
 * The join is what filters. A dealership whose inventory is all drafts has no visible
 * vehicles, so it produces no rows and never appears, without this query mentioning
 * `status` at all.
 */
export async function listPublicDealers(client: PoolClient): Promise<DealerListing[]> {
  const result = await client.query<DealerListing>(
    `select d.slug, d.display_name as name, d.city, d.state,
            count(v.id)::int as "listingCount"
       from public.dealer_profiles d
       join public.vehicles v on v.tenant_id = d.tenant_id
      group by d.slug, d.display_name, d.city, d.state
      order by d.display_name`,
  );
  return result.rows;
}

/** One seller's public profile, by slug. */
export async function findPublicDealerBySlug(
  client: PoolClient,
  slug: string,
): Promise<DealerProfile | undefined> {
  const result = await client.query<DealerProfile>(
    `select ${PROFILE_COLUMNS} from public.dealer_profiles where slug = $1`,
    [slug],
  );
  return result.rows[0];
}

/** The signed-in dealership's own profile. RLS makes "own" the only possible answer. */
export async function findProfileForTenant(client: PoolClient): Promise<DealerProfile | undefined> {
  const result = await client.query<DealerProfile>(
    `select ${PROFILE_COLUMNS} from public.dealer_profiles`,
  );
  return result.rows[0];
}

/**
 * Save the dealership's public identity.
 *
 * Update only, never insert: every dealership gets its profile from a trigger the moment the
 * organization is created, so a missing row is a broken invariant, not a case to paper over
 * by inventing a slug here. The caller turns "no row" into a 404 that says so.
 *
 * The `update` has **no `where` clause**, and that is deliberate, not an oversight. RLS
 * narrows it to the one row this tenant owns, which is the same guarantee the whole codebase
 * relies on: a filter someone can forget to type is weaker than one the database applies.
 * Written with `where tenant_id = ...` it would look safer and be exactly as safe, while
 * suggesting the database were not already enforcing it.
 */
export async function updateProfileForTenant(
  client: PoolClient,
  patch: UpdateDealerProfile,
): Promise<DealerProfile | undefined> {
  const result = await client.query<DealerProfile>(
    `update public.dealer_profiles
        set display_name = $1, city = $2, state = $3, phone = $4, about = $5
      returning ${PROFILE_COLUMNS}`,
    [patch.name, patch.city ?? null, patch.state ?? null, patch.phone ?? null, patch.about ?? null],
  );
  return result.rows[0];
}
