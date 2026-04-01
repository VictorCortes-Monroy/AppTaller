# WorkShop Manager — Product Requirements Document (PRD)
**Versión:** 1.0  
**Fecha:** Marzo 2026  
**Estado:** Borrador para validación  
**Confidencial — uso interno**

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Contexto y problema](#2-contexto-y-problema)
3. [Objetivo del producto](#3-objetivo-del-producto)
4. [Usuarios y roles](#4-usuarios-y-roles)
5. [Alcance v1.0](#5-alcance-v10)
6. [Requerimientos funcionales](#6-requerimientos-funcionales)
7. [Requerimientos no funcionales](#7-requerimientos-no-funcionales)
8. [Modelo de datos](#8-modelo-de-datos)
9. [Arquitectura técnica](#9-arquitectura-técnica)
10. [Reglas de negocio](#10-reglas-de-negocio)
11. [Criterios de aceptación del MVP](#11-criterios-de-aceptación-del-mvp)
12. [Roadmap](#12-roadmap)
13. [Fuera del alcance v1.0](#13-fuera-del-alcance-v10)

---

## 1. Resumen ejecutivo

**WorkShop Manager** es un sistema SaaS web diseñado para talleres de mantención de vehículos mineros. Digitaliza y centraliza la gestión operativa de cada mantención, desde el ingreso del vehículo hasta su entrega, asegurando que todo trabajo ejecutado quede registrado, trazado y disponible para cobro.

El producto nace de un problema concreto: los talleres operan con registros fragmentados (Excel, papel, WhatsApp), lo que genera trabajos no cobrados, falta de visibilidad del estado real del taller y ausencia de trazabilidad ante disputas con clientes o proveedores.

La versión 1.0 (MVP) se enfoca en tres capacidades fundamentales:
- **Registro**: toda actividad queda registrada con usuario, fecha y contexto.
- **Trazabilidad**: log inmutable de cada cambio de estado, tarea y repuesto por OT.
- **Visibilidad**: dashboard en tiempo real de OTs activas, repuestos pendientes e historial.

---

## 2. Contexto y problema

### 2.1 Contexto operacional

Un taller de vehículos mineros recibe aproximadamente **1 vehículo por día** para mantención. Cada mantención involucra:

- Un **proveedor externo** (ej. Komatsu) que realiza la evaluación inicial y emite un Informe Técnico (IT) con el diagnóstico (STP).
- **Repuestos** que pueden venir del proveedor o del propio taller, que llegan en distintos momentos y no necesariamente todos juntos.
- **Tareas adicionales** identificadas por el técnico interno durante la evaluación y la ejecución — trabajos no contemplados en el diagnóstico original que representan ingreso adicional para el taller.
- Múltiples actores internos (supervisor, técnico, bodega, administración) con responsabilidades distintas sobre la misma OT.

### 2.2 Problemas actuales

| Problema | Impacto directo |
|---|---|
| Tareas adicionales anotadas en papel o no anotadas | Trabajos ejecutados que no se facturan |
| Estado del taller solo en la cabeza del supervisor | Sin visibilidad ante ausencias o rotación |
| Repuestos gestionados por WhatsApp | Sin trazabilidad de quién recibió qué y cuándo |
| Sin historial por vehículo | Imposible demostrar qué se hizo ante una disputa |
| IT de Komatsu en Excel desconectado del resto | Reproceso y pérdida de información |

### 2.3 Hipótesis de valor

> Si el taller registra en un único sistema cada acción sobre cada OT, entonces ningún trabajo adicional se escapa del cobro, el supervisor tiene visibilidad total en tiempo real, y el taller puede demostrar todo lo que hizo ante cualquier auditoría o disputa.

---

## 3. Objetivo del producto

### 3.1 Objetivo general

Ser la fuente única de verdad para la gestión operativa de talleres de vehículos mineros, desde el ingreso del vehículo hasta su entrega.

### 3.2 Objetivos específicos

- Centralizar en un sistema toda la información de cada mantención.
- Garantizar que todo trabajo adicional ejecutado quede registrado con costo antes del cierre de la OT.
- Dar visibilidad en tiempo real sobre el estado de cada vehículo, repuestos pendientes y responsabilidades.
- Proveer un log de auditoría inmutable por OT.
- Ser la base de datos que soporte módulos futuros sin refactoring mayor.

### 3.3 Principios de diseño

| Principio | Implicación técnica |
|---|---|
| **Registro antes que automatización** | No hay flujos automáticos en v1.0. Todo cambio es manual por el actor responsable. |
| **Volumen sobre velocidad** | Sin cache Redis, sin colas. PostgreSQL bien indexado es suficiente. |
| **Simplicidad operacional** | Interfaces directas, sin fricción, pensadas para usuarios de taller no técnicos. |
| **Multi-tenant desde el inicio** | `id_taller` en todas las tablas. Row-level filtering en cada query. |
| **Base para crecer** | El modelo de datos anticipa entidades de v2 y v3. |

---

## 4. Usuarios y roles

### 4.1 Personas

**Supervisor del taller**
- Perfil: profesional técnico con experiencia en mantención. Maneja Excel y WhatsApp pero no es usuario de software complejo.
- Responsabilidad: gestiona el ciclo completo de la OT. Es el actor más activo del sistema.
- Pain point principal: pierde tiempo buscando información dispersa y teme que se pierdan cobros.

**Técnico interno**
- Perfil: mecánico o técnico de mantención. Puede tener poca experiencia con sistemas digitales.
- Responsabilidad: ejecuta los trabajos y registra los adicionales. Actualiza estados.
- Pain point principal: registrar en papel lo que hace y que alguien más lo transcriba.

**Bodega / Logística**
- Perfil: encargado de recibir y gestionar insumos y repuestos.
- Responsabilidad: actualizar estado de cada repuesto a medida que llegan.
- Pain point principal: no saber qué repuestos están pendientes para qué vehículo.

**Administración**
- Perfil: área administrativa del taller.
- Responsabilidad: control de costos y adicionales para facturación.
- Pain point principal: no tener visibilidad de lo que se hizo vs lo que se cotizó.

**Jefe / Dueño del taller**
- Perfil: dueño o gerente. Visión global del negocio.
- Responsabilidad: supervisión general, gestión de usuarios.
- Pain point principal: no saber qué está pasando en el taller sin preguntar.

### 4.2 Matriz de permisos por módulo

| Módulo | Jefe | Supervisor | Técnico | Bodega | Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| Gestionar usuarios | ✅ | ❌ | ❌ | ❌ | ❌ |
| Registrar vehículo | ✅ | ✅ | ❌ | ❌ | ❌ |
| Crear / gestionar OT | ✅ | ✅ | parcial | ❌ | ❌ |
| Cargar IT y STP | ✅ | ✅ | ❌ | ❌ | ❌ |
| Registrar tareas adicionales | ✅ | ✅ | ✅ | ❌ | ❌ |
| Gestionar repuestos | ✅ | ✅ | 👁️ | ✅ | 👁️ |
| Ver costos de adicionales | ✅ | ✅ | ❌ | ❌ | ✅ |
| Dashboard completo | ✅ | ✅ | ❌ | parcial | ✅ |
| Anular OT | ✅ | ✅ | ❌ | ❌ | ❌ |

> ✅ acceso completo · 👁️ solo lectura · parcial = acceso restringido según estado · ❌ sin acceso

**Detalle de acceso parcial — Técnico en OT:**  
Puede cambiar estado solo en las transiciones: `En evaluación interna → En ejecución → Listo para entrega`.

**Detalle de acceso parcial — Bodega en dashboard:**  
Solo tiene acceso a la vista de repuestos pendientes.

---

## 6. Requerimientos funcionales

### RF-01 · Autenticación y sesión

| ID | Requerimiento |
|---|---|
| RF-01.1 | El sistema permite login con email y contraseña. |
| RF-01.2 | Las sesiones se gestionan con JWT. El token expira en 8 horas. Existe refresh token de 7 días. |
| RF-01.3 | Cada usuario pertenece a exactamente un taller (`id_taller`). |
| RF-01.4 | El rol del usuario determina qué rutas y acciones están disponibles. El backend verifica el rol en cada request. |
| RF-01.5 | El Jefe puede crear, editar y desactivar usuarios de su taller. No puede eliminar usuarios con registros asociados. |

---

### RF-02 · Gestión de vehículos

| ID | Requerimiento |
|---|---|
| RF-02.1 | El supervisor puede crear un vehículo con los campos: marca, modelo, número de serie, cliente / minera y sucursal. |
| RF-02.2 | El número de serie es único por taller. El sistema rechaza duplicados con mensaje de error claro. |
| RF-02.3 | Antes de crear un vehículo nuevo, el sistema permite buscarlo por número de serie para evitar duplicados. |
| RF-02.4 | La ficha del vehículo muestra el historial de todas las OTs asociadas en orden cronológico descendente. |
| RF-02.5 | Un vehículo no puede eliminarse si tiene OTs asociadas. Solo se puede desactivar. |

---

### RF-03 · Gestión de OT

| ID | Requerimiento |
|---|---|
| RF-03.1 | Al ingresar un vehículo, el supervisor crea una OT. El sistema asigna número correlativo único por taller (formato `OT-YYYY-NNN`). |
| RF-03.2 | No puede existir más de una OT activa para el mismo vehículo. "Activa" = cualquier estado distinto a `Entregado` o `Anulada`. |
| RF-03.3 | Los datos de creación de la OT son: vehículo, fecha de ingreso, horómetro de ingreso y técnico asignado (opcional). |
| RF-03.4 | El estado inicial de toda OT es `Ingresado`. |
| RF-03.5 | Los estados solo avanzan. Las únicas transiciones válidas son las definidas en la tabla de estados (ver sección 5). |
| RF-03.6 | Cada cambio de estado genera un registro en `LogEstadoOT` con: tipo de evento, estados anterior y nuevo, fecha exacta, usuario y comentario. |
| RF-03.7 | El campo comentario es obligatorio cuando el estado nuevo es `Anulada`. El backend rechaza la petición si viene vacío. |
| RF-03.8 | Al entregar el vehículo (`Entregado`), el supervisor registra: horómetro de salida, fecha y hora de entrega, y nombre de quien retira. |
| RF-03.9 | Una OT anulada no puede reactivarse. |

**Tabla de transiciones válidas:**

| Estado actual | Estados siguientes válidos |
|---|---|
| Ingresado | En espera evaluación externa · Anulada |
| En espera evaluación externa | Evaluación externa en curso · Anulada |
| Evaluación externa en curso | IT recibido · Anulada |
| IT recibido | En evaluación interna · Anulada |
| En evaluación interna | En ejecución · Anulada |
| En ejecución | Listo para entrega · Anulada |
| Listo para entrega | Entregado · Anulada |
| Entregado | — (estado final) |
| Anulada | — (estado final) |

---

### RF-04 · IT y STP

| ID | Requerimiento |
|---|---|
| RF-04.1 | El supervisor puede adjuntar el archivo IT (PDF o Excel, máx. 20 MB) a la OT. El archivo se almacena en S3. |
| RF-04.2 | El supervisor registra el encabezado del IT: fecha de evaluación, nombre del evaluador Komatsu, horómetro leído y observaciones generales. |
| RF-04.3 | El supervisor registra cada tarea del STP manualmente. Campos por tarea: número de tarea, componente, descripción, si requiere repuesto (bool), tipo de repuesto (condicional) y cantidad (condicional). |
| RF-04.4 | Si una tarea tiene `requiere_repuesto = true`, los campos tipo y cantidad son obligatorios. Al guardar la tarea, el sistema crea automáticamente un ítem de repuesto en estado `Pendiente` vinculado a la OT. |
| RF-04.5 | Las tareas del STP no pueden editarse una vez registradas. Solo se puede agregar tareas nuevas (que serán `TareaAdicional`). |
| RF-04.6 | Una OT puede tener exactamente un IT registrado. |

---

### RF-05 · Gestión de repuestos

| ID | Requerimiento |
|---|---|
| RF-05.1 | Los repuestos se crean automáticamente desde las tareas IT (ver RF-04.4) o manualmente por el supervisor / bodega. |
| RF-05.2 | Campos de cada repuesto: descripción, cantidad, unidad, origen (`KOMATSU` / `TALLER`), estado, fecha estimada, costo unitario. |
| RF-05.3 | El campo `costo_unitario` es obligatorio para repuestos con `origen = TALLER`. |
| RF-05.4 | Los estados válidos de un repuesto son: `Pendiente → En espera → En tránsito → Recibido`. |
| RF-05.5 | Al marcar un repuesto como `Recibido`, el sistema registra automáticamente la fecha y hora de recepción y el usuario que realizó el cambio. |
| RF-05.6 | Bodega puede actualizar el estado de cualquier repuesto de cualquier OT activa. |
| RF-05.7 | Cada cambio de estado de un repuesto genera un registro en `LogEstadoOT` con `tipo_evento = REPUESTO_RECIBIDO`. |
| RF-05.8 | Se pueden agregar repuestos manualmente a una OT (fuera del STP) mientras la OT esté en estado activo (no `Listo para entrega`, `Entregado` ni `Anulada`). |

---

### RF-06 · Tareas adicionales

| ID | Requerimiento |
|---|---|
| RF-06.1 | El técnico o supervisor puede registrar tareas adicionales en OTs en estado `En evaluación interna`, `En ejecución` o `Listo para entrega`. |
| RF-06.2 | Campos de cada tarea adicional: descripción (obligatorio), componente, tipo de trabajo, momento de registro (`EVALUACION_INTERNA` / `DURANTE_EJECUCION`), insumos (texto libre), costo (obligatorio). |
| RF-06.3 | El campo `momento_registro` se selecciona manualmente — refleja cuándo se identificó el trabajo, no cuándo se registró. |
| RF-06.4 | Las tareas adicionales no pueden registrarse en OTs en estado `Entregado` o `Anulada`. |
| RF-06.5 | Cada tarea adicional registrada genera un evento en `LogEstadoOT` con `tipo_evento = TAREA_ADICIONAL`. |
| RF-06.6 | Las tareas adicionales pueden editarse mientras la OT no esté en estado `Entregado` o `Anulada`. Solo el usuario que la creó o el supervisor / jefe pueden editarla. |

---

### RF-07 · Dashboard

| ID | Requerimiento |
|---|---|
| RF-07.1 | **Vista 1 — OTs activas:** lista todas las OTs en estado distinto a `Entregado` y `Anulada`. Columnas: número OT, vehículo, estado actual, días en taller, técnico asignado, repuestos pendientes (conteo), tareas adicionales (conteo). |
| RF-07.2 | Vista 1 permite filtrar por: estado, técnico asignado. Muestra alerta visual (color) en OTs con más de N días en taller (N configurable por el jefe). |
| RF-07.3 | **Vista 2 — Repuestos pendientes:** lista todos los repuestos en estado `Pendiente`, `En espera` o `En tránsito`, agrupados por OT. Columnas: OT, vehículo, descripción, origen, estado, fecha estimada, días de espera. |
| RF-07.4 | Vista 2 muestra alerta visual para repuestos con fecha estimada vencida o sin fecha asignada. Desde esta vista Bodega puede actualizar el estado del repuesto directamente. |
| RF-07.5 | **Vista 3 — Historial de OT:** log cronológico completo de todos los eventos de una OT seleccionada. Columnas: fecha/hora, tipo de evento, descripción, usuario. No editable. |
| RF-07.6 | El acceso al dashboard respeta los roles: Bodega solo ve Vista 2. Técnico no tiene acceso al dashboard. El resto ve las tres vistas. |

---

### RF-08 · Log y auditoría

| ID | Requerimiento |
|---|---|
| RF-08.1 | La tabla `LogEstadoOT` registra todos los eventos de una OT: cambios de estado, carga de IT, recepción de repuestos, registro de tareas adicionales. |
| RF-08.2 | Los registros de log son inmutables. El backend no expone endpoints de UPDATE ni DELETE sobre esta tabla. |
| RF-08.3 | Cada registro incluye: `id_ot`, `tipo_evento`, `estado_anterior`, `estado_nuevo`, `descripcion_evento`, `fecha_evento` (timestamp con timezone), `usuario_id` y `comentario`. |
| RF-08.4 | El historial de una OT es visible para todos los roles excepto Técnico (que solo ve las OTs de su taller). |

---

## 7. Requerimientos no funcionales

| ID | Categoría | Requerimiento |
|---|---|---|
| RNF-01 | Disponibilidad | El sistema debe tener disponibilidad del 99% en horario laboral (lunes a sábado, 7:00–20:00 hora Chile). |
| RNF-02 | Rendimiento | Las páginas principales (dashboard, detalle OT) deben cargar en menos de 3 segundos con conexión de 10 Mbps. |
| RNF-03 | Seguridad | Toda comunicación debe ser sobre HTTPS. Las contraseñas se almacenan con bcrypt (cost factor ≥ 12). |
| RNF-04 | Multi-tenancy | Ningún usuario puede ver ni modificar datos de otro taller. El filtro por `id_taller` se aplica en el backend en cada query, nunca solo en el frontend. |
| RNF-05 | Almacenamiento | El sistema está diseñado para volumen alto de registros de log y trazabilidad. No se purgan registros históricos en v1.0. |
| RNF-06 | Usabilidad | La interfaz debe ser operable en tablet y desktop. No se requiere app móvil nativa en v1.0. |
| RNF-07 | Navegadores | Compatible con Chrome y Edge en sus dos últimas versiones. |
| RNF-08 | Archivos | Los archivos IT adjuntos tienen un límite de 20 MB por archivo. Formatos aceptados: PDF, XLS, XLSX. |
| RNF-09 | Escalabilidad | La arquitectura debe soportar al menos 20 talleres concurrentes sin cambios estructurales (solo upgrade de instancia). |
| RNF-10 | Backups | La base de datos debe tener backup automático diario con retención de 30 días. |

---

## 8. Modelo de datos

### Diagrama de relaciones (simplificado)

```
Taller
  └── Usuario (N)
  └── Vehiculo (N)
        └── OrdenTrabajo (N — una activa a la vez)
              ├── InformeTecnico (1)
              │     └── TareaIT (N)
              ├── Repuesto (N)
              ├── TareaAdicional (N)
              └── LogEstadoOT (N — inmutable)
```

### 8.1 Taller

```sql
Table taller {
  id             UUID        [pk]
  nombre         VARCHAR(200) [not null]
  rut            VARCHAR(20)
  direccion      VARCHAR(300)
  activo         BOOLEAN     [default: true]
  creado_en      TIMESTAMP   [default: now()]
}
```

### 8.2 Usuario

```sql
Table usuario {
  id             UUID        [pk]
  id_taller      UUID        [ref: > taller.id, not null]
  nombre         VARCHAR(200) [not null]
  email          VARCHAR(200) [unique, not null]
  password_hash  VARCHAR(300) [not null]
  rol            ENUM('JEFE','SUPERVISOR','TECNICO','BODEGA','ADMIN') [not null]
  activo         BOOLEAN     [default: true]
  creado_en      TIMESTAMP   [default: now()]
}
```

### 8.3 Vehiculo

```sql
Table vehiculo {
  id             UUID        [pk]
  id_taller      UUID        [ref: > taller.id, not null]
  marca          VARCHAR(100) [not null]
  modelo         VARCHAR(100) [not null]
  numero_serie   VARCHAR(100) [not null]
  cliente        VARCHAR(200) [not null]
  sucursal       VARCHAR(200) [not null]
  notas          TEXT
  activo         BOOLEAN     [default: true]
  creado_en      TIMESTAMP   [default: now()]

  Indexes {
    (id_taller, numero_serie) [unique]
    (id_taller)
  }
}
```

### 8.4 OrdenTrabajo

```sql
Table orden_trabajo {
  id                 UUID        [pk]
  id_taller          UUID        [ref: > taller.id, not null]
  numero_ot          VARCHAR(20) [not null]
  id_vehiculo        UUID        [ref: > vehiculo.id, not null]
  estado             ENUM('INGRESADO','EN_ESPERA_EVAL_EXTERNA','EVALUACION_EXTERNA_EN_CURSO',
                          'IT_RECIBIDO','EN_EVALUACION_INTERNA','EN_EJECUCION',
                          'LISTO_PARA_ENTREGA','ENTREGADO','ANULADA') [not null]
  fecha_ingreso      TIMESTAMP   [not null]
  horometro_ingreso  INTEGER     [not null]
  horometro_salida   INTEGER
  fecha_entrega      TIMESTAMP
  receptor_nombre    VARCHAR(200)
  id_tecnico         UUID        [ref: > usuario.id]
  creado_por         UUID        [ref: > usuario.id, not null]
  creado_en          TIMESTAMP   [default: now()]

  Indexes {
    (id_taller, numero_ot) [unique]
    (id_taller, estado)
    (id_vehiculo)
  }
}
```

### 8.5 InformeTecnico

```sql
Table informe_tecnico {
  id                 UUID        [pk]
  id_ot              UUID        [ref: > orden_trabajo.id, unique, not null]
  fecha_evaluacion   DATE        [not null]
  nombre_evaluador   VARCHAR(200) [not null]
  horometro_lectura  INTEGER     [not null]
  observaciones      TEXT
  archivo_url        VARCHAR(500)
  creado_por         UUID        [ref: > usuario.id, not null]
  creado_en          TIMESTAMP   [default: now()]
}
```

### 8.6 TareaIT

```sql
Table tarea_it {
  id                 UUID        [pk]
  id_it              UUID        [ref: > informe_tecnico.id, not null]
  numero_tarea       INTEGER     [not null]
  componente         VARCHAR(200) [not null]
  descripcion        TEXT        [not null]
  requiere_repuesto  BOOLEAN     [default: false]
  tipo_repuesto      VARCHAR(200)
  cantidad           DECIMAL(10,2)

  Indexes {
    (id_it, numero_tarea) [unique]
  }
}
```

### 8.7 Repuesto

```sql
Table repuesto {
  id                 UUID        [pk]
  id_ot              UUID        [ref: > orden_trabajo.id, not null]
  descripcion        VARCHAR(300) [not null]
  cantidad           DECIMAL(10,2) [not null]
  unidad             VARCHAR(50) [not null]
  origen             ENUM('KOMATSU','TALLER') [not null]
  estado             ENUM('PENDIENTE','EN_ESPERA','EN_TRANSITO','RECIBIDO') [default: 'PENDIENTE']
  fecha_estimada     DATE
  fecha_recepcion    TIMESTAMP
  costo_unitario     DECIMAL(12,2)
  recibido_por       UUID        [ref: > usuario.id]
  creado_por         UUID        [ref: > usuario.id, not null]
  creado_en          TIMESTAMP   [default: now()]

  Indexes {
    (id_ot, estado)
    (id_ot)
  }

  -- Constraint: costo_unitario NOT NULL cuando origen = 'TALLER'
  -- Implementado a nivel de servicio NestJS
}
```

### 8.8 TareaAdicional

```sql
Table tarea_adicional {
  id                 UUID        [pk]
  id_ot              UUID        [ref: > orden_trabajo.id, not null]
  descripcion        TEXT        [not null]
  componente         VARCHAR(200)
  tipo_trabajo       VARCHAR(100)
  momento_registro   ENUM('EVALUACION_INTERNA','DURANTE_EJECUCION') [not null]
  insumos            TEXT
  costo              DECIMAL(12,2) [not null]
  registrado_por     UUID        [ref: > usuario.id, not null]
  registrado_en      TIMESTAMP   [default: now()]

  Indexes {
    (id_ot, registrado_en)
  }
}
```

### 8.9 LogEstadoOT

```sql
Table log_estado_ot {
  id                 UUID        [pk]
  id_ot              UUID        [ref: > orden_trabajo.id, not null]
  tipo_evento        ENUM('CAMBIO_ESTADO','IT_CARGADO','REPUESTO_RECIBIDO','TAREA_ADICIONAL') [not null]
  estado_anterior    ENUM(...)   -- mismo enum que orden_trabajo.estado, nullable
  estado_nuevo       ENUM(...)   -- nullable (para eventos que no cambian estado)
  descripcion_evento TEXT        [not null]
  fecha_evento       TIMESTAMP   [not null, default: now()]
  usuario_id         UUID        [ref: > usuario.id, not null]
  comentario         TEXT        -- obligatorio cuando estado_nuevo = 'ANULADA'

  Indexes {
    (id_ot, fecha_evento DESC)
    (id_ot)
  }

  -- Sin UPDATE ni DELETE. Solo INSERT.
}
```

---

## 9. Arquitectura técnica

### 9.1 Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | Next.js + App Router | 14.x |
| Estilos | TailwindCSS + shadcn/ui | latest |
| Backend | NestJS + TypeScript | 10.x |
| ORM | Prisma | 5.x |
| Base de datos | PostgreSQL | 15.x |
| Almacenamiento archivos | AWS S3 Standard | — |
| Autenticación | JWT + bcrypt | — |
| Deploy frontend | Vercel | — |
| Deploy backend + DB | Railway | — |

### 9.2 Estructura de carpetas (monorepo)

```
workshop-manager/
├── apps/
│   ├── web/                        # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/             # login, recuperar contraseña
│   │   │   ├── (dashboard)/        # layout autenticado
│   │   │   │   ├── dashboard/      # vistas del dashboard
│   │   │   │   ├── vehiculos/      # lista y ficha de vehículos
│   │   │   │   ├── ots/            # lista y detalle de OTs
│   │   │   │   └── usuarios/       # gestión de usuarios (jefe)
│   │   │   └── layout.tsx
│   │   └── components/
│   └── api/                        # NestJS backend
│       └── src/
│           ├── auth/               # AuthModule — JWT, guards, decorators
│           ├── vehiculos/          # VehiculoModule
│           ├── ordenes/            # OrdenTrabajoModule
│           ├── informes/           # InformeTecnicoModule + TareaITModule
│           ├── repuestos/          # RepuestoModule
│           ├── adicionales/        # TareaAdicionalModule
│           ├── log/                # LogEstadoOTModule (solo lectura desde fuera)
│           ├── dashboard/          # DashboardModule (queries agregadas)
│           ├── usuarios/           # UsuarioModule
│           └── storage/            # StorageModule — S3 presigned URLs
├── packages/
│   └── types/                      # tipos compartidos frontend/backend
├── prisma/
│   └── schema.prisma
└── package.json
```

### 9.3 Patrones de implementación

**Multi-tenancy:**  
Cada request autenticado lleva el `id_taller` en el JWT payload. Un decorator `@CurrentTaller()` lo extrae y cada servicio lo recibe como parámetro obligatorio. Ninguna query se ejecuta sin el filtro de taller.

```typescript
// Ejemplo en servicio
async findAllActivas(idTaller: string): Promise<OrdenTrabajo[]> {
  return this.prisma.ordenTrabajo.findMany({
    where: {
      id_taller: idTaller,  // siempre presente
      estado: { notIn: ['ENTREGADO', 'ANULADA'] },
    },
    orderBy: { fecha_ingreso: 'desc' },
  });
}
```

**Guards de rol:**

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERVISOR', 'JEFE')
@Post('ots')
async crearOT(@CurrentTaller() idTaller: string, @Body() dto: CreateOTDto) { ... }
```

**Log inmutable — solo INSERT desde servicio interno:**

```typescript
// LogService — solo expone este método
async registrarEvento(evento: CreateLogEventoDto): Promise<void> {
  await this.prisma.logEstadoOt.create({ data: evento });
  // Sin update(), sin delete(), sin upsert()
}
```

**Upload de archivos IT:**  
El backend genera una PUT presigned URL de S3 con expiración de 10 minutos. El frontend sube directamente a S3. El backend registra la URL resultante en la tabla `informe_tecnico`.

### 9.4 Infraestructura piloto

```
Internet
    │
    ├── Vercel (Next.js)          free → $20/mes
    │       │
    │       └── API calls ──────► Railway Web Service (NestJS)    ~$10/mes
    │                                     │
    │                                     ├── Railway PostgreSQL   ~$10/mes
    │                                     │
    │                                     └── AWS S3 (archivos IT) ~$1/mes
    │
    └── Total estimado: USD $21 – $41 / mes en piloto
```

**Migración a AWS** cuando se superen 3 talleres activos:
- EC2 `t3.small` (NestJS + Next.js en mismo servidor o separados)
- RDS `t3.micro` PostgreSQL
- S3 Standard para archivos
- Costo estimado: USD $45 – 65/mes

### 9.5 Índices críticos

```sql
-- Dashboard Vista 1: OTs activas por taller
CREATE INDEX idx_ot_taller_estado ON orden_trabajo (id_taller, estado);

-- Dashboard Vista 2: repuestos pendientes por OT
CREATE INDEX idx_repuesto_ot_estado ON repuesto (id_ot, estado);

-- Vista 3: historial por OT (más reciente primero)
CREATE INDEX idx_log_ot_fecha ON log_estado_ot (id_ot, fecha_evento DESC);

-- Búsqueda de vehículo por número de serie
CREATE UNIQUE INDEX idx_vehiculo_serie_taller ON vehiculo (id_taller, numero_serie);

-- Historial de OTs por vehículo
CREATE INDEX idx_ot_vehiculo ON orden_trabajo (id_vehiculo);

-- Tareas adicionales por OT
CREATE INDEX idx_adicional_ot ON tarea_adicional (id_ot, registrado_en);
```

---

## 10. Reglas de negocio

| ID | Regla | Validación |
|---|---|---|
| RN-01 | Una sola OT activa por vehículo. | Backend: antes de crear OT, verificar que no exista OT activa para el vehículo. |
| RN-02 | Los estados solo avanzan. Solo es válida la transición según la tabla de RF-03. | Backend: validar transición en el servicio antes de ejecutar el update. |
| RN-03 | `LogEstadoOT` es inmutable. Solo INSERT. | Backend: no exponer endpoints UPDATE/DELETE. A nivel Prisma, no generar métodos de mutación sobre esta tabla. |
| RN-04 | Comentario obligatorio al anular. | Backend: validar que `comentario` no esté vacío cuando `estado_nuevo = ANULADA`. |
| RN-05 | `costo_unitario` obligatorio si `origen = TALLER`. | Backend: validar en create y update de Repuesto. |
| RN-06 | Tareas adicionales solo en OTs activas (no `Listo para entrega`, `Entregado`, `Anulada`). | Backend: validar estado de la OT antes de insertar. |
| RN-07 | Filtro de taller en todas las queries. | Backend: decorator `@CurrentTaller()` en todos los controllers. Prohibido queries sin `where id_taller`. |
| RN-08 | Número de OT único y correlativo por taller. | Backend: usar secuencia PostgreSQL por taller para evitar colisiones en concurrencia. |
| RN-09 | Una OT tiene exactamente un IT. | Backend: verificar que no exista IT para la OT antes de crear. Unique constraint en `informe_tecnico.id_ot`. |
| RN-10 | Las tareas IT no se editan post-registro. | Backend: no exponer endpoint PUT/PATCH para `tarea_it`. |

---

## 11. Criterios de aceptación del MVP

El MVP se considera listo para producción cuando cumple **todos** los siguientes criterios:

### Funcionales

- [ ] Un supervisor puede registrar un vehículo, crear una OT y llevarla desde `Ingresado` hasta `Entregado` sin errores.
- [ ] El log de la OT muestra todos los cambios de estado con usuario y timestamp correcto.
- [ ] Bodega puede actualizar el estado de un repuesto y el cambio queda reflejado en el dashboard inmediatamente.
- [ ] Un técnico no puede ver el dashboard ni cambiar estados fuera de su rango permitido.
- [ ] No es posible crear una segunda OT activa para el mismo vehículo.
- [ ] El sistema rechaza anular una OT sin comentario.
- [ ] Al registrar una tarea IT con repuesto, el repuesto aparece automáticamente en la lista de repuestos de la OT.
- [ ] Un usuario de un taller no puede ver ni acceder a datos de otro taller bajo ninguna circunstancia.

### No funcionales

- [ ] El dashboard carga en menos de 3 segundos con 50 OTs activas y 200 repuestos pendientes.
- [ ] Las contraseñas están hasheadas con bcrypt. No se almacenan en texto plano.
- [ ] Todos los endpoints están protegidos con JWT. Un request sin token recibe 401.
- [ ] La base de datos tiene backup automático configurado con retención de 30 días.
- [ ] El sistema es operable en tablet (viewport ≥ 768px) sin scroll horizontal.

---

## 12. Roadmap

### v1.0 — MVP (actual)
**Objetivo:** registro, trazabilidad y visibilidad básica.  
Módulos: vehículos, OT con estados, IT y STP, repuestos, tareas adicionales, dashboard, roles y permisos, multi-tenancy.

### v2.0 — Cotización y cierre formal
**Objetivo:** cerrar el ciclo financiero de la mantención.  
Módulos:
- Cotización generada por el taller desde el STP, enviada a Komatsu para aprobación.
- Flujo de aprobación interno secuencial: supervisor → jefe para cierre y entrega.
- Acta de salida PDF generada automáticamente con datos de la OT y firma digital del receptor.
- Exportación de reportes en Excel y PDF (OTs, repuestos, adicionales).

**Prerequisito:** v1.0 en producción con al menos 1 taller activo durante 60 días.

### v3.0 — Calidad, facturación y comunicaciones
**Objetivo:** automatizar el control de calidad y el cobro.  
Módulos:
- Control de calidad multimedia: checklist con fotos y videos por ítem, flujo de aprobación de dos niveles.
- Facturación: consolidación de costos y generación de documento de cobro.
- Notificaciones: alertas por email y WhatsApp para cambios de estado y llegada de repuestos.
- Portal Komatsu: acceso externo limitado para aprobación de cotizaciones.

**Prerequisito:** v2.0 estable con 3+ talleres activos.

---

## 13. Fuera del alcance v1.0

Los siguientes elementos están explícitamente excluidos de la versión 1.0. Cualquier solicitud de implementación de estos ítems durante el desarrollo del MVP debe documentarse como deuda técnica o feature request para v2.0/v3.0.

| Elemento | Versión objetivo |
|---|---|
| Generación y gestión de cotizaciones | v2.0 |
| Flujo de aprobación supervisor → jefe | v2.0 |
| Acta de salida PDF automática | v2.0 |
| Exportación de reportes Excel / PDF | v2.0 |
| Control de calidad con fotos y videos | v3.0 |
| Facturación y consolidación de costos | v3.0 |
| Notificaciones por email o WhatsApp | v3.0 |
| Portal de acceso para Komatsu | v3.0 |
| App móvil nativa (iOS / Android) | Sin definir |
| Integración con ERP o sistemas contables | Sin definir |
| Firma digital de documentos | v2.0 |

---

*WorkShop Manager PRD v1.0 — Marzo 2026*  
*Documento sujeto a cambios durante el desarrollo del MVP.*
