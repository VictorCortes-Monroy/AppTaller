# Changelog

Formato: `[YYYY-MM-DD] Fase N — Descripción`

---

## [2026-04-05] Verificación MVP — Testing end-to-end

### Entorno de desarrollo
- Configuración completa del entorno local: Docker (PostgreSQL + Adminer), `.env` API, `.env.local` frontend
- Instalación de pnpm global, dependencias del monorepo, Prisma client y sincronización de schema
- Verificación de compilación exitosa del API (0 errores, 11 módulos, 40+ endpoints mapeados)
- Corrección: faltaba `apps/web/.env.local` con `NEXT_PUBLIC_API_URL` — frontend no conectaba a la API

### Seed de datos de prueba
- Creado `apps/api/prisma/seed.ts` con datos realistas:
  - 2 talleres (Norte y Sur) para testing cross-tenant
  - 7 usuarios (todos los roles: JEFE, SUPERVISOR, TECNICO×2, BODEGA, ADMIN + 1 JEFE en Taller Sur)
  - 4 vehículos (3 en Norte, 1 en Sur)
  - Password universal `Test1234!` con bcrypt cost 12
- Registrado script seed en `package.json` (`prisma.seed`)

### Criterios MVP verificados (10/13)
1. **Ciclo OT completo** ✅ — INGRESADO → EN_EVALUACION → EN_ESPERA → EN_EVALUACION → ESPERANDO_REPUESTOS → EN_EJECUCION → CONTROL_CALIDAD → LISTO_PARA_ENTREGA → ENTREGADO (9 transiciones)
2. **Log auditoría** ✅ — 9 entries con tipoEvento, usuario.nombre, fechaEvento, descripción
3. **Bodega + dashboard** ✅ — PENDIENTE → EN_ESPERA → EN_TRANSITO → RECIBIDO; fechaRecepcion/idReceptor auto-registrados; dashboard filtra correctamente; no-BODEGA recibe 403
4. **Restricciones TECNICO** ✅ — No crea OT (403), no crea usuarios (403), no cancela (422), no ve OTs de otros (0 results), solo ve las suyas
5. **OT duplicada** ✅ — 409 Conflict: "El vehículo ya tiene una OT activa: OT-2026-002"
6. **Cancelación** ✅ — Sin comentario: 400; comentario vacío: 400; con comentario: OK + comentarioCancelacion guardado
7. **STP auto-repuestos** ✅ — requiereRepuesto=true crea Repuesto en PENDIENTE vinculado a TareaIT; sin repuesto no crea nada
8. **Cross-taller** ✅ — Jefe Sur: 0 OTs, 0 vehículos ajenos, 404 en OT específica, 403 en repuesto ajeno
9. **bcrypt** ✅ — Todos los hashes inician con `$2b$12$`; passwordHash excluido de respuestas API
10. **JWT requerido** ✅ — 11/11 endpoints protegidos retornan 401 sin token; login público; token inválido rechazado

### Criterios pendientes de verificación
- **Dashboard <3s con 50 OTs + 200 repuestos**: ~50ms con datos actuales; requiere seed masivo para load test real
- **Backups automáticos 30 días**: requiere configuración de producción (Railway/AWS)
- **Responsive tablet ≥768px**: requiere verificación manual en Chrome DevTools

### Archivos creados/modificados
- `apps/api/.env` — variables de entorno locales configuradas
- `apps/api/prisma/seed.ts` — script de seed con datos de prueba
- `apps/api/package.json` — agregado `prisma.seed`
- `apps/web/.env.local` — `NEXT_PUBLIC_API_URL=http://localhost:3001`

---

## [2026-04-04] Fase 7 — Frontend (Next.js 14)

### Implementado
- Configuración completa shadcn/ui manual (sin CLI): Button, Input, Label, Card, Badge, Table, Select, Dialog, Textarea
- `lib/utils.ts`: función `cn()` para clases condicionales
- `lib/auth.ts`: gestión de tokens (get/set/clear), decodificación JWT client-side, helper `hasRole()`
- `lib/api.ts` actualizado: interceptor con refresh automático y sincronización de cookie `access_token`
- `middleware.ts`: protección de rutas via cookie `access_token` (edge-compatible)
- `components/providers.tsx`: QueryClientProvider + Sonner Toaster
- Layout raíz actualizado con Providers
- **Páginas:**
  - `(auth)/login`: formulario Zod + react-hook-form, manejo de errores inline, toast de bienvenida
  - `(dashboard)/layout`: sidebar + main content
  - `components/layout/sidebar`: navegación por rol (items filtrados según JWT), logout con limpieza de cookie
  - `(dashboard)/ots`: lista de OTs activas con alertas, días en taller, repuestos pendientes
  - `(dashboard)/ots/[id]`: detalle OT, cambio de estado inline, log de auditoría, tareas adicionales
  - `(dashboard)/ots/[id]/it`: carga de IT (presigned URL → S3 → confirm), tareas STP con repuesto
  - `(dashboard)/repuestos`: dashboard bodega agrupado por OT, avance de estado con Select
  - `(dashboard)/historial`: log cronológico con badges por tipo de evento
  - `(dashboard)/vehiculos`: listado + modal de creación con Zod
  - `(dashboard)/usuarios`: CRUD de usuarios con toggle activo/inactivo (solo JEFE)

### Decisiones tomadas
- **Cookie `access_token` como puente middleware**: JWT en localStorage no es accesible en Next.js middleware (Edge Runtime). Se escribe la cookie en el login y al refrescar para que el middleware pueda proteger rutas SSR
- **shadcn/ui instalado manualmente**: no disponible CLI en este entorno; componentes creados siguiendo exactamente el patrón de shadcn/ui con Radix + CVA
- **Sidebar con filtrado de roles client-side**: el token se decodifica en el cliente para mostrar/ocultar items de navegación; la protección real ocurre en el backend

