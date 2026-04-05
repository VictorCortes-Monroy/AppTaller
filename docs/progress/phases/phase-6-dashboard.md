# Fase 6 — Dashboard y Log de Auditoría

**Estado:** ✅ Completado — 2026-04-04

## Objetivo
Tres vistas del dashboard con acceso por rol y el log de auditoría inmutable.

## Endpoints del Dashboard

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/v1/dashboard/ots-activas` | JEFE, SUPERVISOR, ADMIN | Vista 1: OTs activas con alertas |
| GET | `/api/v1/dashboard/repuestos-pendientes` | JEFE, SUPERVISOR, BODEGA, ADMIN | Vista 2: Repuestos agrupados por OT |
| GET | `/api/v1/dashboard/historial` | JEFE, SUPERVISOR, ADMIN | Vista 3: Log cronológico |
| GET | `/api/v1/ordenes/:idOT/log` | Todos (excepto TECNICO) | Log de una OT específica |

## Vista 1 — OTs Activas

Campos por OT:
- Número OT, vehículo, cliente
- Estado actual y días en taller
- Técnico asignado
- Cantidad de repuestos pendientes (no RECIBIDO)
- Cantidad de tareas adicionales no facturadas
- **Alerta** si días en taller > umbral (configurable, default 7 días)

## Vista 2 — Repuestos Pendientes

Agrupado por OT, ordenado por días de espera DESC:
- Descripción, origen, estado actual
- Fecha estimada de llegada
- Días en espera desde `creadoEn`
- Botón de actualización de estado (solo BODEGA)

## Vista 3 — Historial (read-only)

- Todos los `LogEstadoOT` del taller
- Filtros: fecha, tipo de evento, número OT
- Sin paginación en v1.0 (historial completo)

## Reglas de negocio críticas

1. BODEGA: solo acceso a Vista 2
2. TECNICO: sin acceso a ninguna vista del dashboard
3. `LogEstadoOT` es insert-only — no exponer endpoints de UPDATE ni DELETE
4. Todos los timestamps en zona horaria de Chile (America/Santiago)

## Criterios de aceptación

- [x] TECNICO accede a dashboard → 403
- [x] BODEGA accede a Vista 1 → 403
- [x] Dashboard carga <3s con 50 OTs activas
- [x] Log muestra eventos en orden cronológico descendente
- [x] Alerta de demora visible para OTs > 7 días
