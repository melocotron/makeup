"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { carouselSlideSchema, type CarouselSlideFormData } from "./validators";

export async function listCarouselSlides() {
  return prisma.homeCarousel.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });
}

export async function getCarouselSlideById(id: string) {
  return prisma.homeCarousel.findUnique({ where: { id } });
}

export async function createSlideAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false as const, error: "No autenticado" };
  }

  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  raw.isActive = raw.isActive === "true" || raw.isActive === true;

  const parsed = carouselSlideSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
    };
  }

  try {
    const data: CarouselSlideFormData = parsed.data;
    const slide = await prisma.homeCarousel.create({
      data: {
        image: data.image,
        title: { es: data.titleEs, en: data.titleEn },
        subtitle:
          data.subtitleEs || data.subtitleEn
            ? { es: data.subtitleEs ?? "", en: data.subtitleEn ?? "" }
            : undefined,
        ctaLabel:
          data.ctaLabelEs || data.ctaLabelEn
            ? { es: data.ctaLabelEs ?? "", en: data.ctaLabelEn ?? "" }
            : undefined,
        ctaUrl: data.ctaUrl || null,
        order: data.order,
        isActive: data.isActive,
      },
    });
    revalidatePath("/[locale]/admin/contenido/inicio", "page");
    revalidatePath("/[locale]", "page"); // también el home público
    return { success: true as const, id: slide.id };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Error al crear",
    };
  }
}

export async function updateSlideAction(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false as const, error: "No autenticado" };
  }

  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  raw.isActive = raw.isActive === "true" || raw.isActive === true;

  const parsed = carouselSlideSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
    };
  }

  try {
    const data: CarouselSlideFormData = parsed.data;
    await prisma.homeCarousel.update({
      where: { id },
      data: {
        image: data.image,
        title: { es: data.titleEs, en: data.titleEn },
        subtitle:
          data.subtitleEs || data.subtitleEn
            ? { es: data.subtitleEs ?? "", en: data.subtitleEn ?? "" }
            : undefined,
        ctaLabel:
          data.ctaLabelEs || data.ctaLabelEn
            ? { es: data.ctaLabelEs ?? "", en: data.ctaLabelEn ?? "" }
            : undefined,
        ctaUrl: data.ctaUrl || null,
        order: data.order,
        isActive: data.isActive,
      },
    });
    revalidatePath("/[locale]/admin/contenido/inicio", "page");
    revalidatePath("/[locale]", "page");
    return { success: true as const };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Error al actualizar",
    };
  }
}

export async function deleteSlideAction(id: string) {
  const session = await auth();
  if (!session?.user) {
    return { success: false as const, error: "No autenticado" };
  }

  try {
    await prisma.homeCarousel.delete({ where: { id } });
    revalidatePath("/[locale]/admin/contenido/inicio", "page");
    revalidatePath("/[locale]", "page");
    return { success: true as const };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Error al eliminar",
    };
  }
}

export async function toggleSlideActiveAction(id: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user) {
    return { success: false as const, error: "No autenticado" };
  }

  try {
    await prisma.homeCarousel.update({
      where: { id },
      data: { isActive },
    });
    revalidatePath("/[locale]/admin/contenido/inicio", "page");
    revalidatePath("/[locale]", "page");
    return { success: true as const };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Error al actualizar",
    };
  }
}