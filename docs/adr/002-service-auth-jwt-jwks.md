# 002 — Service-to-service auth with JWT + JWKS

- **Status:** Accepted
- **Date:** 2026-07-12
- **Phase:** 1 (Multi-tenancy + Auth)

## Context

Auth runs inside the Next marketplace (Better Auth), but business logic lives in a
separate Fastify API. The API must answer one question on every request: _who is calling,
and which dealership are they acting for?_ Its answer feeds the RLS tenant context
(ADR 001), so getting it wrong is a data-leak class of bug, not a login annoyance.

Three ways to do it:

1. **Read the session table from Fastify.** The API queries Better Auth's `session` table
   directly.
2. **Shared secret (HS256).** The marketplace signs tokens with a symmetric key that the
   API also holds.
3. **Asymmetric JWT + JWKS.** The marketplace signs with a private key and publishes the
   public half at a JWKS endpoint; the API verifies offline.

## Decision

**Asymmetric JWT + JWKS**, via Better Auth's `jwt` plugin (EdDSA / Ed25519).

- The marketplace mints a **5-minute** access token at `/api/auth/token` and serves its
  public keys at `/api/auth/jwks`.
- Token claims carry the identity **and the tenant**: `sub`, `email`, `name`,
  `activeOrganizationId` (the RLS tenant id), and the caller's dealership `role`.
- Fastify verifies tokens with `jose`'s `createRemoteJWKSet` (cached, refetched on key
  rotation), checking `iss` and `aud`. It then parses the claims against
  `accessTokenClaimsSchema` from `packages/shared`, so a claim drift fails at the door
  instead of deep inside a query.
- `authenticate` and `requireTenant(roles)` hooks turn a verified token into
  `request.auth`, which feeds `withTenant()`.

## Consequences

- **The API holds no signing key.** It can verify tokens but cannot mint them, so
  compromising the API does not let an attacker forge an identity. A shared secret would
  have given exactly that power to every service holding it.
- **Stateless verification:** no session lookup on the hot path, no second service coupled
  to Better Auth's internal schema. The API scales independently.
- **Key rotation is free:** rotate at the issuer, and verifiers pick up the new `kid` from
  the JWKS automatically.
- **The cost is staleness:** a revoked membership or a switched active dealership stays
  valid until the token expires. Mitigated by the 5-minute lifetime. If we later need
  instant revocation on a sensitive action, that specific endpoint can check session state
  explicitly; we do not pay for it on every request.
- The client must attach `Authorization: Bearer <token>` and refresh the token. Cookies
  remain the mechanism inside the Next app itself.

## Alternatives

| Alternative                       | Why not                                                                                                                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fastify reads the `session` table | Couples a second service to Better Auth's internal schema (it would break on their next migration), reimplements signed-cookie validation by hand, and adds a DB round-trip per request. |
| Shared secret (HS256)             | Every service that can verify can also forge. The blast radius of one leaked service is the whole system's identity.                                                                     |
| Proxy all API calls through Next  | Makes Next a bottleneck and a single point of failure, and defeats having a standalone API and workers.                                                                                  |

## Verified

`pnpm --filter @selectcars/db verify:api` drives the real servers with two real
dealerships: an unsigned/forged token is rejected (401), each dealership sees only its own
rows through the API, a role-gated write is enforced, and the audit trail is attributed
and tenant-scoped.
