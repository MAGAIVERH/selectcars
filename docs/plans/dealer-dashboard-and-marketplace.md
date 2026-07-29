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

This holds today: the marketplace reads `/public/vehicles` live (the static `cars.ts` is gone),
and a listing leaves the public site the moment a dealer unpublishes or sells it.

## Who sells: the seller model

SELECTCARS is a **multi-seller platform**, not one shop's website. The full loop, which every
part of the build must keep true:

1. A business signs up and creates its dealership. That dealership is the tenant: its own
   isolated inventory, its own team, its own numbers.
2. Its team adds vehicles in the dashboard and publishes them.
3. Those cars appear in the public collection **immediately**, alongside every other
   dealership's cars, because the marketplace reads the same rows through the read-only
   public role.
4. A buyer can see who is selling each car, open that seller's page, and filter the whole
   collection down to one seller.

As more businesses join, dealerships, rental companies unloading their fleet, independent
lots, the collection is simply the union of what they have all published. Nothing is
special-cased per seller.

### The seller is the dealership, not the salesperson

This was researched rather than assumed. In the US market the seller of record on a listing is
the store: a franchised dealership, an independent dealership, or a private seller. Cars.com
and Autotrader both structure listings that way, and buyers filter and judge by dealer. A
salesperson is **internal staff**: they work leads and close deals inside a dealership; they
never own a listing.

So the platform reads:

- **Dealership = the tenant** (a Better Auth organization). It has a public profile
  (`dealer_profiles`): name, city, state, phone, and a short pitch. This is what "Sold by"
  shows, what `/dealers/<slug>` resolves to, and what the Seller filter selects.
- **Salesperson = a role inside it** (`owner`, `manager`, `salesperson`, `viewer`). Roles
  decide who may publish, price, or rename the store. They are never shown to buyers.

A dealership becomes visible to buyers the moment it publishes its first car and disappears
when it has none live. That rule is enforced by an RLS policy, not by a query someone writes,
so an empty seller can never be linked or enumerated. See
[Day 26](../tasks/day-26-dealer-identity.md).

Private sellers (an individual listing one car) are a separate account type and are
deliberately not modeled yet.

### The data is the platform's memory

Everything above lives in the database, never in the code: listings, photos, sellers, and
their profiles. The seeded showroom's cars belong to a real dealership account like any
other, and its photographs are that dealership's inventory photos. That is why they survive a
restart, a deploy, or a new browser: the site renders whatever the database holds at that
moment, for every seller at once. A car added by any dealership tomorrow shows up the same
way, with no code change and no second copy of the data.

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
2. **Add / edit vehicle + photo upload (Phase 2 finish).** **Done.** Create and edit shipped on
   Days 18-19 and 25; photo upload to Supabase Storage shipped on Day 28, direct from the
   browser under a server-signed ticket ([ADR 003](../adr/003-direct-to-storage-uploads.md)).
   The loop is closed: a dealer signs up, adds a car, photographs it, publishes, and it is on
   the marketplace with its images.
3. **Status workflow.** **Done (Day 25).** Publish draft to active, mark pending, mark sold,
   relist, from the row or the edit page. The legal moves live in one map in
   `packages/shared`; the API validates against it inside the writing transaction, so the UI
   cannot offer a move the server refuses.
4. **Dashboard overview with financial KPIs (Phase 4).** **Done (Day 29).** `/dashboard` is
   the overview; the inventory list moved to `/dashboard/inventory`. The `deals` table holds
   sale price, cost, recon and back-end gross, with front-end and total gross as generated
   columns so no screen can define them differently. Owners and managers only.
5. **Leads / CRM (Phase 4).** **Done (Day 30).** An enquiry from a listing becomes a lead in
   the selling dealership's pipeline, assigned to a person, with response time stamped by the
   API on the first move. A buyer may create one and can never read one: `selectcars_public`
   holds an insert grant and no select policy at all. This is where the **salesperson** role
   finally does product work, while the listing stays owned by the dealership.
6. **Analytics + AI insights (Phase 5).** Trends shipped on Day 31: units sold, gross, and
   enquiries by month, at `/dashboard/analytics`, as small multiples with a table twin. The
   async AI half (pricing position, aging alerts, lead scoring) is next, and stays on BullMQ:
   never on the request path.

Delivered alongside the above, out of sequence because the marketplace needed it to be a real
platform:

- **Seller identity (Day 26).** Dealer profiles, "Sold by" on every listing, a seller
  directory at `/dealers`, one storefront per dealership, and a Seller filter. See the model
  described above.

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
