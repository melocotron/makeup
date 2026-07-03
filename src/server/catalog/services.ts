"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { serviceSchema } from "./validators";

export async function createServiceAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { success: false as const, error: "No autenticado" };

  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  // Parse extras JSON
  let extras: unknown[] = [];
  try {
    extras = JSON.parse((raw.extras as string) || "[]");
  } catch {
    return { success: false as const, error: "Error al parsear extras" };
  }
  raw.extras = extras;
  raw.isActive = raw.isActive === "true" || raw.isActive === true;

  const parsed = serviceSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
    };
  }

  const data = parsed.data;
  try {
    const service = await prisma.service.create({
      data: {
        slug: `svc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: { es: data.nameEs, en: data.nameEn },
        description: {
          es: data.descriptionEs ?? "",
          en: data.descriptionEn ?? "",
        },
        durationMin: data.durationMin,
        basePrice: data.basePrice,
        image: data.image || null,
        category: data.category || null,
        order: data.order,
        isActive: data.isActive,
        extras: {
          create: data.extras.map((e) => ({
            name: { es: e.nameEs, en: e.nameEn },
            price: e.price,
            isActive: true,
          })),
        },
      },
    });

    revalidatePath("/[locale]/admin/servicios", "page");
    return { success: true as const, id: service.id };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Error al crear",
    };
  }
}

export async function updateServiceAction(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) return { success: false as const, error: "No autenticado" };

  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  let extras: unknown[] = [];
  try {
    extras = JSON.parse((raw.extras as string) || "[]");
  } catch {
    return { success: false as const, error: "Error al parsear extras" };
  }
  raw.extras = extras;
  raw.isActive = raw.isActive === "true" || raw.isActive === true;

  const parsed = serviceSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
    };
  }

  const data = parsed.data;
  try {
    await prisma.$transaction([
      prisma.service.update({
        where: { id },
        data: {
          name: { es: data.nameEs, en: data.nameEn },
          description: { es: data.descriptionEs ?? "", en: data.descriptionEn ?? "" },
          durationMin: data.durationMin,
          basePrice: data.basePrice,
          image: data.image || null,
          category: data.category || null,
          order: data.order,
          isActive: data.isActive,
        },
      }),
      prisma.serviceExtra.deleteMany({ where: { serviceId: id } }),
      ...(data.extras.length > 0
        ? [
            prisma.serviceExtra.createMany({
              data: data.extras.map((e) => ({
                serviceId: id,
                name: { es: e.nameEs, en: e.nameEn },
                price: e.price,
                isActive: true,
              })),
            }),
          ]
        : []),
    ]);

    revalidatePath("/[locale]/admin/servicios", "page");
    revalidatePath(`/[locale]/admin/servicios/${id}`, "page");
    return { success: true as const };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Error al actualizar",
    };
  }
}

export async function deleteServiceAction(id: string) {
  const session = await auth();
  if (!session?.user) return { success: false as const, error: "No autenticado" };

  try {
    await prisma.service.delete({ where: { id } });
    revalidatePath("/[locale]/admin/servicios", "page");
    return { success: true as const };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Error al eliminar",
    };
  }
}

export async function toggleServiceActiveAction(id: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user) return { success: false as const, error: "No autenticado" };

  try {
    await prisma.service.update({ where: { id }, data: { isActive } });
    revalidatePath("/[locale]/admin/servicios", "page");
    return { success: true as const };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Error al actualizar",
    };
  }
}