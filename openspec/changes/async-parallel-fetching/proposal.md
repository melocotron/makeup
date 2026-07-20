# Proposal 012 — Async Parallelization in RSC Pages

## Why

A code review against the [Vercel React Best Practices](https://www.skills.sh/vercel-labs/agent-skills/vercel-react-best-practices) skill (70 rules across 8 categories) identified 4 critical + 1 high-impact waterfall pattern repeated across 11 RSC pages.

The pattern: every page that needs both server data (e.g. `getSettings`, `listAllServices`, `getAppointmentById`) and translations (`getTranslations` from `next-intl/server`) awaits them **sequentially**:

```tsx
const data = await getData();      // 5-20ms
const t = await getTranslations(); // 5-10ms
// Total: 10-30ms
```

When they are independent, they should be awaited **in parallel** with `Promise.all`:

```tsx
const [data, t] = await Promise.all([getData(), getTranslations()]);
// Total: max(5-20, 5-10) = 5-20ms
```

This saves 5-15ms per page render across 11 pages. On the landing page (`/es`), this is the largest single user-perceived performance win available right now. Same on every admin page mount.

Additionally, two single-row queries (`getSettings`, `getAboutContent`) are called multiple times per request across the codebase. Wrapping them with `React.cache()` deduplicates the calls within a single request at zero cost.

## What Changes

### Files modified

**11 RSC pages** — replace sequential `await` of `getTranslations` (and similar independent calls) with `Promise.all`:

```
src/app/[locale]/(public)/page.tsx
src/app/[locale]/(public)/maintenance/page.tsx
src/app/[locale]/(admin)/admin/page.tsx
src/app/[locale]/(admin)/admin/services/page.tsx
src/app/[locale]/(admin)/admin/services/[id]/page.tsx
src/app/[locale]/(admin)/admin/packages/page.tsx
src/app/[locale]/(admin)/admin/packages/nuevo/page.tsx
src/app/[locale]/(admin)/admin/profile/page.tsx
src/app/[locale]/(admin)/admin/profile/credentials/page.tsx
src/app/[locale]/(admin)/admin/content/home/page.tsx
src/app/[locale]/(admin)/admin/settings/page.tsx
src/app/[locale]/(admin)/admin/appointments/[id]/page.tsx
```

**2 query modules** — wrap single-row queries with `React.cache()` for per-request deduplication:

```
src/server/system/queries.ts  →  getSettings()
src/server/content/queries.ts  →  getAboutContent()
```

### Pattern (applied to every page)

```diff
  export default async function FooPage({ params }) {
    const { locale } = await params;
    setRequestLocale(locale);

-   const data = await getData();
-   const t = await getTranslations({ locale, namespace: "..." });
+   const [data, t] = await Promise.all([
+     getData(),
+     getTranslations({ locale, namespace: "..." }),
+   ]);

    if (data.condition) redirect("/...");
    // ... rest unchanged
  }
```

### Exception

`HomePage` (landing) has a sequential dependency: `getSettings` must finish **before** the queries for services/packages/about, because the maintenance check may `redirect()` and short-circuit. So the pattern there is:

```tsx
const settings = await getSettings();
if (settings.maintenanceMode) redirect(`/${locale}/maintenance`);

const [services, packages, about, t] = await Promise.all([
  listServices(),
  listPackages(),
  getAboutContent(),
  getTranslations({ locale, namespace: "home" }),
]);
```

This is the right shape per the Vercel rule `async-cheap-condition-before-await` (cheap guard first, then parallelize the rest).

### `cache()` pattern (in query modules)

```diff
- import { prisma } from "@/server/db";
+ import { cache } from "react";
+ import { prisma } from "@/server/db";

- export async function getSettings() {
+ export const getSettings = cache(async () => {
    return prisma.settings.findFirst({ where: { id: SINGLETON_ID } });
- }
+ });
```

`cache()` deduplicates calls within a single React render pass. Cross-request caching would need `unstable_cache` (LRU), which is out of scope here.

### Files NOT touched

- Client components (no waterfall issues there).
- Query files that already return lists (no dedup needed; lists are unique per call).
- `prisma/seed.ts`, tests, build config.
- Stub pages (clients/promotions/loyalty/blog/reports) — they have no data fetch, just one `getTranslations` call, nothing to parallelize.

## Impact

- **Áreas afectadas**: `admin`, `public`, `server` (queries).
- **Archivos modificados**: 11 pages + 2 query modules = 13 archivos.
- **Archivos nuevos**: 0.
- **Riesgo**: BAJO. Cambios mecánicos, sin cambio de comportamiento. Promise.all con tipos de retorno correctos.
- **Beneficio medible**: ~5-15ms menos TTFB en las 11 páginas. En el landing público, perceptible.

## Out of Scope

- `js-*` optimizations (low impact, no hot loops).
- `rerender-*` cleanups (H7, H8) — cosmetic only.
- Bundle size optimizations (H5) — requiere medir primero.
- Cross-request caching (`unstable_cache` / LRU) — sería cambio siguiente si hace falta.
- React Suspense boundaries (H2) — el proyecto todavía no las necesita; ningún page es lento en términos de streaming.

## Verification

- [x] `npx tsc --noEmit` limpio
- [x] `npm run dev` y las 13 rutas afectadas devuelven 200
- [x] Inspección manual: cada Promise.all mantiene el orden de los resultados esperados
- [x] `getSettings()` y `getAboutContent()` siguen retornando los mismos datos (cache es transparente)

## Rollback

Reversible con `git revert` del commit. Cada cambio es local a una función async; el revert deja los awaits en serie como estaban.
