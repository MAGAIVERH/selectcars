# Engineering Rules

Non-negotiable rules for SELECTCARS. These exist so the codebase reads like it was built by a senior team.

## Investigate the target before you act

Before any operation that reaches outside the current file, stop and confirm **where** it goes and **why**, then say so before running it. This is not optional and it applies every time, without being asked.

- **Database / external services:** confirm the exact target (host, project, database, role) is the intended one before connecting or querying. This project is Supabase only. Never touch another project's database (the Neon instance belongs to a different project). A guard enforces this: do not work around it, fix the target instead.
- **Network requests / APIs:** know which endpoint, environment (dev vs prod), and account a request hits before sending it. State it first.
- **Destructive or hard-to-reverse actions** (migrations, deletes, overwrites, pushes, merges, deploys, sending mail): name the target and the effect, verify it is correct, then proceed. If what you find contradicts how it was described, surface that instead of proceeding.
- **When unsure, verify, don't assume.** Read the config, check the connection string, list what exists. A wrong target is worse than a slow one.

## TypeScript

- **`strict: true` everywhere. Never use `any`.** Use `unknown` + narrowing, generics, or Zod-inferred types.
- No `@ts-ignore` without a one-line justification comment. Prefer `@ts-expect-error` with a reason.
- Public functions and module boundaries are fully typed. Infer internally, annotate at the edges.
- Shared types come from Zod schemas in `packages/shared` — infer with `z.infer`, never duplicate.

## Contracts & data

- **One source of truth:** every request/response shape is a Zod schema in `packages/shared`. API and frontend import the same schema — no type drift.
- **RLS on every business table.** Never run a query without tenant context. Cross-tenant access must fail at the database, not just in app code.
- AI/embedding/LLM work is **always async via BullMQ** — never block an HTTP request on a model call.

## UI & design

- **Use shadcn/ui** components as the base; compose, don't reinvent. No throwaway "badge" chips as primary UI — interactions must feel intentional and premium.
- Distinctive, editorial design. Generous whitespace, real type hierarchy, motion with purpose.
- **GSAP / Lenis are polish, not architecture.** Always respect `prefers-reduced-motion`.
- Accessibility is a requirement: keyboard nav, aria labels on icon buttons, visible focus, WCAG AA contrast.

## Copy & localization

- **en-US only** in product UI, copy, emails, seed data. USD, miles, US addresses, US date format.
- **Do not use the em dash `—` in copy** — it reads as AI-generated. Use a colon, comma, or `·`.
- Marketing copy is specific and confident, never generic filler.

## Git & process

- Conventional Commits in English (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`). Small, focused commits.
- Branch off the default branch; never push to it directly without asking.
- Feature-flag risky/expensive features (e.g. `ENABLE_AI_VISION`) so demos work without keys.
- Every phase updates the matching `docs/staks/*.md` Changelog and, when a trade-off is made, an ADR in `docs/adr/`.

## Definition of done (per feature)

- [ ] Typecheck clean, lint clean, no `any`.
- [ ] RLS verified if it touches tenant data.
- [ ] Exercised end-to-end in the browser (Playwright) or via API, not just unit-tested.
- [ ] en-US copy, no em dashes.
- [ ] Stack sheet + ADR updated if the stack changed.
