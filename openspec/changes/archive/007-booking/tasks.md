# Tasks 007 — Sistema de Reservas

## OpenSpec

- [x] Crear change folder con proposal/design/tasks
- [x] Crear specs/booking/spec.md

## Backend — Lógica pura

- [x] `src/server/booking/scheduling.ts`:
  - [x] `doIntervalsOverlap(aStart, aEnd, bStart, bEnd): boolean`
  - [x] `timeStringToDate(date, time): Date`
  - [x] `formatTime(date): string`
  - [x] `getLocalDayOfWeek(date): number`
  - [x] `isSameLocalDay(target, reference): boolean`
  - [x] `generateSlotsForDay(args): Slot[]`
  - [x] `isSlotAvailable(args): boolean`
- [x] `getAvailableSlots(targetDate, serviceId): Slot[]` (en `queries.ts`)

## Backend — Prisma layer

- [x] `src/server/booking/queries.ts`:
  - [x] `listSchedules()`
  - [x] `getScheduleByDay(dayOfWeek)`
  - [x] `listScheduleExceptions(from?, to?)`
  - [x] `getScheduleExceptionByDate(date)`
  - [x] `listAppointments({ status?, from?, to? })`
  - [x] `getAppointmentById(id)`
  - [x] `getAppointmentsForDate(date)`
  - [x] `getAvailableSlots(targetDate, serviceId)` (orchestrator)

- [x] `src/server/booking/validators.ts`:
  - [x] `createAppointmentSchema` (Zod)
  - [x] `updateAppointmentStatusSchema`
  - [x] `updateAppointmentSchema`
  - [x] `scheduleSchema`
  - [x] `scheduleExceptionSchema`

- [x] `src/server/booking/services.ts`:
  - [x] `createAppointment(input)` — con validación de slot en transacción
  - [x] `updateAppointmentStatus(input)`
  - [x] `upsertSchedule(input)`
  - [x] `deleteSchedule(dayOfWeek)`
  - [x] `upsertScheduleException(input)`
  - [x] `deleteScheduleException(dateStr)`

- [ ] `src/server/booking/actions.ts` — Server Actions re-exportando services con `revalidatePath`

## Frontend público — Wizard

- [x] `src/app/[locale]/(public)/reservar/page.tsx` — Server Component wrapper
- [x] `src/components/booking/wizard.tsx` — Client Component que lee query params
- [x] `src/components/booking/wizard-stepper.tsx` — stepper visual + URL helpers
- [x] `src/components/booking/step-service.tsx` — Grid de servicios con selección
- [x] `src/components/booking/step-datetime.tsx` — Calendario + slots (fetch via /api/booking/slots)
- [x] `src/components/booking/step-customer.tsx` — Formulario de datos
- [x] `src/components/booking/step-confirm.tsx` — Resumen + confirmar
- [x] `src/components/booking/booking-success.tsx` — Pantalla post-creación
- [x] `src/app/api/booking/slots/route.ts` — API route para slots
- [x] i18n `booking.*` namespace (es.json + en.json)

## Frontend admin

- [x] `src/app/[locale]/(admin)/admin/appointments/page.tsx` — Lista de citas
- [x] `src/components/admin/appointments-list.tsx` — Tabla con filtros
- [x] `src/app/[locale]/(admin)/admin/appointments/[id]/page.tsx` — Detalle
- [x] `src/components/admin/appointment-detail.tsx` — Vista detalle + acciones
- [x] `src/app/[locale]/(admin)/admin/horarios/page.tsx` — CRUD horarios
- [x] `src/components/admin/schedule-manager.tsx` — Form semanal
- [x] `src/app/[locale]/(admin)/admin/horarios/bloqueos/page.tsx` — Bloqueos
- [x] `src/components/admin/schedule-exceptions-manager.tsx` — CRUD fechas bloqueadas

## i18n

- [x] Namespace `booking.*` (es.json + en.json) — public wizard completo
- [x] Namespace `admin.appointments.*` (es.json + en.json)
- [x] Namespace `admin.schedule.*` (es.json + en.json)

## Sidebar admin

- [x] Link "Citas" en sidebar (ya existía con icono CalendarDays)
- [x] Link "Horarios" en sidebar (Calendar icon, agregago en este change)

## Verificación

- [x] `npm run typecheck` pasa
- [ ] `npm run lint` sin warnings nuevos (revisar)
- [ ] `npm run build` compila (revisar)
- [ ] Manual wizard end-to-end (realizar antes de archivar):
  - [ ] Crear slot disponible → reservar → ver cita en admin
  - [ ] Día bloqueado → wizard no muestra slots
  - [ ] Slot ocupado → otro cliente no puede
  - [ ] Cancelar cita → slot se libera
  - [ ] Cambiar status en admin: CONFIRMED → COMPLETED
- [ ] Lighthouse público `/reservar`:
  - [ ] Performance ≥ 90
  - [ ] Accessibility ≥ 95

## Commit final

- [x] `feat(booking): scheduling logic + queries + validators`
- [x] `feat(booking): public wizard + create appointment flow`
- [x] `feat(booking): admin schedule + appointments CRUD`
- [ ] `chore(openspec): archive change 007-booking`