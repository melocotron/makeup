# Proposal 004 — Contenido: Perfil, Credenciales, Carrusel

## Why

Fase 2a dejó lista la base de contenido editable (Settings + Media library). Ahora se necesitan los **bloques de contenido concretos** que se mostrarán en la landing pública:

- **Perfil profesional**: quién es la dueña del negocio, su bio, foto, firma
- **Preparación profesional**: certificaciones, cursos, formación (para sección "Sobre mí" / "Credenciales")
- **Carrusel del home**: slides que aparecen en la landing principal

Sin esto, la landing pública (Fase 3) no tiene contenido dinámico que mostrar.

## What Changes

### Perfil Profesional
- Modelo `AboutContent` (singleton) ya existe en schema
- Admin page `/admin/perfil` con form para:
  - Foto principal (selector de media)
  - Bio (es/en) - textareas
  - Texto de firma (opcional, una línea)
- Server action `updateAboutContent()`

### Credenciales (Preparación)
- Modelo `Credential` ya existe en schema
- Admin page `/admin/perfil/preparacion` con:
  - Lista de credenciales (tabla)
  - CRUD inline con modal/form
  - Por credencial: título (es/en), institución, año, imagen, orden
  - Drag-to-reorder omitido (input numérico de orden)
- Server actions: create, update, delete, reorder

### Carrusel del Home
- Modelo `HomeCarousel` ya existe en schema
- Admin page `/admin/contenido/inicio` con:
  - Lista de slides (cards con preview)
  - CRUD con form
  - Por slide: imagen (requerida), título (es/en), subtítulo (es/en opcional), CTA label (es/en opcional), CTA URL opcional, orden, activo toggle
- Server actions: create, update, delete, toggleActive

### Componente compartido: MediaPicker
Para usar en formularios cuando se necesita seleccionar imagen:
- Botón "Seleccionar imagen"
- Abre dialog con MediaBrowser (existente)
- Click en imagen → selecciona y cierra
- Muestra preview de la imagen seleccionada
- Botón "Quitar" para deseleccionar

## Impact

- **Áreas afectadas**: `content`, `media` (extender MediaPicker), `admin` (3 páginas nuevas)
- **Archivos nuevos**: ~12
- **Riesgo**: BAJO. CRUD estándar con imágenes.
- **Dependencias**: usa todo lo instalado.

## Out of scope

- Drag-to-reorder visual (orden por input numérico)
- Multi-imagen por credencial (una sola)
- Videos en carrusel (solo imágenes por ahora)
- Programación de slides (fechas de inicio/fin) — los slides son permanentes con toggle activo
- Internacionalización del carrusel en cards del admin (solo es/en)

## UX considerations

- Los forms usan el patrón establecido: Server Action + Zod + RHF + sonner
- Los dialogs de credenciales y slides son modales (shadcn Dialog ya creado en Fase 2a)
- MediaPicker reusa el componente MediaBrowser
- Después de crear/editar/eliminar: revalidatePath + refrescar la lista