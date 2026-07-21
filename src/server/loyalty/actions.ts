"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/server/auth";
import { prisma } from "@/lib/prisma";

import {
  adjustPointsSchema,
  type AdjustPointsInput,
  type UpsertLoyaltyRuleInput,
  upsertLoyaltyRuleSchema,
} from "./validators";

type ActionResult = { success: true; id?: string } | { success: false; error: string };

async function requireAdmin(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "No autenticado" };
  }
  return { success: true };
}

/**
 * Crea o actualiza la regla activa. Como diseñamos 1-solo-activa-a-la-vez,
 * este action desactiva todas las reglas existentes en la misma transacción
 * antes de activar/crear la nueva.
 *
 * Si `input.id` está presente, se actualiza la regla existente (manteniendo
 * su historial de uso). Si no, se crea una nueva.
 */
export async function upsertLoyaltyRuleAction(
  input: UpsertLoyaltyRuleInput,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  const parsed = upsertLoyaltyRuleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "campo"}: ${i.message}`)
        .join(", "),
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Desactivar todas las reglas existentes.
      await tx.loyaltyRule.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      if (parsed.data.id) {
        // Update: reactivamos y actualizamos la regla indicada.
        return tx.loyaltyRule.update({
          where: { id: parsed.data.id },
          data: {
            name: parsed.data.name,
            pointsPerAmount: parsed.data.pointsPerAmount,
            pointsToRedeem: parsed.data.pointsToRedeem,
            redeemValue: parsed.data.redeemValue,
            isActive: true,
          },
          select: { id: true },
        });
      }
      // Create
      return tx.loyaltyRule.create({
        data: {
          name: parsed.data.name,
          pointsPerAmount: parsed.data.pointsPerAmount,
          pointsToRedeem: parsed.data.pointsToRedeem,
          redeemValue: parsed.data.redeemValue,
          isActive: true,
        },
        select: { id: true },
      });
    });

    revalidatePath("/[locale]/admin/loyalty", "page");
    revalidatePath("/[locale]/admin/clients", "page");
    return { success: true, id: result.id };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Error al guardar la regla",
    };
  }
}

/**
 * Ajuste manual de puntos. Crea una LoyaltyTransaction y actualiza el
 * counter en el cliente, todo dentro de una transacción atómica.
 *
 * Si el ajuste es positivo, type se fuerza a EARNED; si es negativo, a
 * REDEEMED. La action también acepta el type explícito (default ADJUSTED)
 * para casos como corrección o regalo sin invoiceId asociado.
 */
export async function adjustPointsAction(
  input: AdjustPointsInput,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  const parsed = adjustPointsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "campo"}: ${i.message}`)
        .join(", "),
    };
  }

  // Si el type no es ADJUSTED, respetamos lo explícito. Si es ADJUSTED (default),
  // inferimos del signo de points.
  const inferredType: "EARNED" | "REDEEMED" | "ADJUSTED" =
    parsed.data.type && parsed.data.type !== "ADJUSTED"
      ? parsed.data.type
      : parsed.data.points > 0
        ? "EARNED"
        : "REDEEMED";

  try {
    await prisma.$transaction(async (tx) => {
      await tx.loyaltyTransaction.create({
        data: {
          clientId: parsed.data.clientId,
          type: inferredType,
          points: parsed.data.points,
          reason: parsed.data.reason,
        },
      });

      await tx.client.update({
        where: { id: parsed.data.clientId },
        data: {
          loyaltyPoints: { increment: parsed.data.points },
        },
      });
    });

    revalidatePath(`/[locale]/admin/clients/${parsed.data.clientId}`, "page");
    revalidatePath("/[locale]/admin/loyalty", "page");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Error al ajustar los puntos",
    };
  }
}
