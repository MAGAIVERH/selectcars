# Multi-stage build for the Fastify API.
#
# The workspace packages ship raw TypeScript, so the build stage bundles them into a plain
# JavaScript entrypoint (tsup). The runtime image then carries no TypeScript toolchain and
# boots `node` directly: smaller image, faster start, less attack surface.

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# --- deps: install the API's workspace slice (including dev deps, needed to build) ------
FROM base AS deps
WORKDIR /repo
# Manifests first, so a source-only change does not bust the install cache.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --filter @selectcars/api...

# --- build: bundle to dist/server.js ----------------------------------------------------
FROM deps AS build
WORKDIR /repo
COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared
RUN pnpm --filter @selectcars/api build

# --- prod-deps: the same slice, without dev dependencies --------------------------------
FROM base AS prod-deps
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --prod --filter @selectcars/api...

# --- runner -----------------------------------------------------------------------------
FROM base AS runner
WORKDIR /repo/apps/api
ENV NODE_ENV=production
ENV API_HOST=0.0.0.0

# Never run as root.
RUN addgroup -S selectcars && adduser -S selectcars -G selectcars

# Only production deps (pg, the native driver, is the one that must stay resolvable) and
# the bundled entrypoint. No source, no tsx, no compiler.
COPY --from=prod-deps /repo/node_modules /repo/node_modules
COPY --from=prod-deps /repo/apps/api/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY apps/api/package.json ./package.json

USER selectcars
EXPOSE 3333

CMD ["node", "dist/server.js"]
