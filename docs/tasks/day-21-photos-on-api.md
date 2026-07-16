# Day 21 — Photos on the API responses + dashboard thumbnails

- **Date:** 2026-07-16
- **Phase:** 3 (Live marketplace)
- **Status:** Done (verified end to end)

## Goal

Make the gallery real everywhere: every vehicle the API returns should carry its photos, so
the dashboard shows thumbnails and (next) the marketplace can render listings from the
database. The `vehicle_photos` rows have existed since Day 15; this wires the read path.

## The design decision: aggregate photos inline, one round trip

`photos` is folded into the single `Vehicle` contract (`vehicleSchema` in `packages/shared`)
rather than a separate "with photos" type, so there is one shape for a vehicle everywhere. It
is always present: an empty array when there are none, never missing.

The repository builds it as a correlated subquery inside the shared `VEHICLE_COLUMNS`, so
list, detail, and even the create/update `RETURNING` all carry the ordered gallery without a
second query or an N+1. On the public path that subquery runs as `selectcars_public`, whose
RLS policy only reveals photos of `active` vehicles, so a buyer still never receives a draft's
images: the same boundary, reused.

## Tasks done

- [x] `vehicleSchema` gains `photos: VehiclePhoto[]` (default `[]`). Removed the now-redundant
      `vehicleWithPhotosSchema`.
- [x] `apps/api/src/repositories/vehicles.ts`: `VEHICLE_COLUMNS` aggregates `photos` via
      `json_agg(... order by position)`, ordered primary-first by `position`.
- [x] Dashboard inventory list renders the primary photo as a thumbnail, with a "No photo"
      fallback and `priority` on the first (LCP) image.

## Verification

- `GET /public/vehicles` returns each vehicle with a `photos` array
  (`{id, url, alt, position, isPrimary}`), primary first.
- `verify:vehicles` still **16/16** against the dev API: the create/update `RETURNING` with
  the inline subquery works, and tenant isolation and the public/private boundary hold.
- Browser (Playwright): the dashboard list shows real thumbnails (Porsche, Ferrari,
  Lamborghini), read browser -> API -> DB. Console clean after marking the LCP image
  `priority`.
- Typecheck + lint clean.

## Still open

- Day 22: switch the marketplace off `src/lib/cars.ts` onto `/public/vehicles`, so what a
  dealer publishes shows on the public site.
- Day 23: public listing detail page with the full gallery.
- The Docker API image is stale until rebuilt (`docker compose up --build`); this was verified
  against the API running in dev.
