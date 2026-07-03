# Proposal 003 — Contenido Editable Base

## Why

Una vez que la admin puede entrar al panel (Fase 1), necesita poder gestionar el contenido que verá el público. Sin esto, la landing pública no tiene con qué alimentarse.

Esta fase crea los **bloques de contenido fundamental** que toda landing tiene:
- Quién soy (perfil profesional)
- Cómo contactarme (datos de contacto)
- Una biblioteca central para subir todas las imágenes
- El carrusel del home
- Settings globales del sitio

## What Changes

### Settings (Singleton)
Tabla `settings` ya existe en el schema (Fase 0). Ahora se crea UI:
- `/admin/ajustes` con tabs: General, Contacto, Apariencia, Mantenimiento
- **General**: nombre del sitio, idioma por defecto (es/en), políticas (anticipación mínima, cancelación)
- **Contacto**: dirección, email, teléfono, WhatsApp, redes (Instagram, Facebook, TikTok, YouTube)
- **Apariencia**: color de acento, logo URL, favicon
- **Mantenimiento**: toggle on/off, mensaje personalizado

### Perfil Profesional
- `/admin/perfil` — editor del perfil que se muestra en `/sobre-mi`
- Campos: foto, nombre público, bio (es/en), especialidades (array), firma (texto)
- `/admin/perfil/preparacion` — CRUD de credenciales (título, institución, año, imagen)
- Modelo `AboutContent` (singleton) + modelo `Credential` (múltiple)

### Carrusel del Home
- `/admin/contenido/inicio` — CRUD de slides
- Campos por slide: imagen, título (es/en), subtítulo (es/en), CTA label, CTA URL, orden, activo
- Drag-to-reorder (opcional esta fase, puede ser input numérico)
- Modelo `HomeCarousel` ya existe en schema

### Media Library (Crítico)
- `/admin/media` — biblioteca centralizada de imágenes
- **Upload**: drag&drop o click, con preview antes de subir
- **Procesamiento**: compresión con `sharp` (max 1920px, webp + avif fallback, blur placeholder)
- **Storage**: filesystem en `/public/uploads/<yyyy>/<mm>/<uuid>.<ext>`
- **Metadata**: filename, mimeType, size, width, height, alt text (es/en), folder
- **List**: grid con paginación, buscador, filtro por folder
- **Delete**: confirmación, elimina archivo físico + registro
- **Componente reutilizable**: `MediaPicker` para usar en formularios de servicios, blog, etc.
- Endpoint `POST /api/media/upload` y `DELETE /api/media/[id]`

### Toggle Blog/Ofertas/Fidelidad
Ya en `settings`. UI para toggles.

## Impact

- **Áreas afectadas**: `content`, `media`, `system`, `admin` (más páginas)
- **Archivos nuevos**: ~18
- **Archivos modificados**: 4 (seed update, settings model used, sidebar ya tiene links)
- **Riesgo**: MEDIO. Upload de archivos es vector de ataque si no se valida bien.
- **Dependencias**: requiere `sharp` (ya en package.json)

## Security: Upload validation

- Whitelist de MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/avif`
- Max size configurable (default 10MB)
- Nombre de archivo generado: UUID + extensión (NO se usa filename original, previene path traversal)
- Validación de magic numbers con sharp (no solo confiar en Content-Type del cliente)
- Endpoint `/api/media/upload` solo accesible para admin autenticado

## Out of scope

- Editor de FAQ / Testimonios / Galería antes-después (fase posterior)
- Crop de imagen (opcional, fase posterior)
- Múltiples idiomas en media alt text (se guarda el JSON pero la UI solo muestra es en esta fase)
- Drag-to-reorder carrusel (input numérico de orden en esta fase)
- Cloudinary / S3 (filesystem local por ahora)
- Versionado de imágenes (no se necesita)