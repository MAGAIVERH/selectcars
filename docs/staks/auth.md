# Stack — Auth

- **Role:** Identity, sessions, and multi-tenant membership. Feeds tenant context to RLS.
- **Status:** `planned`
- **Owner:** Magaiver

## Tools & versions

| Tool                         | Version | Notes                            |
| ---------------------------- | ------- | -------------------------------- |
| Supabase Auth                | latest  | email/password + OAuth providers |
| Custom `tenants` / `members` | -       | dealership membership + roles    |

## Why we chose this

- Supabase Auth is native to the DB, so JWT claims map cleanly to RLS policies.
- One provider for buyer accounts and dealer team accounts.

## Model highlights

- Roles: `owner`, `manager`, `salesperson`, `viewer` (dealer side); `buyer` (marketplace).
- `members(tenant_id, user_id, role)`; active tenant carried in session/JWT.
- Permission map in `packages/shared`: `vehicles:write`, `leads:write`, `analytics:read`, `billing:manage`.

## Alternatives considered

| Alternative                 | Why not (for now)                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------- |
| Better Auth (Organizations) | Strong, but adds a second system next to Supabase; revisit if org features fall short |
| Clerk / Auth0               | Less control over the RLS/JWT claim mapping                                           |

## Open decisions

- [ ] Model dealerships as a custom `tenants` table vs a Supabase-native org concept.
- [ ] Buyer vs dealer sign-up split (same table, different role, different app entry).

## Changelog

| Date       | Change        | Reason                        |
| ---------- | ------------- | ----------------------------- |
| 2026-07-12 | Created sheet | Supabase Auth chosen (all-in) |
