# Fase 1 — Auth y Usuarios

**Estado:** ✅ Completado — 2026-04-01

## Objetivo
Implementar autenticación JWT con refresh tokens, sistema de roles, decorator de multi-tenancy, y gestión de usuarios.

## Módulos a crear en `apps/api/src/`

```
auth/
  auth.module.ts
  auth.controller.ts
  auth.service.ts
  strategies/
    jwt.strategy.ts
    jwt-refresh.strategy.ts
  guards/
    jwt-auth.guard.ts
    roles.guard.ts
  decorators/
    roles.decorator.ts
    current-user.decorator.ts
    current-taller.decorator.ts   ← CRÍTICO para multi-tenancy
  dto/
    login.dto.ts
    refresh-token.dto.ts
    auth-response.dto.ts

users/
  users.module.ts
  users.controller.ts
  users.service.ts
  dto/
    create-user.dto.ts
    update-user.dto.ts
    user-response.dto.ts
```

## Endpoints a implementar

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/api/v1/auth/login` | Público | Login con email/password |
| POST | `/api/v1/auth/refresh` | Refresh token | Renovar access token |
| GET | `/api/v1/auth/me` | Autenticado | Perfil del usuario actual |
| POST | `/api/v1/users` | Solo JEFE | Crear usuario en el taller |
| GET | `/api/v1/users` | JEFE, SUPERVISOR | Listar usuarios del taller |
| PATCH | `/api/v1/users/:id` | Solo JEFE | Actualizar/desactivar usuario |

## Reglas de negocio críticas

1. bcrypt con cost ≥ 12
2. Access token: 8h, Refresh token: 7d
3. `@CurrentTaller()` extrae `id_taller` del JWT — todas las queries DEBEN usar este valor
4. El JEFE solo puede gestionar usuarios de su propio taller
5. Email único por taller (no global)

## Criterios de aceptación

- [x] Login con credenciales válidas devuelve access + refresh tokens
- [x] Token expirado retorna 401 con mensaje claro
- [x] Refresh genera nuevo access token sin re-login
- [x] Endpoint de usuario con rol incorrecto retorna 403
- [x] Usuario de Taller A no puede ver usuarios de Taller B
- [x] Contraseñas no se exponen en ninguna respuesta (`USER_SELECT` excluye passwordHash)
- [x] TECNICO no puede crear usuarios (403 via `@Roles(RolUsuario.JEFE)`)
