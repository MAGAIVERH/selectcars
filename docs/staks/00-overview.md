# Stacks — Overview

Single source of truth for **which stack we use, why, and its status**. Each row links to a detailed sheet. Update the status as we progress; log every change in the individual sheet's Changelog.

**Locked decisions (2026-07-12):** en-US market · Turborepo + pnpm monorepo with microfrontends · Supabase all-in (Postgres + RLS + Auth + pgvector + Storage + Realtime) · BullMQ + Redis (Upstash) for queues.

| Area            | Primary tools                                                                                                 | Status      | Sheet                              |
| --------------- | ------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------- |
| Frontend        | Next.js (App Router), React 19, TypeScript strict, Tailwind v4, shadcn/ui, GSAP, Lenis, Vercel Microfrontends | in-progress | [frontend.md](./frontend.md)       |
| Backend / API   | Node, Fastify, Zod, BullMQ workers                                                                            | planned     | [backend-api.md](./backend-api.md) |
| Database        | Supabase Postgres, RLS (multi-tenant), pgvector                                                               | planned     | [database.md](./database.md)       |
| Auth            | Supabase Auth, tenants + roles model                                                                          | planned     | [auth.md](./auth.md)               |
| AI              | Vercel AI SDK (AI Gateway), embeddings, vision, lead scoring                                                  | planned     | [ai.md](./ai.md)                   |
| Storage / Media | Supabase Storage, 360° sets, color variants                                                                   | planned     | [storage.md](./storage.md)         |
| Payments        | Stripe (Free / Pro)                                                                                           | planned     | [payments.md](./payments.md)       |
| DevOps          | Turborepo, pnpm, GitHub Actions, Docker, Vercel, Sentry                                                       | planned     | [devops.md](./devops.md)           |
| Testing         | Vitest, Playwright                                                                                            | planned     | [testing.md](./testing.md)         |

## How to use

1. Before adding/removing a tool, update the relevant sheet (Changelog + Tools table).
2. Keep this overview table's **Status** column in sync.
3. Architectural decisions with trade-offs get an ADR in [`../adr/`](../adr/).
