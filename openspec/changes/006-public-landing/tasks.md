# Tasks 006 — Landing Pública Dinámica

## OpenSpec

- [x] Crear change folder con proposal/design/tasks
- [x] Crear specs/public/spec.md (delta)

## Backend — Queries

- [x] Crear `src/server/content/carousel.queries.ts` con `listActiveCarouselSlides()` (separa queries de actions según convención del proyecto)
- [x] Verificar `getSettings()` exporta el singleton (`src/server/system/queries.ts` — `maintenanceMode`, `maintenanceMessage`)

## Layout público

- [x] `src/app/[locale]/(public)/layout.tsx` (wrapper PublicHeader + Footer + redirect a maintenance si `maintenanceMode`)

## Componentes públicos

- [x] `src/components/public/public-nav.tsx` (navbar mobile con hamburger)
- [x] `src/components/public/public-chrome.tsx` (PublicHeader + PublicFooter)
- [x] `src/components/public/service-card.tsx` (card para grid)
- [x] `src/components/public/package-card.tsx` (card para grid)
- [x] `src/components/public/about-section.tsx` (sección sobre mí)
- [x] `src/components/public/empty-state.tsx` (estado vacío reutilizable)

## Landing page

- [x] `src/app/[locale]/(public)/page.tsx`:
  - [x] Hero con título + CTA
  - [x] Sección Servicios (grid de ServiceCard, empty state si 0)
  - [x] Sección Paquetes (grid de PackageCard, empty state si 0)
  - [x] Sección Sobre mí (AboutSection)
  - [x] Carrusel (placeholder `#booking` — carrusel dinámico llega en fase de contenido)

## Página de mantenimiento

- [x] `src/app/[locale]/(public)/maintenance/page.tsx`
- [x] Renderiza mensaje desde `settings.maintenanceMessage` o fallback

## i18n

- [x] Namespaces `home.*`, `services.*`, `packages.*`, `maintenance.*` en `es.json`
- [x] Mismos keys en `en.json`

## Verificación

- [x] `npm run typecheck` pasa
- [x] `npm run build` compila
- [x] `npm run lint` (solo warnings preexistentes de unused imports fuera del scope)
- [x] Manual (server-side via `Invoke-WebRequest`):
  - [x] `/es` muestra navbar, hero, servicios desde DB (2 cards), paquetes (empty state), sobre mí con bio + signature
  - [x] `/en` renderiza en inglés (Services, Packages, About, Book now)
  - [x] Activar maintenance → `/es` redirige 307 a `/es/maintenance` con mensaje custom
  - [x] Admin sigue accesible con maintenance activo (`/es/admin/login` → 200)
- [ ] Manual (cliente — requiere browser):
  - [ ] Toggle theme persiste entre admin y pública
  - [ ] Language switcher funciona (cambia URL `/es` ↔ `/en`)

## Commit final

- [ ] `refactor(content): split carousel into queries and actions`
- [ ] `chore(openspec): archive change 006-public-landing`
