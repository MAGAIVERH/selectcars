# 001 — Multi-tenancy via Postgres Row-Level Security

- **Status:** Accepted
- **Date:** 2026-07-12
- **Phase:** 1 (Multi-tenancy + Auth)

## Context

SELECTCARS is multi-tenant: many dealerships share one database. Tenant isolation
must be enforced at the database, not only in application code, so a bug in a query
can never leak one dealership's inventory or leads to another.

Two candidate models: schema-per-tenant (one Postgres schema per dealership) and a
shared schema with Row-Level Security (RLS). Auth is **Better Auth** with the
organization plugin, so a tenant is an `organization` and its id is a text nanoid
(not a Supabase-issued JWT `uuid`). Tenant context therefore cannot come from a
Supabase JWT claim; it is set by the application per request.

A critical constraint surfaced during the POC: the Supabase connection role
`postgres` has `rolbypassrls = true`. It silently ignores every RLS policy, so it
can never be used to prove or enforce isolation.

## Decision

Shared schema with RLS, using a **dedicated non-bypass role** for all tenant-scoped
queries:

1. Business tables carry `tenant_id text NOT NULL` (references `organization(id)`),
   `ENABLE ROW LEVEL SECURITY`, and a policy scoped to the app role:
   `USING (tenant_id = current_setting('app.current_tenant', true))` plus the same
   `WITH CHECK`.
2. A role `selectcars_app` (`NOLOGIN NOINHERIT`, no bypass) is created; `postgres`
   is granted membership so it can assume it.
3. Every business query runs through `withTenant()` (`packages/db`): a transaction
   that runs `SET LOCAL ROLE selectcars_app` and
   `set_config('app.current_tenant', <orgId>, true)` before the query.
4. Migrations and Better Auth's own tables run as `postgres` (bypass by design).

## Consequences

- Isolation is enforced by Postgres. Proven by `packages/db` `rls:verify`:
  - tenant A sees only its rows; tenant B sees only its rows;
  - a write tagged with another tenant's id fails the RLS `WITH CHECK`;
  - **no tenant context returns zero rows** (fail-closed, never a cross-tenant leak).
- Any code path that forgets `withTenant` runs as `postgres` and would bypass RLS,
  so business data access MUST go through `withTenant`. This is the one rule to guard
  in review. A future hardening step is to connect the app pool as a login role that
  lacks bypass, removing the footgun entirely.
- One schema keeps migrations, pooling, and cross-tenant admin analytics simple.

## Alternatives

| Alternative                                     | Why not                                                                                                                          |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Schema-per-tenant                               | Migration and connection-pool complexity grows per tenant; cross-tenant analytics get awkward; overkill for the scale we target. |
| RLS keyed off a Supabase JWT claim              | We use Better Auth, not Supabase Auth, so there is no Supabase JWT. Tenant context comes from the active organization instead.   |
| Trusting app-code `WHERE tenant_id = ?` filters | Not defense in depth: a single missed filter leaks data. RLS fails closed at the DB.                                             |
