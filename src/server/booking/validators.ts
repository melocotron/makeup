import { z } from "zod";

/**
 * Date format: "YYYY-MM-DD"
 */
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)");

/**
 * Time format: "HH:mm" (24h)
 */
const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:mm)");

/**
 * Customer details captured during the booking wizard.
 * No foreign key to Client — clients are created on the fly
 * (or matched by email) in the create-appointment transaction.
 */
const customerSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "Máximo 100 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z
    .string()
    .min(8, "Teléfono inválido")
    .regex(/^[\d\s+()\-]{8,}$/, "Solo dígitos, espacios y +"),
  notes: z.string().max(500, "Máximo 500 caracteres").optional(),
});

export const createAppointmentSchema = z.object({
  serviceId: z.string().min(1, "Servicio requerido"),
  date: dateStringSchema,
  time: timeStringSchema,
  customer: customerSchema,
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

/**
 * Admin: change appointment status (with optional cancel reason).
 */
export const updateAppointmentStatusSchema = z
  .object({
    id: z.string().min(1),
    status: z.enum([
      "PENDING",
      "CONFIRMED",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ]),
    cancelReason: z.string().max(200).optional(),
  })
  .refine(
    (data) =>
      data.status !== "CANCELLED" ||
      (data.cancelReason && data.cancelReason.trim().length > 0),
    {
      message: "Indica el motivo de cancelación",
      path: ["cancelReason"],
    },
  );

export type UpdateAppointmentStatusInput = z.infer<
  typeof updateAppointmentStatusSchema
>;

/**
 * Admin: edit appointment internal notes / customer details.
 */
export const updateAppointmentSchema = z.object({
  id: z.string().min(1),
  internalNotes: z.string().max(2000).optional(),
  notes: z.string().max(500).optional(),
  customer: customerSchema.partial().optional(),
});

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

/**
 * Admin: schedule per day-of-week.
 * endTime must be after startTime (validated in service layer).
 */
export const scheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: timeStringSchema,
  endTime: timeStringSchema,
  isActive: z.boolean(),
});

export type ScheduleInput = z.infer<typeof scheduleSchema>;

/**
 * Admin: block a specific date.
 */
export const scheduleExceptionSchema = z.object({
  date: dateStringSchema,
  reason: z.string().max(200).optional(),
  isBlocked: z.boolean(),
});

export type ScheduleExceptionInput = z.infer<typeof scheduleExceptionSchema>;