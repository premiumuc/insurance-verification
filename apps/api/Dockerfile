# Multi-stage build for the Fastify API. Runs as non-root on distroless in prod.
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

# --- deps: install the whole workspace (cached on lockfile) ---
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile

# --- build: compile TS to dist ---
FROM deps AS build
COPY tsconfig.base.json ./
RUN pnpm --filter @healthy-companion/api... build
RUN pnpm --filter @healthy-companion/api --prod deploy /out

# --- runtime: minimal, non-root ---
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/dist ./dist
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/package.json ./package.json
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:3000/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
