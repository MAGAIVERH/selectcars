# Day 15 — Vehicle photos schema + showroom seed

- **Date:** 2026-07-16
- **Phase:** 2 (Inventory / Vehicles)
- **Status:** Done (schema + seed loaded to Supabase)

## Goal

Get real inventory into the database, with images, so the marketplace can render names,
prices, specs, and photos from the database instead of a hardcoded file
(`apps/marketplace/src/lib/cars.ts`).

## The visual assets: what is and is not possible

The product goal includes the manufacturer-style effect where a car "changes color while
staying in place" and spins 360. That effect is a real-time 3D render (WebGL), not a set of
downloaded photos: on the Porsche, BMW, and Bentley configurators, changing color swaps a
material and rotating orbits a camera, all from a 3D model. There is no coherent set of "the
same real car, every color, every angle, no background" to download. So that feature stays
on a separate track: a CC-licensed GLB model rendered in the browser.

For this step we loaded **free stock photography** (Pexels License: free use, including
commercial, no attribution required) for a curated gallery. Provenance for every image is
recorded in `apps/marketplace/public/cars/CREDITS.json`. We did not scrape manufacturer
sites: those images are copyrighted and would not form a usable set anyway.

## The design decision: a separate photos table, same two-role model

Media is its own concern, so photos live in `vehicle_photos`, not as columns on `vehicles`.
It carries a denormalized `tenant_id` so the dealer RLS policy stays a plain equality, the
same shape as `vehicles`. The buyer path reuses the vehicles boundary: the public read
policy admits a photo only when `exists (active vehicle)`, and that subquery runs as the
same non-bypass `selectcars_public` role, so a photo of a draft or sold car is unreachable
without any extra filter.

## Tasks done

- [x] Migration `0007_vehicle_photos.sql`: `vehicle_photos` (url, alt, position, is_primary),
      a partial unique index for one primary per vehicle, dealer + public RLS policies,
      grants, and the audit trigger.
- [x] Zod contracts in `packages/shared`: `vehiclePhotoSchema` and `vehicleWithPhotosSchema`
      (additive, non-breaking).
- [x] 20 curated luxury car images downloaded to `apps/marketplace/public/cars/`, with a
      `CREDITS.json` recording the Pexels source of each.
- [x] Seed `packages/db/src/scripts/seed-showroom.ts` (`pnpm --filter @selectcars/db seed`):
      creates the `SELECTCARS Showroom` dealership and loads 9 active listings + their
      photos. Idempotent: it rebuilds only this tenant's inventory, scoped by RLS.

## Verification

- `migrate` applied `0007` to Supabase (`aws-1-sa-east-1.pooler.supabase.com/postgres`).
- `seed` loaded **9 vehicles, 20 photos, all status=active**.
- Public API (`GET /public/vehicles`) returns all **9/9** showroom listings, reading from
  the database through the buyer role.
- Photo RLS: dealer (tenant-scoped) sees 20 photos, public (active-only) sees 20. A photo is
  reachable to a buyer only through an active vehicle.
- Typecheck clean for `@selectcars/shared` and `@selectcars/db`.

## Still open

- Surface `photos` in the public and dealer API responses (repository + routes) and switch
  the marketplace off `src/lib/cars.ts` onto `/public/vehicles`. That is the marketplace UI
  work (Phase 6), done when the reading UI is built.
- Move image bytes to Supabase Storage (presigned upload) instead of the app's `public/`
  folder. The rows store a site-relative path, so it is a URL swap.
- The 3D configurator (GLB + color swap + 360) for the hero, on its own track.
