# Day 2 — Environment

- **Date:** 2026-07-12
- **Phase:** 0 (Foundation)
- **Status:** Done (accounts provisioned as each phase needs them)

> Reconstructed from git history and the working environment (backfilled).

## Goal

Have the local toolchain and the external accounts needed to build without blocking.

## Tasks done

- [x] Local toolchain: Node 22 (`v22.22.3`), pnpm 11 (`11.5.0`).
- [x] Supabase project created (Postgres + Auth + Storage + pgvector available).
      Region: `sa-east-1`. pgvector 0.8.2 available for Phase 3.
- [x] Google Cloud OAuth client created (client id + secret), redirect pointed at
      `http://localhost:3000` for local development.
- [x] GitHub repo + Actions enabled.

## Still open (provisioned when the phase needs them)

- [ ] Upstash (Redis/BullMQ): needed in Phase 3.
- [ ] Stripe (test mode): Phase 7.
- [ ] Resend: Phase 5.
- [ ] Sentry: Phase 9.
- [ ] Docker (local compose): Day 12.

## Verification

- `node -v` / `pnpm -v` report the versions above.
- Supabase reachable from local dev (see the connection caveat in
  [Day 6](day-06-db-package.md): the direct host is IPv6-only, so we use the session pooler).
