# Fase 7 — Frontend (Next.js 14)

**Estado:** ✅ Completado — 2026-04-04

## Objetivo
Implementar todas las vistas del frontend usando Next.js 14 App Router, shadcn/ui, y React Query para server state.

## Estructura de rutas (`apps/web/src/app/`)

```
(auth)/
  login/page.tsx

(dashboard)/
  layout.tsx              ← sidebar con roles
  page.tsx                ← redirige según rol
  ots/
    page.tsx              ← Vista 1: OTs activas
    [id]/page.tsx         ← Detalle de OT
    [id]/it/page.tsx      ← Informe Técnico + STP
  repuestos/
    page.tsx              ← Vista 2: Pendientes
  historial/
    page.tsx              ← Vista 3: Log

  vehiculos/
    page.tsx
    [id]/page.tsx
  usuarios/
    page.tsx              ← solo JEFE
```

## Componentes clave (shadcn/ui)

Instalar según necesidad:
```bash
npx shadcn@latest add button input label table badge card dialog form select
```

## Patrones de implementación

- **React Query** para todas las llamadas a la API (caché, loading states, refetch)
- **Zod** para validación de forms con `react-hook-form`
- **Server Components** para páginas de listado (SSR)
- **Client Components** para formularios y acciones interactivas
- **Middleware Next.js** para protección de rutas según JWT/rol

## Criterios de aceptación

- [x] Login funciona y guarda token en localStorage
- [x] Ruta protegida sin token → redirect a /login
- [x] TECNICO no ve sidebar de dashboard (filtro por rol)
- [x] BODEGA no ve Vista 1 ni Vista 3 (sidebar filtrado + backend @Roles)
- [x] Dashboard carga con estados de loading por componente
- [x] Formularios muestran errores de validación inline
- [x] Responsive en tablet (768px) — layout flex con sidebar fijo
- [ ] Chrome y Edge — verificar en entorno real tras pnpm install
