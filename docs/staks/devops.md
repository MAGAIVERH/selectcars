# Stack — DevOps

- **Role:** Monorepo tooling, CI/CD, containers, deploys, observability.
- **Status:** `planned`
- **Owner:** Magaiver

## Tools & versions

| Tool | Version | Notes |
|------|---------|-------|
| Turborepo | latest | task orchestration + caching |
| pnpm | 9+ | workspaces |
| GitHub Actions | - | lint, typecheck, test, deploy previews |
| Docker | - | api + workers images, local compose |
| Vercel | - | frontends + microfrontends |
| Sentry | - | errors on all apps |
| Upstash Redis | - | BullMQ backend |

## Why we chose this

- Turborepo + pnpm is the standard senior monorepo setup with fast, cached builds.
- Vercel handles the microfrontend composition and preview deploys.
- CI that actually runs (lint + typecheck + tests) is a credibility signal.

## Open decisions

- [ ] API/worker host: Railway vs Fly.io vs Render.
- [ ] Where migrations run on deploy.

## Changelog

| Date | Change | Reason |
|------|--------|--------|
| 2026-07-12 | Created sheet | Turborepo/pnpm/GitHub Actions/Vercel chosen |
