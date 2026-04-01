# WorkShop Manager

Sistema SaaS para la gestión digitalizada de talleres de mantención de vehículos mineros. Centraliza el registro y trazabilidad de Órdenes de Trabajo, repuestos, tareas adicionales e informes técnicos, garantizando que ningún trabajo escape a la facturación y que el supervisor tenga visibilidad en tiempo real.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | NestJS 10 + TypeScript |
| ORM | Prisma 5 |
| Base de datos | PostgreSQL 15 |
| Frontend | Next.js 14 (App Router) |
| Estilos | TailwindCSS + shadcn/ui |
| Auth | JWT (access 8h + refresh 7d) + bcrypt |
| Archivos | AWS S3 + presigned PUT URLs |
| Infraestructura dev | Docker Compose |
| Gestión de paquetes | pnpm workspaces |

---

## Requisitos previos

- [Node.js 20 LTS](https://nodejs.org/)
- [pnpm](https://pnpm.io/) — `npm install -g pnpm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

## Inicio rápido

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd AppTaller

# 2. Levantar PostgreSQL + Adminer
docker compose up -d

# 3. Configurar variables de entorno
cp .env.example apps/api/.env
# Editar apps/api/.env si es necesario (la config por defecto funciona con docker-compose)

# 4. Instalar dependencias
pnpm install

# 5. Crear las tablas en la base de datos
cd apps/api && pnpm db:migrate && cd ../..

# 6. Arrancar el proyecto
pnpm dev
```

| Servicio | URL |
|----------|-----|
| API (NestJS) | http://localhost:3001/api/v1 |
| Swagger | http://localhost:3001/api/docs |
| Frontend (Next.js) | http://localhost:3000 |
| Adminer (DB UI) | http://localhost:8080 |

> En Adminer: servidor `postgres`, usuario `workshop`, contraseña `workshop`, base de datos `workshop_dev`

---

## Estructura del repositorio

```
AppTaller/
├── apps/
│   ├── api/                    # Backend — NestJS 10
│   │   ├── prisma/
│   │   │   └── schema.prisma   # 9 tablas, 5 enums, indexes
│   │   └── src/
│   │       ├── auth/           # JWT, guards, decorators, strategies
│   │       ├── users/          # Gestión de usuarios por taller
│   │       ├── vehiculos/      # Registro de vehículos (VIN único)
│   │       ├── ordenes/        # OTs + state machine de 9 estados
│   │       ├── informe-tecnico/ # IT + STP + subida S3
│   │       ├── repuestos/      # Partes + flujo bodega
│   │       ├── tareas-adicionales/ # Trabajo extra + costos
│   │       ├── dashboard/      # 3 vistas + log de auditoría
│   │       └── prisma/         # PrismaService global
│   │
│   └── web/                    # Frontend — Next.js 14
│       └── src/
│           ├── app/            # App Router (layouts por rol)
│           └── lib/api.ts      # Cliente Axios con interceptores JWT
│
├── docs/
│   ├── prd/                    # Product Requirements Documents
│   ├── architecture/           # Schema DB, diseño de API
│   ├── decisions/              # ADRs (decisiones de arquitectura)
│   └── progress/               # Roadmap, changelog, fases
│
├── docker-compose.yml          # PostgreSQL + Adminer
├── pnpm-workspace.yaml
└── CLAUDE.md                   # Contexto para Claude Code
```

---

## Comandos útiles

```bash
# Desarrollo
pnpm dev              # Arranca api (:3001) y web (:3000) en paralelo
pnpm dev:api          # Solo el backend
pnpm dev:web          # Solo el frontend

# Base de datos
pnpm db:migrate       # Aplica migraciones pendientes
pnpm db:generate      # Regenera el cliente Prisma
pnpm db:studio        # Abre Prisma Studio en :5555

# Docker
docker compose up -d  # Levantar PostgreSQL + Adminer
docker compose down   # Detener contenedores
docker compose down -v # Detener y eliminar volúmenes (borra datos)

# Build
pnpm build            # Build de todas las apps
```

---

## Roles y permisos

| Rol | Capacidades principales |
|-----|------------------------|
| **Jefe** | Todo + gestión de usuarios |
| **Supervisor** | Crear/gestionar vehículos y OTs, cargar IT/STP, repuestos, tareas adicionales |
| **Técnico** | Avanzar estado en OTs asignadas, registrar tareas adicionales |
| **Bodega** | Actualizar estado de repuestos, ver dashboard de partes pendientes |
| **Admin** | Ver costos, acceso al dashboard completo (lectura) |

---

## Estado de desarrollo

| Fase | Módulo | Estado |
|------|--------|--------|
| 0 | Infraestructura (monorepo, Docker, Prisma) | ✅ |
| 1 | Auth y Usuarios | ✅ |
| 2 | Vehículos y Órdenes de Trabajo | ✅ |
| 3 | Informe Técnico y Plan de Servicio (S3) | ⏳ |
| 4 | Repuestos | ⏳ |
| 5 | Tareas Adicionales | ⏳ |
| 6 | Dashboard y Log de Auditoría | ⏳ |
| 7 | Frontend (Next.js 14) | ⏳ |

Ver [docs/progress/ROADMAP.md](docs/progress/ROADMAP.md) para detalles.

---

## Variables de entorno

Ver [.env.example](.env.example) para la lista completa. Las mínimas para desarrollo:

```env
DATABASE_URL="postgresql://workshop:workshop@localhost:5432/workshop_dev"
JWT_SECRET="tu-secret-seguro"
```

---

## Documentación

| Recurso | Ruta |
|---------|------|
| PRD del producto | [docs/prd/WorkShopManager_PRD_v1.0.md](docs/prd/WorkShopManager_PRD_v1.0.md) |
| Schema de base de datos | [docs/architecture/database-schema.md](docs/architecture/database-schema.md) |
| Diseño de la API | [docs/architecture/api-design.md](docs/architecture/api-design.md) |
| Decisiones de arquitectura | [docs/decisions/](docs/decisions/) |
| Roadmap y changelog | [docs/progress/](docs/progress/) |
| Swagger (en desarrollo) | http://localhost:3001/api/docs |
