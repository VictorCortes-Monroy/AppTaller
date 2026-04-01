# WorkShop Manager — Contexto para Claude

## Qué es este proyecto

SaaS web para digitalizar talleres de mantención de vehículos mineros. Permite registrar y trazar cada acción sobre una Orden de Trabajo, garantizando que ningún trabajo adicional escape a la facturación y que el supervisor tenga visibilidad en tiempo real.

**PRD completo:** [docs/prd/WorkShopManager_PRD_v1.0.md](docs/prd/WorkShopManager_PRD_v1.0.md)

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | NestJS 10 + TypeScript |
| ORM | Prisma 5 + PostgreSQL 15 |
| Frontend | Next.js 14 (App Router) + TailwindCSS + shadcn/ui |
| Auth | JWT (8h access + 7d refresh) + bcrypt cost≥12 |
| Archivos | AWS S3 + presigned PUT URLs (10min) |
| Infra dev | Docker Compose (solo PostgreSQL + Adminer) |
| Paquetes | pnpm workspaces |

---

## Estructura del repositorio

```
AppTaller/
├── CLAUDE.md                        ← este archivo
├── docker-compose.yml               ← PostgreSQL :5432 + Adminer :8080
├── pnpm-workspace.yaml
├── package.json                     ← scripts raíz
├── .env.example                     ← todas las variables documentadas
│
├── apps/
│   ├── api/                         ← NestJS 10
│   │   ├── prisma/schema.prisma     ← 9 tablas, 5 enums, indexes
│   │   └── src/
│   │       ├── main.ts              ← puerto 3001, Swagger en /api/docs
│   │       ├── app.module.ts        ← importa todos los módulos
│   │       ├── prisma/              ← PrismaModule global + PrismaService
│   │       ├── auth/                ← JWT, guards, decorators
│   │       ├── users/               ← CRUD usuarios (solo Jefe)
│   │       ├── vehiculos/           ← registro vehículos
│   │       ├── ordenes/             ← OTs + state machine
│   │       ├── informe-tecnico/     ← IT + STP + S3
│   │       ├── repuestos/           ← partes + flujo bodega
│   │       ├── tareas-adicionales/  ← trabajo extra + costos
│   │       ├── dashboard/           ← 3 vistas + log auditoría
│   │       └── common/              ← pipes, filters, interceptors
│   │
│   └── web/                         ← Next.js 14
│       └── src/
│           ├── app/                 ← App Router (layouts por rol)
│           └── lib/api.ts           ← cliente Axios con interceptores JWT
│
└── docs/
    ├── prd/                         ← PRDs del producto
    ├── architecture/                ← schema DB, diseño API
    ├── decisions/                   ← ADRs (por qué se tomó cada decisión)
    └── progress/                    ← estado de avance
        ├── ROADMAP.md               ← tabla de fases con estado actual
        ├── CHANGELOG.md             ← historial de lo implementado
        └── phases/                  ← detalle de cada fase
```

---

## Metodología de trabajo

### Unidad de trabajo: Fase

Cada sesión de desarrollo avanza **una fase completa**. Las fases están definidas en `docs/progress/phases/phase-N-*.md` e incluyen:
- Objetivo
- Módulos y archivos a crear
- Endpoints con tabla de acceso por rol
- Reglas de negocio críticas
- Checklist de criterios de aceptación

### Orden de fases (dependencias)

```
Fase 0 (Infra) ✅
  └→ Fase 1 (Auth + Usuarios)      ← JWT y @CurrentTaller() necesarios para todo
       └→ Fase 2 (Vehículos + OT)  ← state machine, base de todo
            └→ Fase 3 (IT + STP)   ← S3, depende de OT
            └→ Fase 4 (Repuestos)  ← depende de OT y TareaIT
            └→ Fase 5 (TareasAd.)  ← depende de OT
                 └→ Fase 6 (Dashboard + Log)
                      └→ Fase 7 (Frontend)
```

### Al iniciar una fase

1. Leer `docs/progress/phases/phase-N-*.md` para entender el scope exacto
2. Leer `docs/architecture/database-schema.md` para las relaciones relevantes
3. Implementar en orden: DTOs → Service → Controller → Module → registrar en AppModule
4. Al terminar: marcar checklist en el archivo de fase, actualizar ROADMAP.md y CHANGELOG.md

### Al terminar una fase

Actualizar estos tres archivos:
- `docs/progress/phases/phase-N-*.md` → marcar checkboxes ✅
- `docs/progress/ROADMAP.md` → cambiar estado a ✅ Completado
- `docs/progress/CHANGELOG.md` → agregar entrada con fecha

---

## Reglas de negocio que nunca se rompen

1. **Multi-tenancy:** `id_taller` siempre viene del JWT via `@CurrentTaller()`, nunca del body ni query string. Sin excepción.
2. **Log inmutable:** `LogEstadoOT` es insert-only. No hay endpoints UPDATE/DELETE para esa tabla.
3. **State machine forward-only:** Los estados de OT y Repuesto solo avanzan; no retroceden (excepto EN_ESPERA).
4. **bcrypt cost≥12:** Siempre en passwords.
5. **Filtro de taller en toda query:** Ninguna query a Prisma ejecuta sin incluir `idTaller` en el where.

---

## Cómo arrancar el entorno de desarrollo

```bash
# Prerequisito: Node.js ≥20 + pnpm instalados
# Instalar pnpm: npm install -g pnpm

docker compose up -d              # PostgreSQL + Adminer
cp .env.example apps/api/.env    # configurar DATABASE_URL
pnpm install                      # instalar dependencias
cd apps/api && pnpm db:migrate    # crear las 9 tablas
pnpm dev                          # api :3001 + web :3000
```

Verificación: http://localhost:8080 (Adminer) → ver 9 tablas | http://localhost:3001/api/docs (Swagger)

---

## Índice de documentación

| Qué buscar | Dónde ir |
|------------|----------|
| Requisitos funcionales completos | [docs/prd/WorkShopManager_PRD_v1.0.md](docs/prd/WorkShopManager_PRD_v1.0.md) |
| Estado actual del proyecto | [docs/progress/ROADMAP.md](docs/progress/ROADMAP.md) |
| Historial de cambios | [docs/progress/CHANGELOG.md](docs/progress/CHANGELOG.md) |
| Detalle de la fase actual | [docs/progress/phases/](docs/progress/phases/) |
| Tablas, relaciones, enums | [docs/architecture/database-schema.md](docs/architecture/database-schema.md) |
| Endpoints, convenciones API | [docs/architecture/api-design.md](docs/architecture/api-design.md) |
| Por qué se usó esta tecnología | [docs/decisions/](docs/decisions/) |
| Schema Prisma (fuente de verdad) | [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma) |
| Variables de entorno necesarias | [.env.example](.env.example) |

---

## Convenciones de código

### Backend (NestJS)

- Módulo por feature: `auth/`, `users/`, `vehiculos/`, etc.
- Estructura interna: `*.module.ts` → `*.controller.ts` → `*.service.ts` → `dto/`
- Siempre usar `@CurrentTaller()` en lugar de leer `req.user.idTaller` directamente
- Respuestas: `{ data: T }` para colecciones, objeto directo para recursos individuales
- Errores: excepciones de NestJS (`NotFoundException`, `ConflictException`, etc.)

### Frontend (Next.js)

- Server Components para listados (SSR)
- Client Components solo para formularios e interactividad
- React Query para todas las llamadas a la API
- Zod + react-hook-form para validación de formularios
- shadcn/ui: instalar componentes individualmente con `npx shadcn@latest add <componente>`
