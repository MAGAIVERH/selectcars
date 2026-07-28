# Architecture Decision Records

Short records of significant, hard-to-reverse decisions and their trade-offs. One file per decision.

**Format:** `NNN-title.md` with: Context · Decision · Consequences · Alternatives.

## Accepted

- [`001-rls-multi-tenancy.md`](001-rls-multi-tenancy.md) — RLS vs schema-per-tenant, and the
  non-bypass role that makes isolation provable.
- [`002-service-auth-jwt-jwks.md`](002-service-auth-jwt-jwks.md) — asymmetric JWT + JWKS
  between the Next issuer and the Fastify API, vs a shared secret or session-table reads.
- [`003-direct-to-storage-uploads.md`](003-direct-to-storage-uploads.md) — photo bytes go
  straight to Supabase Storage under a server-signed ticket, so the service-role key never
  reaches a browser and no photo travels through our API.

## Planned

- `004-ai-vision-listings.md` — photo-to-listing vision approach and cost controls.
- `005-semantic-search-pgvector.md` — pgvector vs external vector DB.
- `006-microfrontends.md` — Vercel microfrontends vs single app.
