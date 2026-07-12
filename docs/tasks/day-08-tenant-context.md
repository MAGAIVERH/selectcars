# Day 8 — Tenant context in requests

- **Date:** 2026-07-12
- **Phase:** 1 (Multi-tenancy + Auth)
- **Status:** Done

## Goal

Set the tenant context per request so a query without context returns empty and never
crosses tenants. A request must prove who it is and which dealership it acts for, before
it can touch a row.

## The problem this had to solve

Auth lives in the Next app (Better Auth), business logic lives in the Fastify API. So the
API needed a trustworthy way to learn the caller's identity **and tenant**. We chose
asymmetric **JWT + JWKS** over reading the session table or sharing a secret. The full
reasoning is in [ADR 002](../adr/002-service-auth-jwt-jwks.md).

## Tasks done

- [x] `withTenant(scope, fn)` in `packages/db`: opens a transaction, runs
      `SET LOCAL ROLE selectcars_app`, and sets `app.current_tenant` (read by RLS) plus
      `app.current_actor` (read by the audit trigger).
- [x] Better Auth `jwt` plugin on the marketplace: EdDSA keys, JWKS at `/api/auth/jwks`,
      5-minute access tokens at `/api/auth/token`.
- [x] Token claims carry the tenant: `activeOrganizationId` + the caller's dealership
      `role`, resolved from `member` at mint time.
- [x] Fastify `auth` plugin: verifies tokens against the remote JWKS with `jose`
      (checking `iss`/`aud`), then validates the claims against the shared Zod contract.
- [x] Hooks `authenticate` and `requireTenant(roles)` produce `request.auth`; the
      `requireAuth` / `requireTenantContext` helpers narrow it without scattering `!`.
- [x] Contracts in `packages/shared`: `accessTokenClaimsSchema`, `authenticatedUserSchema`,
      `dealershipRoleSchema`, `apiErrorSchema`. Both services compile against the same shapes.
- [x] Proof routes: `GET /me`, `GET /tenant/items`, `POST /tenant/items` (owner/manager only).
- [x] Global error handler: every failure leaves shaped like `apiErrorSchema`; stack traces
      and driver messages never reach a client. Auth headers redacted from logs.

## Artifacts

- `apps/api/src/plugins/auth.ts`, `apps/api/src/lib/request-context.ts`, `apps/api/src/routes/me.ts`
- `apps/marketplace/src/lib/auth.ts` (jwt plugin + `definePayload`)
- `packages/db/src/tenant.ts`, `packages/db/migrations/0004_better_auth_jwks.sql`
- `docs/adr/002-service-auth-jwt-jwks.md`

## Verification

`pnpm --filter @selectcars/db verify:api` (both servers running). Nothing mocked: it signs
up two real dealerships, mints real tokens, and drives the real API. 13/13 pass:

- `/me` returns the verified identity, with an active tenant and the `owner` role.
- No token -> 401. **Forged token -> 401** (signature checked against the JWKS).
- Each dealership can write in its own tenant (201).
- **Alpha sees only Alpha's rows; Bravo sees only Bravo's** (RLS, through the API).
- Invalid body -> 400 (Zod).
- Audit trail readable by owner, attributed to the actor, and never leaking another tenant.

## Still open

- Token refresh on the client (the 5-minute token expires; the Next app needs to re-mint).
- The `buyer` role and the marketplace-side permission map.
