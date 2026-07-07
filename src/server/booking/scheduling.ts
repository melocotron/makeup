import "server-only";

import { AppointmentStatus } from "@prisma/client";

/**
 * Pure scheduling logic for booking slots.
 *
 * NO database access here — all functions accept data as parameters so
 * they can be unit-tested in isolation. The DB-touching orchestrator
 * (`getAvailableSlots`) lives in this same file but is the only one
 * that touches Prisma.
 */

export type Slot = {
  /** UTC start of the slot */
  start: Date;
  /** UTC end of the slot (start + serviceDurationMin) */
  end: Date;
  /** "HH:mm" formatted in the server's local timezone, for display */
  displayTime: string;
  /** True if the slot can be booked */
  available: boolean;
};

export type ScheduleLike = {
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  isActive: boolean;
} | null;

export type ExceptionLike = {
  isBlocked: boolean;
  reason: string | null;
} | null;

export type AppointmentLike = {
  scheduledAt: Date;
  durationMin: number;
  status: AppointmentStatus;
};

/**
 * Pure interval overlap check.
 * Two intervals overlap when each starts before the other ends.
 */
export function doIntervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Parses "HH:mm" + a reference date into a Date object
 * in the SERVER'S local timezone.
 */
export function timeStringToDate(date: Date, time: string): Date {
  const parts = time.split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Formats a Date as "HH:mm" in the server's local timezone.
 */
export function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Returns the day-of-week (0=Sun, 6=Sat) of the given date
 * in the server's local timezone.
 */
export function getLocalDayOfWeek(date: Date): number {
  return date.getDay();
}

/**
 * Returns true iff `target` is on the same calendar day as `reference`,
 * in the server's local timezone.
 */
export function isSameLocalDay(target: Date, reference: Date): boolean {
  return (
    target.getFullYear() === reference.getFullYear() &&
    target.getMonth() === reference.getMonth() &&
    target.getDate() === reference.getDate()
  );
}

/**
 * Generates all slots for a single day given schedule + exceptions + bookings.
 *
 * Pure function: no I/O, deterministic given inputs.
 *
 * @param targetDate     any Date that falls on the day we want slots for (local)
 * @param schedule       Schedule entry for that dayOfWeek, or null if no schedule
 * @param exception      ScheduleException for that exact date, or null
 * @param appointments   Existing appointments on that date (any status)
 * @param durationMin    Service duration in minutes
 * @param now            Current time (used to enforce minAdvanceHours)
 * @param minAdvanceHours Minimum hours of advance required
 * @param slotIntervalMin Slot granularity (default 30)
 */
export function generateSlotsForDay(args: {
  targetDate: Date;
  schedule: ScheduleLike;
  exception: ExceptionLike;
  appointments: AppointmentLike[];
  durationMin: number;
  now: Date;
  minAdvanceHours: number;
  slotIntervalMin?: number;
}): Slot[] {
  const {
    targetDate,
    schedule,
    exception,
    appointments,
    durationMin,
    now,
    minAdvanceHours,
    slotIntervalMin = 30,
  } = args;

  // Blocked day → no slots
  if (exception?.isBlocked) return [];

  // No schedule or inactive → no slots
  if (!schedule || !schedule.isActive) return [];

  // Parse window: schedule.startTime .. schedule.endTime
  const dayStart = timeStringToDate(targetDate, schedule.startTime);
  const dayEnd = timeStringToDate(targetDate, schedule.endTime);

  // Earliest allowed slot: now + minAdvanceHours
  const earliest = new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000);

  // Build slot grid
  const slots: Slot[] = [];
  const slotMs = slotIntervalMin * 60 * 1000;
  const durationMs = durationMin * 60 * 1000;

  for (
    let cursor = new Date(dayStart);
    cursor.getTime() + durationMs <= dayEnd.getTime();
    cursor = new Date(cursor.getTime() + slotMs)
  ) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(slotStart.getTime() + durationMs);

    // Available iff (a) past earliest allowed, (b) no overlap with existing
    const passesAdvance = slotStart >= earliest;
    const hasOverlap = appointments.some(
      (a) =>
        a.status !== AppointmentStatus.CANCELLED &&
        doIntervalsOverlap(
          slotStart,
          slotEnd,
          a.scheduledAt,
          new Date(a.scheduledAt.getTime() + a.durationMin * 60 * 1000),
        ),
    );

    slots.push({
      start: slotStart,
      end: slotEnd,
      displayTime: formatTime(slotStart),
      available: passesAdvance && !hasOverlap,
    });
  }

  return slots;
}

/**
 * Returns true iff a proposed slot is still bookable.
 * Use this for double-booking protection when creating an Appointment.
 *
 * @param excludeId  Optional appointment id to exclude (for updates)
 */
export function isSlotAvailable(args: {
  scheduledAt: Date;
  durationMin: number;
  existingAppointments: AppointmentLike[];
  excludeId?: string;
}): boolean {
  const { scheduledAt, durationMin, existingAppointments, excludeId } = args;
  const slotEnd = new Date(scheduledAt.getTime() + durationMin * 60 * 1000);

  return !existingAppointments.some((a) => {
    if (a.status === AppointmentStatus.CANCELLED) return false;
    if (excludeId && "id" in a && a.id === excludeId) return false;
    const aEnd = new Date(a.scheduledAt.getTime() + a.durationMin * 60 * 1000);
    return doIntervalsOverlap(scheduledAt, slotEnd, a.scheduledAt, aEnd);
  });
}