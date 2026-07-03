"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { packageSchema } from "./validators";

export async function createPackageAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { success: false as const, error: "No autenticado" };

  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  let items: unknown[] = [];
  try {
    items = JSON.parse((raw.items as string) || "[]");
  } catch {
    return { success: false as const, error: "Error al parsear items" };
  }
  raw.items = items;
  raw.isActive = raw.isActive === "true" || raw.isActive === true;

  const parsed = packageSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
    };
  }

  const data = parsed.data;
  try {
    const pkg = await prisma.package.create({
      data: {
        slug: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: { es: data.nameEs, en: data.nameEn },
        description: { es: data.descriptionEs ?? "", en: data.descriptionEn ?? "" },
        totalPrice: data.totalPrice,
        image: data.image || null,
        order: data.order,
        isActive: data.isActive,
        items: {
          create: data.items.map((it) => ({
            serviceId: it.serviceId,
            quantity: it.quantity,
          })),
        },
      },
    });

    revalidatePath("/[locale]/admin/packages", "page");
    return { success: true as const, id: pkg.id };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Error al crear",
    };
  }
}

export async function updatePackageAction(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) return { success: false as const, error: "No autenticado" };

  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  let items: unknown[] = [];
  try {
    items = JSON.parse((raw.items as string) || "[]");
  } catch {
    return { success: false as const, error: "Error al parsear items" };
  }
  raw.items = items;
  raw.isActive = raw.isActive === "true" || raw.isActive === true;

  const parsed = packageSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
    };
  }

  const data = parsed.data;
  try {
    await prisma.$transaction([
      prisma.package.update({
        where: { id },
        data: {
          name: { es: data.nameEs, en: data.nameEn },
          description: { es: data.descriptionEs ?? "", en: data.descriptionEn ?? "" },
          totalPrice: data.totalPrice,
          image: data.image || null,
          order: data.order,
          isActive: data.isActive,
        },
      }),
      prisma.packageItem.deleteMany({ where: { packageId: id } }),
      prisma.packageItem.createMany({
        data: data.items.map((it) => ({
          packageId: id,
          serviceId: it.serviceId,
          quantity: it.quantity,
        })),
      }),
    ]);

    revalidatePath("/[locale]/admin/packages", "page");
    revalidatePath(`/[locale]/admin/packages/${id}`, "page");
    return { success: true as const };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Error al actualizar",
    };
  }
}

export async function deletePackageAction(id: string) {
  const session = await auth();
  if (!session?.user) return { success: false as const, error: "No autenticado" };

  try {
    await prisma.package.delete({ where: { id } });
    revalidatePath("/[locale]/admin/packages", "page");
    return { success: true as const };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Error al eliminar",
    };
  }
}

export async function togglePackageActiveAction(id: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user) return { success: false as const, error: "No autenticado" };

  try {
    await prisma.package.update({ where: { id }, data: { isActive } });
    revalidatePath("/[locale]/admin/packages", "page");
    return { success: true as const };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Error al actualizar",
    };
  }
}