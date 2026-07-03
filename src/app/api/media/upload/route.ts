import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/server/auth";
import { processAndStoreImage, ALLOWED_MIME_TYPES, MAX_UPLOAD_SIZE } from "@/server/media/upload";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Tipo no permitido: ${file.type}. Usa JPEG, PNG, WebP o AVIF.` },
      { status: 415 },
    );
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ error: "Archivo excede 10MB" }, { status: 413 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Archivo vacío" }, { status: 400 });
  }

  try {
    const folder = (formData.get("folder") as string) || "general";
    const altEs = (formData.get("altEs") as string) || null;
    const altEn = (formData.get("altEn") as string) || null;

    const processed = await processAndStoreImage(file, folder);

    const altJson =
      altEs || altEn ? { es: altEs ?? "", en: altEn ?? "" } : null;

    const media = await prisma.media.create({
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

    return NextResponse.json({
      id: media.id,
      url: media.url,
      filename: media.filename,
      mimeType: media.mimeType,
      size: media.size,
      width: media.width,
      height: media.height,
      folder: media.folder,
      createdAt: media.createdAt,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al procesar imagen" },
      { status: 500 },
    );
  }
}