---

## [2026-04-04] Fase 6 — Dashboard y Log de Auditoría

### Implementado
- `DashboardModule`: 3 endpoints de vistas + log por OT
- `DashboardService`:
  - `getOtsActivas()`: OTs no finalizadas con alerta `>7 días`, repuestos pendientes, tareas adicionales count
  - `getRepuestosPendientes()`: agrupado por OT, ordenado por días de espera DESC
  - `getHistorial()`: todos los `LogEstadoOT` del taller en orden cronológico DESC
- `GET /ordenes/:id/log` agregado a OrdenesController — acceso a todos excepto TECNICO
- `OrdenesService.getLog()`: log inmutable de una OT específica con usuario incluido

### Decisiones tomadas
- **BODEGA solo Vista 2**: el controller aplica `@Roles()` por endpoint; BODEGA no puede ver Vista 1 ni Vista 3
- **Historial sin paginación en v1.0**: se retornan todos los eventos del taller; v2.0 puede agregar cursor-based pagination si el volumen lo requiere

---

## [2026-04-04] Fase 5 — Tareas Adicionales

### Implementado
- `TareasAdicionalesModule`: 3 endpoints en 2 controllers (rutas nested + standalone)
- `TareasAdicionalesController` (`/ordenes/:idOT/tareas-adicionales`): POST y GET
- `TareasAdicionalesItemController` (`/tareas-adicionales`): PATCH `:id`
- `TareasAdicionalesService`:
  - `create()`: valida OT activa, registra tarea + log `REGISTRO_TAREA_ADICIONAL` en transacción
  - `findByOT()`: lista tareas con usuario incluido
  - `update()`: verifica autoría (solo creador, SUPERVISOR o JEFE); bloquea si OT en estado final

### Decisiones tomadas
- **`momentoRegistro` es selección manual**: el campo registra en qué estado *se identificó* el trabajo, no el estado actual de la OT — permite contexto histórico correcto
- **PATCH en ruta separada** (`/tareas-adicionales/:id`): sigue el patrón REST del proyecto; evitar sub-rutas nested innecesarias

---

## [2026-04-04] Fase 4 — Repuestos (flujo bodega)

### Implementado
- `RepuestosModule`: gestión de repuestos vinculados a OTs
- `RepuestosController`: 4 endpoints — POST/GET `/ordenes/:idOT/repuestos`, PATCH `/repuestos/:id/estado`, GET `/repuestos/pendientes`
- `RepuestosService`:
  - `create()`: agrega repuesto manual con validación de OT activa y costo obligatorio si `origen=TALLER`
  - `findByOT()`: lista repuestos de una OT con tarea STP vinculada (si aplica)
  - `actualizarEstado()`: avanza estado forward-only (`PENDIENTE→EN_ESPERA→EN_TRANSITO→RECIBIDO`), solo `BODEGA`; en `RECIBIDO` guarda `fechaRecepcion` e `idReceptor`
  - `getPendientes()`: dashboard bodega — repuestos no recibidos agrupados por OT con días de espera calculados
- DTOs: `CreateRepuestoDto` (con validación condicional `costo` si origen TALLER), `ActualizarEstadoRepuestoDto`

### Decisiones tomadas
- **PATCH /repuestos/:id/estado solo para BODEGA:** el avance del estado de un repuesto es responsabilidad exclusiva de bodega; JEFE/SUPERVISOR pueden ver pero no modificar
- **Multi-tenant en actualizarEstado:** se verifica `repuesto.ordenTrabajo.idTaller === idTaller` del JWT para bloquear acceso cross-taller
- **diasEspera calculado en runtime:** diferencia en ms entre `creado_en` y `Date.now()`, sin columna adicional en DB

---

## [2026-04-04] Fase 3 — Informe Técnico y Plan de Servicio (STP)

### Implementado
- `S3Module` (@Global): `S3Service` con presigned PUT URL vía `@aws-sdk/s3-request-presigner`; flag `SKIP_S3=true` devuelve URLs fake para desarrollo sin credenciales AWS
- `InformeTecnicoModule`: IT + tareas STP
- `InformeTecnicoController`: 4 endpoints — GET presigned-url, POST `/it`, GET `/it`, POST `/it/tareas`
- `InformeTecnicoService`:
  - `getPresignedUrl()`: valida OT en `EN_EVALUACION`, sin IT previo, genera key `it-files/{idTaller}/{idOT}/{uuid}.{ext}`
  - `crearIT()`: valida prefijo del key (seguridad multi-tenant), crea `InformeTecnico` + log `SUBIDA_IT` en transacción
  - `getIT()`: retorna IT con todas las tareas STP y sus repuestos
  - `crearTarea()`: crea `TareaIT` (inmutable — sin `updatedAt`); si `requiereRepuesto=true` auto-crea `Repuesto` en `PENDIENTE` + log `REGISTRO_TAREA_ADICIONAL`
- DTOs: `PresignedUrlQueryDto`, `CreateInformeTecnicoDto`, `CreateTareaITDto` (con `@ValidateIf` condicional)

### Decisiones tomadas
- **Validación del key en confirm:** se verifica que `dto.key` comience con `it-files/${idTaller}/${idOT}/` para prevenir path traversal cross-taller
- **SKIP_S3=true para dev:** evita requerir credenciales AWS en entorno local; la URL fake es suficiente para testing del flujo completo
- **Tareas STP inmutables:** no se exponen endpoints PATCH/PUT sobre `TareaIT`; una vez registrada no se modifica

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
