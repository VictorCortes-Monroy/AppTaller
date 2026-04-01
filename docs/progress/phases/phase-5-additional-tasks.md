# Fase 5 — Tareas Adicionales

**Estado:** ⏳ Pendiente

## Objetivo
Registro de trabajo adicional identificado durante la ejecución, con costo obligatorio y trazabilidad del momento en que fue identificado.

## Endpoints

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/api/v1/ordenes/:idOT/tareas-adicionales` | JEFE, SUPERVISOR, TECNICO | Registrar tarea adicional |
| GET | `/api/v1/ordenes/:idOT/tareas-adicionales` | Todos | Listar tareas de la OT |
| PATCH | `/api/v1/tareas-adicionales/:id` | Creador / SUPERVISOR / JEFE | Editar (solo antes de completar OT) |

## Reglas de negocio críticas

1. `costo` siempre requerido
2. `momentoRegistro` es el estado en que se **identificó** el trabajo (selección manual del usuario) — no el estado actual de la OT
3. No registrar en OT `ENTREGADO` o `CANCELADO`
4. Edición solo por: el creador de la tarea, SUPERVISOR, o JEFE
5. No editable si la OT ya está en estado final

## Criterios de aceptación

- [ ] Tarea sin costo → 400
- [ ] BODEGA intenta crear tarea adicional → 403
- [ ] `momentoRegistro` puede diferir del estado actual de la OT
- [ ] TECNICO A no puede editar tarea de TECNICO B
- [ ] Tarea en OT completada no editable → 422
- [ ] Creación genera log automático en `LogEstadoOT`
