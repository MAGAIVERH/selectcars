# Stack — Backend / API

- **Role:** Business logic that does not belong in Supabase directly: orchestration, AI job enqueue, webhooks (Stripe), CSV export, rate limiting. Hosts BullMQ workers.
- **Status:** `planned`
- **Owner:** Magaiver

## Tools & versions

| Tool        | Version | Notes                                                   |
| ----------- | ------- | ------------------------------------------------------- |
| Node.js     | 20 LTS  |                                                         |
| Fastify     | 4.x     | REST + plugins (cors, helmet, pino)                     |
| Zod         | latest  | validation; contracts shared via `packages/shared`      |
| BullMQ      | latest  | async jobs (AI, emails)                                 |
| Supabase JS | latest  | server-side client with service role for privileged ops |

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

## Open decisions

- [ ] Single `apps/api` with worker entry vs separate `apps/worker`.
- [ ] Auth verification: validate Supabase JWT in Fastify vs proxy through Next.

## Changelog

| Date       | Change        | Reason                                     |
| ---------- | ------------- | ------------------------------------------ |
| 2026-07-12 | Created sheet | Initial decision: Fastify + BullMQ service |
