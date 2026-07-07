# Proposal 007 — Sistema de Reservas (Fase 6)

## Why

La landing pública (change 006) ya muestra servicios y paquetes, pero el CTA "Agendar cita" lleva a un placeholder (`#booking`). Sin sistema de reservas, el flujo cliente se corta: no hay manera de convertir interés en cita confirmada. Esta fase cierra el ciclo comercial básico:

- Cliente ve servicio → reserva slot → admin confirma → cita queda registrada
- Admin controla disponibilidad y gestiona la agenda diaria

Sin esto, no podemos facturar (fase 9), no hay datos de clientes (fase 7) ni valor real del sitio.

## What Changes

### Backend (`src/server/booking/`)

- **`scheduling.ts`** — lógica pura de slots disponibles:
  - Combina `Schedule` (horario semanal) + `ScheduleException` (bloqueos puntuales) + `Appointment` existentes
  - Genera slots de N minutos según `durationMin` del servicio
  - Respeta `Settings.minAdvanceHours`
  - Exporta `getAvailableSlots(date, serviceId): Slot[]` y `isSlotAvailable(...)`

- **`queries.ts`** — funciones de lectura
- **`validators.ts`** — Zod schemas
- **`services.ts`** — lógica de negocio: `createAppointment`, `updateAppointmentStatus`, `createSchedule`, `createScheduleException`
- **`actions.ts`** — Server Actions para admin

### Flujo público (`/[locale]/reservar`)

Wizard de 4 pasos:
1. **Servicio** — grid de `Service` activos con duración
2. **Fecha y hora** — calendario del mes + lista de slots para el día seleccionado
3. **Datos** — formulario: nombre, email, teléfono, notas
4. **Confirmación** — resumen + crear `Appointment` con status PENDING

Estado del wizard en URL query params (`?step=1&serviceId=X&date=Y&slot=Z`) para permitir back/forward del navegador.

### Admin (`/admin/citas/*`)

| Ruta | Función |
|---|---|
| `/admin/citas` | Lista de citas ordenadas por fecha (próximas primero), con filtros (status, fecha) |
| `/admin/citas/[id]` | Detalle + cambiar status (PENDING → CONFIRMED → COMPLETED, o CANCELLED, NO_SHOW) |
| `/admin/horarios` | CRUD de `Schedule` (7 entradas, una por día de semana) |
| `/admin/horarios/bloqueos` | CRUD de `ScheduleException` (vacaciones, holidays) |

### i18n

Namespace nuevo `booking.*` en `es.json` y `en.json`. Keys por paso del wizard + admin.

## Impact

- **Áreas afectadas**: `booking`, `public`, `admin`, `i18n`
- **Archivos nuevos estimados**: ~20 (backend + frontend público + admin + i18n)
- **Riesgo**: MEDIO. Lógica de slots requiere cuidado con zonas horarias y edge cases (DST, citas que cruzan medianoche, etc.)
- **Dependencias**:
  - `Service` y `Schedule` ya existen (cambios 005 y foundation)
  - `Settings.minAdvanceHours` / `cancelHours` ya existen
  - `Client` y `MagicLink` existen pero **no se usan en este change** (queda para fase 7)

## Architecture Decisions

### Timezone

Todo se almacena en UTC (`scheduledAt: DateTime`). El frontend usa la zona del cliente para mostrar. Esto evita problemas con DST y cambios de zona.

### Slot granularity

Slots alineados a `:00` y `:30` por defecto (configurable vía `Settings` si hace falta más adelante). La duración del servicio puede extender el slot a través de horas (ej: servicio de 90min empezando a las 10:30 termina 12:00).

### Conflicto con citas existentes

Para evitar race conditions, `createAppointment` usa `prisma.$transaction` y valida disponibilidad dentro de la transacción. Si dos clientes intentan el mismo slot simultáneamente, uno gana y el otro recibe error "slot ya no disponible".

### Status flow

```
PENDING → CONFIRMED → COMPLETED
   ↓         ↓
CANCELLED  NO_SHOW
```

- Cliente siempre crea en PENDING
- Admin mueve a CONFIRMED cuando confirma (manual o auto según preferencia)
- Admin marca COMPLETED después de la cita
- Admin o cliente pueden CANCELLED (con `cancelReason`)
- Admin marca NO_SHOW si cliente no asiste

### Frontend state management

Estado del wizard en URL query params (no en state global). Esto permite refresh/back/forward sin perder progreso.

### Validación de slot

`createAppointment` valida:
1. Día no está en `ScheduleException` con `isBlocked: true`
2. Día de semana tiene `Schedule` activo
3. Slot dentro de `startTime..endTime` del schedule
4. Slot + `durationMin` no excede `endTime`
5. `scheduledAt >= now + minAdvanceHours`
6. No hay overlap con otros `Appointment` no-cancelled del mismo día

### Out of scope (fases futuras)

- Magic link para clientes autenticados (fase 7)
- Notificaciones email reales (fase 10)
- Pagos online (fase 9)
- Reserva de paquetes completos (este change solo servicios individuales)
- Lista de espera
- Reservas recurrentes
- Cancellation policy enforcement automática (la policy existe en `Settings` pero no se bloquea cancelar tarde)
- SMS / WhatsApp notifications

## UX considerations

### Wizard público

- Stepper visual con 4 pasos (highlight actual)
- Botón "Atrás" preserva estado
- Slot grid: solo muestra slots futuros con `minAdvanceHours` aplicado
- Mobile: calendario compacto, slots en scroll vertical
- Loading state durante fetch de slots
- Error state si slot se ocupa mientras se confirma (sugerir refrescar)

### Admin

- Vista de citas con calendario semanal (opcional) + tabla
- Acciones en lote: confirmar múltiples PENDING
- Filtros guardados en URL
- Indicador visual de status (badges con color)

### Validaciones de formulario

- Email: regex básico + verificación dominio válido
- Teléfono: solo dígitos, espacios y `+`, mínimo 8 caracteres
- Nombre: 2-100 caracteres
- Notas: máximo 500 caracteres