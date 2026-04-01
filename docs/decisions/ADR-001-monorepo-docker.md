# ADR-001: Monorepo con pnpm workspaces y Docker solo para infraestructura

**Fecha:** 2026-04-01
**Estado:** Aceptado

## Contexto

El proyecto WorkShop Manager tiene dos aplicaciones (NestJS API + Next.js frontend) que comparten tipos TypeScript. Se necesita una estrategia de organización del repositorio y de gestión de dependencias de infraestructura (PostgreSQL).

## Decisión

### Monorepo con pnpm workspaces

Organización:
```
apps/api    ← NestJS
apps/web    ← Next.js
packages/shared ← tipos compartidos (futuro)
```

**Por qué pnpm y no npm workspaces:**
- Evita duplicación de node_modules mediante hard links
- `pnpm --filter api dev` ejecuta scripts en un solo workspace
- Compatible nativamente con Vercel (web) y Railway (api)
- Significativamente más rápido que npm en installs repetidos

### Docker solo para PostgreSQL (no para las apps)

`docker-compose.yml` contiene únicamente:
- `postgres:15-alpine` en puerto 5432
- `adminer` en puerto 8080 (UI de inspección de DB)

NestJS y Next.js corren directamente en el host con `pnpm dev`.

**Por qué no dockerizar las apps:**
- En Windows, los bind mounts de Docker tienen overhead significativo de I/O que degrada el hot-reload
- El DX (Developer Experience) es mucho mejor corriendo Node.js nativo
- PostgreSQL no tiene hot-reload, por eso sí va en Docker
- La paridad dev/prod se mantiene a nivel de configuración (variables de entorno), no de contenedor

## Consecuencias

**Positivas:**
- Hot-reload instantáneo en ambas apps
- Adminer disponible para inspección visual de la DB sin herramientas externas
- Un solo `docker compose up -d` y la infraestructura está lista

**Negativas:**
- Requiere Node.js ≥20 instalado en el host (no solo Docker)
- pnpm debe instalarse globalmente: `npm install -g pnpm`

## Cómo instalar Node.js y pnpm

```bash
# Descargar Node.js 20 LTS desde https://nodejs.org
# Luego:
npm install -g pnpm@latest
pnpm --version  # verificar
```
