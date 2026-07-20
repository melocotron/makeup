# Proposal 010 — Server-Only Translations in Admin & Public Pages

## Why

Las rutas `/es/admin/**` (excepto `login`) y la home `/es` devolvían **500 Internal Server Error** al renderizar. La causa raíz era el mismo anti-patrón repetido en 14 archivos `page.tsx` (más 1 archivo de layout/cache que afectaba al dev server):

```tsx
// ❌ Anti-patrón: hook de cliente dentro de un RSC indirecto
export default async function ServerPage() {
  await fetchData();
  return <InnerContent />;
}

function InnerContent() {
  const t = useTranslations("admin");  // ← rompe el render del RSC
  return <JSX />;
}
```

`useTranslations` de `next-intl` es un hook de React (consume `useContext` internamente) y **no puede invocarse dentro de un React Server Component**, ni siquiera indirectamente desde uno. Next.js 15 falla el render con 500 silencioso. Sin este fix, el panel admin es completamente inaccesible y la home pública también.

## What Changes

**Decisión arquitectónica**: en vez de extraer los `useTranslations` a componentes cliente separados (el plan original), se optó por **convertir cada `page.tsx` a server-only puro** usando `getTranslations` de `next-intl/server`.

### Por qué server-only en lugar de client wrappers

| Enfoque | Pros | Contras |
|---|---|---|
| Extraer a `*-content.tsx` con `"use client"` | Mantiene interactividad cliente, `useState`/`useEffect` donde haga falta | 15 archivos nuevos, prop drilling, doble salto de red, lógica duplicada |
| **Server-only con `getTranslations`** ✓ | Menos archivos, una sola fuente de verdad, menos JS al cliente, queries ya en el server | Pierde interactividad fina si se necesita `useState`/`useEffect` (no es el caso actual) |

Las 15 pages afectadas no necesitan estado ni efectos cliente — son render puro con datos del server. Server-only es la opción más simple y la que mejor rendimiento da.

### Archivos modificados (14)

Los 14 `page.tsx` siguen el mismo patrón de cambio (`admin/login` se excluye — ver nota al final):

```diff
- import { useTranslations } from "next-intl";
- import { setRequestLocale } from "next-intl/server";
+ import { setRequestLocale, getTranslations } from "next-intl/server";

  export default async function XPage({ params }) {
    const { locale } = await params;
    setRequestLocale(locale);
    // ... queries existentes
-   return <XContent locale={locale} {...data} />;
- }
-
- function XContent({ locale, ...data }) {
-   const t = useTranslations("...");
+   const t = await getTranslations({ locale, namespace: "..." });
    return <JSX />;
  }
```

### Pages afectadas

```
src/app/[locale]/(public)/page.tsx
src/app/[locale]/(public)/maintenance/page.tsx
src/app/[locale]/(admin)/admin/page.tsx
src/app/[locale]/(admin)/admin/services/page.tsx
src/app/[locale]/(admin)/admin/services/[id]/page.tsx
src/app/[locale]/(admin)/admin/services/nuevo/page.tsx
src/app/[locale]/(admin)/admin/packages/page.tsx
src/app/[locale]/(admin)/admin/packages/[id]/page.tsx
src/app/[locale]/(admin)/admin/packages/nuevo/page.tsx
src/app/[locale]/(admin)/admin/profile/page.tsx
src/app/[locale]/(admin)/admin/profile/credentials/page.tsx
src/app/[locale]/(admin)/admin/media/page.tsx
src/app/[locale]/(admin)/admin/content/home/page.tsx
src/app/[locale]/(admin)/admin/settings/page.tsx
```

**Nota sobre `admin/login`**: este archivo **no se modificó**. Mantiene el patrón original con `useTranslations` dentro de un sub-componente `LoginScreen` (de hecho, `LoginScreen` se invoca desde un RSC, lo que es el mismo anti-patrón que el resto). Sin embargo, en el dev server actual responde **200 OK** y renderiza correctamente. Conclusión: el 500 observado durante el debug temprano era ruido del dev server (cache o procesos colgados), no del código. Si vuelve a fallar en el futuro, aplicar el mismo refactor server-only que al resto.

### Efectos colaterales (visuales, menores)

Para que las pages queden 100% server, fue necesario:

