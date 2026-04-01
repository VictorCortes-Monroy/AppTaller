# Fase 3 — Informe Técnico y Plan de Servicio

**Estado:** ⏳ Pendiente

## Objetivo
Subida de archivo IT a S3 via presigned URL y registro de tareas del Plan de Servicio (STP) con creación automática de repuestos.

## Flujo de subida de archivo

```
Frontend                    Backend (NestJS)         AWS S3
   |                              |                     |
   |-- POST /it/presigned-url --> |                     |
   |                              |-- genera presigned PUT URL (10min)
   |<-- { url, key } ----------- |                     |
   |                              |                     |
   |-- PUT (archivo) ------------|-------------------> |
   |<-- 200 OK ------------------|<------------------- |
   |                              |                     |
   |-- POST /it (con key) -----> |                     |
   |                              |-- guarda registro IT en DB
   |<-- InformeTecnico ----------|                     |
```

## Endpoints

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/v1/ordenes/:idOT/it/presigned-url` | JEFE, SUPERVISOR | Obtener URL firmada para subir archivo |
| POST | `/api/v1/ordenes/:idOT/it` | JEFE, SUPERVISOR | Registrar header IT (tras subida exitosa) |
| GET | `/api/v1/ordenes/:idOT/it` | Todos | Ver IT + tareas STP |
| POST | `/api/v1/ordenes/:idOT/it/tareas` | JEFE, SUPERVISOR | Agregar tarea STP |

## Reglas de negocio críticas

1. Solo 1 IT por OT (constraint único en DB)
2. IT solo se puede crear cuando OT está en `EN_EVALUACION`
3. Archivo: PDF/XLS/XLSX, máximo 20MB — validación en backend
4. Presigned URL expira en 10 minutos
5. Tareas STP son **inmutables** post-registro (no endpoints de edición)
6. Si `requiereRepuesto: true` → crear `Repuesto` en estado `PENDIENTE` automáticamente
7. Creación de repuesto genera `LogEstadoOT` con tipo `REGISTRO_TAREA_ADICIONAL`

## Criterios de aceptación

- [ ] Segunda IT en misma OT → 409 Conflict
- [ ] Archivo > 20MB rechazado con error claro
- [ ] Tarea con `requiereRepuesto: true` crea repuesto automáticamente
- [ ] Intentar editar tarea STP → 405 Method Not Allowed
- [ ] URL firmada expira correctamente (verificar con prueba manual)
- [ ] IT solo creable en estado `EN_EVALUACION`
