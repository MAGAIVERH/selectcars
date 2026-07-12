# Day 12 — Docker compose + env template

- **Date:** 2026-07-12
- **Phase:** 1 (Multi-tenancy + Auth)
- **Status:** Done (built and verified)

## Goal

A fresh clone should be able to boot the stack, and a new dev should know exactly which
secrets to provide.

## Tasks done

- [x] `apps/api/Dockerfile`: 4-stage build (deps -> build -> prod-deps -> runner), Node 22
      Alpine, pnpm via corepack. Manifests are copied before source so a code change does
      not bust the install cache. **Runs as a non-root user.** Final image: **255 MB**.
- [x] **Bundled with tsup**: the API compiles to a single `dist/server.js`, with the raw-TS
      workspace packages bundled in and `pg` (native driver) left external. The runtime
      image ships no TypeScript toolchain and boots plain `node`.
- [x] `docker-compose.yml`: `redis` (BullMQ, Phase 3) with a healthcheck and a persistent
      volume, and `api` gated on Redis being healthy. The API healthcheck hits `/ready`, so
      a container is "healthy" only if it can actually reach Supabase.
- [x] `.dockerignore`: host `node_modules` (Windows-native binaries) and `dist` never enter
      the image; `.env` is never baked in (compose injects env vars instead).
- [x] `.env.example`: every variable, with the non-obvious ones explained.

## Three things the real build taught us

The Dockerfile did not work on the first run. Each failure was a genuine design flaw:

1. **`tsx` was missing at runtime.** The `start` script ran TypeScript through `tsx`, a dev
   tool that the production install (`--prod`) correctly refuses to ship. The fix was not to
   install `tsx` in production: it was to stop shipping TypeScript at all, and bundle to
   plain JS. Faster boot, smaller image, less attack surface.

2. **Host port 6379 was already taken** by another project's Redis on this machine. Ours is
   published on **6380** instead. Inside the compose network the API still talks to
   `redis:6379`, so only host tooling notices.

3. **`localhost` inside a container is the container.** The API could not fetch the JWKS
   from `http://localhost:3000` (`ECONNREFUSED`): the marketplace runs on the _host_. The
   naive fix (point `AUTH_ISSUER_URL` at `host.docker.internal`) would have **broken
   security**, because that value also validates the token's `iss` claim, which says
   `http://localhost:3000`.

   The real bug was conflating two concepts in one variable. They are now separate:
   - `AUTH_ISSUER_URL`: the issuer's **identity** (matched against `iss` / `aud`).
   - `AUTH_JWKS_URL`: the **address** to fetch keys from (varies per environment).

   Compose sets only the address. What we accept never changes.

## Design note: no Postgres container

Postgres is deliberately **not** in the compose file. The database is Supabase (managed),
and running a second local Postgres would let the RLS policies and roles drift between
local and production, which is precisely the thing this phase exists to prove. Redis is
local because BullMQ needs it and Upstash is only worth paying for in production.

## Verification

- `docker compose up --build`: both containers report **healthy**. `api` is healthy only
  because `/ready` proves it reaches Supabase from inside the container.
- **The full end-to-end suite passes against the containerized API** (13/13): real tokens,
  real JWKS verification across the container boundary, real RLS isolation.
  (First run was a false positive: the host port was still served by a leftover dev server.
  Confirmed by stopping it and re-running.)
- Other projects on the machine are untouched: their containers, images, and volumes are
  unchanged, and the `redis:7-alpine` layer is shared rather than duplicated.

## Still open

- Tag `foundation-v0.1.0`.
- Worker service (BullMQ) is added in Phase 3.
