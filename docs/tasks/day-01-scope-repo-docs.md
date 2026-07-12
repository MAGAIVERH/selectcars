# Day 1 — Scope, repo, docs

- **Date:** 2026-07-12
- **Phase:** 0 (Foundation)
- **Status:** Done
- **Commit:** `0e87579` chore: initial commit (SELECTCARS landing + project docs)

> Reconstructed from git history (this log was started at Day 6 and backfilled).

## Goal

Turn the existing Figma-built showroom into a real project: define scope, publish the
repo, and write the docs that later phases are held against.

## Tasks done

- [x] Scope approved: premium car marketplace (buyer) + dealership OS (seller),
      multi-tenant, AI-assisted, US market.
- [x] `docs/` created:
  - `REQUIREMENTS.md`, `architecture.md`, `README.md`
  - `rules/engineering-rules.md` (TS strict, no `any`, RLS everywhere, en-US, no em dashes,
    shadcn/ui, async AI, Conventional Commits)
  - `staks/` stack sheets: frontend, backend-api, database, auth, ai, storage, payments,
    devops, testing (+ `00-overview.md` and `_template.md`)
  - `adr/README.md` with the planned ADR list
- [x] `CLAUDE.md` + `AGENTS.md` (always-on rules for AI agents in the repo).
- [x] Tooling baseline: Prettier config, ESLint config, `.gitignore`, VS Code settings.
- [x] Public GitHub repo `MAGAIVERH/selectcars`; README with pitch and architecture draft.

## Artifacts

- `docs/**`, `CLAUDE.md`, `AGENTS.md`, `README.md`, `.prettierrc.json`, `eslint.config.mjs`

## Verification

- Repo published on GitHub with docs committed. (`DEVELOPMENT-GUIDE.md` stays gitignored:
  it is the personal working tracker.)

## Notes

- At this point the app was still a single Next.js app at the repo root, in pt-BR.
