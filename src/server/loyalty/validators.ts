import { z } from "zod";

// ============================================================================
// LOYALTY
// ============================================================================

/**
 * Razones predefinidas para ajustes manuales de puntos.
 *
 * Se usan en la UI como opciones de select. La action acepta cualquier string
 * no vacío, pero estas son las razones que el admin debería usar con más
 * frecuencia.
 */
export const ADJUSTMENT_REASONS = [
  "gift",
  "correction",
  "complaint",
  "birthday",
  "other",
] as const;

export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number];

/**
 * Schema para crear/editar la regla activa de fidelización.
 *
 * Diseño: solo 1 regla activa a la vez. La action se encarga de desactivar
 * todas las anteriores en la misma transacción. El id es opcional: si está,
 * se actualiza la regla existente; si no, se crea una nueva.
 */
export const upsertLoyaltyRuleSchema = z
  .object({
    id: z.string().min(1).optional(),
    name: z.string().trim().min(1, "Nombre requerido").max(80),
    pointsPerAmount: z
      .number()
      .positive("Debe ser mayor a 0")
      .max(100, "Como máximo 1 punto por cada $0.01"),
    pointsToRedeem: z.number().int().min(1, "Mínimo 1 punto para redimir").max(10_000),
    redeemValue: z.number().positive("El valor de redención debe ser positivo").max(10_000),
  })
  .refine(
    (data) => data.pointsToRedeem * data.redeemValue <= 10_000,
    {
      message:
        "La redención máxima por uso no puede superar $10,000 (ajusta pointsToRedeem o redeemValue)",
      path: ["redeemValue"],
    },
  );

export type UpsertLoyaltyRuleInput = z.infer<typeof upsertLoyaltyRuleSchema>;

/**
 * Schema para ajustar manualmente los puntos de un cliente.
 *
 * El reason es obligatorio para auditoría. type se infiere del signo de points
 * (positivo = EARNED, negativo = REDEEMED, pero la action permite también
 * EARNED explícito para regalos del admin).
 */
export const adjustPointsSchema = z
  .object({
    clientId: z.string().min(1),
    points: z.number().int("Los puntos deben ser enteros"),
    reason: z
      .string()
      .trim()
      .min(3, "La razón debe tener al menos 3 caracteres")
      .max(200, "Máximo 200 caracteres"),
    type: z.enum(["EARNED", "REDEEMED", "ADJUSTED"]).default("ADJUSTED"),
  })
  .refine((data) => data.points !== 0, {
    message: "Los puntos no pueden ser 0",
    path: ["points"],
  });

export type AdjustPointsInput = z.infer<typeof adjustPointsSchema>;
