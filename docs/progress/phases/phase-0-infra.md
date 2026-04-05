# Fase 0 — Infraestructura base

**Estado:** ✅ Completado — 2026-04-01

## Objetivo
Establecer la fundación técnica del proyecto: monorepo, contenedores Docker para dependencias de infraestructura, schema de base de datos completo, y scaffolds de aplicaciones.

## Archivos creados

### Raíz del monorepo
- `docker-compose.yml` — PostgreSQL 15 + Adminer
- `pnpm-workspace.yaml` — configuración de workspaces
- `package.json` — scripts raíz (dev, build, db:*)
- `.env.example` — todas las variables necesarias
- `.gitignore`

### apps/api (NestJS 10)
- `package.json` — dependencias: NestJS, Prisma, JWT, bcrypt, AWS SDK
- `tsconfig.json`
- `nest-cli.json`
- `src/main.ts` — bootstrap con Swagger en `/api/docs`
- `src/app.module.ts` — módulo raíz (con imports comentados para fases futuras)
- `src/prisma/prisma.module.ts` — módulo global
- `src/prisma/prisma.service.ts` — cliente Prisma con lifecycle hooks
- `prisma/schema.prisma` — **9 tablas, 5 enums, indexes críticos**

### apps/web (Next.js 14)
- `package.json` — Next.js 14, React Query, Axios, shadcn compatible, Zod
- `tsconfig.json`
- `next.config.ts`
- `tailwind.config.ts` — variables CSS para shadcn/ui
- `postcss.config.mjs`
- `src/app/layout.tsx` — root layout
- `src/app/globals.css` — variables CSS + Tailwind directives
- `src/app/page.tsx` — página de inicio placeholder
- `src/lib/api.ts` — cliente Axios con interceptores JWT

## Criterios de aceptación — Verificación

- [x] `docker compose up -d` levanta postgres y adminer sin errores — verificado 2026-04-05
- [x] Schema Prisma tiene las 9 tablas del PRD
- [x] `pnpm install` completa sin errores — verificado 2026-04-05 (Node 22.14, pnpm 10.33)
- [x] `prisma db push` crea las tablas en PostgreSQL — verificado 2026-04-05
- [x] Adminer en `:8080` muestra las 9 tablas creadas — verificado 2026-04-05
- [x] `pnpm --filter api dev` inicia NestJS en `:3001` (0 errores compilación) — verificado 2026-04-05
- [x] `pnpm --filter web dev` inicia Next.js en `:3000` — verificado 2026-04-05
- [x] Swagger disponible en `http://localhost:3001/api/docs` — verificado 2026-04-05

## Notas de implementación

Node.js no estaba disponible en el entorno al crear los archivos — todos los archivos de scaffold se crearon manualmente. Se requiere instalar Node.js ≥20 y pnpm ≥9 antes de ejecutar los comandos.
