# Daily task log

Per-day record of what was built, how it was verified, and what is still open.
This is the shareable progress trail for other devs and reviewers: each file maps to
a day in the build plan.

- One file per day: `day-NN-short-title.md`.
- Structure: Goal · Tasks done · Artifacts · Verification · Still open.
- Stack decisions live in `docs/staks/*.md`; hard trade-offs live in `docs/adr/*.md`.
  Task files link to those instead of repeating them.

> Days 1-5 were backfilled from git history: the log started at Day 6. They are marked
> as reconstructed and cite the commit they came from.

## Index

### Phase 0 — Foundation

| Day | Title                                               | Status |
| --- | --------------------------------------------------- | ------ |
| 01  | [Scope, repo, docs](day-01-scope-repo-docs.md)      | Done   |
| 02  | [Environment](day-02-environment.md)                | Done   |
| 03  | [Turborepo monorepo](day-03-monorepo.md)            | Done   |
| 04  | [Shared tooling + CI](day-04-tooling-ci.md)         | Done   |
| 05  | [en-US migration + UI base](day-05-en-us-and-ui.md) | Done   |

### Phase 1 — Multi-tenancy + Auth

| Day | Title                                                     | Status                    |
| --- | --------------------------------------------------------- | ------------------------- |
| 06  | [DB package + migrations](day-06-db-package.md)           | Done                      |
| 07  | [RLS proof-of-concept](day-07-rls-poc.md)                 | Done                      |
| 08  | [Tenant context in requests](day-08-tenant-context.md)    | Done                      |
| 09  | [Auth with Better Auth](day-09-auth-better-auth.md)       | Done (roles partial)      |
| 10  | [Fastify API scaffold](day-10-fastify-api.md)             | Done                      |
| 11  | [Audit log](day-11-audit-log.md)                          | Done                      |
| 12  | [Docker compose + env template](day-12-docker-and-tag.md) | Done (build not executed) |

**Phase 1 is functionally complete.** Tenant isolation, JWT/JWKS service auth, RBAC, and
the audit trail are proven end to end by `pnpm --filter @selectcars/db verify:api`
(13/13, against real servers). Key decisions: [ADR 001](../adr/001-rls-multi-tenancy.md)
and [ADR 002](../adr/002-service-auth-jwt-jwks.md).

### Phase 2 — Inventory / Vehicles

| Day   | Title                                                                   | Status |
| ----- | ----------------------------------------------------------------------- | ------ |
| 13-14 | [Vehicles schema, RLS, and CRUD API](day-13-vehicles-schema-and-api.md) | Done   |
| 15    | [Vehicle photos schema + showroom seed](day-15-photos-and-showroom-seed.md) | Done   |
| 16-17 | [Dashboard shell + inventory list UI](day-16-dashboard-shell-and-inventory.md) | Done   |
| 18-19 | Vehicle create/edit form + photo uploader                               | Open   |
| 20    | Status workflow (draft to sold)                                         | Open   |

The vehicles module introduced a second Postgres role: buyers read through
`selectcars_public`, which can only ever see `active` listings. See the day log.

### Phase 3 — Live marketplace (dashboard reflects on the public site)

| Day | Title                                                          | Status |
| --- | -------------------------------------------------------------- | ------ |
| 21  | Photos on the API responses (dealer + public)                  | Open   |
| 22  | Marketplace reads `/public/vehicles` (replace static cars.ts)  | Open   |
| 23  | Public listing detail page + gallery                           | Open   |

Whatever a dealer publishes surfaces here automatically: same rows, read-only public role.

### Phase 4 — Professional dashboard (financials + CRM)

| Day   | Title                                                     | Status |
| ----- | --------------------------------------------------------- | ------ |
| 24-25 | Sales / deals schema (gross front + back end)             | Open   |
| 26-27 | Dashboard overview: inventory value, units, gross, aging  | Open   |
| 28-29 | Leads / CRM pipeline from marketplace interest            | Open   |

### Phase 5 — Analytics + AI insights

| Day | Title                                                | Status |
| --- | ---------------------------------------------------- | ------ |
| 30+ | Trend charts, inventory turn, async AI (pricing)     | Open   |

The full intent behind Phases 3-5 lives in
[`docs/plans/dealer-dashboard-and-marketplace.md`](../plans/dealer-dashboard-and-marketplace.md).
