# Stack — Auth

- **Role:** Identity, sessions, and multi-tenant membership. Feeds tenant context to RLS.
- **Status:** `in-progress`
- **Owner:** Magaiver

## Tools & versions

| Tool                             | Version | Notes                                             |
| -------------------------------- | ------- | ------------------------------------------------- |
| Better Auth                      | 1.6.x   | email/password + Google OAuth; runs in the Next app |
| Better Auth `organization` plugin | 1.6.x   | organization = tenant; `member` = membership + role |
| Supabase Postgres                | 15      | stores Better Auth tables (owned by `postgres`)   |

## Why we chose this

- Better Auth is a typed, self-hosted library: full control over the schema, sessions,
  and the organization model, with no vendor session format to reverse-engineer.
- The `organization` plugin gives multi-tenant membership out of the box, so an
  organization id is exactly the `tenant_id` that RLS filters on.
- One provider for buyer accounts and dealer team accounts.

## Model highlights

- A **tenant is an `organization`**; ids are text nanoids (not uuid).
- Roles: `owner`, `manager`, `salesperson`, `viewer` (dealer side); `buyer` (marketplace).
  The plugin ships `owner`/`admin`/`member`; the SELECTCARS role set is layered on next.
- Sign-up creates the user; creating the first dealership makes the user its `owner`.
  A `session.create.before` hook sets `activeOrganizationId`, so the session carries
  the active tenant. See [[selectcars-rls-tenant-context]] and ADR 001.
- Permission map in `packages/shared`: `vehicles:write`, `leads:write`, `analytics:read`,
  `billing:manage` (to be added with RBAC).

## Alternatives considered

| Alternative      | Why not (for now)                                                                 |
| ---------------- | --------------------------------------------------------------------------------- |
| Supabase Auth    | Ties tenant context to a Supabase JWT claim; less control over the schema and RLS mapping. Google OAuth was already configured against a localhost callback, which fits an in-app library. |
| Clerk / Auth0    | Hosted, less control over the RLS/JWT claim mapping; another vendor.               |

## Open decisions

- [ ] Map the SELECTCARS role set (`manager`/`salesperson`/`viewer`) onto Better Auth
      access-control roles vs a separate `role` column.
- [ ] Buyer vs dealer sign-up split (same user table, different role, different app entry).
- [ ] Extract the Better Auth instance into `packages/auth` once the Fastify API needs it.

## Changelog

| Date       | Change                                      | Reason                                                        |
| ---------- | ------------------------------------------- | ------------------------------------------------------------- |
| 2026-07-12 | Created sheet                               | Supabase Auth chosen (all-in)                                 |
| 2026-07-12 | Switched to Better Auth + organization plugin | More schema/session control; org = tenant maps cleanly to RLS |
