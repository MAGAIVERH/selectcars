# Day 5 — en-US migration + UI base

- **Date:** 2026-07-12
- **Phase:** 0 (Foundation)
- **Status:** Done
- **Commit:** `4f50e7d` feat: complete Phase 0 with en-US migration and shadcn UI base
- **PR:** #2 (`feat/phase-0-en-us-and-ui`)

> Reconstructed from git history (backfilled).

## Goal

The product targets the US market, so every string, unit, and place name must be en-US.
Also establish the shared component base so UI stays consistent across apps.

## Tasks done

- [x] Migrated all marketplace copy from **pt-BR to en-US** (home, collection, FAQ,
      process, footer, header, contact form).
- [x] US units and locale: **USD** prices, **miles** instead of km. Renamed the domain
      field `Car.km` -> `mileage` and `formatKm()` -> `formatMileage()`.
- [x] `SITE.location` set to **Miami** (`packages/shared`).
- [x] Created **`packages/ui`** (`@selectcars/ui`): the shadcn-style base with a `cn()`
      utility (clsx + tailwind-merge) and a `Button` built on `class-variance-authority`.
      Wired into the app via `transpilePackages` and adopted in the contact form.
- [x] Translated all `docs/staks/*` stack sheets to en-US.
- [x] Removed the unused `hero-carousel` component.

## Artifacts

- `packages/ui/{package.json,tsconfig.json,src/index.ts,src/lib/utils.ts,src/components/button.tsx}`
- `apps/marketplace/src/**` (copy + units)
- `docs/staks/*.md`

## Verification

- No Portuguese strings left in `apps/marketplace`; CI (lint + typecheck) green on PR #2.

## Notes

- Routes still carry Portuguese path names (`/colecao`). Renaming to `/vehicles` is
  planned with the public marketplace routes in Phase 6.
