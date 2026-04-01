# API Design — WorkShop Manager v1.0

## Base URL

- **Desarrollo:** `http://localhost:3001/api/v1`
- **Producción:** `https://api.workshopmanager.app/api/v1`
- **Swagger:** `http://localhost:3001/api/docs`

## Autenticación

Todos los endpoints (excepto `/auth/login`) requieren:
```
Authorization: Bearer <access_token>
```

El JWT payload contiene:
```json
{
  "sub": "userId",
  "email": "user@taller.com",
  "rol": "SUPERVISOR",
  "idTaller": "tallerId",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Convenciones

- **Formato de respuesta exitosa:** `{ data: T, message?: string }`
- **Formato de error:** `{ statusCode, message, error }`
- **Fechas:** ISO 8601 UTC en la API, conversión a America/Santiago en el frontend
- **IDs:** cuid (string)
- **Paginación:** `?page=1&limit=20` (implementar a partir de Fase 6)

## Multi-tenancy

**REGLA DE ORO:** El `id_taller` siempre viene del JWT, nunca del body o query string. El decorator `@CurrentTaller()` lo inyecta en cada handler.

```typescript
// Ejemplo de uso en controller
@Get()
findAll(@CurrentTaller() idTaller: string) {
  return this.vehiculosService.findAll(idTaller);
}
```

## Tabla de endpoints por módulo

### Auth (`/auth`)
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`

### Usuarios (`/users`)
- `POST /users` — solo JEFE
- `GET /users` — JEFE, SUPERVISOR
- `PATCH /users/:id` — solo JEFE

### Vehículos (`/vehiculos`)
- `POST /vehiculos`
- `GET /vehiculos`
- `GET /vehiculos/:id`
- `PATCH /vehiculos/:id`

### Órdenes de Trabajo (`/ordenes`)
- `POST /ordenes`
- `GET /ordenes`
- `GET /ordenes/:id`
- `PATCH /ordenes/:id/estado`
- `PATCH /ordenes/:id/entrega`

### Informe Técnico (`/ordenes/:idOT/it`)
- `GET /ordenes/:idOT/it/presigned-url`
- `POST /ordenes/:idOT/it`
- `GET /ordenes/:idOT/it`
- `POST /ordenes/:idOT/it/tareas`

### Repuestos (`/repuestos`, `/ordenes/:idOT/repuestos`)
- `POST /ordenes/:idOT/repuestos`
- `GET /ordenes/:idOT/repuestos`
- `PATCH /repuestos/:id/estado` — solo BODEGA
- `GET /repuestos/pendientes`

### Tareas Adicionales (`/ordenes/:idOT/tareas-adicionales`)
- `POST /ordenes/:idOT/tareas-adicionales`
- `GET /ordenes/:idOT/tareas-adicionales`
- `PATCH /tareas-adicionales/:id`

### Dashboard (`/dashboard`)
- `GET /dashboard/ots-activas`
- `GET /dashboard/repuestos-pendientes`
- `GET /dashboard/historial`
- `GET /ordenes/:idOT/log`
