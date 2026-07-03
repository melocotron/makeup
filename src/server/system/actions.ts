"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { auth } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { settingsSchema } from "./validators";

export async function updateSettingsAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false as const, error: "No autenticado" };
  }

  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  // Checkboxes: si no vienen, son false (FormData no incluye unchecked)
  const toBool = (v: unknown) => v === "true" || v === true;
  raw.blogEnabled = toBool(raw.blogEnabled);
  raw.offersEnabled = toBool(raw.offersEnabled);
  raw.loyaltyEnabled = toBool(raw.loyaltyEnabled);
  raw.maintenanceMode = toBool(raw.maintenanceMode);

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
    };
  }

  const data = parsed.data;

  try {
    await prisma.settings.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        siteName: data.siteName,
        email: data.email || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        address: data.address || null,
        instagram: data.instagram || null,
        facebook: data.facebook || null,
        tiktok: data.tiktok || null,
        youtube: data.youtube || null,
        metaTitle: data.metaTitle ? data.metaTitle : Prisma.JsonNull,
        metaDesc: data.metaDesc ? data.metaDesc : Prisma.JsonNull,
        blogEnabled: data.blogEnabled,
        offersEnabled: data.offersEnabled,
        loyaltyEnabled: data.loyaltyEnabled,
        minAdvanceHours: data.minAdvanceHours,
        cancelHours: data.cancelHours,
        maintenanceMode: data.maintenanceMode,
        maintenanceMessage: data.maintenanceMessage || null,
      },
      update: {
        siteName: data.siteName,
        email: data.email || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        address: data.address || null,
        instagram: data.instagram || null,
        facebook: data.facebook || null,
        tiktok: data.tiktok || null,
        youtube: data.youtube || null,
        metaTitle: data.metaTitle ? data.metaTitle : Prisma.JsonNull,
        metaDesc: data.metaDesc ? data.metaDesc : Prisma.JsonNull,
        blogEnabled: data.blogEnabled,
        offersEnabled: data.offersEnabled,
        loyaltyEnabled: data.loyaltyEnabled,
        minAdvanceHours: data.minAdvanceHours,
        cancelHours: data.cancelHours,
        maintenanceMode: data.maintenanceMode,
        maintenanceMessage: data.maintenanceMessage || null,
      },
    });

    revalidatePath("/[locale]", "layout");

    return { success: true as const };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Error al guardar",
    };
  }
}