# Requirements — SELECTCARS

**Product:** A premium, AI-powered car marketplace and dealership operating system for the US market. Two front doors: a public **buyer marketplace** and a multi-tenant **dealer dashboard**.

## Actors

- **Dealership Owner** — creates the workspace, billing, full access.
- **Sales Manager** — manages inventory, team, all leads and analytics.
- **Salesperson** — manages assigned vehicles and leads, schedules test drives.
- **Viewer** — read-only (reporting).
- **Public Buyer** — browses the marketplace, no account required to browse; account to save/inquire.

## Core flows

**Dealer:** Sign up → create dealership (tenant) → invite team → add vehicles (AI-assisted from photos) → manage leads in pipeline → schedule test drives → close deals → view analytics.

**Buyer:** Browse marketplace → semantic search ("reliable AWD SUV under $35k, low miles") → view vehicle (gallery, 360°, color change, specs) → submit interest / schedule test drive → lead appears in the dealer CRM in real time.

## Vehicle fields (US)

`make`, `model`, `year`, `trim`, `vin`, `mileage` (miles), `priceUSD`, `condition` (New / Used / Certified Pre-Owned), `bodyStyle` (Sedan / Coupe / SUV / Truck / Convertible / Hatchback), `transmission` (Automatic / Manual / DCT), `drivetrain` (RWD / AWD / FWD), `fuelType` (Gas / Hybrid / EV / Diesel), `exteriorColor`, `interiorColor`, `features[]`, `images[]`, `colorVariants[]`, `spin360[]`, `status` (draft / active / pending / sold).

## AI features (v1)

- Vision: photos → listing fields + description + suggested price.
- Semantic search (pgvector) over the marketplace.
- Lead scoring (0–100 + reasoning).
- Price estimate from comparable inventory.

## Explicitly out of scope (v1)

- Real MLS/inventory-feed integrations, native mobile app, full financing/loan underwriting, multi-language i18n, live 3D configurator (WebGL) beyond the 360° frame viewer.

## Non-functional

- en-US, USD, miles, US addresses/dates.
- Multi-tenant isolation enforced by RLS.
- Premium, accessible UI (WCAG AA), motion respects `prefers-reduced-motion`.
- Lighthouse performance target 85+ on marketplace vehicle page.
