import { z } from "zod";

// ============================================================================
// BILLING
// ============================================================================

/**
 * Métodos de pago aceptados en cobros manuales.
 *
 * Mantener alineado con la columna `paymentMethod` en el modelo Invoice
 * (campo String libre). Los valores son case-insensitive en DB, pero
 * siempre lowercase en código.
 */
export const PAYMENT_METHODS = ["efectivo", "transferencia", "otro"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const paymentMethodSchema = z.enum(PAYMENT_METHODS, {
  errorMap: () => ({
    message: "Método de pago inválido (efectivo, transferencia, otro)",
  }),
});

/**
 * Schema para crear una invoice a partir de una cita existente.
 *
 * La action se encarga de:
 * - Verificar que la cita está en estado facturable (CONFIRMED o COMPLETED).
 * - Verificar que la cita no tiene ya una invoice (constraint unique en
 *   appointmentId lo garantiza a nivel DB, pero el check previo da mejor
 *   mensaje de error).
 * - Generar el número de invoice.
 */
export const createInvoiceForAppointmentSchema = z.object({
  appointmentId: z.string().min(1, "ID de cita requerido"),
});

export type CreateInvoiceForAppointmentInput = z.infer<
  typeof createInvoiceForAppointmentSchema
>;

/**
 * Schema para aplicar un cupón a una invoice.
 *
 * `couponCode` se normaliza a uppercase antes de validar (mismo patrón
 * que en promotions).
 */
export const applyCouponToInvoiceSchema = z.object({
  invoiceId: z.string().min(1, "ID de factura requerido"),
  couponCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Código de cupón requerido")
    .max(32, "Código demasiado largo"),
});

export type ApplyCouponToInvoiceInput = z.infer<typeof applyCouponToInvoiceSchema>;

/**
 * Schema para quitar un cupón aplicado a una invoice.
 *
 * Se requiere el `couponUsageId` para evitar borrar usos que no son
 * de esta invoice (defensa en profundidad: la action también lo
 * verifica).
 */
export const removeCouponFromInvoiceSchema = z.object({
  invoiceId: z.string().min(1, "ID de factura requerido"),
  couponUsageId: z.string().min(1, "ID de uso de cupón requerido"),
});

export type RemoveCouponFromInvoiceInput = z.infer<
  typeof removeCouponFromInvoiceSchema
>;

/**
 * Schema para marcar una invoice como pagada.
 *
 * `paidAt` se coerce a Date; si no se envía, la action usa `new Date()`.
 * `notes` es opcional (puede ser el método de pago o una nota libre).
 */
export const markInvoicePaidSchema = z.object({
  invoiceId: z.string().min(1, "ID de factura requerido"),
  paymentMethod: paymentMethodSchema,
  paidAt: z
    .coerce
    .date({ errorMap: () => ({ message: "Fecha de pago inválida" }) })
    .optional()
    .nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type MarkInvoicePaidInput = z.infer<typeof markInvoicePaidSchema>;

/**
 * Schema para cancelar una invoice (PENDING → CANCELLED).
 *
 * `reason` es obligatorio y se almacena en `notes` con un prefijo
 * para auditoría. Mínimo 3 caracteres para evitar motivos vacíos
 * tipo "x" o "-".
 */
export const cancelInvoiceSchema = z.object({
  invoiceId: z.string().min(1, "ID de factura requerido"),
  reason: z
    .string()
    .trim()
    .min(3, "Indica el motivo de cancelación (mínimo 3 caracteres)")
    .max(500, "Máximo 500 caracteres"),
});

export type CancelInvoiceInput = z.infer<typeof cancelInvoiceSchema>;

/**
 * Schema para editar las notas de una invoice.
 *
 * No hay restricción de status: se puede editar incluso en CANCELLED
 * para agregar notas post-cancelación. `notes` puede ser `null` para
 * limpiar el campo.
 */
export const updateInvoiceNotesSchema = z.object({
  invoiceId: z.string().min(1, "ID de factura requerido"),
  notes: z.string().trim().max(1000).nullable(),
});

export type UpdateInvoiceNotesInput = z.infer<typeof updateInvoiceNotesSchema>;

/**
 * Schema para los filtros del listado de invoices.
 *
 * `search` busca en `Invoice.number` o en el nombre/email del cliente
 * asociado (vía la relation). `status` filtra por `InvoiceStatus`.
 * La paginación usa skip/take con límites razonables.
 */
export const invoiceFilterSchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["all", "PENDING", "PAID", "CANCELLED"]).default("all"),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(50),
});

export type InvoiceFilterInput = z.infer<typeof invoiceFilterSchema>;
