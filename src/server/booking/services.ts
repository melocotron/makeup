import "server-only";

import { AppointmentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type CreateAppointmentInput,
  type ScheduleExceptionInput,
  type ScheduleInput,
  type UpdateAppointmentStatusInput,
} from "./validators";

import { isSlotAvailable, timeStringToDate } from "./scheduling";

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

/**
 * Creates a new Appointment.
 *
 * Flow:
 *  1. Validate the proposed slot (service active, day not blocked,
 *     schedule exists, slot inside window, past minAdvanceHours)
 *  2. Within a transaction: upsert Client by email, re-check slot
 *     availability (race condition protection), create Appointment
 *     with status PENDING.
 */
export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<ServiceResult<{ appointmentId: string }>> {
  // 1. Load service
  const service = await prisma.service.findUnique({
    where: { id: input.serviceId },
    select: { id: true, durationMin: true, isActive: true },
  });
  if (!service || !service.isActive) {
    return { ok: false, error: "Servicio no disponible", code: "SERVICE_INVALID" };
  }

  // 2. Load settings (minAdvanceHours)
  const settings = await prisma.settings.findUnique({
    where: { id: "singleton" },
    select: { minAdvanceHours: true },
  });
  const minAdvanceHours = settings?.minAdvanceHours ?? 24;

  // 3. Build slot Date in server local timezone
  const [year, month, day] = input.date.split("-").map(Number);
  const targetDate = new Date(year!, month! - 1, day!);
  const slotStart = timeStringToDate(targetDate, input.time);
  const now = new Date();
  const earliest = new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000);

  if (slotStart < earliest) {
    return {
      ok: false,
      error: `Debes reservar con al menos ${minAdvanceHours}h de anticipación`,
      code: "MIN_ADVANCE",
    };
  }

  // 4. Check day not blocked + schedule exists for that dayOfWeek
  const dayOfWeek = targetDate.getDay();
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const [schedule, exception] = await Promise.all([
    prisma.schedule.findUnique({ where: { dayOfWeek } }),
    prisma.scheduleException.findFirst({
      where: { date: { gte: dayStart, lte: dayEnd } },
    }),
  ]);

  if (exception?.isBlocked) {
    return { ok: false, error: "Ese día no está disponible", code: "DAY_BLOCKED" };
  }
  if (!schedule || !schedule.isActive) {
    return {
      ok: false,
      error: "No atendemos ese día",
      code: "NO_SCHEDULE",
    };
  }

  // 5. Verify slot falls within the schedule window
  const scheduleStart = timeStringToDate(targetDate, schedule.startTime);
  const scheduleEnd = timeStringToDate(targetDate, schedule.endTime);
  const slotEnd = new Date(slotStart.getTime() + service.durationMin * 60 * 1000);

  if (slotStart < scheduleStart || slotEnd > scheduleEnd) {
    return {
      ok: false,
      error: "Horario fuera del rango de atención",
      code: "OUT_OF_RANGE",
    };
  }

  // 6. Transactional create with race-condition protection
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Re-check slot availability inside the transaction (lock-free;
      // worst case: two clients race and one gets a uniqueness violation)
      const existing = await tx.appointment.findMany({
        where: {
          scheduledAt: { gte: dayStart, lte: dayEnd },
          status: { not: AppointmentStatus.CANCELLED },
        },
        select: {
          scheduledAt: true,
          durationMin: true,
          status: true,
        },
      });

      if (!isSlotAvailable({
        scheduledAt: slotStart,
        durationMin: service.durationMin,
        existingAppointments: existing,
      })) {
        throw new Error("SLOT_UNAVAILABLE");
      }

      // Upsert Client by email
      const client = await tx.client.upsert({
        where: { email: input.customer.email },
        create: {
          email: input.customer.email,
          name: input.customer.name,
          phone: input.customer.phone,
        },
        update: {
          name: input.customer.name,
          phone: input.customer.phone,
        },
      });

      const appointment = await tx.appointment.create({
        data: {
          clientId: client.id,
          serviceId: service.id,
          scheduledAt: slotStart,
          durationMin: service.durationMin,
          status: AppointmentStatus.PENDING,
          notes: input.customer.notes,
        },
        select: { id: true },
      });

      return appointment;
    });

    return { ok: true, data: { appointmentId: result.id } };
  } catch (e) {
    if (e instanceof Error && e.message === "SLOT_UNAVAILABLE") {
      return {
        ok: false,
        error: "Ese horario acaba de ser reservado. Elige otro.",
        code: "SLOT_UNAVAILABLE",
      };
    }
    throw e;
  }
}

/**
 * Updates the status of an existing Appointment.
 */
export async function updateAppointmentStatus(
  input: UpdateAppointmentStatusInput,
): Promise<ServiceResult<true>> {
  const existing = await prisma.appointment.findUnique({
    where: { id: input.id },
    select: { id: true, status: true },
  });
  if (!existing) {
    return { ok: false, error: "Cita no encontrada", code: "NOT_FOUND" };
  }

  await prisma.appointment.update({
    where: { id: input.id },
    data: {
      status: input.status as AppointmentStatus,
      cancelReason:
        input.status === "CANCELLED" ? input.cancelReason ?? null : null,
    },
  });

  return { ok: true, data: true };
}

/**
 * Upserts the Schedule for a single dayOfWeek.
 * Schedule has a unique constraint on dayOfWeek, so this is one row.
 */
export async function upsertSchedule(
  input: ScheduleInput,
): Promise<ServiceResult<true>> {
  if (input.endTime <= input.startTime) {
    return {
      ok: false,
      error: "La hora de fin debe ser posterior a la de inicio",
      code: "INVALID_RANGE",
    };
  }

  await prisma.schedule.upsert({
    where: { dayOfWeek: input.dayOfWeek },
    create: input,
    update: input,
  });

  return { ok: true, data: true };
}

export async function deleteSchedule(
  dayOfWeek: number,
): Promise<ServiceResult<true>> {
  await prisma.schedule.delete({ where: { dayOfWeek } }).catch(() => {
    // Idempotent: deleting a non-existent schedule is fine
  });
  return { ok: true, data: true };
}

/**
 * Creates or replaces a ScheduleException for a specific date.
 * Unique constraint on `date`.
 */
export async function upsertScheduleException(
  input: ScheduleExceptionInput,
): Promise<ServiceResult<true>> {
  const [year, month, day] = input.date.split("-").map(Number);
  const date = new Date(year!, month! - 1, day!);

  await prisma.scheduleException.upsert({
    where: { date },
    create: {
      date,
      reason: input.reason,
      isBlocked: input.isBlocked,
    },
    update: {
      reason: input.reason,
      isBlocked: input.isBlocked,
    },
  });

  return { ok: true, data: true };
}

export async function deleteScheduleException(
  dateStr: string,
): Promise<ServiceResult<true>> {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year!, month! - 1, day!);
  await prisma.scheduleException.delete({ where: { date } }).catch(() => {
    // Idempotent
  });
  return { ok: true, data: true };
}