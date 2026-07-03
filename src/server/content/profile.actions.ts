"use server";

import { Prisma } from "@prisma/client";

import { auth } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { aboutContentSchema } from "./validators";

export async function updateAboutContentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false as const, error: "No autenticado" };
  }

  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  const parsed = aboutContentSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
    };
  }

  const data = parsed.data;

  try {
    await prisma.aboutContent.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        bio: data.bioEs || data.bioEn
          ? { es: data.bioEs ?? "", en: data.bioEn ?? "" }
          : Prisma.JsonNull,
        signatureText: data.signatureText || null,
        image: data.image || null,
      },
      update: {
        bio: data.bioEs || data.bioEn
          ? { es: data.bioEs ?? "", en: data.bioEn ?? "" }
          : Prisma.JsonNull,
        signatureText: data.signatureText || null,
        image: data.image || null,
      },
    });

    return { success: true as const };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Error al guardar",
    };
  }
}