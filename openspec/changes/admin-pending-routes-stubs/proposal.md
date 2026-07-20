# Proposal 011 — Stubs for Pending Admin Routes

## Why

The admin sidebar (`src/components/admin/sidebar.tsx`) and the dashboard's "Accesos rápidos" grid (`src/app/[locale]/(admin)/admin/page.tsx`) link to 5 routes that don't exist yet:

- `/admin/clients` (sidebar + dashboard quickAccess)
- `/admin/promotions` (sidebar + dashboard quickAccess)
- `/admin/loyalty` (sidebar)
- `/admin/blog` (sidebar + dashboard quickAccess)
- `/admin/reports` (sidebar)

When a user clicks any of these links, Next returns **404**, the URL stays visible in the address bar, and the browser console logs a `404` error. The dashboard at `/es/admin` works, but the very first user navigation attempt to a "quick access" tile like **Nuevo cliente** fails.

This is a navigation UX bug: the chrome promises functionality that does not exist, and the failure mode is silent (no friendly message, just a Next 404 page). The functionality itself (Clientes/Promociones/Fidelidad/Blog/Reportes) is intentionally deferred to later project phases (Fase 6, 7, 9, 10 per the dashboard's own progress list). It is not a refactor of the existing pages; it is a placeholder.

## What Changes

Add a server-rendered **"Próximamente"** stub page at each of the 5 missing routes. The stub uses the existing `PageHeader` and `EmptyState` admin components and a single shared i18n namespace (`admin.comingSoon`). Each page is server-only, follows the same `getTranslations` + `setRequestLocale` pattern as the rest of the admin, and identifies which roadmap phase the feature belongs to.

### Files added (5 pages)

```
src/app/[locale]/(admin)/admin/clients/page.tsx
src/app/[locale]/(admin)/admin/promotions/page.tsx
src/app/[locale]/(admin)/admin/loyalty/page.tsx
src/app/[locale]/(admin)/admin/blog/page.tsx
src/app/[locale]/(admin)/admin/reports/page.tsx
```

All five are 100% server-rendered, follow the same `getTranslations` + `setRequestLocale` pattern established in proposal 010, and differ only in the `titleKey` / `phaseKey` props passed to the placeholder.

### Visual

Each page renders:
- `<PageHeader title={t(titleKey)} description={t("comingSoon.description")} />`
- `<EmptyState icon={Construction} title={t("comingSoon.title")} description={t(phaseKey)} />`

The icon is `Construction` from `lucide-react` (same library already used by the rest of admin). The phase label makes it clear **when** the feature will be implemented (e.g. "Fase 6 — Clientes").

### i18n additions

Add `admin.comingSoon` namespace in both `messages/es.json` and `messages/en.json`:

```json
"comingSoon": {
  "title": "Próximamente",
  "description": "Esta sección estará disponible en una fase posterior del proyecto.",
  "phase": "Fase {phase} — {name}",
  "backToDashboard": "Volver al dashboard"
}
```

Plus a `phase` map (es/en) with the 5 phases:

```json
"phaseMap": {
  "clients": { "phase": 6, "name": "Clientes" },
  "promotions": { "phase": 7, "name": "Promociones, descuentos y fidelidad" },
  "loyalty": { "phase": 7, "name": "Fidelidad" },
  "blog": { "phase": 9, "name": "Blog" },
  "reports": { "phase": 10, "name": "Reportes" }
}
```

(Phases match the dashboard's `projectProgress` list.)

### Files NOT touched

- Sidebar links stay exactly as they are — they now resolve to a friendly stub instead of 404.
- Dashboard `quickAccess` grid stays exactly as it is — same reason.
- No new client components needed: `PageHeader` and `EmptyState` already exist and are server-renderable.
- No DB changes.

## Impact

- **Áreas afectadas**: `admin`
- **Archivos nuevos**: 5 `page.tsx` + 2 `messages/*.json` edits = 7
- **Archivos modificados**: 0
- **Riesgo**: MUY BAJO. Las páginas son read-only, no agregan queries, no tocan el chrome, no rompen la navegación existente.
- **Dependencias**: usa lo ya instalado.

## Out of Scope

- Implementar Clientes, Promociones, Fidelidad, Blog o Reportes de verdad (cada uno es su propio change/ADR cuando llegue su fase).
- Cambiar el dashboard `quickAccess` para mostrar solo las rutas que sí existen (preferimos stubs honestos a quitar entradas del dashboard; el usuario espera ver el roadmap completo).
- Cambiar la sidebar para filtrar entradas no implementadas.
- Agregar un layout diferente para stubs (viven dentro del shell admin normal).

## Verification

- [x] `npx tsc --noEmit` limpio
- [x] `npm run dev` y las 5 nuevas rutas devuelven 200
- [x] Click en cada link del sidebar (clients, promotions, loyalty, blog, reports) y del dashboard `quickAccess` (clients, promotions, blog) → 200, sin errores en consola del navegador
- [x] El resto de la navegación admin sigue funcionando (no se rompió nada existente)

## Rollback

Reversible con `git revert` del commit. Los 5 archivos se borran y los 2 `messages/*.json` vuelven a su estado anterior. La sidebar/dashboard siguen apuntando a las rutas; al borrarlas los links vuelven al estado 404 original.
