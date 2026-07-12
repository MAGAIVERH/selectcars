# Day 7 — RLS proof-of-concept (do not skip)

- **Date:** 2026-07-12
- **Phase:** 1 (Multi-tenancy + Auth)
- **Status:** Done

## Goal

Prove tenant isolation at the database with Row-Level Security before building any
feature. This is the item the plan flags as make-or-break.

## Tasks done

- [x] `test_items(tenant_id text, ...)` with `ENABLE ROW LEVEL SECURITY`.
- [x] Policy scoped to the app role: `USING/WITH CHECK (tenant_id = current_setting('app.current_tenant', true))`.
- [x] Dedicated non-bypass role `selectcars_app` created; `postgres` granted membership
      so it can assume it via `SET LOCAL ROLE`. (The `postgres` role has `rolbypassrls`,
      so it can never prove isolation on its own.)
- [x] `verify-rls.ts` script seeds two tenants and asserts isolation.
- [x] Decision recorded in `docs/adr/001-rls-multi-tenancy.md`.

## Artifacts

- `packages/db/migrations/0001_rls_foundation.sql`, `0002_rls_poc.sql`
- `packages/db/src/scripts/verify-rls.ts`
- `docs/adr/001-rls-multi-tenancy.md`

## Verification

`pnpm --filter @selectcars/db rls:verify` reports all checks PASS:

- tenant A sees only its 2 rows;
- tenant B sees only its 1 row;
- tenant A cannot insert a row tagged as tenant B (RLS `WITH CHECK` rejects it);
- no tenant context returns 0 rows (fail-closed, never a cross-tenant leak).

## Still open

- Harden by connecting the app pool as a login role that lacks bypass, removing the
  "forgot `withTenant`" footgun entirely (noted in ADR 001).
