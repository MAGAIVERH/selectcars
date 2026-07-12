# Architecture Decision Records

Short records of significant, hard-to-reverse decisions and their trade-offs. One file per decision.

**Format:** `NNN-title.md` with: Context · Decision · Consequences · Alternatives.

## Accepted

- [`001-rls-multi-tenancy.md`](001-rls-multi-tenancy.md) — RLS vs schema-per-tenant, and the
  non-bypass role that makes isolation provable.
- [`002-service-auth-jwt-jwks.md`](002-service-auth-jwt-jwks.md) — asymmetric JWT + JWKS
  between the Next issuer and the Fastify API, vs a shared secret or session-table reads.

## Planned

- `003-ai-vision-listings.md` — photo-to-listing vision approach and cost controls.
- `004-semantic-search-pgvector.md` — pgvector vs external vector DB.
- `005-microfrontends.md` — Vercel microfrontends vs single app.
