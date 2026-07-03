# Tasks 001 — Foundation

## Setup del repo

- [ ] Inicializar Git (`git init`, `.gitignore`)
- [ ] Crear `README.md` con instrucciones de setup
- [ ] Primer commit: "chore: initial repo setup"

## OpenSpec

- [x] Crear `openspec.json` con config del proyecto
- [x] Crear `openspec/README.md` con guía de uso
- [x] Crear `changes/001-foundation/{proposal,design,tasks}.md`
- [x] Crear spec viva `specs/design-system/spec.md`

## Proyecto Next.js

- [ ] Scaffold con `npx create-next-app@latest`
  - TypeScript: sí
  - ESLint: sí
  - Tailwind: sí (v4)
  - src/ directory: sí
  - App Router: sí
  - Turbopack: sí
  - Import alias: `@/*`
- [ ] Verificar que `npm run dev` arranca

## Dependencias core

- [ ] `prisma` + `@prisma/client`
- [ ] `next-auth@beta` (v5)
- [ ] `next-intl`
- [ ] `next-themes`
- [ ] `tailwindcss-animate` (para shadcn)
- [ ] `class-variance-authority` (cva)
- [ ] `clsx` + `tailwind-merge`
- [ ] `lucide-react`
- [ ] `zod`
- [ ] `react-hook-form` + `@hookform/resolvers`

## Dependencias para fases futuras (instalar ya)

- [ ] `bcrypt` + `@types/bcrypt`
- [ ] `nodemailer` + `@types/nodemailer`
- [ ] `@react-email/components` + `react-email`
- [ ] `@tiptap/react` + extensiones (`@tiptap/starter-kit`, link, image)
- [ ] `embla-carousel-react`
- [ ] `@tanstack/react-table`
- [ ] `react-day-picker` + `date-fns`
- [ ] `react-big-calendar`
- [ ] `recharts`
- [ ] `sonner` (toasts)
- [ ] `sharp` (imágenes)

## shadcn/ui

- [ ] `npx shadcn@latest init` (con TS, New York style, slate base, CSS variables)
- [ ] Componentes base a agregar (primera tanda):
  - [ ] `button`
  - [ ] `input`
  - [ ] `label`
  - [ ] `textarea`
  - [ ] `card`
  - [ ] `badge`
  - [ ] `dialog`
  - [ ] `sheet` (drawer)
  - [ ] `dropdown-menu`
  - [ ] `select`
  - [ ] `popover`
  - [ ] `tabs`
  - [ ] `table`
  - [ ] `tooltip`
  - [ ] `toast` (o sonner)
  - [ ] `form`
  - [ ] `switch`
  - [ ] `checkbox`
  - [ ] `radio-group`
  - [ ] `slider`
  - [ ] `separator`
  - [ ] `avatar`
  - [ ] `command` (search)
  - [ ] `breadcrumb`
  - [ ] `sidebar` (shadcn nuevo)
  - [ ] `calendar`
  - [ ] `skeleton`

## Design tokens

- [ ] Configurar `tailwind.config.ts` con:
  - Paleta completa del design system (colors extendidos)
  - Tipografía dual (Inter + Playfair Display)
  - Spacing custom (xs, sm, md, lg, xl, xxl, 3xl)
  - Border radius custom
  - Box shadow suave (Level 2)
- [ ] Configurar CSS variables en `globals.css` para temas
- [ ] Configurar `darkMode: 'class'` en Tailwind
- [ ] Cargar fuentes: Inter (UI), Playfair Display (headlines landing), JetBrains Mono (code)
- [ ] Crear archivo `src/styles/tokens.css` con variables

## Tema light/dark

- [ ] Instalar y configurar `next-themes` con `ThemeProvider`
- [ ] Crear `components/theme/ThemeToggle.tsx` (botón sol/luna)
- [ ] Crear `components/theme/ThemeScript.tsx` (anti-FOUC)
- [ ] Variantes en `globals.css` para dark mode

## i18n

- [ ] Instalar y configurar `next-intl`
- [ ] Crear `i18n/request.ts` con config
- [ ] Crear `middleware.ts` para routing por locale
- [ ] Reestructurar `app/` para usar `[locale]/`
- [ ] Crear `messages/es.json` con traducciones base (UI strings)
- [ ] Crear `messages/en.json` con traducciones base
- [ ] Crear `<LanguageSwitcher />` component
- [ ] Tipar `Locale` enum

## Base de datos

- [ ] Crear `docker-compose.dev.yml` con MySQL 8 + phpMyAdmin
- [ ] Crear `.env.example` con `DATABASE_URL`
- [ ] Crear `.env` local (gitignored)
- [ ] Inicializar Prisma: `npx prisma init --datasource-provider mysql`
- [ ] Crear `prisma/schema.prisma` con modelos iniciales (vacíos por ahora, solo el modelo Admin):
  - [ ] `Admin` (id, email, password, name, createdAt, updatedAt)
- [ ] Crear migración inicial: `npx prisma migrate dev --name init`
- [ ] Verificar conexión: `npx prisma studio` (en dev)
- [ ] Documentar comandos Docker en README

## Scripts npm

- [ ] `dev`: `next dev`
- [ ] `build`: `prisma generate && next build`
- [ ] `start`: `next start`
- [ ] `lint`: `next lint`
- [ ] `typecheck`: `tsc --noEmit`
- [ ] `db:up`: `docker compose -f docker-compose.dev.yml up -d`
- [ ] `db:down`: `docker compose -f docker-compose.dev.yml down`
- [ ] `db:reset`: `docker compose -f docker-compose.dev.yml down -v && npm run db:up && npx prisma migrate reset`
- [ ] `db:migrate`: `prisma migrate dev`
- [ ] `db:studio`: `prisma studio`
- [ ] `db:seed`: `prisma db seed`

## Estructura base

- [ ] Crear carpetas vacías para bounded contexts con `.gitkeep`
- [ ] Crear `src/lib/utils.ts` con helper `cn()` (clsx + tailwind-merge)
- [ ] Crear `src/types/index.ts` con tipos compartidos

## Páginas placeholder

- [ ] `app/[locale]/page.tsx` → home placeholder
- [ ] `app/[locale]/admin/page.tsx` → admin placeholder
- [ ] `app/[locale]/admin/login/page.tsx` → login placeholder
- [ ] Verificar que cada una renderiza

## Verificación final

- [ ] `npm run typecheck` pasa sin errores
- [ ] `npm run lint` pasa sin errores
- [ ] `npm run build` compila
- [ ] `npm run dev` arranca y se ve la home en `http://localhost:3000`
- [ ] Theme toggle funciona (light ↔ dark)
- [ ] Cambio de idioma funciona (`/en`)
- [ ] Docker MySQL arriba, `npx prisma studio` muestra la DB
- [ ] Commit final: "feat(foundation): initial project setup with design system, i18n, theme, db"