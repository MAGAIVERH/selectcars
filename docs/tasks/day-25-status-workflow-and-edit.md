# Day 25 — Status workflow (draft to sold) and editing a listing

- **Date:** 2026-07-28
- **Phase:** 2 (Inventory / Vehicles), closing the last open items
- **Status:** Done (verified end to end, in the browser and through the API)

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

`pnpm typecheck` (five packages), `pnpm lint`, `next build`, and Prettier: clean.

**`pnpm --filter @selectcars/db verify:vehicles`: 23/23 PASS**, against the rebuilt API
container and the real database. The seven new checks:

```
PASS  active -> pending allowed -> 200
PASS  pending -> draft refused -> 409 (a deal in progress is not a draft)
PASS  pending -> sold allowed -> 200
PASS  a sold listing leaves the public marketplace -> 404
PASS  sold -> draft refused -> 409 (it would erase the sale from the record)
PASS  sold -> active (relist) allowed -> 200
PASS  draft -> sold refused -> 409 (a car nobody could see cannot have been sold)
```

**Browser (Playwright), signed in as the demo dealer**, on the Jaguar XF R-Sport:

- The inventory row offers exactly `active`'s moves: Unpublish, Mark pending, Mark sold.
- "Mark pending" flipped the pill to **Pending** and the buttons became "Back to active" and
  "Mark sold": the buttons are read from the transition map, not hard-coded.
- The public collection dropped to **8 vehicles in inventory** and the "Jaguar" checkbox
  disappeared from the filter sidebar, because the filters are derived from the live data.
  `/public/vehicles/jaguar-xf` answered 404 while the car was off the market.
- "Mark sold" left **Relist** as the only move; relisting returned the car to `active` and
  the "View on marketplace" link reappeared.
- The edit form arrived prefilled with all eighteen fields. Changing the price to $46,500 and
  the trim saved, showed in the list, and reached `/public/vehicles/jaguar-xf` (same rows,
  read-only public role).
- **Clearing the trim wrote `null`**, which is the `null` vs `undefined` decision above,
  proven rather than assumed.
- The audit trail recorded the nine updates attributed to the acting user.

The showroom was returned to its seeded state: 9 vehicles, all `active`, price back to
$47,000, trim empty.

## Note: the Supabase instance was paused when this day started

Not caused by this change, and resolved by restoring the project from the Supabase dashboard.
Recorded because the symptom is misleading and will happen again after any quiet week:

```
db.jhsvkdeuwzuqolvokmbk.supabase.co        -> Non-existent domain (NXDOMAIN)
aws-1-sa-east-1.pooler.supabase.com:5432   -> "tenant/user postgres.jhsvkdeuwzuqolvokmbk not found"
https://jhsvkdeuwzuqolvokmbk.supabase.co   -> no response
```

Reproduced from the host and from inside the API container, so it was neither Docker nor the
local network. A free-tier project pauses after about a week of inactivity, and the last
commit was twelve days before this one. When a project is paused, its `db.<ref>` DNS record is
withdrawn and the pooler answers "tenant or user not found", which reads like a credentials
problem and is not one. `nslookup db.<ref>.supabase.co` settles it: `Non-existent domain`
means paused or deleted, never a wrong password.

**Fix:** restore the project from the Supabase dashboard (done). If it had been deleted, a new
project plus `pnpm --filter @selectcars/db migrate` and `seed` would have rebuilt it: the
schema and the showroom are both in the repo.

One consequence worth remembering: the API container had to be rebuilt
(`docker compose up -d --build api`) before verifying, because it was still running the image
built from the previous commit. A green `/health` says the process is alive, not that it is
running the code you just wrote.

## Still open

- **Photo upload** (Supabase Storage, presigned). A listing created in the dashboard still has
  no photos, which is why the edit page shows the gallery read-only.
- Publishing a car with no photo is allowed today. Once upload exists, that should probably
  become a refusal (a blank listing is a bad listing), which is a new rule in the same
  transition map.
- Phase 4 starts after this: the sales/deals table and the dashboard overview KPIs.
