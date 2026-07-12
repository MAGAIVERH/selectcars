# Day 10 — Fastify API scaffold

- **Date:** 2026-07-12
- **Phase:** 1 (Multi-tenancy + Auth)
- **Status:** Done

## Goal

Stand up `apps/api`: a real Fastify service with security plugins, structured logging,
Zod-validated contracts, and liveness/readiness probes.

## Decision

The API stays a **separate Fastify service** (as planned), even though Better Auth runs
inside the Next app. Cross-service session validation is the next step (Day 8 completion).

## Tasks done

- [x] `apps/api` (`@selectcars/api`), ESM + TypeScript strict.
- [x] Fastify 5 with `@fastify/cors` (locked to `APP_ORIGIN`, credentials on) and
      `@fastify/helmet`.
- [x] **pino** logging built in, `pino-pretty` in development.
- [x] Zod type provider (`fastify-type-provider-zod`): requests validated and responses
      serialized through the shared schemas.
- [x] Env validated with Zod at boot (`src/env.ts`), loading the repo-root `.env`.
      Fails fast on a bad config instead of at first request.
- [x] Routes: `GET /health` (liveness) and `GET /ready` (readiness: pings Postgres,
      returns 503 `degraded` if the DB is down).
- [x] Shared contracts `healthStatusSchema` / `readyStatusSchema` in `packages/shared`,
      so the API and its clients cannot drift.

## Dependency note

`@fastify/type-provider-zod` (the official one) requires **zod v4**, but the monorepo is
on **zod 3**. Used the community `fastify-type-provider-zod@4.0.2`, whose peers are
`zod ^3` + `fastify ^5`. Revisit when the monorepo moves to zod 4.

## Artifacts

- `apps/api/src/{server,app,env}.ts`, `apps/api/src/routes/health.ts`
- `packages/shared/src/index.ts` (health contracts)

## Verification

API running on `:3333` (`pnpm --filter @selectcars/api dev`):

- `GET /health` -> `200 {"status":"ok","service":"selectcars-api","uptimeSeconds":26}`
- `GET /ready` -> `200 {"status":"ready","checks":{"database":"up"}}` (reaches Supabase)
- CORS preflight from `http://localhost:3000` -> `access-control-allow-origin: http://localhost:3000`
- Typecheck clean.

## Still open

- Tenant-context plugin on the request lifecycle: validate the Better Auth session
  across services and scope the connection with `withTenant`
  (completes [Day 8](day-08-tenant-context.md)).
- Audit log (Day 11), docker-compose (Day 12).
