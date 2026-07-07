# Capability: Sistema de Reservas

## Purpose

Permitir a clientes reservar slots de servicios desde la landing pública, y al admin gestionar la agenda (horarios, bloqueos, citas) desde el panel.

## Requirements

### Requirement: Cliente puede ver slots disponibles

The system must mostrar al cliente los slots disponibles para un servicio en una fecha dada.

#### Scenario: Servicio normal en día laborable
Given un `Service` activo con `durationMin = 60`
And un `Schedule` para el día de la semana con `startTime = "09:00"` y `endTime = "18:00"`
And no hay `ScheduleException` para esa fecha
And no hay otros `Appointment` ese día
When el cliente solicita slots para esa fecha y servicio
Then el sistema retorna slots cada 30 minutos entre 09:00 y 17:00 (último slot que termina antes de las 18:00)

#### Scenario: Día bloqueado
Given un `ScheduleException` con `isBlocked = true` para la fecha solicitada
When el cliente solicita slots para esa fecha
Then el sistema retorna lista vacía
And la UI muestra "Día no disponible"

#### Scenario: Slot ocupado
Given un `Appointment` existente en `scheduledAt = "2026-07-15T10:00:00Z"` con `durationMin = 60` y `status != CANCELLED`
And un servicio de 60 minutos
When el cliente solicita slots para ese día
Then el slot de las 10:00 no aparece en la lista
And el slot de las 10:30 no aparece (overlap con cita que termina a las 11:00)

#### Scenario: Slot en pasado o muy próximo
Given `Settings.minAdvanceHours = 24`
And la fecha solicitada es hoy
When el cliente solicita slots para hoy
Then el sistema retorna solo slots cuya hora sea >= now + 24h

#### Scenario: Sin schedule para el día
Given no hay `Schedule` con `dayOfWeek = X` para el día de la semana solicitado
When el cliente solicita slots para esa fecha
Then el sistema retorna lista vacía

### Requirement: Cliente puede crear appointment

The system must permitir al cliente crear un `Appointment` con status PENDING.

#### Scenario: Creación exitosa
Given el cliente completa el wizard con datos válidos
And el slot está disponible en el momento de la creación
When el cliente confirma la reserva
Then el sistema crea un `Appointment` con `status = PENDING`
And muestra pantalla de confirmación con número de cita
And la cita aparece en `/admin/citas`

#### Scenario: Slot ocupado durante confirmación
Given el slot fue ocupado por otra reserva mientras el cliente completaba el formulario
When el cliente confirma la reserva
Then el sistema rechaza la creación con error "Slot no disponible"
And sugiere al cliente elegir otro horario

#### Scenario: Datos inválidos
Given el cliente ingresa email "no-es-email" en el formulario
When intenta confirmar
Then el sistema rechaza con error de validación en el campo email
And no crea el `Appointment`

### Requirement: Admin puede gestionar horarios

The system must permitir al admin crear, editar y eliminar `Schedule` entries (una por día de semana).

#### Scenario: Admin crea horario para lunes
Given el admin accede a `/admin/horarios`
And no hay `Schedule` con `dayOfWeek = 1`
When el admin crea un horario lunes 09:00-18:00 activo
Then se crea un `Schedule` con `dayOfWeek = 1`

#### Scenario: Admin desactiva domingo
Given existe `Schedule` con `dayOfWeek = 0` activo
When el admin lo desactiva
Then `isActive = false` y no se generan slots los domingos

### Requirement: Admin puede bloquear fechas

The system must permitir al admin crear, editar y eliminar `ScheduleException` para fechas específicas.

#### Scenario: Admin bloquea día por vacaciones
Given el admin accede a `/admin/horarios/bloqueos`
When crea una excepción para "2026-12-25" con `isBlocked = true` y `reason = "Navidad"`
Then el sistema no genera slots ese día

#### Scenario: Admin desbloquea fecha
Given existe `ScheduleException` para "2026-12-25" con `isBlocked = true`
When el admin edita y pone `isBlocked = false`
Then el día se trata como día normal (slots según `Schedule`)

### Requirement: Admin puede gestionar citas

The system must permitir al admin ver, confirmar, cancelar, completar y marcar como no-show las citas.

#### Scenario: Admin confirma cita pendiente
Given un `Appointment` con `status = PENDING`
When el admin lo cambia a `CONFIRMED`
Then `status = CONFIRMED` y aparece badge "Confirmada" en la lista

#### Scenario: Admin cancela cita confirmada
Given un `Appointment` con `status = CONFIRMED`
When el admin lo cambia a `CANCELLED` con `cancelReason = "Cliente solicitó"`
Then `status = CANCELLED`, `cancelReason` se guarda
And el slot se libera (no aparece en slots ocupados)

#### Scenario: Admin marca como completada
Given un `Appointment` con `status = CONFIRMED` cuya fecha ya pasó
When el admin lo cambia a `COMPLETED`
Then `status = COMPLETED`
And la cita aparece en histórico

#### Scenario: Admin marca no-show
Given un `Appointment` con `status = CONFIRMED` cuya fecha ya pasó
And el cliente no asistió
When el admin lo cambia a `NO_SHOW`
Then `status = NO_SHOW`

### Requirement: Sistema valida anticipación mínima

The system must respetar `Settings.minAdvanceHours` al crear appointments.

#### Scenario: Reserva con poca anticipación
Given `Settings.minAdvanceHours = 24`
And el cliente intenta reservar para dentro de 12 horas
Then el sistema rechaza la creación
And muestra mensaje "Debes reservar con al menos 24h de anticipación"

### Requirement: Sistema libera slot al cancelar

The system must considerar un `Appointment` con `status = CANCELLED` como slot libre.

#### Scenario: Cancelar libera el slot
Given un `Appointment` en `scheduledAt = T` con `status = CONFIRMED`
When se cancela (status → CANCELLED)
And otro cliente consulta slots para la fecha de T
Then el slot T aparece disponible

### Requirement: Sistema previene race conditions

The system must prevenir que dos clientes reserven el mismo slot simultáneamente.

#### Scenario: Doble booking simultáneo
Given dos clientes inician wizard con el mismo servicio + fecha + slot
When ambos confirman al mismo tiempo
Then solo uno crea el `Appointment`
And el otro recibe error "Slot ya no disponible"