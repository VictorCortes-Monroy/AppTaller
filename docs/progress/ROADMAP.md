# WorkShop Manager — Roadmap de Desarrollo

> Actualizado: 2026-04-01

## Estado general

| Fase | Descripción | Estado | Objetivo |
|------|-------------|--------|----------|
| **0** | Infraestructura (monorepo, Docker, Prisma schema) | ✅ Completado | 2026-04-01 |
| **1** | Auth y Usuarios (JWT, roles, multi-tenancy) | ✅ Completado | 2026-04-01 |
| **2** | Vehículos y Órdenes de Trabajo (state machine) | ✅ Completado | 2026-04-01 |
| **3** | Informe Técnico y Plan de Servicio (S3, STP) | ⏳ Pendiente | — |
| **4** | Repuestos (estados, flujo bodega) | ⏳ Pendiente | — |
| **5** | Tareas Adicionales (costos, trazabilidad) | ⏳ Pendiente | — |
| **6** | Dashboard y Log de Auditoría (3 vistas) | ⏳ Pendiente | — |
| **7** | Frontend (Next.js 14, App Router, shadcn/ui) | ⏳ Pendiente | — |

## Criterios de MVP completado

- [ ] Ciclo completo OT: Ingresado → Entregado sin errores
- [ ] Log de auditoría completo con timestamps y usuarios correctos
- [ ] Bodega puede actualizar repuestos con reflejo inmediato en dashboard
- [ ] Restricciones de rol Técnico aplicadas
- [ ] Prevención de OT duplicada por vehículo
- [ ] Cancelación requiere comentario
- [ ] Tareas STP crean repuestos automáticamente
- [ ] Acceso cross-taller bloqueado
- [ ] Dashboard carga <3s con 50 OTs + 200 repuestos pendientes
- [ ] Contraseñas con bcrypt verificadas
- [ ] Todos los endpoints requieren JWT
- [ ] Backups automáticos con retención 30 días
- [ ] Responsivo en tablet (≥768px)
