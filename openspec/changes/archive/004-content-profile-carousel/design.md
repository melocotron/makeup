# Design 004 — Perfil, Credenciales, Carrusel

## Backend structure

```
src/server/content/
├── profile.ts        ← AboutContent CRUD
├── credentials.ts    ← Credential CRUD
├── carousel.ts       ← HomeCarousel CRUD
├── queries.ts        ← shared queries
└── validators.ts     ← Zod schemas
```

## AboutContent (Singleton)

Mismo patrón que Settings:
```ts
const about = await prisma.aboutContent.upsert({
  where: { id: "singleton" },
  create: { id: "singleton" },
  update: { ... }
})
```

Image se guarda como `String?` (URL directa del Media), no como FK. Razón: simplicidad, una sola imagen, no necesitamos queries relacionales.

## Credentials

CRUD estándar:
- `createCredential(formData)` 
- `updateCredential(id, formData)`
- `deleteCredential(id)`
- `reorderCredentials(orderedIds[])` — recibe array de IDs en nuevo orden

UI:
- Lista en tabla (Admin) o cards (mobile)
- Botón "Nueva credencial" abre Dialog con form
- Click en fila abre Dialog con form de edición
- Botón eliminar con confirmación

## HomeCarousel

CRUD similar al de Credentials.

UI específica:
- Cada slide muestra preview de imagen + título + estado activo
- Botón "Nuevo slide" abre Dialog
- Reorder: input numérico por slide (no drag-drop)
- Toggle activo: switch inline en la lista

## MediaPicker component

```tsx
interface MediaPickerProps {
  value?: string  // media ID
  onChange: (media: { id: string; url: string } | null) => void
  folder?: string  // folder default al abrir (ej: "perfil")
  className?: string
}
```

Estructura:
```
[Imagen preview si hay]  [Botón "Cambiar"]  [Botón "Quitar" si hay]
   o
[Placeholder + Botón "Seleccionar imagen"]
```

Al hacer click en seleccionar/cambiar, abre Dialog con MediaBrowser (el componente de Fase 2a).

Como MediaBrowser es client y MediaPicker también lo será, la implementación es directa. Solo necesita compartir el fetcher de media.

## Forms

Todos usan el patrón:
```tsx
"use client"
const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
  resolver: zodResolver(schema)
})

async function onSubmit(data) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(data)) fd.append(k, v)
  const result = await serverAction(fd)
  if (result.success) toast.success("...")
  else toast.error(result.error)
}
```

## i18n

Agregar al messages/es.json y en.json:
```json
"profile": {
  "photo": "Foto",
  "bio": "Biografía",
  "signature": "Texto de firma"
},
"credentials": {
  "title": "Preparación profesional",
  "titleField": "Título",
  "institution": "Institución",
  "year": "Año",
  "image": "Imagen (opcional)",
  "order": "Orden"
},
"carousel": {
  "image": "Imagen",
  "title": "Título",
  "subtitle": "Subtítulo",
  "ctaLabel": "Texto del botón",
  "ctaUrl": "URL del botón",
  "active": "Activo",
  "order": "Orden"
}
```

## Validation

```ts
const credentialSchema = z.object({
  titleEs: z.string().min(1).max(150),
  titleEn: z.string().min(1).max(150),
  institution: z.string().min(1).max(150),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  image: z.string().optional(),
  order: z.coerce.number().int().default(0),
})

const slideSchema = z.object({
  image: z.string().min(1, "Imagen requerida"),
  titleEs: z.string().min(1).max(150),
  titleEn: z.string().min(1).max(150),
  subtitleEs: z.string().max(300).optional(),
  subtitleEn: z.string().max(300).optional(),
  ctaLabelEs: z.string().max(50).optional(),
  ctaLabelEn: z.string().max(50).optional(),
  ctaUrl: z.string().url().optional().or(z.literal("")),
  order: z.coerce.number().int().default(0),
  isActive: z.coerce.boolean().default(true),
})
```

## Risks

| Riesgo | Mitigación |
|---|---|
| Race condition en reorder | Solo el admin edita, no es problema |
| Slide sin imagen | Validación Zod required |
| Imagen borrada que aún se referencia | Validación al cargar (mostrar warning si media no existe) |