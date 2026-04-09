# WorkShop Manager — API (NestJS)
# Build context: monorepo root
FROM node:20-alpine

WORKDIR /app

# Instalar OpenSSL (Prisma) + herramientas de compilación nativa (bcrypt)
RUN apk add --no-cache openssl python3 make g++

# Enable pnpm via corepack
RUN corepack enable

# Copy workspace manifests first (layer cache: reinstall only if these change)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/package.json

# pnpm-workspace references packages/* which may not exist — create empty dir
RUN mkdir -p packages

# Install ALL dependencies (including devDeps for build)
RUN pnpm install --frozen-lockfile

# Copy API source and config
COPY apps/api/src          ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY apps/api/nest-cli.json ./apps/api/nest-cli.json
COPY apps/api/prisma       ./apps/api/prisma

# Generate Prisma client + compile TypeScript
RUN cd apps/api && npx prisma generate && npx nest build

# Verify dist was created
RUN ls -la apps/api/dist/

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main"]
