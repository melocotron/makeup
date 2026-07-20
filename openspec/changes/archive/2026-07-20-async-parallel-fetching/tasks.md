# Tasks 012 — Async Parallelization in RSC Pages

## Pages — Promise.all (11)

- [x] `src/app/[locale]/(public)/page.tsx` — `getTranslations` agregado al Promise.all existente
- [x] `src/app/[locale]/(public)/maintenance/page.tsx` — `getTranslations` en Promise.all con `getSettings`
- [x] `src/app/[locale]/(admin)/admin/page.tsx` — 2 translators (`admin` + `common`) en Promise.all
- [x] `src/app/[locale]/(admin)/admin/services/page.tsx` — `listAllServices` + `getTranslations`
- [x] `src/app/[locale]/(admin)/admin/services/[id]/page.tsx` — `getServiceById` + `getTranslations`
- [x] `src/app/[locale]/(admin)/admin/packages/page.tsx` — `listAllPackages` + `getTranslations`
- [x] `src/app/[locale]/(admin)/admin/packages/nuevo/page.tsx` — `listAllServices` + `getTranslations`
- [x] `src/app/[locale]/(admin)/admin/profile/page.tsx` — `getAboutContent` + `getTranslations`
- [x] `src/app/[locale]/(admin)/admin/profile/credentials/page.tsx` — `listCredentials` + `getTranslations`
- [x] `src/app/[locale]/(admin)/admin/content/home/page.tsx` — `listCarouselSlides` + `getTranslations`
- [x] `src/app/[locale]/(admin)/admin/settings/page.tsx` — `getSettings` + `getTranslations`
- [x] `src/app/[locale]/(admin)/admin/appointments/[id]/page.tsx` — `getAppointmentById` + `getTranslations`

## Server queries — React.cache() (2)

- [x] `src/server/system/queries.ts` — wrappear `getSettings()` con `cache()`
- [x] `src/server/content/queries.ts` — wrappear `getAboutContent()` con `cache()`

## Verificación

- [x] `npx tsc --noEmit` sin errores
- [x] Las 13 rutas afectadas siguen devolviendo 200
- [x] Inspección manual: cada Promise.all mantiene el orden esperado
