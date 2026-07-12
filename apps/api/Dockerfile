# Multi-stage build for the Fastify API.
# The monorepo ships raw TypeScript from workspace packages, so the build stage installs
# with the full workspace context and the runtime stage carries only what it needs.

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /repo
# Copy only the manifests first, so a source-only change does not bust the install cache.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --filter @selectcars/api...

FROM base AS runner
WORKDIR /repo
ENV NODE_ENV=production

# Never run as root.
RUN addgroup -S selectcars && adduser -S selectcars -G selectcars

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /repo/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules

COPY package.json pnpm-workspace.yaml ./
COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared

USER selectcars
EXPOSE 3333
ENV API_HOST=0.0.0.0

# `start` runs the TypeScript entrypoint through tsx: the workspace packages are raw TS,
# so there is no separate compile step to keep in sync.
CMD ["pnpm", "--filter", "@selectcars/api", "start"]
