# Tasks 004 — Perfil, Credenciales, Carrusel

## OpenSpec

- [x] Crear change folder con proposal, design, tasks
- [ ] Crear specs/content/profile.md y content/carousel.md (opcional)

## Backend — Content

- [ ] Crear `src/server/content/queries.ts` (helpers compartidos)
- [ ] Crear `src/server/content/validators.ts` (Zod schemas)
- [ ] Crear `src/server/content/profile.ts` (AboutContent action)
- [ ] Crear `src/server/content/credentials.ts` (CRUD + reorder)
- [ ] Crear `src/server/content/carousel.ts` (CRUD + toggleActive)

## Componente compartido: MediaPicker

- [ ] Crear `src/components/admin/media-picker.tsx`:
  - Botón + preview
  - Abre Dialog con MediaBrowser
  - Selección + cierre
  - Botón quitar

## Admin — Perfil

- [ ] Crear `src/app/[locale]/(admin)/admin/perfil/page.tsx`
- [ ] Crear `src/components/admin/profile-form.tsx` (RHF + Zod + MediaPicker)

## Admin — Credenciales

- [ ] Crear `src/app/[locale]/(admin)/admin/perfil/preparacion/page.tsx`
- [ ] Crear `src/components/admin/credentials-list.tsx` (tabla + botones)
- [ ] Crear `src/components/admin/credential-form-dialog.tsx` (Dialog con form)

## Admin — Carrusel

- [ ] Crear `src/app/[locale]/(admin)/admin/contenido/inicio/page.tsx`
- [ ] Crear `src/components/admin/carousel-list.tsx` (cards + acciones)
- [ ] Crear `src/components/admin/carousel-form-dialog.tsx` (Dialog con form)

## i18n

- [ ] Agregar keys de profile, credentials, carousel a es.json
- [ ] Agregar keys equivalentes a en.json

## Verificación

- [ ] `npm run typecheck` pasa
- [ ] `npm run build` compila
- [ ] Perfil: editar y guardar funciona
- [ ] Credenciales: crear, editar, eliminar funciona
- [ ] Carrusel: crear, editar, eliminar, toggle activo funciona
- [ ] MediaPicker funciona en los 3 forms

## Commit final

- [ ] `feat(content): profile + credentials + carousel`