# Days 22-23 — Marketplace reads from the database (collection + detail)

- **Date:** 2026-07-16
- **Phase:** 3 (Live marketplace)
- **Status:** Done (verified in the browser)

## Goal

Make the public marketplace show real, published inventory from the database instead of the
static `src/lib/cars.ts`. This is the visible half of the core principle: whatever any dealer
publishes surfaces here automatically.

## Deviation from the plan (noted on purpose)

The roadmap split this as Day 22 (collection from DB) and Day 23 (detail page). They shipped
together, because the collection's "View details" links would be dead ends without the detail
route. So this increment covers both. The **home page showroom preview** is still static and
becomes the next step (added below).

## The design decision: type on the real data, derive facets from it

The static `Car` type and the API `Vehicle` had divergent enums (`Car.body` had "GT",
`Car.fuel` was only Gas/Hybrid, transmission was "PDK"/"DCT"). Mapping `Vehicle` onto `Car`
would have lost or misrepresented data (an EV shown as "Gas"). So the marketplace UI now types
on `Vehicle` directly, and the collection's filter facets (make, body, fuel, condition, price
ceiling) are **derived from the fetched vehicles**, so the filters always match the actual
inventory and never drift from a hardcoded list.

## Tasks done

- [x] `src/lib/public-api.ts`: `fetchPublicVehicles()` and `fetchPublicVehicleBySlug()`, hitting
      the API's public path (no auth, no tenant, `active`-only by RLS).
- [x] `ListingCard` (Vehicle-based, primary photo, condition + color, specs, price, links by
      slug) and `ListingGallery` (client: a large image with a selectable thumbnail strip).
- [x] `CollectionBrowser` rewritten to consume `Vehicle[]` with data-derived facets, search,
      price, condition chips, and sort. `/colecao` is now an async server component.
- [x] `/colecao/[slug]`: the public listing detail page: gallery, price, description, a spec
      grid, and a "Book a private viewing" CTA. `notFound()` when the slug is not an active
      listing.

## Verification

Browser (Playwright), no auth:

- `/colecao` renders **live** listings from the database, spanning every dealership's `active`
  inventory (the seeded showroom plus other tenants' published cars), with working
  data-derived filters. This is the dashboard-to-marketplace reflection, visible.
- `/colecao/porsche-911-gt3-rs` renders the full gallery, specs, and price from the DB.
- Typecheck + lint clean; console clean after prioritizing the above-the-fold row.

## Still open

- **Home page showroom preview** still renders static `cars.ts`; convert it to live listings
  with `ListingCard` (next). The hero/featured sections stay as presentation.
- Data hygiene: `verify:vehicles` leaves test dealers' (`Alpha`/`Bravo`) active cars in the
  DB, so they also show on the public marketplace. Correct multi-tenant behavior, but consider
  a cleanup for a tidy demo.
- Once the home preview is live, `src/lib/cars.ts` keeps only the shared `formatPrice` /
  `formatMileage` helpers (and whatever the hero/featured still use).
