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
- [`004-async-insights.md`](004-async-insights.md) — insights are computed deterministically
  on a BullMQ queue and the model writes only the sentence, so the feature works with no API
  key and no page ever waits on a model.

## Planned

- `005-ai-vision-listings.md` — photo-to-listing vision approach and cost controls.
- `006-semantic-search-pgvector.md` — pgvector vs external vector DB.
- `007-microfrontends.md` — Vercel microfrontends vs single app.
