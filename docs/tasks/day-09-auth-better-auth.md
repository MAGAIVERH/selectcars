# Day 9 — Auth with Better Auth + roles

- **Date:** 2026-07-12
- **Phase:** 1 (Multi-tenancy + Auth)
- **Status:** Done (full role set still partial)

## Goal

Authentication with dealership membership: sign up creates a dealership and its owner,
and the session carries the active tenant.

## Decision

Auth stack changed from Supabase Auth to **Better Auth** (see `docs/staks/auth.md`).
A tenant is a Better Auth `organization`; its id is the `tenant_id` used by RLS.

## Tasks done

- [x] Better Auth server instance (`src/lib/auth.ts`): email/password + Google OAuth,
      pg pool from `@selectcars/db`, `organization` plugin.
- [x] Next route handler `app/api/auth/[...all]/route.ts` and typed client (`auth-client.ts`).
- [x] `session.create.before` hook sets `activeOrganizationId` from the user's first
      membership, so the session always carries the active tenant.
- [x] `/signin` (email/password + Continue with Google) and `/account` (active dealership,
      role, tenant id, sign out) pages, in the site's editorial style.
- [x] Sign-up creates the user; creating the first dealership makes the user its `owner`
      and sets it active.
- [x] Better Auth schema migrated (`0003_better_auth.sql`): user, session, account,
      verification, organization, member, invitation.

## Artifacts

- `apps/marketplace/src/lib/{auth,auth-client,session}.ts`
- `apps/marketplace/src/app/api/auth/[...all]/route.ts`
- `apps/marketplace/src/app/{signin,account}/page.tsx`
- `apps/marketplace/src/components/auth/*`
- `apps/marketplace/next.config.ts` (loads root `.env`, keeps `pg` external)

## Verification (browser, Playwright)

- Email sign-up -> creates user -> create dealership -> becomes `owner` -> tenant id on session.
- Sign out, then sign in again -> hook auto-selects the active organization (no re-onboarding).
- Google button reaches the real Google consent screen with the correct `client_id` and
  `redirect_uri=http://localhost:3000/api/auth/callback/google` (no `redirect_uri_mismatch`).
  Completing the Google account selection requires a real Google account (cannot be automated).

## Still open

- Full SELECTCARS role set (`manager` / `salesperson` / `viewer` + `buyer`) and the
  permission map in `packages/shared`.
- Buyer vs dealer sign-up split (same user table, different role and app entry).
