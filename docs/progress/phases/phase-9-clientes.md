# Fase 9 — Módulo de Gestión de Clientes

> Estado: ✅ Completado  
> Fecha: 2026-04-06

## Objetivo

Crear una entidad `Cliente` propia con datos empresariales (RUT, contacto, dirección) y una vista centralizada que muestre vehículos, órdenes de trabajo, servicios realizados y fechas. Permite trazabilidad completa por cliente y alimenta el sistema con datos estructurados.

---

## Implementado

### 9.1 — Schema y Modelo de Datos

- **Nuevo modelo `Cliente`**: id, nombre, rut, dirección, contacto, teléfono, email, activo
- **Unique constraint**: `@@unique([idTaller, nombre])` — un cliente por nombre por taller
- **Relación con Vehiculo**: `idCliente` (FK nullable) en Vehiculo, relación `clienteRef`
- **Relación con Taller**: `clientes Cliente[]` agregado al modelo Taller
- Campo `cliente` (string) mantenido en Vehiculo por backward compatibility

### 9.2 — Backend: ClientesModule

**DTOs:**
- `CreateClienteDto`: nombre (requerido), rut, dirección, contacto, teléfono, email (opcionales)
- `UpdateClienteDto`: todos opcionales + activo (boolean)

**Service (`clientes.service.ts`):**
- `create()`: valida nombre único por taller, crea registro
- `findAll()`: lista clientes con stats agregados via raw SQL (vehiculosCount, totalServicios, ultimoServicio)
- `findOne()`: detalle completo — cliente + vehículos con count OTs + últimas 50 OTs + resumen
- `update()`: actualización con validación de duplicados en nombre

**Controller (`clientes.controller.ts`):**

| Método | Ruta | Roles |
|--------|------|-------|
| POST | /clientes | JEFE, SUPERVISOR |
| GET | /clientes | JEFE, SUPERVISOR, ADMIN |
| GET | /clientes/:id | JEFE, SUPERVISOR, ADMIN |
| PATCH | /clientes/:id | JEFE, SUPERVISOR |

### 9.3 — Auto-link en VehiculosService

- Método privado `resolveCliente()`: busca o crea un `Cliente` por nombre dentro del taller
- `create()` y `bulkCreate()` vinculan automáticamente vehículos al Cliente correspondiente
- Backward compatible: el campo `cliente` (string) sigue existiendo

### 9.4 — Migración de Datos

- Script `prisma/migrate-clientes.ts`: creó registros Cliente desde strings `vehiculo.cliente` existentes y vinculó vehículos
- Seed actualizado con 3 clientes (Minera Los Pelambres, Minera Escondida, Minera Collahuasi) con datos completos

### 9.5 — Frontend

**Sidebar:** item "Clientes" con icono `Building2`, roles JEFE/SUPERVISOR/ADMIN

**Página lista `/clientes`:**
- 3 KPI cards: clientes activos, vehículos totales, servicios realizados
- Buscador por nombre o RUT
- Tabla: Nombre, RUT, Contacto, Vehículos (count), Servicios (count), Último Servicio, Estado
- Dialog "Nuevo Cliente" con formulario Zod (nombre, RUT, dirección, contacto, teléfono, email)
- Filas clickeables → navega al detalle

**Página detalle `/clientes/[id]`:**
- Header con datos del cliente (nombre, RUT, contacto, teléfono, email, dirección)
- 3 KPI cards: vehículos, servicios realizados, último servicio
- Tabla "Vehículos": VIN, marca/modelo, sucursal, count OTs, estado
- Tabla "Historial de Servicios": N° OT, vehículo, tipo, estado (coloreado), técnico, fecha ingreso/entrega
- Filas de OTs clickeables → navega al detalle de la OT

---

## Archivos creados/modificados

| Archivo | Acción |
|---------|--------|
| `apps/api/prisma/schema.prisma` | Modelo Cliente, FK idCliente en Vehiculo, relación en Taller |
| `apps/api/prisma/migrate-clientes.ts` | **Nuevo** — script migración datos existentes |
| `apps/api/prisma/seed.ts` | Actualizado — 3 clientes con datos empresariales |
| `apps/api/src/clientes/clientes.module.ts` | **Nuevo** |
| `apps/api/src/clientes/clientes.controller.ts` | **Nuevo** — 4 endpoints |
| `apps/api/src/clientes/clientes.service.ts` | **Nuevo** — CRUD + stats agregados |
| `apps/api/src/clientes/dto/create-cliente.dto.ts` | **Nuevo** |
| `apps/api/src/clientes/dto/update-cliente.dto.ts` | **Nuevo** |
| `apps/api/src/app.module.ts` | Registrado ClientesModule |
| `apps/api/src/vehiculos/vehiculos.service.ts` | resolveCliente() + auto-link |
| `apps/api/src/vehiculos/vehiculos.controller.ts` | Endpoint POST /vehiculos/bulk |
| `apps/api/src/vehiculos/dto/bulk-create-vehiculo.dto.ts` | **Nuevo** |
| `apps/web/src/components/layout/sidebar.tsx` | Item Clientes con Building2 |
| `apps/web/src/app/(dashboard)/clientes/page.tsx` | **Nuevo** — lista clientes |
| `apps/web/src/app/(dashboard)/clientes/[id]/page.tsx` | **Nuevo** — detalle cliente |

---

## Checklist de aceptación

- [x] `prisma db push` → tabla `cliente` creada con constraint único
- [x] Script migración → clientes creados desde vehículos existentes
- [x] `POST /clientes` → crea cliente, duplicado → 409
- [x] `GET /clientes` → lista con counts de vehículos y OTs
- [x] `GET /clientes/:id` → detalle con vehículos + historial OTs
- [x] Crear vehículo con cliente string → auto-crea/vincula Cliente
- [x] Frontend: navegar a /clientes → ver lista → click → detalle con datos
- [x] Build de producción compila sin errores
