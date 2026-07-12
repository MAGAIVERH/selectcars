# Daily task log

Per-day record of what was built, how it was verified, and what is still open.
This is the shareable progress trail for other devs and reviewers: each file maps to
a day in the build plan.

- One file per day: `day-NN-short-title.md`.
- Structure: Goal · Tasks done · Artifacts · Verification · Still open.
- Stack decisions live in `docs/staks/*.md`; hard trade-offs live in `docs/adr/*.md`.
  Task files link to those instead of repeating them.

## Index

### Phase 0 — Foundation (Days 1-5)
Completed in earlier sessions: monorepo (Turborepo + pnpm), `apps/marketplace`,
`packages/{shared,ui}`, CI (lint + typecheck), en-US migration, shadcn base.
Not individually logged here (predates this log).

### Phase 1 — Multi-tenancy + Auth (Days 6-12)

| Day | Title | Status |
| --- | --- | --- |
| 06 | [DB package + migrations](day-06-db-package.md) | Done |
| 07 | [RLS proof-of-concept](day-07-rls-poc.md) | Done |
| 08 | [Tenant context in requests](day-08-tenant-context.md) | Partial |
| 09 | [Auth with Better Auth](day-09-auth-better-auth.md) | Done (roles partial) |
| 10 | Fastify API scaffold | Open |
| 11 | Audit log | Open |
| 12 | Docker compose + tag | Open |
