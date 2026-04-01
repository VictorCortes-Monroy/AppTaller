# Database Schema — WorkShop Manager v1.0

> Corresponde a `apps/api/prisma/schema.prisma`

## Diagrama de relaciones

```
Taller (1)
  ├── (N) Usuario         [id_taller + email UNIQUE]
  ├── (N) Vehiculo        [id_taller + numero_serie UNIQUE]
  └── (N) OrdenTrabajo    [id_taller + numero_ot UNIQUE]

OrdenTrabajo (1)
  ├── (1) InformeTecnico  [id_ot UNIQUE]
  │     └── (N) TareaIT
  │           └── (0..1) Repuesto  [id_tarea_it UNIQUE]
  ├── (N) Repuesto        [también creados manualmente]
  ├── (N) TareaAdicional
  └── (N) LogEstadoOT     [insert-only]
```

## Tablas

### taller
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| nombre | String | |
| rut | String | UNIQUE global |
| direccion | String? | |
| activo | Boolean | default true |

### usuario
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| id_taller | String | FK → taller |
| nombre | String | |
| email | String | UNIQUE por taller |
| password_hash | String | bcrypt cost ≥12 |
| rol | RolUsuario | JEFE/SUPERVISOR/TECNICO/BODEGA/ADMIN |
| activo | Boolean | soft delete |

### vehiculo
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| id_taller | String | FK → taller |
| marca | String | |
| modelo | String | |
| numero_serie | String | VIN, UNIQUE por taller |
| cliente | String | empresa/mina |
| sucursal | String? | |
| activo | Boolean | no eliminar si tiene OTs |

### orden_trabajo
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| id_taller | String | FK → taller |
| id_vehiculo | String | FK → vehiculo |
| id_tecnico | String? | FK → usuario |
| numero_ot | String | OT-YYYY-NNN, UNIQUE por taller |
| estado | EstadoOT | state machine 9 estados |
| kilometraje | Int? | al ingreso |
| kilometraje_salida | Int? | al entregar |
| fecha_entrega | DateTime? | real, no estimada |
| receptor_nombre | String? | quien retiró el vehículo |
| comentario_cancelacion | String? | obligatorio si CANCELADO |

**Indexes críticos:**
- `(id_taller, estado)` — OTs activas por taller
- `(id_vehiculo, estado)` — validar 1 activa por vehículo

### informe_tecnico
| Campo | Tipo | Notas |
|-------|------|-------|
| id_ot | String | FK + UNIQUE → orden_trabajo (1:1) |
| fecha_evaluacion | DateTime | |
| evaluador | String | nombre del técnico evaluador |
| kilometraje | Int | odómetro en evaluación |
| archivo_url | String | URL en S3 |
| archivo_nombre | String | nombre original del archivo |

### tarea_it
| Campo | Tipo | Notas |
|-------|------|-------|
| id_it | String | FK → informe_tecnico |
| numero | Int | número en el STP |
| componente | String | |
| descripcion | String | |
| requiere_repuesto | Boolean | si true → auto-crea Repuesto |

**Inmutable:** sin `updated_at`, sin endpoint de edición.

### repuesto
| Campo | Tipo | Notas |
|-------|------|-------|
| id_ot | String | FK → orden_trabajo |
| id_tarea_it | String? | UNIQUE, FK → tarea_it (null si manual) |
| descripcion | String | |
| cantidad | Decimal(10,2) | |
| unidad | String | "unidad", "litros", etc. |
| origen | OrigenRepuesto | KOMATSU / TALLER |
| costo | Decimal(12,2)? | requerido si TALLER |
| estado | EstadoRepuesto | 4 estados |
| fecha_estimada | DateTime? | |
| fecha_recepcion | DateTime? | auto al recibir |
| id_receptor | String? | FK → usuario, auto al recibir |

**Index crítico:** `(id_ot, estado)` — partes pendientes por OT

### tarea_adicional
| Campo | Tipo | Notas |
|-------|------|-------|
| id_ot | String | FK → orden_trabajo |
| id_usuario | String | FK → usuario (creador) |
| descripcion | String | |
| componente | String? | |
| tipo_trabajo | String? | |
| momento_registro | EstadoOT | estado en que se identificó el trabajo |
| insumos | String? | |
| costo | Decimal(12,2) | siempre requerido |

### log_estado_ot
| Campo | Tipo | Notas |
|-------|------|-------|
| id_ot | String | FK → orden_trabajo |
| id_usuario | String | FK → usuario |
| tipo_evento | TipoEventoLog | enum |
| estado_anterior | EstadoOT? | null en creación |
| estado_nuevo | EstadoOT? | null en eventos sin cambio de estado |
| descripcion | String | texto del evento |
| comentario | String? | obligatorio en CANCELADO |
| fecha_evento | DateTime | default now(), inmutable |

**Inmutable:** sin `updated_at`. No hay endpoints UPDATE/DELETE para esta tabla.

**Index crítico:** `(id_ot, fecha_evento DESC)` — historial ordenado

## Enums

```
RolUsuario:  JEFE | SUPERVISOR | TECNICO | BODEGA | ADMIN

EstadoOT:    INGRESADO | EN_EVALUACION | ESPERANDO_REPUESTOS |
             EN_EJECUCION | CONTROL_CALIDAD | LISTO_PARA_ENTREGA |
             ENTREGADO | CANCELADO | EN_ESPERA

EstadoRepuesto: PENDIENTE | EN_ESPERA | EN_TRANSITO | RECIBIDO

OrigenRepuesto: KOMATSU | TALLER

TipoEventoLog: CAMBIO_ESTADO | SUBIDA_IT | RECEPCION_REPUESTO |
               REGISTRO_TAREA_ADICIONAL | CREACION_OT | ACTUALIZACION_REPUESTO
```
