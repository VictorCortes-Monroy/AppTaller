# Fase 8 — Mejoras de UX y Funcionalidades Avanzadas

> Estado: ✅ Completado  
> Fecha: 2026-04-05 / 2026-04-06

## Objetivo

Mejorar la experiencia de usuario del frontend con funcionalidades avanzadas: dashboard de monitoreo, kanban de OTs, checklist STP interactivo, importación masiva de vehículos, timeline de progreso de OTs, y formularios optimizados.

---

## Implementado

### 8.1 — Dashboard de Monitoreo (Página de Inicio)

- **KPI cards**: OTs activas, completadas del mes, tiempo promedio, repuestos pendientes
- **Gráficos con Recharts**: barras (OTs por estado), pie (distribución por tipo de servicio)
- **Tabla de prioridad**: OTs con más días en taller, alertas visuales
- **Donut chart**: estado de repuestos pendientes
- Endpoint consumido: `GET /dashboard/resumen`

### 8.2 — Kanban de Órdenes de Trabajo

- Reemplazo de la vista tabla por tablero kanban con 7 columnas de estado
- `OTKanbanCard`: muestra N° OT, vehículo, cliente, técnico, días en taller, badge de repuestos
- **Barra de filtros**: búsqueda por texto + filtros por estado, marca, técnico con limpieza rápida
- Cambio de estado se realiza en la página de detalle (no drag & drop)

### 8.3 — Formulario de Creación de OT Mejorado

- Flujo **cliente-primero**: primero se selecciona el cliente, luego se filtran los vehículos disponibles
- Campo de tipo de servicio (`TipoServicio` enum)
- Selección de técnico asignado
- Fix de dropdowns transparentes (CSS variables `--popover` y `--popover-foreground`)

### 8.4 — Timeline de Progreso de OT

- Componente `OTProgressTimeline`: stepper horizontal con 7 pasos del flujo
- `buildStateTimestamps()`: extrae timestamps del log de auditoría
- Manejo visual de `EN_ESPERA` (badge de pausa) y `CANCELADO` (banner rojo)
- Reemplaza el anterior header con Badge+Select

### 8.5 — Checklist STP Interactivo

- Estilo Monday.com: tareas inline con toggle de completado, fechas, edición in-place
- **Bulk paste desde Excel**: pegar múltiples tareas desde portapapeles
- Campos: descripción, requiere repuesto, completada, fecha de actualización

### 8.6 — Importación Masiva de Vehículos

- **Backend**: `POST /vehiculos/bulk` con validación de VINs duplicados (en lote y en BD)
- **Frontend**: `BulkImportDialog` con:
  - Upload de archivo Excel/CSV
  - Parsing client-side con SheetJS (`xlsx`)
  - Tabla de preview con validación por fila (errores resaltados en rojo)
  - Descarga de plantilla `.xlsx` generada client-side
  - Botón de importación con feedback de éxito/error

### 8.7 — Fixes Técnicos

- **Hydration errors**: `getUser()` lee localStorage (solo client). Fix: `useState + useEffect` para diferir lectura al mount
- **Redirect loop en `/`**: `app/page.tsx` tenía `redirect('/ots')` que tomaba prioridad sobre `(dashboard)/page.tsx`. Fix: eliminar `app/page.tsx`
- **TypeScript**: `Set` spread incompatible con target — reemplazado por `Array.from(new Set(...))`
- **CSS**: variables `--popover` y `--popover-foreground` faltantes en `globals.css`

---

## Archivos creados/modificados

| Archivo | Acción |
|---------|--------|
| `apps/web/src/app/(dashboard)/page.tsx` | Dashboard de monitoreo con KPIs y gráficos |
| `apps/web/src/app/(dashboard)/ots/page.tsx` | Kanban + filtros + formulario mejorado |
| `apps/web/src/app/(dashboard)/ots/[id]/page.tsx` | Timeline + checklist STP interactivo |
| `apps/web/src/app/(dashboard)/vehiculos/page.tsx` | Importación masiva Excel |
| `apps/web/src/components/layout/sidebar.tsx` | Fix hydration, item "Inicio" |
| `apps/web/src/app/globals.css` | Variables CSS popover |
| `apps/web/package.json` | Dependencias: recharts, xlsx |
| `apps/api/src/vehiculos/vehiculos.controller.ts` | Endpoint POST /vehiculos/bulk |
| `apps/api/src/vehiculos/vehiculos.service.ts` | bulkCreate() con validación |
| `apps/api/src/vehiculos/dto/bulk-create-vehiculo.dto.ts` | DTO para importación masiva |

---

## Checklist de aceptación

- [x] Dashboard de inicio muestra KPIs y gráficos con datos reales
- [x] Kanban muestra OTs agrupadas por estado con filtros funcionales
- [x] Formulario de OT permite selección cliente → vehículo → tipo servicio
- [x] Timeline de progreso muestra estados con timestamps del log
- [x] Checklist STP permite crear, completar y editar tareas inline
- [x] Bulk paste desde Excel funciona para tareas STP
- [x] Importación masiva valida, previsualiza y crea vehículos desde Excel
- [x] Sin errores de hydration en sidebar ni páginas
- [x] Build de producción compila sin errores TypeScript
