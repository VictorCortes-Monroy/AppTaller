# Fase 7 — Frontend (Next.js 14)

**Estado:** ⏳ Pendiente

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

- [ ] Login funciona y guarda token en localStorage
- [ ] Ruta protegida sin token → redirect a /login
- [ ] TECNICO no ve sidebar de dashboard
- [ ] BODEGA no ve Vista 1 ni Vista 3
- [ ] Dashboard carga con Suspense boundaries (sin layout shift)
- [ ] Formularios muestran errores de validación inline
- [ ] Responsive en tablet (768px) — todas las vistas usables
- [ ] Chrome y Edge (últimas 2 versiones) sin errores de consola
