# Day 12 — Docker compose + env template

- **Date:** 2026-07-12
- **Phase:** 1 (Multi-tenancy + Auth)
- **Status:** Done (compose build not executed locally: see Verification)

## Goal

A fresh clone should be able to boot the stack, and a new dev should know exactly which
secrets to provide.

## Tasks done

- [x] `apps/api/Dockerfile`: multi-stage (deps -> runner), Node 22 Alpine, pnpm via corepack,
      manifests copied before source so a code change does not bust the install cache,
      `pnpm install --filter @selectcars/api...` to pull only the API's workspace slice.
      **Runs as a non-root user.**
- [x] `docker-compose.yml`: `redis` (BullMQ, Phase 3) with a healthcheck and a persistent
      volume, and `api` gated on Redis being healthy. The API healthcheck hits `/ready`, so
      a container is "healthy" only if it can actually reach Supabase.
- [x] `.env.example`: every variable, with the non-obvious ones explained (session pooler
      vs direct host, `%40` password encoding, why the var is `SELECTCARS_DATABASE_URL`,
      the exact Google redirect URI).

## Design note: no Postgres container

Postgres is deliberately **not** in the compose file. The database is Supabase (managed),
and running a second local Postgres would let the RLS policies and roles drift between
local and production, which is precisely the thing this phase exists to prove. Redis is
local because BullMQ needs it and Upstash is only worth paying for in production.

## Verification

- `docker compose config` parses cleanly (valid schema).
- **Not verified:** the image build and `compose up` were **not executed**, because the
  Docker daemon was not running on this machine (CLI present, Docker Desktop stopped).
  The Dockerfile is therefore unproven. Run `docker compose up --build` and confirm the
  `api` container reports healthy before relying on it.

## Still open

- Execute the build and fix whatever the first real `docker compose up` surfaces.
- Worker service (BullMQ) is added in Phase 3.
- Tag `foundation-v0.1.0` once the compose run is confirmed.
