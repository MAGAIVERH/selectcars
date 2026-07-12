# Stack — Backend / API

- **Role:** Business logic that does not belong in Supabase directly: orchestration, AI job enqueue, webhooks (Stripe), CSV export, rate limiting. Hosts BullMQ workers.
- **Status:** `in-progress`
- **Owner:** Magaiver

## Tools & versions

| Tool                        | Version  | Notes                                                              |
| --------------------------- | -------- | ------------------------------------------------------------------ |
| Node.js                     | 22 LTS   | local: v22.22.3                                                    |
| Fastify                     | 5.x      | REST + plugins (`@fastify/cors` 11, `@fastify/helmet` 13)          |
| pino / pino-pretty          | 9.x/13.x | structured logs; pretty in development                             |
| Zod                         | 3.x      | validation; contracts shared via `packages/shared`                 |
| `fastify-type-provider-zod` | 4.0.2    | community provider: the official one needs zod v4, we are on zod 3 |
| `@selectcars/db`            | -        | pg pool + `withTenant()` for RLS-scoped queries                    |
| BullMQ                      | latest   | async jobs (AI, emails): Phase 3                                   |

## Why we chose this

- A dedicated `apps/api` gives a real microservice boundary (workers + HTTP) instead of stuffing everything into Next Route Handlers.
- Fastify is fast, plugin-based, and pairs well with Zod contracts.
- Keeps AI/queue work off the request path (rule: AI is always async).

## Alternatives considered

| Alternative              | Why not (for now)                                                           |
| ------------------------ | --------------------------------------------------------------------------- |
| Only Next Route Handlers | Weaker microservice story; harder to run standalone workers                 |
| NestJS                   | More boilerplate than we need for the demo scope                            |
| Hono                     | Great, but Fastify's plugin ecosystem fits BullMQ/observability better here |

## Current surface

- `GET /health`: liveness. `GET /ready`: readiness (pings Postgres, 503 when down).
- Env validated with Zod at boot (`API_PORT`, `API_HOST`, `APP_ORIGIN`, `NODE_ENV`).
- CORS locked to `APP_ORIGIN` with credentials (the Better Auth session cookie).

## Open decisions

- [ ] Single `apps/api` with worker entry vs separate `apps/worker`.
- [ ] **Auth verification:** validate the Better Auth session in Fastify (shared secret /
      session lookup) vs proxying through Next. Auth is no longer Supabase, so there is no
      Supabase JWT to verify. This is the blocker for the tenant-context plugin.
- [ ] Move to zod 4 across the monorepo and adopt the official `@fastify/type-provider-zod`.

## Changelog

| Date       | Change                            | Reason                                           |
| ---------- | --------------------------------- | ------------------------------------------------ |
| 2026-07-12 | Created sheet                     | Initial decision: Fastify + BullMQ service       |
| 2026-07-12 | Scaffolded `apps/api` (Fastify 5) | Day 10: cors, helmet, pino, Zod, /health, /ready |
