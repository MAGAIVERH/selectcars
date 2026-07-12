# Stack — Testing

- **Role:** Confidence on critical paths and a real (not decorative) CI test suite.
- **Status:** `planned`
- **Owner:** Magaiver

## Tools & versions

| Tool       | Version | Notes                                |
| ---------- | ------- | ------------------------------------ |
| Vitest     | latest  | unit/integration                     |
| Playwright | latest  | E2E + visual verification during dev |

## What we test

- **Unit (Vitest):** RLS isolation helper, lead stage transitions, Zod schema validation, search ranking. Target ~20–30 meaningful tests, not coverage theater.
- **E2E (Playwright):** sign up → onboarding; create vehicle → AI analyze (mock ok) → publish; marketplace submit interest → lead appears in pipeline.
- Playwright is also the day-to-day tool for verifying UI in the browser (per the "exercise it, don't just typecheck" rule).

## Open decisions

- [ ] E2E target: local Docker vs staging.

## Changelog

| Date       | Change        | Reason                     |
| ---------- | ------------- | -------------------------- |
| 2026-07-12 | Created sheet | Vitest + Playwright chosen |
