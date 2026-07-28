# Day 27 — One photographic standard, and a second seller

- **Date:** 2026-07-28
- **Phase:** 3 (Live marketplace)
- **Status:** Done (verified in the browser)

## Goal

Two things that only make sense together:

1. **One photographic standard.** The old set was full cars on transparent backgrounds, but
   shot from whatever angle the stock photo happened to be: some front three-quarter, one
   from the rear. In a grid that reads as a hobby project. Every car now uses the **same
   framing**: complete vehicle, side profile, facing the same direction.
2. **A second dealership.** Day 26 built seller identity, but with a single seller the
   Seller filter and the directory had nothing to choose between. The seed now creates two
   real sellers with their own inventory, which is what the platform is actually for.

## The standard, and why it is enforceable

> Side profile, full car, facing left, transparent background, at most 1200px wide.

It is written down in `apps/marketplace/public/cars/CREDITS.json`, so the next person adding a
photo has a rule to follow rather than a vibe to match.

Getting there was mostly rejection, and that is the part worth learning:

- About 30 stock photos were pulled and **looked at one by one**. Stock captions cannot be
  trusted (Day 24 learned this the hard way): "side view" returned wheels, mirrors, and
  interiors; one "silver coupe in a studio" was a **die-cast scale model**.
- Backgrounds were removed locally with the same offline u2net model as Day 24, about 5s per
  image, no API and no credits.
- Photos shot from the other side were **mirrored** so all seven cars face left. A grid where
  half the cars point the other way looks like an accident.
- The alpha was hardened and trimmed tight, then capped at 1200px. That step matters more
  than it sounds: the Jaguar arrived at **1.5 MB** because a faint halo of wall kept the
  bounding box huge. It ships at 97 KB.

### Two cars were thrown away, on purpose

A Ferrari F12 and a Lamborghini Gallardo, both dark cars photographed on black. The model ate
their rear ends. A second attempt computed the mask from a **brightened** copy and applied it
to the original pixels, which is the right trick when a subject and its background are the
same value, and it still failed: the Lamborghini came back as an outline with two wheels.

They are recorded as rejected in `CREDITS.json` rather than quietly shipped half-cut. The
inventory went from nine cars to seven, and seven consistent listings beat nine mismatched
ones.

## The second seller: a rental company, not another showroom

`Bayshore Fleet Sales` (Tampa, FL) is the remarketing arm of a rental fleet: a Genesis G90 and
two Hyundais, higher mileage, lower prices. That is deliberate. It proves the platform holds
**different kinds of seller** at once, which is the case the plan describes: dealerships,
independent lots, and rental companies unloading a fleet, all publishing into one collection.

| Seller               | Where     | Inventory                                                          |
| -------------------- | --------- | ------------------------------------------------------------------ |
| SELECTCARS Showroom  | Miami, FL | Bentley Continental GT, Mercedes-AMG C 63, Jaguar F-Type R, BMW i8 |
| Bayshore Fleet Sales | Tampa, FL | Genesis G90, Hyundai Kona SEL, Hyundai Elantra Limited             |

Nothing about the second dealership is special-cased. It is an organization row with a profile
and vehicles, exactly like the first, and exactly like one created by a real sign-up.

## Files

| File                                        | Change                                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `apps/marketplace/public/cars/*.png`        | Seven new cutouts to the standard; the nine old ones removed.                                   |
| `apps/marketplace/public/cars/CREDITS.json` | Sources, the written standard, the mirroring note, and the two rejections.                      |
| `packages/db/src/scripts/seed-showroom.ts`  | Rewritten around a `DEALERSHIPS` array: two sellers, each with a profile and its inventory.     |
| `apps/marketplace/src/app/colecao/page.tsx` | The label counts sellers instead of naming one showroom, now that the collection spans several. |

## Verification

- `pnpm typecheck`, `pnpm lint`, Prettier: clean.
- Seed: `2 dealerships, 7 vehicles, 7 photos`, all `active`.
- `GET /public/dealers` returns both sellers with their live counts (4 and 3).
- **Browser** (`/colecao`): seven cars in one grid, every one in side profile facing left,
  each card reading "Sold by SELECTCARS Showroom · Miami, FL" or "Sold by Bayshore Fleet Sales
  · Tampa, FL". The **Seller** facet now appears in the sidebar with both dealerships, because
  it only renders when there is more than one seller to choose between.

## Still open

- **Photo upload** (Supabase Storage). A dealer adding a car in the dashboard still cannot
  attach an image, so new listings publish without one. This is now the single biggest gap.
- More inventory per seller, and eventually multiple photos per car (the gallery already
  supports it; the seed uses one).
