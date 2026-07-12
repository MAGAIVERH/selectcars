# Day 6 — DB package + migrations

- **Date:** 2026-07-12
- **Phase:** 1 (Multi-tenancy + Auth)
- **Status:** Done

## Goal

Create `packages/db` with the Postgres connection and a repeatable migration path, so
every app and the API share one database layer.

## Tasks done

- [x] `packages/db` (`@selectcars/db`): lazy pg `Pool` singleton reading `SELECTCARS_DATABASE_URL`.
- [x] `withTenant()` helper: runs a query inside a transaction that drops to the
      non-bypass role and sets the `app.current_tenant` GUC (used by all tenant-scoped queries).
- [x] SQL migration runner (`pnpm --filter @selectcars/db migrate`) tracking applied
      files in `public._migrations`.
- [x] Migrations: `0001_rls_foundation.sql`, `0002_rls_poc.sql`, `0003_better_auth.sql`.

## Infrastructure notes (non-obvious)

- The Supabase **direct** host `db.<ref>.supabase.co` does not resolve on IPv4 (IPv6-only).
  We connect through the **session pooler**: `aws-1-sa-east-1.pooler.supabase.com:5432`,
  user `postgres.<ref>`, password `@` encoded as `%40`.
- A global `DATABASE_URL` (from the Neon MCP) was hijacking the pool. The app uses a
  uniquely named `SELECTCARS_DATABASE_URL` to avoid the collision.
- Tenancy is not a hand-rolled `tenants` table: it comes from the Better Auth
  `organization` / `member` tables (see Day 9).

## Artifacts

- `packages/db/src/{pool,tenant,migrate,index}.ts`
- `packages/db/migrations/*.sql`

## Verification

- `pnpm --filter @selectcars/db migrate` applies all three migrations against Supabase.

## Still open

- Extract shared query helpers as business tables arrive (Phase 2 vehicles).
