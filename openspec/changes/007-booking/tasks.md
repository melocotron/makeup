# Tasks 007 — Sistema de Reservas

## OpenSpec

- [x] Crear change folder con proposal/design/tasks
- [x] Crear specs/booking/spec.md

## Backend — Lógica pura

- [ ] `src/server/booking/scheduling.ts`:
  - [ ] `getAvailableSlots(targetDate, serviceId): Slot[]`
  - [ ] `isSlotAvailable(scheduledAt, durationMin, excludeId?): boolean`
  - [ ] `doIntervalsOverlap(aStart, aEnd, bStart, bEnd): boolean`
  - [ ] `generateSlotsForDay(schedule, exceptions, existingAppts, durationMin, fromTime): Slot[]`

## Backend — Prisma layer

- [ ] `src/server/booking/queries.ts`:
  - [ ] `listSchedules()`
  - [ ] `getScheduleByDay(dayOfWeek)`
  - [ ] `listScheduleExceptions(from?, to?)`
  - [ ] `listAppointments({ status?, from?, to? })`
  - [ ] `getAppointmentById(id)`
  - [ ] `getAppointmentsForDate(date)`

- [ ] `src/server/booking/validators.ts`:
  - [ ] `createAppointmentSchema` (Zod)
  - [ ] `scheduleSchema`
  - [ ] `scheduleExceptionSchema`
  - [ ] `updateStatusSchema`

- [ ] `src/server/booking/services.ts`:
  - [ ] `createAppointment(input)` — con validación de slot en transacción
  - [ ] `updateAppointmentStatus(id, status, cancelReason?)`
  - [ ] `upsertSchedule(input)`
  - [ ] `deleteSchedule(id)`
  - [ ] `createScheduleException(input)`
  - [ ] `deleteScheduleException(id)`

- [ ] `src/server/booking/actions.ts` — Server Actions re-exportando services con `revalidatePath`

## Frontend público — Wizard

- [ ] `src/app/[locale]/(public)/reservar/page.tsx` — Server Component wrapper
- [ ] `src/components/booking/wizard.tsx` — Client Component que lee query params
- [ ] `src/components/booking/step-service.tsx` — Grid de servicios con selección
- [ ] `src/components/booking/step-datetime.tsx` — Calendario + slots
- [ ] `src/components/booking/step-customer.tsx` — Formulario de datos
- [ ] `src/components/booking/step-confirm.tsx` — Resumen + confirmar
- [ ] `src/components/booking/booking-success.tsx` — Pantalla post-creación

## Frontend admin

- [ ] `src/app/[locale]/(admin)/admin/citas/page.tsx` — Lista de citas
- [ ] `src/components/admin/appointments-list.tsx` — Tabla con filtros
- [ ] `src/app/[locale]/(admin)/admin/citas/[id]/page.tsx` — Detalle
- [ ] `src/components/admin/appointment-detail.tsx` — Vista detalle + acciones
- [ ] `src/app/[locale]/(admin)/admin/horarios/page.tsx` — CRUD horarios
- [ ] `src/components/admin/schedule-manager.tsx` — Form semanal
- [ ] `src/app/[locale]/(admin)/admin/horarios/bloqueos/page.tsx` — Bloqueos
- [ ] `src/components/admin/schedule-exceptions-manager.tsx` — CRUD fechas bloqueadas

## i18n

- [ ] Agregar namespace `booking.*` a `messages/es.json`:
  - [ ] `booking.title`, `booking.subtitle`
  - [ ] `booking.steps.service/datetime/customer/confirm`
  - [ ] `booking.errors.slotUnavailable`, `booking.errors.minAdvanceHours`, etc.
  - [ ] `booking.success.title`, `booking.success.message`
  - [ ] `admin.appointments.*`
  - [ ] `admin.schedule.*`
- [ ] Mismas keys en `messages/en.json`

## Sidebar admin

- [ ] Agregar link "Citas" en sidebar con icono (Calendar)
- [ ] Agregar link "Horarios" en sidebar o submenú de Citas

## Verificación

- [ ] `npm run typecheck` pasa
- [ ] `npm run lint` sin warnings nuevos
- [ ] `npm run build` compila
- [ ] Manual wizard end-to-end:
  - [ ] Crear slot disponible → reservar → ver cita en admin
  - [ ] Día bloqueado → wizard no muestra slots
  - [ ] Slot ocupado → otro cliente no puede
  - [ ] Cancelar cita → slot se libera
  - [ ] Cambiar status en admin: CONFIRMED → COMPLETED
- [ ] Lighthouse público `/reservar`:
  - [ ] Performance ≥ 90
  - [ ] Accessibility ≥ 95

## Commit final

- [ ] `feat(booking): scheduling logic + queries + validators`
- [ ] `feat(booking): admin schedule + appointments CRUD`
- [ ] `feat(booking): public wizard + create appointment flow`
- [ ] `chore(openspec): archive change 007-booking`