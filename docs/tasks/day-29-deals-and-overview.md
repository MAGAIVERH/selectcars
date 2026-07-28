# Day 29 — Deals, and the screen a dealer principal opens first

- **Date:** 2026-07-28
- **Phase:** 4 (Professional dashboard: financials)
- **Status:** Done (38/38 verified through the API, plus a full loop in the browser)

## Goal

A listing could reach `sold`, but nothing recorded what the dealership actually made on it, so
the dashboard could show inventory and never money. This adds the money, and the screen that
reads it: **`/dashboard` is now the overview**, and the inventory list moved to
`/dashboard/inventory`.

## The vocabulary is the trade's, not ours

The point of a dealer management system is that someone who has run a store can read it
without a glossary. So the schema uses their words:

| Term            | Meaning                                                |
| --------------- | ------------------------------------------------------ |
| front-end gross | what the car made: sale price, less cost, less recon   |
| back-end gross  | what the finance office made: reserve, warranty, GAP   |
| total gross     | the two together                                       |
| PVR             | gross per vehicle retailed, an average over units sold |
| days to sale    | listed to closed                                       |
| aging           | units sitting 60+ days, the money going stale          |

The metric set is the standard one (Cox Automotive's used-car KPIs, the dashboards in Tekion
and DealerSocket), which was the point: a dealer should recognise the screen.

## The design decision: gross is computed by the database

`front_end_gross_usd` and `total_gross_usd` are **generated columns**:

```sql
front_end_gross_usd numeric(12,2)
  generated always as (sale_price_usd - vehicle_cost_usd - recon_cost_usd) stored,
```

So a client sends the four figures a dealer actually types, and never a total. Two screens can
disagree about a filter; they cannot disagree about what gross means, because neither of them
gets to define it. The form says so out loud: _"Front-end and total gross are calculated by the
system, not typed."_

One thing worth knowing before you try the obvious: **Postgres will not let a generated column
reference another generated column**, so the total restates the arithmetic instead of adding
front and back.

## Three smaller decisions

- **`on delete restrict` on the vehicle**, not cascade. Deleting a listing must not silently
  erase the sale it made. The seed had to be changed to delete deals first, which is exactly
  the friction that was wanted: throwing away history should be explicit.
- **No public grant at all.** What a dealership paid for a car is the one thing on this
  platform a buyer must never see, and the safest way to guarantee that is to grant nothing
  rather than to write a careful policy.
- **Owners and managers only.** A salesperson may list, price, and sell a car, but the money
  is not theirs to read. This is the first place where the role split does real work rather
  than describing an intention.

## The bug the verification caught

Recording a sale against a car that was still `active` was accepted. The metrics would then
count it as sold while buyers could still see it for sale: a dashboard contradicting the
website. `POST /deals` now answers **409** unless the listing is already `sold`, which is the
order a dealership works in anyway.

## Files

| File                                                        | Why                                                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `packages/db/migrations/0010_deals.sql`                     | The table, generated gross columns, RLS, audit trigger.                                    |
| `packages/shared/src/index.ts`                              | `dealSchema`, `createDealSchema`, `dealershipMetricsSchema`.                               |
| `apps/api/src/repositories/deals.ts`                        | Deal reads and **every overview number in one query**.                                     |
| `apps/api/src/routes/deals.ts`                              | `/metrics`, `/deals` (list, create, delete), owner and manager only.                       |
| `apps/marketplace/src/app/dashboard/page.tsx`               | The overview: eight tiles and recent sales.                                                |
| `apps/marketplace/src/app/dashboard/inventory/page.tsx`     | The list, moved out of the home slot.                                                      |
| `apps/marketplace/src/components/dashboard/record-sale.tsx` | Record a sale, or read back what it made.                                                  |
| `packages/db/src/scripts/seed-showroom.ts`                  | Listing dates are backdated and five units are sold with deals, so the screen has history. |

### Why the seed now backdates its listings

Every seeded car used to arrive "today", which made average days on lot and aging read a flat
zero: a screen whose whole job is to warn you, showing nothing to worry about. Units are now
listed 12 to 96 days ago, so the aging tile turns red on the two cars that deserve it.

## Verification

- `pnpm typecheck`, `pnpm lint`, Prettier: clean.
- **`verify:vehicles`: 38/38 PASS**, including seven new checks: a sale on a still-active
  listing is refused (409), gross comes back computed by the database, another dealership can
  neither record a sale on the car nor see the deal, and its own metrics stay at zero.
- **Browser, full loop:** marked the Jaguar F-Type sold, recorded the sale (96,500 sale,
  81,000 cost, 2,400 recon, 3,100 back end). The page came back with **front-end 13,100 and
  total 16,200**, computed by Postgres, and days to sale 38. The overview moved from 2 units
  and $46,000 gross to 3 units and $62,200, gross per unit $20,733, average days to sale 46,
  and `/public/vehicles` dropped from 7 to 6 as the car left the marketplace. Every tile was
  checked by hand against the seeded figures.

## Still open

- **Leads / CRM** (Phase 4's other half): buyer interest from the marketplace into a
  per-tenant pipeline, assigned to a salesperson. That is where the role finally appears in
  the product.
- Trends over time: today's tiles are current state and a 30-day window, with no chart.
- A sold car with an unwound deal has to be relisted and the deal deleted by hand. Fine for
  now; a real DMS models the unwind.