- **Remover imports de iconos de lucide** en los JSX directos (`CalendarDays`, `BarChart3`, `Scissors`, `Package`, `Percent`, `Users`, `FileText`, etc.). Los iconos siguen apareciendo en otros componentes cliente que ya tenían `"use client"` (sidebar, topbar, formularios). El efecto visual: el dashboard, los empty states y la home pública pierden los iconos decorativos grandes. Los iconos pequeños inline en `<PageHeader>`, `<ServiceList>`, `<PackageList>`, etc. **se mantienen** porque esos componentes ya son client wrappers.
- **`EmptyState icon={null}`** en home pública (antes `icon={<Scissors />}`). El componente `EmptyState` ya tenía `"use client"`, pero la prop icon como JSX literal no se podía construir en server.
- **Comentarios de sección** (`{/* Servicios */}`, `{/* KPIs */}`, etc.) removidos por limpieza.
- **Clase `group-hover:scale-110`** removida del dashboard (no aplica en server-only sin group).

### Archivos no tocados

- `appointments/page.tsx`, `appointments/[id]/page.tsx`, `horarios/page.tsx`, `horarios/bloqueos/page.tsx`: ya usaban `getTranslations` (server) o strings hardcoded. No requerían cambio.
- `login-form.tsx`: ya tenía `"use client"`. No requería cambio.
- Componentes `Sidebar`, `Topbar`, formularios (`ServiceForm`, `PackageForm`, etc.), listas (`ServiceList`, `PackageList`): todos ya eran `"use client"`. No requirieron cambio.
- `package-items-picker.tsx`, `extras-manager.tsx`, `carousel-form-dialog.tsx`, `media-picker.tsx`, etc.: ya client.

## Impact

- **Áreas afectadas**: `admin`, `public`
- **Archivos modificados**: 14 `page.tsx` + `.gitignore` + `tsconfig.json` = 16 archivos
- **Archivos nuevos**: 0 (decisión de no extraer a client wrappers)
- **Riesgo**: BAJO. Cambio mecánico: misma UI, mismo contenido, solo cambia cómo se obtiene el translator (server vs client hook).
- **Dependencias**: usa lo ya instalado (`next-intl`, `react`, `next`).
- **Bundle JS al cliente**: baja ligeramente (no hay 15 nuevos chunks de client wrappers).

## Out of Scope

- Re-arquitectura profunda (ej. `getTranslations` server + pasar strings planos a un client component existente que aún tenga `useTranslations`). Eso sería un refactor mayor con poco beneficio.
- Restaurar los iconos removidos vía wrappers cliente: si hace falta, se puede hacer en una iteración posterior.
- Tests unitarios sobre las pages (no hay tests previos en el repo).
- Mover el subproyecto `open-design/` (residía accidentalmente dentro del repo y arrastraba 7 350 errores de typecheck ajenos al proyecto. **Ya fue movido a `C:\00-Cursos\000-SDD\open-design/` en esta misma iteración**, junto con exclusión en `.gitignore` y `tsconfig.json#exclude` para que no vuelva a contaminar typechecks).

## Verification

- [x] `npx tsc --noEmit` → 0 errores en `src/` y `prisma/`
- [x] `npm run dev` arranca y las 15 rutas devuelven 200:
  - [x] `GET /es` → 200
  - [x] `GET /es/maintenance` → 200
  - [x] `GET /es/admin` → 200
  - [x] `GET /es/admin/services` → 200
  - [x] `GET /es/admin/services/nuevo` → 200
  - [x] `GET /es/admin/services/svc-demo` → 200
  - [x] `GET /es/admin/packages` → 200
  - [x] `GET /es/admin/packages/nuevo` → 200
  - [x] `GET /es/admin/packages/pkg-demo` → 200
  - [x] `GET /es/admin/media` → 200
  - [x] `GET /es/admin/settings` → 200
  - [x] `GET /es/admin/content/home` → 200
  - [x] `GET /es/admin/profile` → 200
  - [x] `GET /es/admin/profile/credentials` → 200
  - [x] `GET /es/admin/login` → 200 (sin modificar)
- [ ] Login con `admin@radiant-beauty.local` / `admin123` → redirige a `/es/admin` (pendiente: prueba end-to-end con browser/cookie)
- [ ] `npm run lint` pasa

## Rollback

Reversible con `git revert` por commit. Si se archiva con `openspec archive`, queda en `openspec/changes/archive/010-...` y el código vuelve a su estado anterior con `git checkout`.
