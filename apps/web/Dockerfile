# WorkShop Manager — Web (Next.js 14)
# Build context: monorepo root
FROM node:20-alpine

WORKDIR /app

RUN corepack enable

# Workspace manifests first (layer cache)
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json

# pnpm-workspace references packages/* — create empty dir to avoid glob errors
RUN mkdir -p packages

# Install all deps (preserves apps/web/node_modules symlinks created by pnpm)
RUN pnpm install

# Copy web source files individually — do NOT overwrite apps/web entirely
# (doing so would destroy the node_modules symlinks pnpm created above)
COPY apps/web/src ./apps/web/src
COPY apps/web/next.config.mjs ./apps/web/next.config.mjs
COPY apps/web/tsconfig.json ./apps/web/tsconfig.json
COPY apps/web/tailwind.config.ts ./apps/web/tailwind.config.ts
COPY apps/web/postcss.config.mjs ./apps/web/postcss.config.mjs
COPY apps/web/components.json ./apps/web/components.json

# NEXT_PUBLIC_* vars are baked at build time — must be passed as build args
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

WORKDIR /app/apps/web
RUN pnpm build

EXPOSE 3000

# next binary is at apps/web/node_modules/.bin/next (pnpm workspace symlink)
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
