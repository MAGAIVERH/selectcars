# Stack — Database

- **Role:** System of record. Multi-tenant isolation via RLS. Vector search via pgvector.
- **Status:** `planned`
- **Owner:** Magaiver

## Tools & versions

| Tool                      | Version | Notes                                 |
| ------------------------- | ------- | ------------------------------------- |
| Supabase Postgres         | 15+     | managed Postgres                      |
| pgvector                  | latest  | embeddings for semantic search        |
| Supabase migrations / SQL | -       | versioned migrations in `packages/db` |

## Why we chose this

- **RLS multi-tenancy** is the core senior story: tenant A can never read tenant B at the database level, not just in app code.
- pgvector keeps semantic search in the same DB (no separate vector store to operate).
- Supabase Postgres integrates Auth, Storage, and Realtime around the same DB.

## Model highlights

- `tenants` (dealerships), `tenant_settings`.
- Business tables carry `tenant_id UUID NOT NULL`, RLS `USING (tenant_id = current tenant)`.
- `vehicles`, `vehicle_images`, `vehicle_features`, `leads`, `pipeline_stages`, `lead_activities`, `test_drives`, `audit_logs`, `notifications`.
- `vehicles.embedding vector(1536)` for semantic search.

## Alternatives considered

| Alternative                        | Why not (for now)                                          |
| ---------------------------------- | ---------------------------------------------------------- |
| Neon + Drizzle (from PropAI guide) | Owner chose Supabase all-in; fewer moving parts            |
| Schema-per-tenant                  | RLS is simpler to operate and demo; better interview story |
| Separate vector DB (Pinecone)      | pgvector is enough at this scale                           |

## Open decisions

- [ ] ORM: Drizzle for typed queries vs Supabase client + generated types only.
- [ ] Where `SET LOCAL app.current_tenant` is applied (Fastify plugin vs RPC).

## Changelog

| Date       | Change        | Reason                                    |
| ---------- | ------------- | ----------------------------------------- |
| 2026-07-12 | Created sheet | Supabase Postgres + RLS + pgvector chosen |
