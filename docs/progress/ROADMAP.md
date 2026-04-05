# WorkShop Manager — Roadmap de Desarrollo

> Actualizado: 2026-04-05

## Estado general

| Fase | Descripción | Estado | Objetivo |
|------|-------------|--------|----------|
| **0** | Infraestructura (monorepo, Docker, Prisma schema) | ✅ Completado | 2026-04-01 |
| **1** | Auth y Usuarios (JWT, roles, multi-tenancy) | ✅ Completado | 2026-04-01 |
| **2** | Vehículos y Órdenes de Trabajo (state machine) | ✅ Completado | 2026-04-01 |
| **3** | Informe Técnico y Plan de Servicio (S3, STP) | ✅ Completado | 2026-04-04 |
| **4** | Repuestos (estados, flujo bodega) | ✅ Completado | 2026-04-04 |
| **5** | Tareas Adicionales (costos, trazabilidad) | ✅ Completado | 2026-04-04 |
| **6** | Dashboard y Log de Auditoría (3 vistas) | ✅ Completado | 2026-04-04 |
| **7** | Frontend (Next.js 14, App Router, shadcn/ui) | ✅ Completado | 2026-04-04 |

## Criterios de MVP completado

> Verificación ejecutada: 2026-04-05 (API end-to-end via curl)

- [x] Ciclo completo OT: Ingresado → Entregado sin errores — 9 transiciones verificadas (incl. EN_ESPERA)
- [x] Log de auditoría completo con timestamps y usuarios correctos — 9 entries con usuario, fecha y descripción
- [x] Bodega puede actualizar repuestos con reflejo inmediato en dashboard — 4 estados + dashboard reactivo
- [x] Restricciones de rol Técnico aplicadas — no crea OT (403), no cancela (422), no ve OTs de otros
- [x] Prevención de OT duplicada por vehículo — 409 Conflict con mensaje descriptivo
- [x] Cancelación requiere comentario — 400 sin comentario/vacío, OK con texto válido
- [x] Tareas STP crean repuestos automáticamente — requiereRepuesto=true crea Repuesto PENDIENTE
- [x] Acceso cross-taller bloqueado — 404 en acceso cross-tenant (OTs, vehículos, usuarios, repuestos)
- [ ] Dashboard carga <3s con 50 OTs + 200 repuestos pendientes — ~50ms con datos actuales; pendiente load test masivo
- [x] Contraseñas con bcrypt verificadas — $2b$12$ confirmado en BD, hash no expuesto en API
- [x] Todos los endpoints requieren JWT — 401 en todos sin token, login público, token inválido rechazado
- [ ] Backups automáticos con retención 30 días — pendiente configuración en producción
- [ ] Responsivo en tablet (≥768px) — pendiente verificación manual en browser
