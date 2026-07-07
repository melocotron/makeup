import "server-only";

import { prisma } from "@/lib/prisma";

import {
  type Slot,
  generateSlotsForDay,
  getLocalDayOfWeek,
} from "./scheduling";

/**
 * Schedules
 */

export async function listSchedules() {
  return prisma.schedule.findMany({
    orderBy: { dayOfWeek: "asc" },
  });
}

export async function getScheduleByDay(dayOfWeek: number) {
  return prisma.schedule.findUnique({
    where: { dayOfWeek },
  });
}

/**
 * Schedule exceptions (blocked dates)
 */

export async function listScheduleExceptions(options?: {
  from?: Date;
  to?: Date;
}) {
  return prisma.scheduleException.findMany({
    where: {
      date: {
        ...(options?.from ? { gte: options.from } : {}),
        ...(options?.to ? { lte: options.to } : {}),
      },
    },
    orderBy: { date: "asc" },
  });
}

export async function getScheduleExceptionByDate(date: Date) {
  // Prisma @db.Date strips time, so compare date-only range
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return prisma.scheduleException.findFirst({
    where: {
      date: {
        gte: start,
        lte: end,
      },
    },
  });
}

/**
 * Appointments
 */

export async function listAppointments(options?: {
  status?: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  from?: Date;
  to?: Date;
}) {
  return prisma.appointment.findMany({
    where: {
      ...(options?.status ? { status: options.status } : {}),
      scheduledAt: {
        ...(options?.from ? { gte: options.from } : {}),
        ...(options?.to ? { lte: options.to } : {}),
      },
    },
    orderBy: { scheduledAt: "asc" },
    include: {
      client: { select: { id: true, name: true, email: true, phone: true } },
      service: {
        select: { id: true, name: true, durationMin: true, basePrice: true },
      },
    },
  });
}

export async function getAppointmentById(id: string) {
  return prisma.appointment.findUnique({
    where: { id },
    include: {
      client: true,
      service: true,
    },
  });
}

export async function getAppointmentsForDate(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return prisma.appointment.findMany({
    where: {
      scheduledAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      client: { select: { id: true, name: true, email: true, phone: true } },
      service: { select: { id: true, name: true, durationMin: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });
}

/**
 * Available slots for a given service on a given date.
 *
 * Orchestrator: loads data from DB and feeds it to the pure
 * `generateSlotsForDay` helper.
 */
export async function getAvailableSlots(
  targetDate: Date,
  serviceId: string,
): Promise<Slot[]> {
  // 1. Service (need durationMin)
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, durationMin: true, isActive: true },
  });
  if (!service || !service.isActive) return [];

  // 2. Settings (need minAdvanceHours)
  const settings = await prisma.settings.findUnique({
    where: { id: "singleton" },
    select: { minAdvanceHours: true },
  });
  const minAdvanceHours = settings?.minAdvanceHours ?? 24;

  // 3. Schedule for that dayOfWeek
  const dayOfWeek = getLocalDayOfWeek(targetDate);
  const schedule = await getScheduleByDay(dayOfWeek);

  // 4. Exception for that date
  const exception = await getScheduleExceptionByDate(targetDate);

  // 5. Existing appointments on that date
  const appointments = await getAppointmentsForDate(targetDate);

  // 6. Generate slots using pure logic
  return generateSlotsForDay({
    targetDate,
    schedule,
    exception,
    appointments,
    durationMin: service.durationMin,
    now: new Date(),
    minAdvanceHours,
  });
}