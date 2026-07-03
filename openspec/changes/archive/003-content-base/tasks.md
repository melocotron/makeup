# Tasks 003 — Contenido Editable Base

## OpenSpec

- [x] Crear `changes/003-content-base/{proposal,design,tasks}.md`
- [x] Crear specs para content, media, system

## Dependencias

- [ ] `sharp` (ya en package.json pero verificar install)
- [ ] `@radix-ui/react-dialog` (ya instalado)
- [ ] `@radix-ui/react-tabs` (instalar si no está)
- [ ] `@radix-ui/react-switch` (instalar si no está)

## Backend — Media

- [ ] Crear `src/server/media/upload.ts` con helper de upload (sharp + filesystem)
- [ ] Crear `src/server/media/queries.ts` (list, getById, delete, search)
- [ ] Crear `src/server/media/validators.ts` (Zod schemas)
- [ ] Crear `src/server/media/actions.ts` (Server Actions)
- [ ] Crear `src/app/api/media/upload/route.ts` (POST)
- [ ] Crear `src/app/api/media/[id]/route.ts` (DELETE)
- [ ] Validar: auth admin, MIME whitelist, max size, magic numbers
- [ ] Test: subir una imagen de prueba, verificar que se guarda

## Backend — Settings

- [ ] Crear `src/server/system/settings.ts` (queries + actions)
- [ ] Crear `src/server/system/validators.ts` (Zod schemas)
- [ ] Server Action `updateSettings()`
- [ ] Test: cambiar un setting, verificar persistencia

## Backend — Content (Perfil, Carrusel)

- [ ] Crear `src/server/content/profile.ts` (AboutContent queries/actions)
- [ ] Crear `src/server/content/credentials.ts` (Credential CRUD)
- [ ] Crear `src/server/content/carousel.ts` (HomeCarousel CRUD)
- [ ] Crear `src/server/content/validators.ts` (Zod schemas)
- [ ] Test: crear/editar/eliminar credenciales y slides

## shadcn/ui components

- [ ] Crear `src/components/ui/dialog.tsx` (si no existe)
- [ ] Crear `src/components/ui/tabs.tsx`
- [ ] Crear `src/components/ui/switch.tsx`
- [ ] Crear `src/components/ui/table.tsx` (ya debería estar)

## Admin components

- [ ] Crear `src/components/admin/media-uploader.tsx` (drag&drop + preview)
- [ ] Crear `src/components/admin/media-grid.tsx` (grid con thumbnails)
- [ ] Crear `src/components/admin/media-card.tsx` (item individual)
- [ ] Crear `src/components/admin/media-picker.tsx` (botón + dialog con biblioteca)
- [ ] Crear `src/components/admin/page-header.tsx` (título + acciones, reutilizable)
- [ ] Crear `src/components/admin/empty-state.tsx` (reutilizable)

## Admin pages

- [ ] `/admin/ajustes` — Settings con tabs
  - [ ] Tab General (sitio, idioma, políticas)
  - [ ] Tab Contacto (dirección, redes)
  - [ ] Tab Apariencia (color, logo)
  - [ ] Tab Mantenimiento (toggle)
- [ ] `/admin/perfil` — Editor de perfil
- [ ] `/admin/perfil/preparacion` — CRUD de credenciales
- [ ] `/admin/media` — Biblioteca de imágenes
- [ ] `/admin/contenido/inicio` — Carrusel del home

## Seed

- [ ] Actualizar `prisma/seed.ts` con AboutContent inicial (texto de ejemplo)

## Verificación

- [ ] `npm run typecheck` pasa
- [ ] `npm run build` compila
- [ ] Subir imagen funciona en /admin/media
- [ ] Eliminar imagen funciona
- [ ] Settings se guardan y persisten
- [ ] Crear slide de carrusel funciona
- [ ] Crear credencial funciona
- [ ] MediaPicker se puede usar en otros forms (al menos placeholder)
- [ ] Theme + lang switcher siguen funcionando

## Commit final

- [ ] `feat(content): editable base + media library`