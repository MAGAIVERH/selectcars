# Day 3 — Turborepo monorepo

- **Date:** 2026-07-12
- **Phase:** 0 (Foundation)
- **Status:** Done
- **Commit:** `312ea0b` chore: migrate to Turborepo monorepo with pnpm
- **PR:** #1 (`chore/phase-0-monorepo`)

> Reconstructed from git history (backfilled).

## Goal

Move from a single root Next.js app to a Turborepo monorepo, so apps and shared
packages can grow independently with one source of truth for contracts.

## Tasks done

- [x] Turborepo + pnpm workspaces: `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `turbo.json`
      (tasks: `dev`, `build`, `lint`, `typecheck`).
- [x] Migrated the existing Next.js app from the repo root into **`apps/marketplace`**
      (`src/`, `tsconfig.json`, `next.config.ts` moved with it).
- [x] Created **`packages/shared`**: Zod contracts and constants (`SITE`, vehicle schema,
      body style / fuel type / condition enums), consumed by the app.
- [x] Switched the lockfile from npm to pnpm (`package-lock.json` removed, `pnpm-lock.yaml` added).
- [x] TypeScript `strict` across packages; `transpilePackages` wires the raw-TS workspace
      packages into Next.

## Artifacts

- `pnpm-workspace.yaml`, `turbo.json`
- `apps/marketplace/**`
- `packages/shared/{package.json,tsconfig.json,src/index.ts}`

## Verification

- `pnpm install` at the root; `@selectcars/shared` imports resolve from the app
  (`SITE` used in the marketplace layout).

## Notes

- Deferred: `apps/dashboard` and `apps/api` were not created yet. The API scaffold
  landed later, in [Day 10](day-10-fastify-api.md).
