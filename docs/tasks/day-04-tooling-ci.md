# Day 4 — Shared tooling + CI

- **Date:** 2026-07-12
- **Phase:** 0 (Foundation)
- **Status:** Done
- **Commits:** `22d6329` ci: add GitHub Actions for lint and typecheck ·
  `7edae25` ci: fix pnpm version conflict (read from packageManager) and use Node 22

> Reconstructed from git history (backfilled).

## Goal

Every PR must be checked automatically, so "it works on my machine" never reaches `main`.

## Tasks done

- [x] GitHub Actions workflow `.github/workflows/ci.yml`: **Lint & Typecheck** on PRs,
      running `pnpm typecheck` and `pnpm lint` through Turborepo.
- [x] Fixed a CI failure where the pnpm version was pinned twice: the action now reads
      the version from `packageManager` in `package.json`. Node bumped to 22.
- [x] Shared config baseline: Prettier (`.prettierrc.json`, `endOfLine: lf`,
      `prettier-plugin-tailwindcss`) and ESLint flat config with the Prettier plugin.

## Artifacts

- `.github/workflows/ci.yml`

## Verification

- CI green on PR #1. It has gated every PR since (PR #2, PR #3).

## Notes

- `packages/config` (a dedicated eslint/tsconfig/tailwind preset package) was **not**
  extracted: each package carries its own `tsconfig.json` and the app holds the ESLint
  config. Worth revisiting when a second app (dashboard) needs the same presets.
- The shadcn base landed in [Day 5](day-05-en-us-and-ui.md) as `packages/ui`, not here.
