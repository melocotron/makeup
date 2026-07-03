# Design 003 — Contenido Editable Base

## Settings (Singleton)

El modelo `Settings` ya existe en el schema con `id: "singleton"` (PK fija). Esto garantiza una sola fila.

```ts
await prisma.settings.upsert({
  where: { id: "singleton" },
  update: { ... },
  create: { id: "singleton", ... }
})
```

### Server Action

```ts
// src/server/system/actions.ts
"use server"
export async function updateSettings(formData: FormData) {
  const data = settingsSchema.parse(Object.fromEntries(formData))
  await prisma.settings.upsert({ ... })
  revalidatePath("/", "layout") // afecta toda la UI
  return { success: true }
}
```

### Tabs UI

Una sola página `/admin/ajustes/page.tsx` con tabs:
- General (sitio, idioma, políticas)
- Contacto (dirección, redes)
- Apariencia (color, logo)
- Mantenimiento (toggle)

Cada tab es un formulario con Server Action propio, o un solo form con todos los campos agrupados por sección. Voy con la segunda opción para menos boilerplate.

## Media Library

### Upload Flow

```
[Browser]                     [Next.js]                    [Filesystem]
   |                              |                              |
   |-- POST /api/media/upload ---->|                              |
   |   (multipart/form-data)       |                              |
   |                              |-- Validate (auth, MIME, size) |
   |                              |-- Sharp process              |
   |                              |-- Generate UUID              |
   |                              |-- Write file ---------------->|
   |                              |-- Insert Media record        |
   |<-- 200 + media JSON ----------|                              |
```

### Sharp Processing

```ts
import sharp from "sharp"

const buffer = Buffer.from(await file.arrayBuffer())
const meta = await sharp(buffer).metadata()

// Genera versión optimizada
const optimized = await sharp(buffer)
  .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
  .webp({ quality: 85 })
  .toBuffer()

// Genera blur placeholder
const blur = await sharp(buffer)
  .resize(20, 20, { fit: "inside" })
  .webp({ quality: 30 })
  .toBuffer()
const blurDataUrl = `data:image/webp;base64,${blur.toString("base64")}`
```

(Por ahora no guardamos el blurDataUrl en la DB para simplificar — se puede regenerar on-demand en un campo `blurData` JSON más adelante.)

### Storage Path

```
public/uploads/
└── 2026/
    └── 07/
        └── 3f8a1b...c4e9.webp
```

Agrupado por año/mes para que un folder no acumule miles de archivos.

### API Endpoints

`POST /api/media/upload`:
- Auth: admin only (verificar session)
- Body: multipart/form-data con `file` y opcional `folder`
- Response: `{ id, url, width, height, size, mimeType, filename }` o error

`DELETE /api/media/[id]`:
- Auth: admin only
- Path param: media id
- Response: `{ success: true }` o 404

### MediaPicker Component

Para usar en otros forms (servicios, blog, etc.):
```tsx
<MediaPicker
  value={selectedMediaId}
  onChange={(media) => setSelectedMediaId(media?.id)}
  folder="servicios"
/>
```

Abre un dialog con la biblioteca + upload. Reutilizable.

## Carrusel

### CRUD básico

Lista de slides en una tabla. Cada fila:
- Preview de la imagen (thumbnail)
- Título
- Activo/Inactivo toggle
- Botones: editar, eliminar, mover arriba/abajo

Form de edición:
- Imagen (MediaPicker)
- Título (es/en)
- Subtítulo (es/en, opcional)
- CTA label (es/en, opcional)
- CTA URL (opcional)
- Switch activo

## Perfil Profesional

### AboutContent (Singleton)

Similar a Settings, una sola fila. Campos:
- bio: { es, en }
- signatureText: string (texto firma/imagen)
- image: mediaId (referencia, no FK por simplicidad)

### Credentials (múltiple)

Lista con CRUD inline:
- Título (es/en)
- Institución
- Año
- Imagen (MediaPicker, opcional)
- Orden

## Image alt text i18n

La tabla `Media` ya tiene `alt: Json?` (es/en). En esta fase la UI solo muestra input para `es`. El `en` se puede dejar vacío o llenar después.

## Why sharp (vs alternatives)

- **sharp**: la mejor opción para Node.js. Rápido (usa libvips), soporta todos los formatos modernos, produce webp/avif nativos
- **jimp**: pure JS pero lento
- **ImageMagick (CLI)**: requiere binario externo, no portable

## File size considerations

- Default max: 10MB
- Después de sharp: típicamente 200-500KB para una foto 1920px webp q85
- La quota del hosting compartido suele ser generosa (10-50GB), así que OK

## Performance considerations

- Lista de media con paginación (24 items por página)
- Thumbnail generado on-demand en la lista (no guardar thumb separado — `next/image` ya hace eso con sizes)
- Lazy loading de imágenes con `next/image` (`loading="lazy"`)

## Risks

| Riesgo | Mitigación |
|---|---|
| Upload de archivo malicioso | Whitelist MIME + magic number check con sharp |
| Path traversal en filename | UUID generado server-side, NO se usa filename del cliente |
| Storage lleno | Mostrar usage en /admin/media, botón de "limpiar no usados" |
| Slow uploads | Max 10MB, cliente comprime antes si quiere (futuro) |
| Imágenes muy grandes | Sharp resize a max 1920px |