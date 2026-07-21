import { z } from "zod";

// ============================================================================
// COUPONS
// ============================================================================

/**
 * Schema para crear un cupón.
 *
 * Restricciones de negocio (validadas también en la action):
 * - code se normaliza a uppercase antes de validar.
 * - Para PERCENTAGE, value debe estar en (0, 100].
 * - Para FIXED, value debe ser > 0.
 * - validUntil debe ser estrictamente posterior a validFrom.
 */
export const createCouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(4, "Mínimo 4 caracteres")
      .max(32, "Máximo 32 caracteres")
      .regex(/^[A-Z0-9_-]+$/, "Solo letras, números, guión y guión bajo"),
    description: z.object({
      es: z.string().trim().min(1, "Descripción en español requerida").max(200),
      en: z.string().trim().min(1, "Descripción en inglés requerida").max(200),
    }),
    type: z.enum(["PERCENTAGE", "FIXED"], {
      errorMap: () => ({ message: "Tipo debe ser PERCENTAGE o FIXED" }),
    }),
    value: z
      .number()
      .positive("El valor debe ser positivo")
      .finite("El valor debe ser finito"),
    minPurchase: z.number().nonnegative("La compra mínima no puede ser negativa").optional().nullable(),
    maxUses: z.number().int("Debe ser entero").min(1, "Mínimo 1 uso").optional().nullable(),
    validFrom: z.coerce.date({ errorMap: () => ({ message: "Fecha de inicio inválida" }) }),
    validUntil: z.coerce.date({ errorMap: () => ({ message: "Fecha de fin inválida" }) }),
    isActive: z.boolean().default(true),
    serviceIds: z.array(z.string().min(1)).optional().nullable(),
  })
  .refine((data) => data.value <= 100 || data.type !== "PERCENTAGE", {
    message: "El porcentaje no puede ser mayor a 100",
    path: ["value"],
  })
  .refine((data) => data.validUntil.getTime() > data.validFrom.getTime(), {
    message: "La fecha de fin debe ser posterior a la fecha de inicio",
    path: ["validUntil"],
  });

export type CreateCouponInput = z.infer<typeof createCouponSchema>;

/**
 * Schema para editar un cupón. Todos los campos son opcionales excepto el id.
 * Si no se envía code/type/value, se mantienen los valores anteriores (eso lo
 * resuelve la action con un prisma.update explícito por campo).
 */
export const updateCouponSchema = z
  .object({
    id: z.string().min(1),
    description: z
      .object({
        es: z.string().trim().min(1).max(200),
        en: z.string().trim().min(1).max(200),
      })
      .optional(),
    value: z.number().positive().finite().optional(),
    minPurchase: z.number().nonnegative().optional().nullable(),
    maxUses: z.number().int().min(1).optional().nullable(),
    validFrom: z.coerce.date().optional(),
    validUntil: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
    serviceIds: z.array(z.string().min(1)).optional().nullable(),
  })
  .refine(
    (data) =>
      data.validFrom === undefined ||
      data.validUntil === undefined ||
      data.validUntil.getTime() > data.validFrom.getTime(),
    {
      message: "La fecha de fin debe ser posterior a la fecha de inicio",
      path: ["validUntil"],
    },
  );

export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;

/**
 * Schema para los filtros del listado.
 */
export const couponFilterSchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["all", "active", "expired", "exhausted", "inactive"]).default("all"),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(50),
});

export type CouponFilterInput = z.infer<typeof couponFilterSchema>;
