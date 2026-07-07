# Design 007 — Sistema de Reservas

## Stack técnico

- **Backend**: Next.js Server Actions + Prisma (sin API routes)
- **Frontend wizard**: React con estado en URL query params (no global state)
- **Calendario**: componente custom (CSS grid) — sin dependencias de date picker pesados
- **Validación**: Zod en backend, validación HTML5 nativa en frontend
- **Fechas**: `date-fns` para manipulaciones (ya instalado vía next-intl)

## Modelo de datos

No hay migraciones nuevas. Todos los modelos existen:

```prisma
model Schedule {
  dayOfWeek Int      // 0=Dom, 6=Sáb
  startTime String   // "HH:mm"
  endTime   String   // "HH:mm"
  isActive  Boolean
}

model ScheduleException {
  date      DateTime @db.Date
  isBlocked Boolean  // true = no se puede agendar
  reason    String?
}

model Appointment {
  clientId    String
  serviceId   String
  scheduledAt DateTime
  durationMin Int
  status      AppointmentStatus  // PENDING|CONFIRMED|COMPLETED|CANCELLED|NO_SHOW
  notes       String?            // del cliente
  internalNotes String?          // solo admin
  cancelReason String?
}
```

## Lógica de scheduling

### Algoritmo `getAvailableSlots(date, serviceId)`

```typescript
function getAvailableSlots(targetDate: Date, serviceId: string): Slot[] {
  // 1. Validar fecha no pasada + minAdvanceHours
  // 2. Cargar Schedule del día de semana
  //    - Si no hay schedule activo → []
  // 3. Cargar ScheduleException de la fecha
  //    - Si isBlocked → []
  // 4. Cargar Appointments existentes del día (status != CANCELLED)
  // 5. Generar slots cada 30min entre startTime y endTime - durationMin
  // 6. Para cada slot:
  //    - Calcular slotEnd = slotStart + durationMin
  //    - Si scheduledAt < now + minAdvanceHours → descartar
  //    - Si overlap con cualquier appointment → descartar
  //    - Si slotEnd > endTime del schedule → descartar
  //    - Else → incluir en resultado
  // 7. Retornar slots[]
}
```

### Detección de overlap

```typescript
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}
```

## Server Actions

```typescript
// src/server/booking/actions.ts
"use server";

export async function createAppointmentAction(input: CreateAppointmentInput) {
  // 1. Validar input con Zod
  // 2. Validar slot disponible (en transacción)
  // 3. Insertar appointment con status PENDING
  // 4. revalidatePath para refrescar admin
}

export async function updateAppointmentStatusAction(id: string, status: AppointmentStatus) {
  // Solo admin
}

export async function createScheduleAction(input: ScheduleInput) { /* ... */ }
// etc
```

## Wizard flow

URL state:
- `?step=1` (default) → selección de servicio
- `?step=2&serviceId=X` → fecha/hora
- `?step=3&serviceId=X&date=Y&slot=Z` → datos
- `?step=4&serviceId=X&date=Y&slot=Z` → confirmación

Cada paso es una vista diferente con su propio componente, pero comparten un wrapper que lee URL params.

## Componentes principales

### `src/components/booking/wizard.tsx`
Wrapper que lee query params y renderiza el paso actual.

### `src/components/booking/step-service.tsx`
Grid de ServiceCard (reutilizar `service-card.tsx` con `onSelect`).

### `src/components/booking/step-datetime.tsx`
- Mini calendario del mes (CSS grid 7 cols)
- Lista de slots disponibles al seleccionar día
- Slot grid con scroll

### `src/components/booking/step-customer.tsx`
Form con name, email, phone, notes.

### `src/components/booking/step-confirm.tsx`
Resumen + botón confirmar.

### `src/components/admin/appointments-list.tsx`
Tabla con citas próximas, filtros, acciones rápidas.

### `src/components/admin/appointment-detail.tsx`
Vista detalle con cambio de status y notas internas.

### `src/components/admin/schedule-manager.tsx`
Form para editar horarios por día de semana.

### `src/components/admin/schedule-exceptions-manager.tsx`
Lista de fechas bloqueadas con CRUD inline.

## Server components vs Client components

- **`/reservar/page.tsx`** — Server Component, lee params y redirige según step
- **`wizard.tsx`** — Client Component (necesita useRouter, useSearchParams)
- Cada step individual — Client Component

## Timezone handling

- DB almacena en UTC
- Server crea `scheduledAt` como UTC a partir de fecha + hora local del cliente
- Cliente muestra en su zona local (via `Intl.DateTimeFormat` o `date-fns-tz`)

Para v1: asumimos que cliente y admin están en la misma zona horaria. Zona del servidor: la del deploy (Hostinger probablemente UTC).

## Error handling

- Slot ocupado entre carga y submit → "Este horario acaba de ser reservado. Por favor elige otro."
- Fecha pasada / muy próxima → deshabilitada en UI
- Error de DB → toast genérico + log a NotificationLog (futuro)
- Validación Zod fallida → mensaje específico del campo

## Validaciones Zod

```typescript
// createAppointment
{
  serviceId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^[\d\s+]{8,}$/),
  notes: z.string().max(500).optional(),
}

// schedule
{
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  isActive: z.boolean(),
}

// scheduleException
{
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(200).optional(),
  isBlocked: z.boolean(),
}
```

## Performance

- Slots del día se cargan con Server Action al seleccionar fecha
- Caché de slots por fecha/servicio en memoria (5min) — out of scope v1
- Calendario renderiza mes completo client-side (no fetch)

## Testing strategy

Tests manuales (mismo approach que change 006):
- Slots disponibles correctos para días normales
- Slots excluidos cuando schedule inactivo
- Slots excluidos en fecha bloqueada
- Slots excluidos si hay cita que overlap
- Anticipación mínima respetada
- Cancelar cita libera slot
- Admin puede confirmar/cancelar/completar
- Wizard completa un flujo end-to-end

Lighthouse objetivo: ≥ 90 en Performance (página pública ligera).

## Out of scope (recordatorio)

Ver `proposal.md` § Out of scope. Lo más relevante:
- Magic link (fase 7)
- Email real (fase 10)
- Pagos (fase 9)
- Reserva de paquetes