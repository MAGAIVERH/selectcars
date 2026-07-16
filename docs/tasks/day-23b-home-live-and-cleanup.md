# Day 23b — Home preview live, static demo data removed, verify self-cleans

- **Date:** 2026-07-16
- **Phase:** 3 (Live marketplace)
- **Status:** Done (verified in the browser)

## Goal

Finish moving the marketplace onto the database: the home page showroom preview should show
live published listings too, so nothing on the buyer side is static anymore.

## Tasks done

- [x] `ShowroomGrid` rewritten to consume live `Vehicle[]` and render `ListingCard`, with
      condition chips derived from the data. The home page is now an async server component
      that fetches the six most recent published listings.
- [x] Removed the static demo data: deleted `src/lib/cars.ts` and the now-unused
      `car-card.tsx`. The shared `formatPrice` / `formatMileage` helpers moved to
      `src/lib/format.ts`, and the four remaining call sites were repointed.
- [x] **`verify:vehicles` now self-cleans.** It deletes the throwaway dealerships it creates
      at the end of the run (pass or fail), so their `active` listings no longer leak onto the
      public marketplace, which reads live inventory. Also removed the 20 test dealerships that
      had accumulated from earlier runs.

## Why the cleanup mattered

Once the home preview went live, the most recent listings shown first were the `verify:vehicles`
test cars (Alpha/Bravo Motors), which have no photos, so the homepage led with three "Photo on
request" placeholders. The fix was twofold: a one-time removal of the accumulated test data,
and making the verify suite tidy up after itself so it never recurs.

## Verification

Browser (Playwright), no auth:

- The home showroom section renders six live listings with real photos, condition chips, specs,
  and prices (Aston Martin, Bentley, BMW, Ferrari, Jaguar, Lamborghini).
- `verify:vehicles` still **16/16**, and the public marketplace count returns to **9** (the
  seeded showroom only) after the run: the suite leaves no residue.
- Typecheck + lint clean across `@selectcars/marketplace` and `@selectcars/db`.

## Result

The entire buyer surface (home preview, `/colecao`, and listing detail) now reads live from
the database. Whatever a dealer publishes shows up across all three.

## Still open

- The `Add vehicle` create form, to complete the dealer's create -> publish -> appears loop
  from the UI (Phase 2 finish).
- The professional dashboard overview with financial KPIs (Phase 4).
