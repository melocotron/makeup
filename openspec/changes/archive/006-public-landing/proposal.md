# Proposal 006 — Landing Pública Dinámica (Fase 4)

## Why

El admin puede gestionar servicios, paquetes, perfil, carrusel y settings (Fases 0–3), pero la landing `/es` y `/en` es solo un esqueleto con placeholders de texto. Sin una landing real, no hay forma de mostrar la oferta al cliente final, ni de validar el ciclo completo "admin crea → cliente ve".

Esta fase materializa el sitio público para que refleje en vivo lo que el admin configura.

## What Changes

### Layout público
- Crear `(public)/layout.tsx` que envuelve con `PublicHeader` + `PublicFooter` (ambos ya existen en `public-chrome.tsx` pero no se usan)
- Sticky navbar transparente con: logo, menú (Servicios, Paquetes, Sobre Mí, Agendar cita), Language switcher, Theme toggle, Login, Book Now
- Footer con copyright + links (privacidad, términos, cookies)

### Landing (`/(public)/page.tsx`)
- **Hero**: título grande + subtítulo + CTA → `#booking` (placeholder anchor, contenido real viene en Fase 5)
- **Servicios**: grid con servicios activos desde DB (imagen, nombre, duración, precio base, badge "desde $X")
- **Paquetes**: grid con paquetes activos desde DB (imagen, nombre, precio total, lista de servicios incluidos)
- **Sobre mí**: imagen + bio desde `AboutContent` (es/en)
- **Carrusel**: slides activos desde `HomeCarousel` en el hero (debajo del título o arriba, decisión en design.md)

### Página de mantenimiento
- Si `settings.maintenanceMode = true`, mostrar `/maintenance` con el mensaje configurado
- Solo bloquea rutas públicas, NO el admin

### i18n
- Reusar keys existentes: `nav.*`, `home.*`, `footer.*`
- Agregar: `public.services.from` ("Desde"), `public.services.duration` ("X min"), `public.services.includes` ("Incluye"), `public.services.viewAll` ("Ver todos"), `public.maintenance.title`/`message`

## Impact

- **Áreas afectadas**: `public`, `catalog`, `content`
- **Archivos nuevos/modificados**: ~6
- **Riesgo**: BAJO. Solo lectura de DB (queries ya existen). No toca admin.
- **Dependencias**: `listServices`, `listPackages`, `getAboutContent`, `listActiveCarouselSlides` (último a crear si no existe)

## Architecture decisions

### Server Components por defecto
La landing es estática (no necesita interactividad). Todo en RSC. Solo `LanguageSwitcher` y `ThemeToggle` son Client Components (ya lo son).

### Imágenes con `next/image`
Usar `Image` con `sizes` apropiados y `priority` solo en hero/above-the-fold. Las URLs vienen como string de la DB (sistema ya validado en admin).

### Carrusel
Decisión pendiente: si incluir carrusel en esta fase o dejarlo para fase posterior. **Propuesta**: incluir si los slides activos son > 0, sino omitir la sección. Es hero-section, no reemplaza al hero textual.

### Modo mantenimiento
- Check en `(public)/layout.tsx` antes de renderizar
- Si activo, redirect a `/[locale]/maintenance`
- El admin siempre es accesible (no toca middleware de auth)

### Responsive
- Mobile-first: navbar colapsa a hamburguesa
- Grids: 1 col mobile, 2 tablet, 3-4 desktop

## Out of scope (fases futuras)

- Página individual `/[locale]/services/[slug]` (detalle del servicio)
- Página individual `/[locale]/packages/[slug]` (detalle del paquete)
- Formulario de reserva (Fase 5)
- Blog público (fase posterior)
- Galería pública (fase posterior)
- Testimonios públicos (fase posterior)
- SEO metadata dinámico (Open Graph, sitemap.xml, robots.txt)
- Analytics

## UX considerations

- Mantener el lenguaje visual del design system (paleta, type, spacing)
- Animaciones suaves al scroll (fade-in opcional, no obligatorio en esta fase)
- CTAs visibles pero no agresivos
- Cargar imágenes con lazy loading (excepto hero)
- Mantener el theme toggle funcional y persistente (ya funciona, no romper)
