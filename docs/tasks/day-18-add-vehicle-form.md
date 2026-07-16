# Days 18-19 — Add vehicle form (create, from the dashboard)

- **Date:** 2026-07-16
- **Phase:** 2 (Inventory / Vehicles)
- **Status:** Done (create; edit + photo upload still open)

## Goal

Close the loop from the UI: a dealer adds a vehicle in the dashboard, and it appears in their
inventory and (if published) on the public marketplace, all through the same API.

## The design decision: one Zod contract, both sides

The form validates with `createVehicleSchema` from `packages/shared`, the exact contract the
API enforces. The client and server can never disagree on what a valid listing is. The tenant
and role are never in the form: they come from the session-minted token inside `createVehicle`,
so a dealer cannot write into another dealership by editing the request.

The write goes through a **Server Action** (`createVehicleAction`), which parses the form,
validates, calls the API with the dealer's token, revalidates `/dashboard`, and redirects.
So there is still exactly one path to inventory (the API), and the dashboard never touches the
database directly.

## Tasks done

- [x] `src/lib/api.ts`: `createVehicle(input)` (mints the token, POSTs to `/vehicles`).
- [x] `src/app/dashboard/actions.ts`: `createVehicleAction` server action, with field-level
      validation errors mapped back from Zod.
- [x] `src/components/dashboard/vehicle-form.tsx`: a grouped form (Identity, Details,
      Appearance, Description) built on `useActionState`, with the enum selects sourced from
      the shared schemas' `.options` (no drift), and a publish choice: save as draft or publish
      to the marketplace.
- [x] `src/app/dashboard/vehicles/new`: the page, gated by the dashboard layout.

## Verification

Browser (Playwright), signed in as the demo dealer:

- Filled the form for a McLaren 750S, chose "Publish to marketplace", saved.
- The dashboard inventory went to **10 vehicles** with the McLaren at the top (Active,
  $345,000), and the public API returned it on `/public/vehicles?make=McLaren`. Create ->
  dashboard -> marketplace, proven end to end.
- Removed the test car afterward (it had no photo yet), so the seeded showroom stays at 9.
- Typecheck + lint clean.

## Still open

- **Photo upload** (Supabase Storage, presigned): a created car has no photos until this
  exists, so the form defaults to draft. This is the immediate next piece.
- **Edit** an existing vehicle (`PATCH /vehicles/:id`) and **row actions** (publish draft to
  active, mark sold, delete) from the list.
