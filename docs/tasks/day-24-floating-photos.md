# Day 24 — Full-car photos, backgrounds removed, cars floating

- **Date:** 2026-07-16
- **Phase:** 3 (Live marketplace)
- **Status:** Done (verified in the browser)

## Goal

Fix the seed imagery. The first stock photos were poor: several were mislabeled (a "Porsche"
was a vintage Triumph, another a Ferrari Dino) or partial crops (a fender, a badge). Replace
them with **full-car** photos and present each car on a **transparent background**, so it
floats, the way premium marketplaces show inventory.

## How it was done

- **Background removal runs locally**, with an offline u2net model
  (`@imgly/background-removal-node`), so it costs no API credits and touches no external
  service. About 18s per image on CPU.
- Every candidate was reviewed by eye (the stock labels could not be trusted). The final nine
  are full-car shots that cut out cleanly; where a photo showed a different model than the old
  listing, the **listing was aligned to the photo** (Ferrari 488, Mercedes-AMG GT R, Aston
  DB11, Range Rover Evoque, Jaguar XF, BMW M2), so nothing misrepresents what a buyer sees.
- The BMW's one background object (a pole) was cropped out with `sharp`.

## Tasks done

- [x] Nine transparent-background PNGs in `apps/marketplace/public/cars/`, one full car each,
      with `CREDITS.json` recording the Pexels source and the background-removal note. The 20
      old JPGs were removed.
- [x] Seed rewritten: nine listings, one floating photo each, make/model/body/color aligned to
      the actual car. Redundant trims dropped.
- [x] Presentation updated for the floating look: `ListingCard`, `ListingGallery`, and the
      dashboard `InventoryItem` now use `object-contain` with a silhouette drop-shadow instead
      of `object-cover`.

## Verification

Browser (Playwright): the home preview, `/colecao`, and the detail pages all render the cars
floating on white with a soft shadow, full car, no background (Porsche 911, Ferrari 488,
Lamborghini Huracan, AMG GT R, Aston DB11, Range Rover Evoque, Jaguar XF, Bentley Continental,
BMW M2). Seed loads 9 vehicles / 9 photos. Typecheck clean; files prettier-clean.

## Note

The processing pipeline lives in a scratchpad, not the repo: only the final PNGs are checked
in. If we later want exact-model imagery or true color-swap, that remains the 3D-model track,
per [`docs/plans/dealer-dashboard-and-marketplace.md`](../plans/dealer-dashboard-and-marketplace.md).
