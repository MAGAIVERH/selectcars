# Stack — Frontend

- **Role:** All user-facing apps: buyer marketplace, dealer dashboard, premium landing. Composed as microfrontends.
- **Status:** `in-progress` (current single Next.js app will be migrated into `apps/marketplace`)
- **Owner:** Magaiver

## Tools & versions

| Tool | Version | Notes |
|------|---------|-------|
| Next.js | 16.x (App Router) | Server Components, Route Handlers |
| React | 19.x | |
| TypeScript | 5.x strict | never `any` |
| Tailwind CSS | v4 | `@tailwindcss/postcss` |
| shadcn/ui | latest | base component system |
| GSAP + Lenis | latest | premium animation + smooth scroll |
| @vercel/microfrontends | latest | compose apps under one domain |
| next/image | built-in | media (see storage sheet) |

## Why we chose this

- Next.js App Router + RSC = SEO for the marketplace and a fast dashboard from one framework.
- shadcn/ui gives accessible, ownable primitives (no black-box UI kit) — reads senior.
- Microfrontends let marketplace, dashboard, and landing deploy independently while sharing `packages/ui`.

## Alternatives considered

| Alternative | Why not (for now) |
|-------------|-------------------|
| Single Next app (no MFE) | Loses the microfrontend/independent-deploy story recruiters look for |
| MUI / Chakra | Heavier, less ownable than shadcn |
| Framer Motion only | GSAP + Lenis give finer control for the "$100k" feel |

## Open decisions

- [ ] Landing as its own `apps/landing` vs a route group inside `apps/marketplace`.
- [ ] Color-change + 360° component: CSS layers vs canvas/WebGL.

## Changelog

| Date | Change | Reason |
|------|--------|--------|
| 2026-07-12 | Created sheet; current single app is the marketplace base | Start of monorepo migration |
| 2026-07-12 | Enlarged featured-car thumbnail + Processo image; added `items-start` to stop grid stretch | UX fixes flagged by owner |
