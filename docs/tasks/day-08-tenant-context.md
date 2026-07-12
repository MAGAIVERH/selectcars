# Day 8 — Tenant context in requests

- **Date:** 2026-07-12
- **Phase:** 1 (Multi-tenancy + Auth)
- **Status:** Partial

## Goal

Set the tenant context per request so a query without context returns empty and never
crosses tenants.

## Tasks done

- [x] `withTenant(tenantId, fn)` in `packages/db`: opens a transaction, runs
      `SET LOCAL ROLE selectcars_app` and `set_config('app.current_tenant', tenantId, true)`,
      then runs the callback and commits. Rolls back on error.
- [x] The tenant id is the active organization id carried on the Better Auth session.

## Artifacts

- `packages/db/src/tenant.ts`

## Verification

- Exercised by the Day 7 `rls:verify` script, which drives all reads/writes through
  `withTenant` and proves isolation.

## Still open

- Wire `withTenant` into the request layer once the Fastify API exists (Day 10): a
  plugin that reads the session's active organization and scopes the connection.
- For Next server actions, a thin wrapper that resolves the active org from the session
  before calling `withTenant`.
- An automated test that proves isolation through the request layer (not just the script).
