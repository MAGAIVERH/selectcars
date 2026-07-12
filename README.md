# SELECTCARS

A multi-tenant car marketplace and dealership operating system for the US market.

Buyers browse a premium showroom. Dealerships get an operating system: inventory, leads,
test drives, analytics. Many dealerships share one database, and **the database itself**
refuses to let one see another's data.

> Status: **Phase 1 complete** (multi-tenancy + auth). Inventory, AI, and the CRM pipeline
> are next. See [`docs/tasks/`](docs/tasks/) for the day-by-day build log.

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
pnpm --filter @selectcars/db rls:verify    # isolation at the SQL level
pnpm --filter @selectcars/db verify:api    # isolation through the API, with real tokens
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
```

Two gotchas that will cost you an hour if you skip the comments in `.env.example`:

- Use the Supabase **session pooler** host, not `db.<ref>.supabase.co`. The direct host is
  IPv6-only and will not resolve on most networks.
- The variable is `SELECTCARS_DATABASE_URL`, not `DATABASE_URL`, on purpose: a generic
  `DATABASE_URL` exported by some other tool in your shell would silently win.

Run it:

```bash
pnpm dev                                   # marketplace on :3000
pnpm --filter @selectcars/api dev          # API on :3333
```

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
