# WorkShop Manager — API (NestJS)
# Build context: monorepo root
FROM node:20-alpine

WORKDIR /app

# Instalar OpenSSL (Prisma) + herramientas de compilación nativa (bcrypt)
RUN apk add --no-cache openssl python3 make g++

# Enable pnpm via corepack
RUN corepack enable

# Copy workspace manifests first (layer cache: reinstall only if these change)
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json

# pnpm-workspace references packages/* which may not exist — create empty dir to avoid glob errors
RUN mkdir -p packages

# Install all dependencies (devDeps needed: prisma CLI + @nestjs/cli for build)
RUN pnpm install

# Copy API source and config
COPY apps/api/src          ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY apps/api/nest-cli.json ./apps/api/nest-cli.json
COPY apps/api/prisma       ./apps/api/prisma

# Generate Prisma client + compile TypeScript
WORKDIR /app/apps/api
RUN npx prisma generate
RUN pnpm build

EXPOSE 3001

# db push aplica el schema sin necesitar archivos de migración (ideal para primer arranque)
CMD ["sh", "-c", "npx prisma db push && node dist/main"]
