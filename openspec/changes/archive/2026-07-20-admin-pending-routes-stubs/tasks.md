# Tasks 011 — Stubs for Pending Admin Routes

## Pages (5)

- [x] Crear `src/app/[locale]/(admin)/admin/clients/page.tsx` (server-only, stub)
- [x] Crear `src/app/[locale]/(admin)/admin/promotions/page.tsx` (server-only, stub)
- [x] Crear `src/app/[locale]/(admin)/admin/loyalty/page.tsx` (server-only, stub)
- [x] Crear `src/app/[locale]/(admin)/admin/blog/page.tsx` (server-only, stub)
- [x] Crear `src/app/[locale]/(admin)/admin/reports/page.tsx` (server-only, stub)

Todas siguen el mismo patrón:
```tsx
import { Construction } from "lucide-react";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export default async function XPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin" });

  return (
    <div className="mx-auto max-w-[1440px] space-y-8">
      <PageHeader title={t("nav.X")} description={t("comingSoon.description")} />
      <EmptyState
        icon={Construction}
        title={t("comingSoon.title")}
        description={t("comingSoon.phaseMap.X", { phase: N, name: "..." })}
      />
    </div>
  );
}
```

## i18n

- [x] Agregar namespace `admin.comingSoon` en `messages/es.json` y `messages/en.json`:
  - `comingSoon.title`
  - `comingSoon.description`
  - `comingSoon.phaseMap.clients` (Fase 6)
  - `comingSoon.phaseMap.promotions` (Fase 7)
  - `comingSoon.phaseMap.loyalty` (Fase 7)
  - `comingSoon.phaseMap.blog` (Fase 9)
  - `comingSoon.phaseMap.reports` (Fase 10)

## Verificación

- [x] `npx tsc --noEmit` sin errores
- [x] `npm run dev` y las 5 nuevas rutas devuelven 200
- [x] Click en cada link del sidebar y del dashboard quickAccess → 200, sin errores en consola
- [x] El resto de la navegación admin sigue funcionando
