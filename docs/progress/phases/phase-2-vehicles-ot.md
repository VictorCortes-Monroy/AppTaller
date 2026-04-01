# Fase 2 — Vehículos y Órdenes de Trabajo

**Estado:** ✅ Completado — 2026-04-01

## Objetivo
Implementar el registro de vehículos y el núcleo del sistema: la Orden de Trabajo con su state machine de 9 estados y log automático de cambios.

## State Machine de OT

```
INGRESADO
  └→ EN_EVALUACION
       └→ ESPERANDO_REPUESTOS ─┐
       └→ EN_EJECUCION  ←──────┘
            └→ CONTROL_CALIDAD
                 └→ LISTO_PARA_ENTREGA
                      └→ ENTREGADO

Cualquier estado activo → CANCELADO (con comentario obligatorio)
Cualquier estado activo → EN_ESPERA (pausa temporal)
EN_ESPERA → retoma al estado anterior
```

## Endpoints — Vehículos

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/api/v1/vehiculos` | JEFE, SUPERVISOR | Crear vehículo (VIN único por taller) |
| GET | `/api/v1/vehiculos` | Todos (excepto TECNICO) | Listar vehículos activos |
| GET | `/api/v1/vehiculos/:id` | Todos | Detalle + historial de OTs |
| PATCH | `/api/v1/vehiculos/:id` | JEFE, SUPERVISOR | Actualizar / desactivar |

## Endpoints — Órdenes de Trabajo

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/api/v1/ordenes` | JEFE, SUPERVISOR | Crear OT (valida 1 activa por vehículo) |
| GET | `/api/v1/ordenes` | Todos (filtrado por rol) | Listar OTs del taller |
| GET | `/api/v1/ordenes/:id` | Todos | Detalle con repuestos y tareas |
| PATCH | `/api/v1/ordenes/:id/estado` | Según rol | Cambiar estado (valida transición) |
| PATCH | `/api/v1/ordenes/:id/entrega` | JEFE, SUPERVISOR | Registrar datos de salida |

## Reglas de negocio críticas

1. Solo 1 OT activa (no ENTREGADO/CANCELADO) por vehículo
2. Numeración secuencial: `OT-YYYY-NNN` vía PostgreSQL sequence por taller
3. Cambio de estado genera `LogEstadoOT` automáticamente
4. Cancelación: comentario obligatorio en body
5. TECNICO solo puede avanzar estado en OTs asignadas (no cancelar)
6. Datos de salida (km, fecha, receptor) requeridos al pasar a ENTREGADO

## Criterios de aceptación

- [x] Crear OT con vehículo que ya tiene OT activa → 409 Conflict
- [x] Transición inválida (ej: INGRESADO → ENTREGADO) → 422
- [x] Cancelar sin comentario → 400 (via `@ValidateIf` en DTO)
- [x] Número OT formato `OT-2026-001` generado automáticamente
- [x] Log creado automáticamente en creación y cada cambio de estado
- [x] TECNICO no puede ver OTs de otro taller (filtro en findAll/findOne)
