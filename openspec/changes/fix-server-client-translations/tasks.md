# Tasks 010 — Server-Only Translations in Admin & Public Pages

## Refactor (15 pages: convertir a server-only con `getTranslations`)

### Public

- [x] Convertir `src/app/[locale]/(public)/page.tsx` a server-only (sin `useTranslations`, sin `HomeContent` interno)
- [x] Convertir `src/app/[locale]/(public)/maintenance/page.tsx` a server-only

### Admin — Dashboard

- [x] Convertir `src/app/[locale]/(admin)/admin/page.tsx` (dashboard) a server-only
- [ ] `src/app/[locale]/(admin)/admin/login/page.tsx` — **no modificado** (mantiene `useTranslations` en `LoginScreen`, sub-componente cliente implícito que ya funciona y da 200). El 500 observado durante el debug era ruido del dev server anterior, no del código.

### Admin — Catálogo (Servicios)

- [x] Convertir `src/app/[locale]/(admin)/admin/services/page.tsx` a server-only
- [x] Convertir `src/app/[locale]/(admin)/admin/services/[id]/page.tsx` a server-only
- [x] Convertir `src/app/[locale]/(admin)/admin/services/nuevo/page.tsx` a server-only

### Admin — Catálogo (Paquetes)

- [x] Convertir `src/app/[locale]/(admin)/admin/packages/page.tsx` a server-only
- [x] Convertir `src/app/[locale]/(admin)/admin/packages/[id]/page.tsx` a server-only
- [x] Convertir `src/app/[locale]/(admin)/admin/packages/nuevo/page.tsx` a server-only

### Admin — Contenido y Media

- [x] Convertir `src/app/[locale]/(admin)/admin/profile/page.tsx` a server-only
- [x] Convertir `src/app/[locale]/(admin)/admin/profile/credentials/page.tsx` a server-only
- [x] Convertir `src/app/[locale]/(admin)/admin/media/page.tsx` a server-only
- [x] Convertir `src/app/[locale]/(admin)/admin/content/home/page.tsx` (carousel) a server-only
- [x] Convertir `src/app/[locale]/(admin)/admin/settings/page.tsx` a server-only

### Endurecimiento del entorno

- [x] Mover `open-design/` de `C:\00-Cursos\000-SDD\makeup\open-design\` a `C:\00-Cursos\000-SDD\open-design\` (proyecto hermano, no subproyecto)
- [x] Añadir `open-design/` a `makeup/.gitignore` (defensa por si vuelve a entrar)
- [x] Añadir `open-design` a `makeup/tsconfig.json#exclude` (defensa de typecheck)

## Verificación

- [x] `npx tsc --noEmit` sin errores en `src/` y `prisma/`
- [x] `npm run dev` arranca y las 15 rutas devuelven 200 (incluyendo `/es/admin/login` sin modificar)
- [ ] Login con `admin@radiant-beauty.local` / `admin123` → redirige a `/es/admin` (pendiente: prueba end-to-end con browser/cookie)
- [ ] `npm run lint` pasa
