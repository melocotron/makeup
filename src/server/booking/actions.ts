"use server";

import { revalidatePath } from "next/cache";

import {
  type CreateAppointmentInput,
  createAppointmentSchema,
  type ScheduleExceptionInput,
  type ScheduleInput,
  type UpdateAppointmentStatusInput,
  scheduleExceptionSchema,
  scheduleSchema,
  updateAppointmentStatusSchema,
} from "./validators";

import {
  createAppointment,
  deleteSchedule,
  deleteScheduleException,
  updateAppointmentStatus,
  upsertSchedule,
  upsertScheduleException,
} from "./services";

// ============================================================================
// Public-facing
// ============================================================================

export async function createAppointmentAction(input: CreateAppointmentInput) {
  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION",
    };
  }
  return createAppointment(parsed.data);
}

// ============================================================================
// Admin: appointments
// ============================================================================

export async function updateAppointmentStatusAction(
  input: UpdateAppointmentStatusInput,
) {
  const parsed = updateAppointmentStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION",
    };
  }
  const result = await updateAppointmentStatus(parsed.data);
  if (result.ok) {
    revalidatePath("/[locale]/admin/appointments", "page");
    revalidatePath("/[locale]/admin", "page");
  }
  return result;
}

// ============================================================================
// Admin: schedules
// ============================================================================

export async function upsertScheduleAction(input: ScheduleInput) {
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION",
    };
  }
  const result = await upsertSchedule(parsed.data);
  if (result.ok) {
    revalidatePath("/[locale]/admin/horarios", "page");
  }
  return result;
}

export async function deleteScheduleAction(dayOfWeek: number) {
  const result = await deleteSchedule(dayOfWeek);
  if (result.ok) {
    revalidatePath("/[locale]/admin/horarios", "page");
  }
  return result;
}

// ============================================================================
// Admin: schedule exceptions
// ============================================================================

export async function upsertScheduleExceptionAction(input: ScheduleExceptionInput) {
  const parsed = scheduleExceptionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION",
    };
  }
  const result = await upsertScheduleException(parsed.data);
  if (result.ok) {
    revalidatePath("/[locale]/admin/horarios/bloqueos", "page");
    revalidatePath("/[locale]/admin/horarios", "page");
  }
  return result;
}

export async function deleteScheduleExceptionAction(dateStr: string) {
  const result = await deleteScheduleException(dateStr);
  if (result.ok) {
    revalidatePath("/[locale]/admin/horarios/bloqueos", "page");
  }
  return result;
}