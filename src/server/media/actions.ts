"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/server/auth";

import { listMedia, deleteMedia as deleteMediaQuery } from "./queries";
import { processAndStoreImage, ALLOWED_MIME_TYPES, MAX_UPLOAD_SIZE } from "./upload";

export async function uploadMediaAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false as const, error: "No autenticado" };
  }

  const file = formData.get("file");
  const folder = (formData.get("folder") as string) || "general";
  const altEs = (formData.get("altEs") as string) || null;
  const altEn = (formData.get("altEn") as string) || null;

  if (!(file instanceof File)) {
    return { success: false as const, error: "No se envió archivo" };
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { success: false as const, error: `Tipo no permitido: ${file.type}` };
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    return { success: false as const, error: "Archivo excede 10MB" };
  }

  try {
    const processed = await processAndStoreImage(file, folder);

    const altJson =
      altEs || altEn
        ? { es: altEs ?? "", en: altEn ?? "" }
        : null;

    const media = await (
      await import("@/lib/prisma")
    ).prisma.media.create({
      data: {
        filename: file.name,
        url: processed.url,
        mimeType: processed.mimeType,
        size: processed.size,
        width: processed.width,
        height: processed.height,
        alt: altJson ?? undefined,
        folder,
        uploadedById: session.user.id,
      },
    });

    revalidatePath("/[locale]/admin/media", "page");

    return {
      success: true as const,
      media: {
        id: media.id,
        url: media.url,
        filename: media.filename,
        width: media.width,
        height: media.height,
        size: media.size,
      },
    };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Error al procesar imagen",
    };
  }
}

export async function deleteMediaAction(id: string) {
  const session = await auth();
  if (!session?.user) {
    return { success: false as const, error: "No autenticado" };
  }

  try {
    await deleteMediaQuery(id);
    revalidatePath("/[locale]/admin/media", "page");
    return { success: true as const };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Error al eliminar",
    };
  }
}

export async function listMediaAction(options: Parameters<typeof listMedia>[0]) {
  const session = await auth();
  if (!session?.user) {
    return { items: [], total: 0, page: 1, pageSize: 24, totalPages: 0 };
  }
  return listMedia(options);
}