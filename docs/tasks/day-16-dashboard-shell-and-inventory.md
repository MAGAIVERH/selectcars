# Days 16-17 — Dealer dashboard shell + inventory list

- **Date:** 2026-07-16
- **Phase:** 2 (Inventory / Vehicles)
- **Status:** Done (verified in the browser)

## Goal

The dealer's logged-in home: sign in, and see the inventory you own. The first real
consumer of the vehicles API we built in Phase 2.

## The decision: a section of the marketplace app, not a separate app

The project vision has a separate `apps/dashboard` with microfrontends. We deliberately
started with a `/dashboard` route group inside the marketplace app instead. The dashboard
needs exactly the auth the marketplace already issues (Better Auth session, the active
organization as tenant, JWKS-minted tokens), so a section reuses all of it and ships a
working screen today. It can be extracted to its own app later, when that separation earns
its cost. Recorded here rather than as an ADR because it is reversible.

## The data path: through the API, not around it

A dashboard server component could query Postgres directly (the app already imports
`@selectcars/db`). It does not. It calls the same `GET /vehicles` any external client would,
with a short-lived token minted from the dealer's session (`getDealerToken` hits
`/api/auth/token`, then the request carries a Bearer token to the Fastify API). The API is
the boundary that enforces RBAC and tenant RLS, so the dashboard gets those guarantees for
free and there is one code path to inventory, not two.

## Tasks done

- [x] `/dashboard` layout: auth-gated (no session to `/signin`, no active dealership to
      `/account`), with a header showing the dealership, role, and sign out.
- [x] Inventory list page: fetches the dealer's vehicles from the API, tenant-scoped.
      Each listing shows make/model, a restrained status pill, trim + color, key specs, and
      price (with `Inquire` for a null price).
- [x] Status filter tabs (All / Active / Draft / Pending / Sold), driven by the URL so they
      work without client JavaScript, passed through to the API's `status` filter.
- [x] Premium empty state and a graceful API-error state.
- [x] `src/lib/api.ts` (token mint + typed `fetchInventory`, response validated with
      `vehicleListSchema`) and `src/lib/dashboard.ts` (active dealership label).

## Verification

Exercised end to end in the browser (Playwright), signed in as a demo dealer who owns the
`SELECTCARS Showroom`:

- `/dashboard` renders **9 vehicles** from the seed, read browser -> Next server component ->
  Fastify API -> Postgres (RLS), each with correct specs, price, and `Active` status.
- The `Draft` tab shows **0 vehicles** and the empty state, proving the status filter reaches
  the API querystring.
- Auth gate holds: no session redirects to `/signin`.
- Typecheck and lint clean for `@selectcars/marketplace`.

## Still open

- `Add vehicle` create/edit form (`/dashboard/vehicles/new`), posting to the API. Next.
- Thumbnails in the list, once the API returns `photos` on the vehicle response (the
  `vehicle_photos` rows exist from Day 15; the read path is not wired yet).
- Row actions: publish draft -> active, edit, delete (RBAC already enforced by the API).
