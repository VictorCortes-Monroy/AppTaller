# Fase 4 — Repuestos

**Estado:** ⏳ Pendiente

## Objetivo
Gestión de repuestos con 4 estados, flujo exclusivo de bodega para actualizaciones, y validaciones según estado de la OT.

## State Machine de Repuesto

```
PENDIENTE → EN_ESPERA → EN_TRANSITO → RECIBIDO
```
Solo avance hacia adelante. Solo rol BODEGA puede transicionar estados.

## Endpoints

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/api/v1/ordenes/:idOT/repuestos` | JEFE, SUPERVISOR | Agregar repuesto manualmente |
| GET | `/api/v1/ordenes/:idOT/repuestos` | Todos | Listar repuestos de la OT |
| PATCH | `/api/v1/repuestos/:id/estado` | Solo BODEGA | Actualizar estado del repuesto |
| GET | `/api/v1/repuestos/pendientes` | JEFE, SUPERVISOR, BODEGA | Vista dashboard: agrupados por OT |

## Reglas de negocio críticas

1. No agregar repuestos en OT con estado `ENTREGADO` o `CANCELADO`
2. `costo` requerido si `origen = TALLER`, opcional si `origen = KOMATSU`
3. Al pasar a `RECIBIDO`: guardar `fechaRecepcion` = now() y `idReceptor` = usuario actual
4. Solo BODEGA puede actualizar estado
5. Repuestos auto-creados desde TareaIT tienen `idTareaIT` referenciado

## Criterios de aceptación

- [ ] Agregar repuesto en OT ENTREGADA → 422
- [ ] Repuesto TALLER sin costo → 400
- [ ] SUPERVISOR intenta cambiar estado repuesto → 403
- [ ] Al recibir repuesto, `fechaRecepcion` y `idReceptor` guardados correctamente
- [ ] Dashboard muestra repuestos agrupados por OT con días de espera
