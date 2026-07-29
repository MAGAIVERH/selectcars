# SELECTCARS

A multi-tenant car marketplace and dealership operating system for the US market.

Buyers browse a premium showroom. Dealerships get an operating system: inventory, leads,
test drives, analytics. Many dealerships share one database, and **the database itself**
refuses to let one see another's data.

> Status: **Phases 2 and 3 are done except photo upload.** Multi-tenancy, auth, the vehicles
> API, a seeded showroom, a live marketplace, and a dealer dashboard where a car is created,
> edited, and moved through its lifecycle (draft, active, pending, sold) are all in place.
> Next: photo upload to Supabase Storage, then the financial/analytics dashboard (Phase 4).
> See the [build plan](docs/plans/dealer-dashboard-and-marketplace.md) for the full vision and
> [`docs/tasks/`](docs/tasks/) for the day-by-day log.

## What works today

- **Marketplace** (`:3000`): premium buyer-facing showroom. The home preview, the collection
  (`/colecao`), and the listing detail pages all read **live** from the database (every
  dealership's published listings), with data-derived filters and per-listing galleries. What
  a dealer publishes in their dashboard shows up here, same rows via the read-only public role.
- **Multi-seller by design**: every listing says who is selling it ("Sold by", with the city),
  `/dealers` is the seller directory, and `/dealers/<slug>` is one dealership's storefront. A
  dealership appears there the moment it publishes its first car and drops out when it has none
  live, and that is an RLS policy rather than a filter in a query.
- **Dealer dashboard** (`/dashboard`): sign in, see your tenant-scoped inventory with photo
  thumbnails, filter by status, and add a vehicle (save as draft or publish straight to the
  marketplace). Every listing can be edited, photographed, and moved through its lifecycle
  from the row or the edit page: publish a draft, mark a deal pending, mark it sold, relist
  it. Which moves are offered comes from one map in `packages/shared` that the API validates
  against, so the buttons and the server can never disagree. Reads and writes the vehicles API
  with a token minted from your session.
- **Photo upload**: a dealer uploads photos straight to Supabase Storage under a ticket the
  API signs for one object key, so a 5 MB photo never travels through our servers and the
  storage credential never reaches a browser. → [ADR 003](docs/adr/003-direct-to-storage-uploads.md)
- **The dealership's numbers** (`/dashboard`): inventory value, what is live, average days on
  lot, what is aging past 60 days, units sold, front and back end gross, gross per unit, and
  days to sale. Gross is computed by Postgres as a generated column, so no screen gets to
  define it. Owners and managers only: a salesperson sells cars without seeing what the store
  paid for them.
- **Leads** (`/dashboard/leads`): a buyer asks about a car from its listing and it lands in
  that dealership's pipeline, assigned to a salesperson, with response time stamped on the
  first reply. The buyer can create a lead and can never read one: the public database role
  holds an insert grant and no select policy at all.
- **Vehicles API**: dealer CRUD (`/vehicles`, RBAC) and a separate public read path
  (`/public/vehicles`) that can only ever return `active` listings, enforced by a distinct
  Postgres role. Every vehicle carries its ordered `photos` gallery; on the public path the
  photo subquery runs under the same read-only role, so a buyer never sees a draft's images.
- **Seeded sellers**: two dealerships publish into the same collection, `SELECTCARS Showroom`
  (Miami, FL: Bentley, AMG, Jaguar, BMW i8) and `Bayshore Fleet Sales` (Tampa, FL: a rental
  company remarketing its fleet). Seven active listings, every photo to one standard: a full
  car in side profile, facing left, on a transparent background. Sign in as the demo dealer to
  see the platform populated; everything a real dealer adds surfaces the same way.

## The two ideas worth reviewing

**1. Tenant isolation is enforced by Postgres, not by application code.**
Every business table carries `tenant_id` under Row-Level Security. Queries run as a role
that _cannot_ bypass RLS (`selectcars_app`), inside a transaction that sets the tenant. A
forgotten `WHERE tenant_id = ...` cannot leak data, because the filter is not in the query:
it is in the database. Without a tenant context, a query returns **zero rows**, never
another tenant's. → [ADR 001](docs/adr/001-rls-multi-tenancy.md)

**2. Services authenticate with asymmetric JWT + JWKS, not a shared secret.**
The Next app is the identity issuer: it signs short-lived EdDSA access tokens and publishes
its public keys. The Fastify API verifies them offline. **The API holds no signing key, so it
can verify identities but never forge one.** The token carries the active dealership, so the
same cryptographic proof that says _who you are_ also says _which tenant you act for_, and
that feeds RLS. → [ADR 002](docs/adr/002-service-auth-jwt-jwks.md)

Both are proven by scripts that drive the real stack, not mocks:

```bash
pnpm --filter @selectcars/db rls:verify       # isolation at the SQL level
pnpm --filter @selectcars/db verify:api       # isolation through the API, with real tokens
pnpm --filter @selectcars/db verify:vehicles  # dealer vs public paths + the status workflow
```

`verify:api` signs up two real dealerships, mints real tokens, and asserts that a forged
token is rejected, that each dealership sees only its own rows, and that the audit trail is
attributed and never leaks across tenants.

## Stack

| Layer       | Choice                                                   |
| ----------- | -------------------------------------------------------- |
| Monorepo    | Turborepo + pnpm                                         |
| Marketplace | Next.js 16, React 19, Tailwind v4, shadcn/ui             |
| API         | Fastify 5, Zod type provider, pino                       |
| Database    | Supabase Postgres, Row-Level Security, pgvector          |
| Auth        | Better Auth (organization plugin = tenant) + JWT/JWKS    |
| Contracts   | Zod schemas in `packages/shared`, imported by both sides |
| Async       | BullMQ + Redis (Phase 3: AI never blocks a request)      |

```
apps/
  marketplace   Next.js buyer-facing app; also the identity issuer (Better Auth)
  api           Fastify service: business logic, tenant-scoped
packages/
  db            pg pool, withTenant() (RLS context), SQL migrations
  shared        Zod contracts shared by every app: one source of truth
  ui            shadcn/ui base
```

## Getting started

**Prerequisites:** Node 22, pnpm 11, a Supabase project. Docker only if you want to run the
API in a container.

```bash
pnpm install
cp .env.example .env        # then fill it in: the file explains every variable
pnpm --filter @selectcars/db migrate
pnpm --filter @selectcars/db seed          # two demo dealerships and their live inventory
```

Two gotchas that will cost you an hour if you skip the comments in `.env.example`:

- Use the Supabase **session pooler** host, not `db.<ref>.supabase.co`. The direct host is
  IPv6-only and will not resolve on most networks.
- The variable is `SELECTCARS_DATABASE_URL`, not `DATABASE_URL`, on purpose: a generic
  `DATABASE_URL` exported by some other tool in your shell would silently win.

If the pooler answers `tenant/user postgres.<ref> not found`, the credentials are almost
certainly fine: a free-tier Supabase project **pauses** after about a week of inactivity, and
a paused project loses its `db.<ref>.supabase.co` DNS record and stops answering at the
pooler. Restore it from the Supabase dashboard. Confirm with
`nslookup db.<ref>.supabase.co`: `Non-existent domain` means paused or deleted, not a wrong
password.

Run it:

```bash
pnpm dev                                   # marketplace on :3000
pnpm --filter @selectcars/api dev          # API on :3333
```

The dealer dashboard is at `/dashboard`. To see it populated with the seeded showroom, sign
in as the demo dealer: `demo-dealer@selectcars.test` / `supercar1234` (owner of the
`SELECTCARS Showroom`). It is created by signing up once and adding the membership; the seed
loads the inventory it displays.

Google sign-in expects this exact redirect URI:
`http://localhost:3000/api/auth/callback/google`

### With Docker

```bash
docker compose up --build      # api on :3333, redis on :6380
```

Redis is published on **6380**, not the default 6379, so it can coexist with another
project's Redis on the same machine. Postgres is intentionally not containerized: the
database is Supabase, and a second local Postgres would let RLS drift from production.

## Engineering rules

Non-negotiables live in [`docs/rules/engineering-rules.md`](docs/rules/engineering-rules.md):
TypeScript strict with no `any`, RLS on every business table, Zod contracts shared between
API and apps, AI always async, en-US copy. Decisions with a real trade-off become an
[ADR](docs/adr/).
