# Day 26 — Who is selling: dealer identity on the marketplace

- **Date:** 2026-07-28
- **Phase:** 3 (Live marketplace), making it a real multi-seller platform
- **Status:** Done (29/29 through the API, plus a browser pass)

## Goal

Until today every listing was anonymous. The platform was already multi-tenant underneath
(each dealership's inventory is isolated by RLS), but a buyer could not see **who** was
selling a car, could not browse one seller's inventory, and could not choose between sellers.
That is the difference between a showroom site and a marketplace.

## The question this settles: dealership or salesperson?

The request was to decide what the seller should be, professionally. It is the **dealership**.

In the US market the seller of record on a listing is the store: a franchised dealership, an
independent dealership, or a private seller. Cars.com and Autotrader both structure listings
exactly that way, and a shopper filters and judges by dealer, not by employee. A salesperson
is internal: they work leads and close deals inside a dealership, they do not own inventory.

That maps cleanly onto what SELECTCARS already had, which is a good sign the model is right:

| Concept                 | Where it already lived                                          |
| ----------------------- | --------------------------------------------------------------- |
| Dealership (the seller) | The tenant: a Better Auth `organization`, the unit RLS isolates |
| Salesperson (the staff) | `dealershipRoleSchema`: owner, manager, salesperson, viewer     |

So nothing was re-modeled. What was missing was the dealership's **public face**, and that is
what this day adds. A second finding shaped the UI: hiding where a car physically is ranks
among buyers' recurring complaints about listing sites, so the seller block states the city
and state next to the name rather than burying it in the specs.

## The design decision: a table of ours, not the auth table

The dealership's name already exists in `organization`. It would have been quicker to read it
from there. Two reasons not to:

1. `organization` belongs to the identity provider. City, phone, and the pitch a buyer reads
   are **business** data, and business data lives in our own table under our own RLS.
2. It keeps the public role out of the auth schema entirely. `selectcars_public` is the role
   an anonymous visitor drives. It should never hold a grant on a table that also stores
   members and invitations.

So `dealer_profiles` (migration 0008), one row per dealership.

### The part worth studying: the RLS policy composes

```sql
create policy dealer_profiles_public_read on public.dealer_profiles
  for select to selectcars_public
  using (exists (select 1 from public.vehicles v where v.tenant_id = dealer_profiles.tenant_id));
```

Read that subquery carefully: it does not mention `status`. It does not have to. The subquery
runs as `selectcars_public`, so the policy on `vehicles` already applies inside it, and the
only rows it can see are `active` ones. The sentence the database ends up enforcing is
therefore **"a dealership is public only while it has something published"**, written without
anyone repeating the definition of "published".

That gives three behaviors for free, none of which is implemented in application code:

- A dealership that signed up and has only drafts does not appear in the seller directory.
- Its `/dealers/<slug>` page is a 404, so nobody can enumerate who has signed up.
- The moment it publishes its first car, it appears; when its last car sells, it drops out.

### Every dealership has a profile from the start

A trigger on `organization` inserts the profile row at sign-up, and the migration backfills
the dealerships that already existed. So "listing with no seller" is not a state the UI has to
render, and no sign-up path can forget to create one. The API still reads it with a left join
and the contract marks `dealer` nullable: a listing must never vanish from its own dealer's
inventory because a profile row is missing.

## Files, and why each one exists

| File                                                                 | Why it exists                                                                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `packages/db/migrations/0008_dealer_profiles.sql`                    | The table, the two RLS policies, the auto-create trigger, the backfill.                                                   |
| `packages/shared/src/index.ts`                                       | `dealerSummarySchema` (embedded in every `Vehicle`), `dealerProfileSchema`, `updateDealerProfileSchema`, `dealer` filter. |
| `apps/api/src/repositories/dealers.ts`                               | Directory, profile by slug, and the tenant's own profile.                                                                 |
| `apps/api/src/routes/dealers.ts`                                     | `/public/dealers`, `/public/dealers/:slug`, `GET` and `PATCH /dealership`.                                                |
| `apps/api/src/repositories/vehicles.ts`                              | The seller travels with every vehicle row, and `?dealer=<slug>` filters by it.                                            |
| `apps/marketplace/src/app/dealers/page.tsx`                          | The seller directory: the explicit place to choose who you buy from.                                                      |
| `apps/marketplace/src/app/dealers/[slug]/page.tsx`                   | One dealership's storefront, fetched filtered by seller so it ships one inventory, not all of them.                       |
| `apps/marketplace/src/components/collection-browser.tsx`             | A Seller facet, shown only when there is more than one seller to choose between.                                          |
| `apps/marketplace/src/components/listing-card.tsx`, `colecao/[slug]` | "Sold by", with the city and state.                                                                                       |
| `apps/marketplace/src/app/dashboard/dealership/page.tsx` + form      | Where a dealership edits the identity buyers see. Owner and manager only, enforced by the API.                            |
| `packages/db/src/scripts/seed-showroom.ts`                           | Fills the seeded dealership's profile: Miami, FL, with its pitch.                                                         |

## Verification

- `pnpm typecheck`, `pnpm lint`, Prettier: clean.
- **`verify:vehicles`: 29/29 PASS**, including six new checks:

```
PASS  a dealership with active inventory appears in the seller directory
PASS  the directory counts only what that dealership has live
PASS  filtering the marketplace by seller returns only that seller's cars
PASS  every public listing carries the dealership that is selling it
PASS  a dealership with only drafts stays out of the seller directory
PASS  asking for that dealership by its exact slug -> 404
```

- **Browser:** `/dealers` lists the showroom with its city and live count; `/dealers/selectcars-showroom`
  renders the storefront with the nine cars; every card on `/colecao` reads "Sold by SELECTCARS
  Showroom · Miami, FL"; the dashboard settings screen loads prefilled, saves, and the new value
  reaches `/public/vehicles` and `/public/dealers`. A lowercase `fl` in the state field is
  accepted and stored as `FL`.

### One bug the browser found that the tests could not

Saving the profile blew up the first time: the server action called `revalidatePath` on
`/colecao` and `/dealers`, and the dev server, re-rendering three routes at once, failed its
own `/api/auth/token` call mid-save.

The fix is a removal, and the reasoning generalizes: those public pages read the API with
`cache: "no-store"`, so there is **no cache entry to invalidate**. The `revalidatePath` calls
were not just harmful, they were meaningless. Only the dashboard path is revalidated now.

## Still open

- **Photo upload** (Supabase Storage). Still the last piece of Phase 2.
- A second seeded dealership, so the Seller facet and the directory have a real choice to
  show. That is the next change, together with a consistent set of listing photographs.
- Private sellers (an individual listing one car) are a different account type and are not
  modeled: every seller today is a dealership.
