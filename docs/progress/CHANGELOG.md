# Changelog

Formato: `[YYYY-MM-DD] Fase N — Descripción`

---

## [2026-04-01] Fase 2 — Vehículos y Órdenes de Trabajo

### Implementado
- `VehiculosModule`: CRUD con VIN único por taller, validación de OT activa antes de desactivar
- `OrdenesModule`: state machine de 9 estados con validación por rol
- `ot-transitions.ts`: define `TRANSICIONES_VALIDAS`, `TRANSICIONES_TECNICO`, `ESTADOS_ACTIVOS`, `esTransicionValida()`
- Numeración secuencial `OT-YYYY-NNN` via transacción Serializable + `$queryRaw`
- Log automático en creación y cada cambio de estado
- `PATCH /ordenes/:id/entrega` — registra datos de salida y cierra OT como ENTREGADO
- Salida de EN_ESPERA: resuelve estado de retorno consultando el último log de entrada

### Decisiones tomadas
- **EN_ESPERA → salida dinámica:** el estado de retorno se extrae del `LogEstadoOT` (campo `estadoAnterior` del último entry con `estadoNuevo = EN_ESPERA`). Evita añadir columna `estadoPrevioEnEspera` al schema.
- **Numeración OT:** `COUNT(*) + 1` dentro de `$transaction(Serializable)`. El `UNIQUE(idTaller, numeroOT)` actúa como red de seguridad ante race conditions.
- **TECNICO:** filtra OTs propias en `findAll` y `findOne`, y solo puede hacer transiciones definidas en `TRANSICIONES_TECNICO` (no puede cancelar ni pausar).
- **`OT_SELECT` estático:** evita over-fetching; se extiende con `include` solo en `findOne`.

---

## [2026-04-01] Fase 1 — Auth y Usuarios

### Implementado
- `AuthModule`: JWT (access 8h + refresh 7d), bcrypt cost=12
- `JwtStrategy` y `JwtRefreshStrategy` (passport)
- `JwtAuthGuard`, `JwtRefreshGuard`, `RolesGuard`
- Decorators: `@CurrentUser()`, `@CurrentTaller()`, `@Roles()`
- `AuthController`: POST /auth/login, POST /auth/refresh, GET /auth/me
- `AuthService`: login, refresh, getMe — nunca expone passwordHash
- `UsersModule`: CRUD de usuarios filtrado por id_taller
- `UsersController`: POST/GET/PATCH /users (acceso por rol)
- `UsersService`: validación de email único por taller, soft delete vía `activo`

### Decisiones tomadas
- `@CurrentTaller()` es la única fuente de `id_taller` en los handlers — nunca desde body/query
- `USER_SELECT` en UsersService excluye `passwordHash` de todas las respuestas
- Login busca por email sin filtro de taller (aún no conocemos el taller) pero valida que el taller esté activo
- `RolesGuard` permite acceso si no hay decorator `@Roles()` (funciona como opt-in)

---

## [2026-04-01] Fase 0 — Infraestructura base

### Implementado
- Monorepo con pnpm workspaces (`apps/api`, `apps/web`, `packages/shared`)
- `docker-compose.yml`: PostgreSQL 15-alpine + Adminer en puertos 5432/8080
- `.env.example` con todas las variables de entorno necesarias
- Scaffold NestJS 10 (`apps/api`): `PrismaModule`, `PrismaService`, `main.ts` con Swagger
- Scaffold Next.js 14 (`apps/web`): App Router, TailwindCSS, cliente Axios con interceptores JWT
- `apps/api/prisma/schema.prisma`: 9 tablas, 5 enums, indexes críticos del PRD
- Estructura de documentación (`docs/prd/`, `docs/progress/`, `docs/architecture/`, `docs/decisions/`)

### Decisiones tomadas
- **Docker solo para PostgreSQL** (no NestJS ni Next.js): elimina complejidad de bind mounts en Windows y mantiene hot-reload nativo
- **pnpm workspaces** sobre npm: menor duplicación de node_modules, más rápido en CI
- **shadcn/ui**: se instala por componente según necesidad (no bulk install)
- Ver [ADR-001](../decisions/ADR-001-monorepo-docker.md) para detalles

### Cómo arrancar (Fase 0)
```bash
docker compose up -d
cp .env.example apps/api/.env
# editar DATABASE_URL si es necesario
pnpm install
cd apps/api && pnpm db:migrate  # crea las 9 tablas
# verificar en http://localhost:8080 (Adminer)
pnpm --filter api dev    # API en :3001
pnpm --filter web dev    # Web en :3000
```
