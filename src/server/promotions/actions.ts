"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/server/auth";
import { prisma } from "@/lib/prisma";

import {
  createCouponSchema,
  updateCouponSchema,
  type CreateCouponInput,
  type UpdateCouponInput,
} from "./validators";

type ActionResult<T = void> =
  | { success: true; data?: T; id?: string }
  | { success: false; error: string };

async function requireAdmin(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "No autenticado" };
  }
  return { success: true };
}

/**
 * serviceIds se guarda como JSON string en la DB (campo String? en schema).
 * Si la lista está vacía o null, guardamos null (cupón aplica a todos los servicios).
 */
function serializeServiceIds(serviceIds: string[] | null | undefined): string | null {
  if (!serviceIds || serviceIds.length === 0) return null;
  return JSON.stringify(serviceIds);
}

/**
 * Crea un cupón. El code se normaliza a uppercase.
 */
export async function createCouponAction(
  input: CreateCouponInput,
): Promise<ActionResult<string>> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  const parsed = createCouponSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "campo"}: ${i.message}`)
        .join(", "),
    };
  }

  const existing = await prisma.coupon.findUnique({
    where: { code: parsed.data.code },
    select: { id: true },
  });
  if (existing) {
    return {
      success: false,
      error: `Ya existe un cupón con el código ${parsed.data.code}`,
    };
  }

  try {
    const coupon = await prisma.coupon.create({
      data: {
        code: parsed.data.code,
        description: parsed.data.description,
        type: parsed.data.type,
        value: parsed.data.value,
        minPurchase: parsed.data.minPurchase ?? null,
        maxUses: parsed.data.maxUses ?? null,
        validFrom: parsed.data.validFrom,
        validUntil: parsed.data.validUntil,
        isActive: parsed.data.isActive,
        serviceIds: serializeServiceIds(parsed.data.serviceIds),
      },
      select: { id: true },
    });

    revalidatePath("/[locale]/admin/promotions", "page");
    return { success: true, id: coupon.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al crear el cupón",
    };
  }
}

/**
 * Actualiza un cupón existente. Solo se modifican los campos provistos.
 * `code` y `type` no son editables después de la creación (mantiene
 * auditoría simple).
 */
export async function updateCouponAction(
  input: UpdateCouponInput,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  const parsed = updateCouponSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "campo"}: ${i.message}`)
        .join(", "),
    };
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.value !== undefined) data.value = parsed.data.value;
  if (parsed.data.minPurchase !== undefined) data.minPurchase = parsed.data.minPurchase;
  if (parsed.data.maxUses !== undefined) data.maxUses = parsed.data.maxUses;
  if (parsed.data.validFrom !== undefined) data.validFrom = parsed.data.validFrom;
  if (parsed.data.validUntil !== undefined) data.validUntil = parsed.data.validUntil;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
  if (parsed.data.serviceIds !== undefined) {
    data.serviceIds = serializeServiceIds(parsed.data.serviceIds);
  }

  if (Object.keys(data).length === 0) {
    return { success: false, error: "Nada que actualizar" };
  }

  try {
    await prisma.coupon.update({
      where: { id: parsed.data.id },
      data,
    });

    revalidatePath("/[locale]/admin/promotions", "page");
    revalidatePath(`/[locale]/admin/promotions/${parsed.data.id}`, "page");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al actualizar el cupón",
    };
  }
}

/**
 * Desactivación lógica. Preserva el histórico de usos.
 */
export async function deactivateCouponAction(id: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  try {
    await prisma.coupon.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/[locale]/admin/promotions", "page");
    revalidatePath(`/[locale]/admin/promotions/${id}`, "page");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al desactivar el cupón",
    };
  }
}

/**
 * Hard delete. Solo permitido si el cupón nunca se ha usado.
 */
export async function deleteCouponAction(id: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  const coupon = await prisma.coupon.findUnique({
    where: { id },
    select: { usedCount: true, code: true },
  });
  if (!coupon) {
    return { success: false, error: "Cupón no encontrado" };
  }
  if (coupon.usedCount > 0) {
    return {
      success: false,
      error: `No se puede eliminar: el cupón ${coupon.code} ya se usó ${coupon.usedCount} vez/veces. Usa desactivar en su lugar.`,
    };
  }

  try {
    await prisma.coupon.delete({ where: { id } });

    revalidatePath("/[locale]/admin/promotions", "page");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al eliminar el cupón",
    };
  }
}
