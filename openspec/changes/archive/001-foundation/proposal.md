# Proposal 001 — Foundation

## Why

El proyecto necesita una base sólida, mantenible y escalable que soporte todas las features futuras (auth, booking, billing, blog, etc.) sin tener que refactorizar en cada fase. Esta fase establece:

- Stack técnico definitivo
- Design system extraído de los archivos de Stitch
- Estructura de proyecto
- Configuración de entorno de desarrollo (Docker MySQL)
- Bounded contexts del backend
- i18n base (es/en)
- Tema light/dark

Sin esta base, cada feature nueva sería un caso especial y el código se volvería inmantenible en pocas semanas.

## What Changes

### Stack
- Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- Prisma + MySQL 8 (Docker en dev, Hostinger en prod)
- Auth.js v5 (admin) + magic link (clientes)
- shadcn/ui como base de componentes
- next-intl para i18n (es/en)
- Tiptap para rich text
- next-themes para light/dark
- Docker Compose para MySQL local

### Design System
- Tokens extraídos de `dashboard_system_design/DESIGN.md` y `landing/DESIGN.md`
- Paleta Material 3 (indigo primary, slate surfaces)
- Tipografía dual: Inter (admin) + Playfair Display (landing headlines)
- Border radius suave (sm 4px → xl 12px)
- Sin sombras pesadas (tonal layers + borders)

### Estructura
- Monorepo single-project (frontend + backend en Next.js)
- Bounded contexts en `/src/server/<context>/`
- OpenSpec para SDD en `/openspec/`

### Entorno
- Docker Compose con MySQL 8 + phpMyAdmin
- Variables de entorno tipadas con Zod
- Scripts npm estandarizados (dev, build, lint, typecheck, db:*)

## Impact

- **Áreas afectadas**: `design-system`, `auth` (estructura), `admin` (estructura), `public` (estructura), `system` (settings)
- **Archivos nuevos**: ~25 (configs, schemas, base components)
- **Líneas de código**: ~1500 (configs + scaffolding)
- **Riesgo**: BAJO. Es setup puro, no hay lógica de negocio.
- **Dependencias futuras**: este cambio es prerrequisito para 002 (auth admin), 003 (dashboard base), etc.

## Out of Scope (para fases posteriores)

- Login admin funcional (Fase 1)
- Dashboard con datos reales (Fase 1)
- Booking wizard (Fase 5)
- Blog (Fase 9)
- Todo lo que no sea scaffolding