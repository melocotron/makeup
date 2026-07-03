# Proposal 005 — Catálogo: Servicios + Paquetes (Fase 3)

## Why

El admin tiene toda la infraestructura (auth, content, media) pero aún no puede gestionar QUÉ vende. Sin servicios definidos, no hay nada que ofrecer, agendar ni cobrar. Esta fase materializa el **catálogo de servicios** con extras y **paquetes** (combos) que son la base de:

- La landing pública (sección "Servicios" + "Paquetes")
- El sistema de reservas (Fase 5)
- La facturación (Fase 8)

## What Changes

### Servicios
- CRUD completo en `/admin/servicios`
- Modelo `Service` ya existe: name (json es/en), description (json), durationMin, basePrice, image, isActive, category, order
- **Extras** dentro del mismo form: cada servicio puede tener N extras (ej: "Material premium", "Peinado extra", "Sesión extendida") con nombre y precio
- Modelo `ServiceExtra` ya existe con relación a Service
- Vista lista: tabla con imagen, nombre, duración, precio base, estado activo, orden

### Paquetes
- CRUD completo en `/admin/paquetes`
- Modelo `Package`: name (json), description (json), totalPrice, image, isActive, order
- **Items** dentro del form: lista de servicios incluidos con cantidad
- Modelo `PackageItem` ya existe
- Vista lista: cards con preview de imagen, nombre, precio, cantidad de servicios incluidos

### Categorías (futuro)
- Por ahora el campo `category` es texto libre. Categorías formales vendrán en fase posterior.

## Impact

- **Áreas afectadas**: `catalog`, `admin`
- **Archivos nuevos**: ~12
- **Riesgo**: BAJO. CRUD estándar con relaciones simples.
- **Dependencias**: usa MediaPicker, todos los componentes ya creados

## Architecture decisions

### Cálculo de precio en paquetes
El admin pone `totalPrice` manual en el paquete (precio final que se cobra). Esto le da control total sobre descuentos de paquete. No calculamos automáticamente.

Alternativa considerada: `totalPrice` = suma de items - descuento. Descartado por simplicidad.

### Imagen del servicio
Usamos `MediaPicker` (ya creado). El servicio se guarda con la URL del media (no FK por simplicidad, igual que hicimos con Profile).

### Extras en el form de servicio
Gestión inline en el mismo form (no modal separado). El admin:
1. Llena datos básicos
2. Agrega extras dinámicamente (botón "+ Agregar extra")
3. Puede eliminar extras existentes
4. Al guardar, se hace upsert de extras (delete + insert)

### Items en paquete
Similar: selección múltiple de servicios con cantidad por item.

## Out of scope (fases futuras)

- Categorías formales (ahora texto libre)
- Imágenes múltiples por servicio (ahora solo una)
- Variantes de precio por duración
- Servicios grupales (capacity > 1)
- Soft delete (borrado lógico) — por ahora hard delete
- Auditoría de cambios en servicios

## UX considerations

- Lista con paginación (cuando haya > 20 servicios)
- Filtro por categoría y activo/inactivo
- Ordenamiento manual (input numérico)
- Validación: nombre en ambos idiomas requerido, precio > 0, duración > 0
- Imagen opcional pero recomendada (preview en lista)