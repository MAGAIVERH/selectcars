# Days 13-14 — Vehicles schema, RLS, and CRUD API

- **Date:** 2026-07-12
- **Phase:** 2 (Inventory / Vehicles)
- **Status:** Done

## Goal

The inventory each dealership owns, and the listings buyers browse. These are the same
rows seen through two very different doors.

## The design decision: two roles, not one

A dealership's inventory is private. The marketplace is public and unauthenticated. The
obvious approach is one query path with a `where status = 'active'` filter for buyers, but
that puts the most sensitive boundary in the system behind a filter somebody has to
remember to write. The marketplace is the one surface an attacker reaches **without
credentials**.

So the buyer path is a **different Postgres role**:

|                | Dealer path                                         | Buyer path                        |
| -------------- | --------------------------------------------------- | --------------------------------- |
| Helper         | `withTenant()`                                      | `withPublic()`                    |
| Role           | `selectcars_app`                                    | `selectcars_public`               |
| Tenant context | required                                            | none (browses across dealerships) |
| Grants         | select, insert, update, delete                      | **select only**                   |
| RLS policy     | `tenant_id = current_setting('app.current_tenant')` | `status = 'active'`               |

A careless public query still cannot expose a draft, a sold car, or another dealership's
private stock. The database refuses, regardless of what the SQL asked for.

## Tasks done

- [x] `vehicles` table with US-market fields: VIN, make, model, year, trim, mileage,
      `price_usd`, condition, body style, fuel type, transmission, drivetrain, colors,
      description, and a `draft -> active -> pending -> sold` status.
- [x] Constraints that encode real rules: VIN unique **per dealership** (two dealers can
      legitimately list the same car across its life), slug unique per dealership, year and
      mileage sanity checks, enum checks mirroring the Zod contracts.
- [x] Indexes for the two real access patterns: the dealer's inventory list
      `(tenant_id, status, created_at desc)`, and a **partial** index for public browse
      (`where status = 'active'`), which is the only slice buyers can see.
- [x] `selectcars_public` role + RLS policy + `withPublic()` helper.
- [x] Audit trigger and an `updated_at` touch trigger on the table.
- [x] Zod contracts in `packages/shared`: `vehicleSchema`, `createVehicleSchema`
      (with real VIN validation: 17 chars, never I/O/Q), `updateVehicleSchema`,
      dealer and public query schemas, and a paginated `vehicleListSchema`.
- [x] Repository (`apps/api/src/repositories/vehicles.ts`): takes an already-scoped client,
      so it **cannot** open a connection outside a tenant context. Its SQL never filters by
      `tenant_id`, because RLS does that.
- [x] Routes: dealer CRUD (`/vehicles`) with RBAC, and public browse (`/public/vehicles`).

## Note on the create contract

`createVehicleSchema` deliberately has no `tenant_id`, `id`, `slug`, or timestamps. The
tenant comes from the **verified access token**, never from the request body, so a caller
cannot write into another dealership by lying in JSON. RBAC: `viewer` can read but not
write; deleting inventory is restricted to `owner`/`manager`.

Cross-tenant access returns **404, not 403**: confirming that someone else's id exists is
itself a leak.

## Verification

`pnpm --filter @selectcars/db verify:vehicles`, against the real API. **16/16 pass:**

- dealer CRUD works; invalid VIN and impossible year are rejected (400);
- Alpha's inventory holds only Alpha's cars;
- Alpha cannot read, reprice, or delete Bravo's vehicle (404 every time);
- the public listing needs no token, shows active cars from **both** dealerships, and
  **never** exposes this run's draft, even when asked for by its exact slug (404);
- every public row is `active`, enforced by RLS rather than a filter;
- publishing a draft makes that same vehicle publicly reachable.

No regressions: `verify:api` (13/13) and `rls:verify` (4/4) still pass.

## Two bugs the suite caught in itself

1. A `DELETE` sent `content-type: application/json` with no body, which Fastify rightly
   rejects as malformed (400, not 404). The API was correct; the test was not.
2. The public assertions matched on **make** ("no Porsche anywhere"), which broke on the
   second run because the previous run had published its Porsche. Assertions now match this
   run's own slugs. A test that only passes against a clean database is not a test.

## Still open

- Photo upload (Supabase Storage, presigned) and the image key format.
- Dashboard UI: inventory list, multi-step create/edit form.
- The marketplace still renders static cars from `src/lib/cars.ts`; it moves onto
  `/public/vehicles` when the public UI is built (Phase 6).
