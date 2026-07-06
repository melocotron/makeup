# Design 006 — Landing Pública Dinámica

## Estructura de archivos

```
src/app/[locale]/(public)/
├── layout.tsx                    ← wrapper con PublicHeader + Footer
├── page.tsx                      ← landing (hero + servicios + paquetes + sobre mí)
└── maintenance/
    └── page.tsx                  ← página de mantenimiento (settings.maintenanceMode)

src/components/public/
├── public-chrome.tsx             ← PublicHeader + PublicFooter (ya existe)
├── public-nav.tsx                ← navbar mobile con hamburger (nuevo, extraer de public-chrome)
├── service-card.tsx              ← card para grid de servicios (nuevo)
├── package-card.tsx              ← card para grid de paquetes (nuevo)
└── about-section.tsx             ← sección sobre mí (nuevo)

src/server/content/
└── carousel.queries.ts           ← listActiveCarouselSlides (nuevo, si no existe)
```

## Layout público

```tsx
// src/app/[locale]/(public)/layout.tsx
export default async function PublicLayout({ children, params }) {
  const { locale } = await params;
  const settings = await getSettings();
  
  if (settings.maintenanceMode) {
    redirect(`/${locale}/maintenance`);
  }
  
  return (
    <>
      <PublicHeader locale={locale} />
      <main className="pt-20">{children}</main>
      <PublicFooter />
    </>
  );
}
```

## Queries a usar

Todas ya existen (`server-only`, importadas desde RSC):

```ts
// src/server/catalog/queries.ts
import { listServices } from "@/server/catalog/queries";
import { listPackages } from "@/server/catalog/queries";

// src/server/content/profile.queries.ts
import { getAboutContent } from "@/server/content/profile.queries";

// src/server/system/queries.ts (o similar)
import { getSettings } from "@/server/system/queries";
```

**Falta crear** (si no existe):
- `src/server/content/carousel.queries.ts` con `listActiveCarouselSlides()` que filtra `isActive: true` ordenado por `order`

## Estructura de la landing

```tsx
// src/app/[locale]/(public)/page.tsx
export default async function HomePage({ params }) {
  const { locale } = await params;
  const [services, packages, about, slides] = await Promise.all([
    listServices(),                              // solo activos
    listPackages(),                              // solo activos
    getAboutContent(),
    listActiveCarouselSlides(),                  // null si no hay
  ]);
  
  return (
    <>
      <Hero slides={slides} />
      <ServicesSection services={services} locale={locale} />
      <PackagesSection packages={packages} locale={locale} />
      <AboutSection about={about} locale={locale} />
    </>
  );
}
```

## Componentes

### ServiceCard

Props:
```ts
{
  service: {
    id: string;
    name: Record<string, string>;
    basePrice: number;
    durationMin: number;
    image: string | null;
    description: Record<string, string>;
    extras: Array<{ id: string; name: Record<string, string>; price: number }>;
  };
  locale: string;
}
```

Render:
- Imagen (o placeholder con icono Scissors)
- Nombre (locale)
- Badge duración: "60 min"
- Precio: "Desde $85.00"
- Descripción truncada a 100 chars
- Si tiene extras, badge "+ X extras" (no expandible en esta fase)

### PackageCard

Props:
```ts
{
  pkg: {
    id: string;
    name: Record<string, string>;
    description: Record<string, string>;
    totalPrice: number;
    image: string | null;
    items: Array<{ quantity: number; service: { name: Record<string, string> } }>;
  };
  locale: string;
}
```

Render:
- Imagen
- Nombre
- Lista de items: "2× Maquillaje Social, 1× Peinado"
- Precio: "$250.00"

### AboutSection

Props:
```ts
{
  about: {
    bio: Record<string, string> | null;
    image: string | null;
    signatureText: string | null;
  };
  locale: string;
}
```

Render:
- Grid 2 col (mobile 1 col): imagen | texto
- Bio en locale actual
- Firma al final si existe

## i18n keys a agregar

```json
// messages/es.json + en.json (en namespace "public" nuevo o reusar "home")
"public": {
  "services": {
    "from": "Desde",
    "duration": "{min} min",
    "includes": "Incluye",
    "viewDetails": "Ver detalles",
    "extrasCount": "+ {count} extras"
  },
  "packages": {
    "itemsCount": "{count} servicios",
    "viewDetails": "Ver detalles"
  },
  "about": {
    "signature": "Con amor",
    "emptyBio": "Pronto más información."
  },
  "maintenance": {
    "title": "Sitio en mantenimiento",
    "subtitle": "Estamos trabajando para ti",
    "backSoon": "Volveremos pronto"
  },
  "common": {
    "loading": "Cargando...",
    "menu": "Menú",
    "close": "Cerrar"
  }
}
```

## Modo mantenimiento

```tsx
// src/app/[locale]/(public)/maintenance/page.tsx
export default async function MaintenancePage({ params }) {
  const { locale } = await params;
  const settings = await getSettings();
  
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1>{t("maintenance.title")}</h1>
        <p>{settings.maintenanceMessage || t("maintenance.backSoon")}</p>
      </div>
    </div>
  );
}
```

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Hidratación con fechas (footer year) | Ya validado en admin layout, mismo patrón |
| Imágenes rotas (URLs inválidas en DB) | next/image + onError fallback |
| Lista vacía de servicios/paquetes | Empty state con mensaje amable (no sección vacía) |
| Mantenimiento bloquea admin | Layout público solo aplica a `(public)` route group; admin tiene su propio `(admin)` group |
| Performance con muchos servicios | Límite de 20 en landing (mostrar "Ver todos" si >20) |
| Locale mal parseado | `setRequestLocale` ya validado en admin pages |

## NO incluido (decisión deliberada)

- **Animaciones de scroll**:優先 funcionalidad. Se puede agregar después con `framer-motion` o CSS `scroll-timeline` (ya hay soporte nativo).
- **Filtros en landing**: no hay suficientes servicios para necesitarlos. Si > 20, "Ver todos" en una página futura.
- **Wishlist / favoritos**: fuera de scope.
- **Reviews públicos**: fuera de scope (hay modelo Testimonial pero no UI pública).
