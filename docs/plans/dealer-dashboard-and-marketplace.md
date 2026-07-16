# Plan: professional dealer dashboard + a live marketplace

The vision for the two surfaces of SELECTCARS, and the sequence to build them. This is the
source of intent; the day-by-day record of what shipped lives in
[`docs/tasks/`](../tasks/README.md).

## The core principle: one database, two doors

Everything a dealer manages in their dashboard and everything a buyer sees in the marketplace
are **the same rows, seen through two roles**. When a dealer publishes a vehicle (status
`active`), it appears in the public marketplace automatically. There is no export, no sync, no
second copy: the marketplace reads the same `vehicles` table through the read-only
`selectcars_public` role, which can only ever see `active` listings (RLS, not a filter).

So the headline behavior is non-negotiable and must always hold:

> **Whatever any dealer adds and publishes in their dashboard reflects in the marketplace.**
> A new dealer signs up, creates their dealership, adds inventory, and those cars show up on
> the public site the moment they are `active`, scoped to nothing but their own tenant.

The marketplace currently still renders static demo cars from `apps/marketplace/src/lib/cars.ts`.
Moving it onto the live database is an explicit, near-term milestone (Phase 3 below).

## The demo account: a living test screen

There is one seeded dealership, `SELECTCARS Showroom` (tenant `org_selectcars_showroom`),
owned by a demo dealer (`demo-dealer@selectcars.test` / `supercar1234`). It is loaded with
real inventory and photos by `pnpm --filter @selectcars/db seed`, and it stays in place as the
account we sign into to see the platform populated as it evolves: dashboard, marketplace, and
every feature we add. It is not special-cased anywhere; it is just a dealer that happens to be
pre-filled, so it exercises exactly the same paths a real dealer would. As we build, we keep
feeding this account (more cars, photos, leads, sales) so there is always something real to
look at and test.

## What "professional and complete" means for the dashboard

Modeled on how real dealer management systems (DMS) and dealership analytics work (Tekion,
DealerSocket, Cox Automotive, and the standard dealership KPI set), a complete dealer
dashboard is not just an inventory list. It is a single, real-time operating view across four
areas. Target scope:

- **Overview (home):** the numbers a dealer principal checks daily. Total inventory value,
  active vs draft vs sold counts, units sold (period), front-end and back-end gross profit,
  average gross per unit (PVR), average days to sale, aging inventory (share 60+ days on lot),
  new leads, and recent activity. Real-time, one screen.
- **Inventory:** the list (done), plus create/edit with photos, the status workflow
  (draft to active to pending to sold), aging and days-on-lot per unit, and pricing.
- **Leads / CRM:** inbound buyer interest per listing, a simple pipeline (new, contacted,
  appointment, closed/lost), and response time. This is the demand side of the same cars.
- **Sales / financials:** recorded deals per vehicle (sale price, cost, recon, front-end and
  back-end gross), which roll up into the overview's financial KPIs.
- **Analytics:** trends over time (sales, gross, inventory turn, views/leads per listing),
  charted. Later: AI insights (pricing suggestions, aging alerts), which fit the async AI
  phase (BullMQ, never blocking a request).

Everything stays tenant-scoped by RLS and reads through the API, the same boundary any client
uses. Financial and lead data are new business tables and follow the same rules: `tenant_id`
under RLS, Zod contracts in `packages/shared`, audited.

## Build sequence

Phase 2 (current) delivered the vehicles API, the photo schema, the seed, and the dashboard
inventory list. Remaining and upcoming, in order:

1. **Photos on the API + the live marketplace (Phase 3).** Return `photos` on the vehicle
   responses (dealer and public). Switch the marketplace off `cars.ts` onto
   `/public/vehicles`, with a real listing detail page. Thumbnails appear in the dashboard
   list. This makes the dashboard to marketplace reflection visible end to end.
2. **Add / edit vehicle + photo upload (Phase 2 finish).** The create/edit form posting to the
   API, with photo upload to Supabase Storage (presigned). Closes the loop: a dealer adds a
   car and it shows on the marketplace.
3. **Status workflow.** Publish draft to active, mark pending/sold, from the dashboard.
4. **Dashboard overview with financial KPIs (Phase 4).** The home screen above. Needs the
   sales/deals table (sale price, cost, recon, gross) and the derived metrics.
5. **Leads / CRM (Phase 4).** Capture buyer interest from the marketplace into a per-tenant
   pipeline, surfaced in the dashboard.
6. **Analytics + AI insights (Phase 5).** Charts and async AI (pricing, aging, lead scoring).

## Non-negotiables that apply throughout

- RLS on every new business table; cross-tenant access fails at the database.
- Contracts in `packages/shared`, imported by both API and apps.
- shadcn/ui base, editorial premium design, en-US copy, no em dash, accessibility.
- Verify in the browser (or via the API) before claiming done.
- Update `README.md` and the relevant `docs/` file in the same change.

## References (market analysis)

- [Dealership KPIs to track (voltra.ai)](https://voltra.ai/blog/dealership-kpis-to-track-2026/)
- [12 metrics every dealer needs (Cox Automotive)](https://www.coxautoinc.com/insights/used-car-kpis/)
- [Tekion DMS: real-time dashboards + AI insights](https://tekion.com/products/dms)
