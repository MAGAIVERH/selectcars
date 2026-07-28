# Day 25 — Status workflow (draft to sold) and editing a listing

- **Date:** 2026-07-28
- **Phase:** 2 (Inventory / Vehicles), closing the last open items
- **Status:** Built, typecheck and lint clean. **End-to-end verification is blocked:** the
  project's Supabase instance is unreachable (see "Blocked" below).

## Goal

A dealer could create a car and see it on the marketplace, but never change it afterwards.
Two things were missing, and they are the same feature seen from two angles:

1. **Edit** a listing (price drops, a corrected mileage, better copy).
2. **Move it through its lifecycle**: publish a draft, put a deal on it, mark it sold, relist
   it if the deal falls apart.

## The design decision: the workflow is a graph, and it lives in the contract

The four statuses were already in `packages/shared`, but nothing said how a car moves between
them. Without that, "status" is just a free-text label: an API call could turn a `sold` car
back into a `draft` and quietly erase it from the sales record.

So the workflow itself became part of the contract:

```ts
// packages/shared/src/index.ts
export const VEHICLE_STATUS_TRANSITIONS: Record<VehicleStatus, readonly VehicleStatus[]> = {
  draft: ["active"],
  active: ["draft", "pending", "sold"],
  pending: ["active", "sold"],
  sold: ["active"], // a deal can come undone; going back to draft cannot
};
```

One map, read by both sides for different reasons:

- The **dashboard** reads it to decide which buttons exist. It never hard-codes "publish".
- The **API** reads it to decide whether to accept the request.

That is the whole point of a shared contract: a dealer is never offered a move the server
would refuse, and someone bypassing the UI with `curl` gets exactly the same answer. Add a
step to the workflow tomorrow and the button appears by itself.

The wording is derived too. Moving to `active` is "Publish" from a draft and "Relist" from a
sold car: `statusActionLabel(from, to)` decides, so the copy cannot drift from the rule.

## The concurrency detail worth knowing

Validating a transition means reading the current status, then writing the new one. Do those
in two connections and there is a window where two managers, clicking "Mark sold" and
"Unpublish" in the same second, both pass the check and both write. The rule would hold in
testing and fail exactly when the dealership is busy.

The API reads and writes inside **one transaction**, and the read takes a row lock:

```sql
select status from public.vehicles where id = $1 for update
```

The second request waits, then re-reads the committed status and is refused. It selects only
`status`, not the whole row with its photo aggregation, so the lock is held for as little
time as possible.

## Files, and why each one exists

| File                                                           | Why it exists                                                                                                                                         |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared/src/index.ts`                                 | The transition map, `canTransitionStatus()`, `statusActionLabel()`, `changeVehicleStatusSchema`, and a new `conflict` API error code.                 |
| `apps/api/src/repositories/vehicles.ts`                        | `lockStatusForUpdate()`: the locking read described above.                                                                                            |
| `apps/api/src/routes/vehicles.ts`                              | `PATCH /vehicles/:id` now validates the move and answers **409 conflict** with the reason, inside the tenant transaction.                             |
| `apps/marketplace/src/lib/api.ts`                              | `fetchVehicle`, `updateVehicle`, `deleteVehicle`, plus `readApiError` so the UI can show the API's own explanation of a 409.                          |
| `apps/marketplace/src/app/dashboard/actions.ts`                | `updateVehicleAction`, `changeVehicleStatusAction`, `deleteVehicleAction`; form parsing extracted so create and edit share one reading of the fields. |
| `apps/marketplace/src/components/dashboard/status-actions.tsx` | The lifecycle buttons, drawn from the shared transition map.                                                                                          |
| `apps/marketplace/src/components/dashboard/delete-vehicle.tsx` | Delete behind an inline two-step confirmation.                                                                                                        |
| `apps/marketplace/src/components/dashboard/vehicle-form.tsx`   | Now serves create **and** edit: same eighteen fields, one component, so they cannot drift.                                                            |
| `apps/marketplace/src/app/dashboard/vehicles/[id]/page.tsx`    | The edit screen: identity, lifecycle panel, photos, the form, and the remove section.                                                                 |
| `apps/marketplace/src/components/dashboard/inventory-item.tsx` | Row actions: the title links to the edit page, and the lifecycle buttons sit on the row.                                                              |

Two smaller decisions inside those files, both of which would bite later if taken the other way:

- **Empty optional fields post as `null`, not `undefined`.** A partial update reads
  `undefined` as "leave it alone", so a dealer who cleared the trim would watch the old value
  reappear on save. `null` says "the dealer emptied this".
- **The row is not one big link.** It contains buttons now, and a button inside a link is
  invalid HTML and unusable with a keyboard. The title is the link instead.

## Verification

- `pnpm typecheck`: clean across all five packages. `pnpm lint`: clean. Prettier clean.
- `verify:vehicles` was extended with the workflow, through the real API: `active -> pending`
  and `pending -> sold` accepted; `pending -> draft`, `sold -> draft`, and `draft -> sold`
  refused with 409; a sold listing disappears from `/public/vehicles`; a relist brings it
  back. **These assertions have not been executed yet** (see below).

## Blocked: the Supabase instance is unreachable

Discovered while starting this day's work, not caused by it:

```
db.jhsvkdeuwzuqolvokmbk.supabase.co        -> Non-existent domain (NXDOMAIN)
aws-1-sa-east-1.pooler.supabase.com:5432   -> "tenant/user postgres.jhsvkdeuwzuqolvokmbk not found"
https://jhsvkdeuwzuqolvokmbk.supabase.co   -> no response
```

Reproduced from the host and from inside the API container, so it is neither Docker nor the
local network: the project is **paused or deleted** on Supabase. A free-tier project pauses
after about a week of inactivity, and the last commit was twelve days before this one. When a
project is paused, its `db.<ref>` DNS record is withdrawn and the pooler answers with exactly
that "tenant or user not found" message, which reads like a credentials problem and is not one.

**Fix:** restore the project from the Supabase dashboard. If it was deleted, create a new one
and run `pnpm --filter @selectcars/db migrate` then `seed`: the schema and the showroom are
both in the repo, so nothing is lost except the throwaway test rows.

Until then: no browser verification, no `verify:vehicles` run. This day is code-complete and
proof-incomplete, and it is recorded that way on purpose.

## Still open

- **Photo upload** (Supabase Storage, presigned). A listing created in the dashboard still has
  no photos, which is why the edit page shows the gallery read-only.
- Publishing a car with no photo is allowed today. Once upload exists, that should probably
  become a refusal (a blank listing is a bad listing), which is a new rule in the same
  transition map.
- Phase 4 starts after this: the sales/deals table and the dashboard overview KPIs.
