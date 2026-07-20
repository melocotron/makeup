# Code Review — Vercel React Best Practices

**Proyecto**: makeup (Next.js 15.5.20, React, Prisma, MySQL)
**Fecha**: 2026-07-20
**Skill**: [vercel-react-best-practices](https://www.skills.sh/vercel-labs/agent-skills/vercel-react-best-practices) (70 reglas, 8 categorías)
**Método**: escaneo del repo con `codebase-memory-mcp` + `grep` directo, cruzado contra las 70 reglas.

## Resumen ejecutivo

| Prioridad | Categoría | Hallazgos aplicables | Notas |
|---|---|---|---|
| CRITICAL | 1. Eliminating Waterfalls | 4 archivos | Patrón sistemático en pages |
| CRITICAL | 2. Bundle Size | 1 archivo | Bien en general; un caso `lucide-react` |
| HIGH | 3. Server-Side Performance | 1 archivo (faltante) | `React.cache()` no se usa en ningún lugar |
| MED-HIGH | 4. Client-Side Data Fetching | 0 | N/A (todo es server-fetched) |
| MEDIUM | 5. Re-render Optimization | 2 archivos | `useEffect` reemplazable + `useMemo` sospechoso |
| MEDIUM | 6. Rendering Performance | 0 críticos | `&&` falsy guards sin riesgo de `0` |
| LOW-MED | 7. JavaScript Performance | 0 críticos | Sin loops hot, sin lookups O(n) |
| LOW | 8. Advanced Patterns | 0 | N/A |

**Total**: 8 hallazgos concretos con fix sugerido. **2 son CRITICAL**, el resto HIGH/MEDIUM.

---

## CRITICAL — Eliminando Waterfalls

### H1. Waterfall en `HomePage` (landing pública)

**Archivo**: `src/app/[locale]/(public)/page.tsx:22-52`
**Regla**: `async-parallel` (Promise.all para independientes)

```tsx
// ❌ Actual
const settings = await getSettings();
if (settings.maintenanceMode) redirect(`/${locale}/maintenance`);

const [services, packages, about] = await Promise.all([...]);  // ← OK

const t = await getTranslations({ locale, namespace: "home" });  // ← waterfall
```

`getSettings` debe ir antes (por el redirect), pero `getTranslations` es independiente de las queries. Corre en serie innecesariamente.

**Fix**:
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

**Impacto**: ~5-15ms en latencia de TTFB de `/es` (depende de latencia de DB).

### H2. Waterfall en `CitaDetailPage`

**Archivo**: `src/app/[locale]/(admin)/admin/appointments/[id]/page.tsx:18-21`
**Regla**: `async-parallel`

```tsx
// ❌ Actual
const appointment = await getAppointmentById(id);
if (!appointment) notFound();
const t = await getTranslations({ locale, namespace: "admin.appointments" });
```

`getTranslations` puede empezar junto con la query, no depende de ella.

**Fix**:
```tsx
const [appointment, t] = await Promise.all([
  getAppointmentById(id),
  getTranslations({ locale, namespace: "admin.appointments" }),
]);
if (!appointment) notFound();
```

### H3. Patrón waterfall repetido en 8+ páginas admin

**Archivos** (todos con el mismo anti-patrón):
- `src/app/[locale]/(admin)/admin/services/page.tsx:14-15` (`listAllServices` + `getTranslations`)
- `src/app/[locale]/(admin)/admin/packages/page.tsx:14-15` (`listAllPackages` + `getTranslations`)
- `src/app/[locale]/(admin)/admin/packages/nuevo/page.tsx:14-15`
- `src/app/[locale]/(admin)/admin/services/[id]/page.tsx:16-19` (`getServiceById` + `getTranslations`)
- `src/app/[locale]/(admin)/admin/profile/page.tsx:15-16` (`getAboutContent` + `getTranslations`)
- `src/app/[locale]/(admin)/admin/profile/credentials/page.tsx:15-16` (`listCredentials` + `getTranslations`)
- `src/app/[locale]/(admin)/admin/content/home/page.tsx:15-16` (`listCarouselSlides` + `getTranslations`)
- `src/app/[locale]/(admin)/admin/settings/page.tsx:15-16` (`getSettings` + `getTranslations`)

**Regla**: `async-parallel`. Mismo fix que H2: meter todo en `Promise.all`.

**Variante especial** — `admin/page.tsx:14-15` carga **dos** translators (`admin` + `common`) en serie. Mismo fix, Promise.all con 3 elementos (incluye el `Promise.all` ya existente, ojo).

### H4. Waterfall en `MaintenancePage`

**Archivo**: `src/app/[locale]/(public)/maintenance/page.tsx:18-23`
**Regla**: `async-parallel`

```tsx
const settings = await getSettings();
if (!settings.maintenanceMode) redirect(`/${locale}`);
const t = await getTranslations({ locale, namespace: "public.maintenance" });
```

`getTranslations` puede correr junto a `getSettings`.

---

## CRITICAL — Bundle Size Optimization

### H5. `lucide-react` import en `login-form.tsx` siempre carga el bundle completo de iconos

**Archivo**: `src/app/[locale]/(admin)/admin/login/login-form.tsx:4`
**Regla**: `bundle-analyzable-paths` / `bundle-dynamic-imports`

```tsx
import { Loader2 } from "lucide-react";
```

`lucide-react` es ESM-tree-shakeable y los named imports sí sacuden el bundle. **No es un hallazgo** — verifiqué que los 43 archivos del repo usan named imports. **Falso positivo descartado**.

Lo que sí es cierto: el sidebar importa 15 iconos en una sola línea. Si Vercel midiera el bundle del admin shell y resultara > 50KB, valdría la pena mover esos iconos a un componente client lazy. Pero medir primero.

**Acción**: correr `npm run build` y revisar el bundle report. Si `lucide-react` aporta > 30KB, abrir change.

---

## HIGH — Server-Side Performance

### H6. `React.cache()` no se usa en ningún lado

**Regla**: `server-cache-react` (per-request deduplication)

`grep "React.cache|cache\(|use cache"` en `src/**/*.ts` → 0 matches.

**Caso concreto**: `getSettings()` se llama en `app/[locale]/(public)/page.tsx:31` Y en `app/[locale]/(public)/maintenance/page.tsx:18` (incluso en la misma request, si la home redirige a maintenance). También `getAboutContent()` se llama en `profile/page.tsx:15` y desde otros lados vía relaciones Prisma.

**Fix recomendado**: wrappear las queries "single row" con `cache()` en `src/server/system/queries.ts` y `src/server/content/queries.ts`:

```tsx
import { cache } from "react";

export const getSettings = cache(async () => {
  return prisma.settings.findFirst({ where: { id: SINGLETON_ID } });
});
```

Beneficio: si en una misma request se llama 2+ veces, solo se ejecuta 1 vez. Gratis en CPU/DB.

**Impacto**: medio. No crítico porque las queries son simples y rápidas, pero es la regla de mayor ROI/Esfuerzo.

---

## MEDIUM — Re-render Optimization

### H7. `useEffect` en `media-browser.tsx` puede ser event handler

**Archivo**: `src/components/admin/media-browser.tsx:37-50`
**Regla**: `rerender-move-effect-to-event`

```tsx
const load = React.useCallback(async () => { ... }, [folder, search]);
React.useEffect(() => { load(); }, [load]);
```

El `useEffect` reacciona a cambios de `folder` o `search`. El `search` se setea solo desde el `handleSearch` del form. Se puede mover la llamada a `load()` directamente al handler y eliminar el effect.

**Fix**:
```tsx
const load = React.useCallback(async (...) => { ... }, [folder, search]);

function handleSearch(e: React.FormEvent) {
  e.preventDefault();
  setSearch(searchInput);
  // load() ya no se necesita — el effect sigue, pero el flujo es más claro
}
```

(De hecho está OK tal cual para `folder` (cambio directo) y para `search` (via form), pero el `useCallback` + `useEffect` aquí es la pareja clásica que la regla apunta. Si querés ser estricto, el `useEffect` no es estrictamente necesario: `setSearch` ya triggerea el re-render que ejecuta el effect. Es decir, ya está bien, pero el `useCallback` sobra si no se pasa como prop.)

**Severidad**: baja — más limpieza que performance real. Ojo: el commit `c4075dd` ("prevent re-fetch loop in step-datetime useEffect") sugiere que el equipo ya tuvo este bug antes.

### H8. `useMemo` con dos `.filter` + `.sort` encadenados en `appointments-list.tsx`

**Archivo**: `src/components/admin/appointments-list.tsx:57-69`
**Regla**: `rerender-memo` (vale la pena) + `js-combine-iterations` (combinar filter/map)

```tsx
const filtered = useMemo(() => {
  const now = new Date();
  const upcoming = items
    .filter((a) => filter === "ALL" || a.status === filter)
    .filter((a) => new Date(a.scheduledAt) >= now || a.status === "PENDING")
    .sort(...);
  const past = items
    .filter((a) => new Date(a.scheduledAt) < now && a.status !== "PENDING")
    .filter((a) => filter === "ALL" || a.status === filter)
    .sort(...)
    .slice(0, 20);
  return { upcoming, past };
}, [items, filter]);
```

**Hallazgos**:
1. `new Date()` adentro del useMemo **no está en las deps** y se ejecuta en cada recompute (cada vez que `items` o `filter` cambian). Para un listado de citas esto es OK, pero rompe la regla "memo debe ser puro respecto a sus deps".
2. Iteración doble sobre `items` (una para upcoming, otra para past) — se podría hacer en una sola pasada con un `reduce`. Pero la complejidad del código sube y el `items.length` rara vez supera 100, así que el ahorro es marginal.

**Severidad**: baja. La función es correcta; el `new Date()` adentro es OK porque es idéntico en ambas llamadas; el doble filter es aceptable para legibilidad. No urge.

---

## MEDIUM — Rendering Performance

### Sin hallazgos críticos

`grep` exhaustivo de `{condition && <JSX/>}`: 112 matches. Revisé los casos con conteo numérico (`{count && ...}`) — **0 matches**. Todos los `&&` son con strings, objetos o booleanos explícitos, así que no hay riesgo de renderizar `0` accidentalmente. Bien.

---

## LOW-MED — JavaScript Performance

### Sin hallazgos críticos

- No hay loops con lookups O(n) sobre arrays grandes.
- No hay `new RegExp()` dentro de loops.
- No hay `localStorage`/`sessionStorage` repetidos.
- `js-set-map-lookups`: revisar si `getSettings()` o `getAboutContent()` se llaman dentro de un `.map()` sobre services/packages. **No es el caso** — siempre se llama una vez por page.

---

## Resumen accionable

### Fixes de alto ROI/bajo esfuerzo (recomendados para change OpenSpec 012)

1. **H1, H2, H3, H4** — Promise.all en 11 archivos. Cambio mecánico, 5 minutos, ganancia clara.
2. **H6** — Agregar `cache()` a 2-3 queries single-row. 10 minutos, previene N+1 silenciosos.

### Fixes opcionales

3. **H7** — Limpiar useEffect de `media-browser.tsx`. Cosmético, bajo impacto.
4. **H8** — Combinar filters en `appointments-list.tsx`. Cosmético, bajo impacto.

### Fixes NO recomendados

5. **H5** — Solo actuar si `npm run build` muestra que `lucide-react` aporta > 30KB al bundle del admin.

---

## Próximo paso

Si querés, abro un change `openspec/changes/async-parallel-fetching/` con H1-H4 + H6, y lo aplico. Dime si voy.
