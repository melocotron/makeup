# Design 005 — Servicios + Paquetes

## Backend structure

```
src/server/catalog/
├── queries.ts        ← listServices, getServiceById, etc.
├── services.ts       ← CRUD actions (services + extras)
├── packages.ts       ← CRUD actions (packages + items)
└── validators.ts     ← Zod schemas
```

## Service CRUD

```ts
// services.ts
"use server";

export async function createServiceAction(formData: FormData)
export async function updateServiceAction(id: string, formData: FormData)
export async function deleteServiceAction(id: string)
export async function toggleServiceActiveAction(id: string, isActive: boolean)
```

### Form data shape

```ts
{
  nameEs: string
  nameEn: string
  descriptionEs: string
  descriptionEn: string
  durationMin: number
  basePrice: number (decimal as string)
  image: string (URL)
  category: string (optional)
  order: number
  isActive: boolean
  extras: Array<{ nameEs, nameEn, price }>  // serialized as JSON string
}
```

### Extras handling

Al guardar un servicio, las extras se manejan así:
1. Delete todas las extras existentes del servicio
2. Insertar las nuevas desde el form

Esto simplifica vs diff-update. Para volúmenes grandes (>20 extras) podría ser un problema pero no aplica aquí.

### Server-side validation

```ts
const serviceSchema = z.object({
  nameEs: z.string().min(1).max(150),
  nameEn: z.string().min(1).max(150),
  descriptionEs: z.string().max(2000).optional(),
  descriptionEn: z.string().max(2000).optional(),
  durationMin: z.coerce.number().int().min(5).max(480),
  basePrice: z.coerce.number().min(0).max(99999.99),
  image: z.string().optional(),
  category: z.string().max(50).optional(),
  order: z.coerce.number().int().default(0),
  isActive: z.coerce.boolean().default(true),
  extras: z.array(z.object({
    nameEs: z.string().min(1),
    nameEn: z.string().min(1),
    price: z.coerce.number().min(0),
  })).default([]),
})
```

## Package CRUD

Similar pattern. Items son servicios con cantidad.

```ts
const packageSchema = z.object({
  nameEs: z.string().min(1).max(150),
  nameEn: z.string().min(1).max(150),
  descriptionEs: z.string().max(2000).optional(),
  descriptionEn: z.string().max(2000).optional(),
  totalPrice: z.coerce.number().min(0),
  image: z.string().optional(),
  order: z.coerce.number().int().default(0),
  isActive: z.coerce.boolean().default(true),
  items: z.array(z.object({
    serviceId: z.string().min(1),
    quantity: z.coerce.number().int().min(1).max(10),
  })).min(1, "Agrega al menos un servicio"),
})
```

## Form components

### ServiceForm
- Inputs básicos arriba (name es/en, descripción, duración, precio)
- MediaPicker para imagen
- Extras manager (lista dinámica con agregar/quitar)
- Toggle activo + orden

### PackageForm
- Inputs básicos (name, descripción, precio total)
- MediaPicker para imagen
- **Service picker**: lista de servicios disponibles con checkbox + cantidad
- Toggle activo + orden

### Extras manager
Botón "+ Agregar extra" abre un mini-form inline con:
- Nombre (es)
- Nombre (en)
- Precio
- Botón guardar (lo agrega a la lista)
- Lista de extras agregados con botón eliminar

## List views

### ServiceList (table)
Columnas: imagen | nombre (es) | duración | precio base | categoría | activo | acciones

Acciones: editar, eliminar, toggle activo inline

### PackageList (cards)
Grid de cards con imagen + título + precio + cantidad de servicios + estado

## Data flow

```
[Form] → [Server Action] → [Zod parse] → [Prisma transaction] → [revalidate] → [toast]
```

Transacciones Prisma para operaciones múltiples (ej: servicio + extras):
```ts
await prisma.$transaction([
  prisma.service.update({ ... }),
  prisma.serviceExtra.deleteMany({ where: { serviceId } }),
  prisma.serviceExtra.createMany({ data: [...] }),
])
```

## i18n keys needed

```json
"catalog": {
  "services": {
    "title": "Servicios",
    "description": "...",
    "newService": "...",
    "name": "Nombre",
    "duration": "Duración",
    "minutes": "min",
    "basePrice": "Precio base",
    "category": "Categoría",
    "extras": "Extras",
    "addExtra": "Agregar extra",
    "removeExtra": "Quitar"
  },
  "packages": {
    "title": "Paquetes",
    "description": "...",
    "newPackage": "...",
    "items": "Servicios incluidos",
    "addItem": "Agregar servicio",
    "quantity": "Cantidad"
  }
}
```

## Risks

| Riesgo | Mitigación |
|---|---|
| Borrar servicio con citas agendadas | FK constraint con Cascade; no aplica en esta fase (citas vienen después) |
| Eliminar servicio que está en paquetes | Soft warning + confirmación |
| Precio inválido | Zod coerce a number con min/max |
| Imágenes muy grandes | Ya validado en MediaPicker (sharp resize) |