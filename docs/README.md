# SELECTCARS — Documentation

Premium, AI-powered car marketplace + dealership operating system for the US market. Multi-tenant, microfrontends, Supabase, AI.

## Index

- [REQUIREMENTS.md](./REQUIREMENTS.md) — actors, flows, vehicle fields, scope.
- [architecture.md](./architecture.md) — system diagram and key decisions.
- [rules/engineering-rules.md](./rules/engineering-rules.md) — non-negotiable engineering rules.
- [staks/00-overview.md](./staks/00-overview.md) — the stack table (source of truth); one sheet per stack.
- [adr/](./adr/) — Architecture Decision Records.

## Stack (locked)

Turborepo + pnpm monorepo (microfrontends) · Next.js 16 / React 19 / TypeScript strict / Tailwind v4 / shadcn/ui / GSAP / Lenis · Fastify + Zod + BullMQ · **Supabase** (Postgres + RLS + Auth + pgvector + Storage + Realtime) · Redis (Upstash) · Vercel AI SDK · Stripe · Sentry · Vitest + Playwright · GitHub Actions + Vercel.

## Progress tracking

- Stack-level status and changelogs live in [`staks/`](./staks/).
- The detailed day-by-day build log is kept as a local working reference (not committed).
