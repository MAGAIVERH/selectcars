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

| Day | Title                                                  | Status               |
| --- | ------------------------------------------------------ | -------------------- |
| 06  | [DB package + migrations](day-06-db-package.md)        | Done                 |
| 07  | [RLS proof-of-concept](day-07-rls-poc.md)              | Done                 |
| 08  | [Tenant context in requests](day-08-tenant-context.md) | Partial              |
| 09  | [Auth with Better Auth](day-09-auth-better-auth.md)    | Done (roles partial) |
| 10  | [Fastify API scaffold](day-10-fastify-api.md)          | Done                 |
| 11  | Audit log                                              | Open                 |
| 12  | Docker compose + tag                                   | Open                 |

### Phase 2 — Inventory / Vehicles

Not started. See `DEVELOPMENT-GUIDE.md` (gitignored) for the plan.
