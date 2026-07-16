@AGENTS.md
@docs/rules/engineering-rules.md

# SELECTCARS — always-on rules (summary; full set in docs/rules/engineering-rules.md)

- **Investigate the target before you act:** before any request/query/action that leaves the current file, confirm *where* it goes and *why*, and say so first. Supabase only; never touch another project's DB (Neon is not ours). Verify, don't assume.
- **TypeScript strict; never `any`** (use `unknown` + Zod-inferred types).
- **en-US only** in product copy; **never the em dash `—`** (reads as AI) — use `:`/`,`/`·`.
- **shadcn/ui** as the component base; no simplistic "badge" chips as primary UI.
- **RLS on every business table**; never query without tenant context.
- **Zod contracts live in `packages/shared`** and are shared between the API and the apps.
- **AI is always async** (BullMQ) — never block HTTP on a model call.
- **Conventional Commits** in English; **verify UI in the browser** (Playwright) before claiming done.
- Monorepo: **Turborepo + pnpm**, `apps/*` (marketplace, dashboard, api) and `packages/*` (ui, shared, db, config).
- Track stack changes in `docs/staks/*.md`; record hard trade-offs as ADRs in `docs/adr/`.
