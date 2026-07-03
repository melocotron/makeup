import "server-only";

import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import sharp from "sharp";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

export interface ProcessedImage {
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  storedFilename: string;
  relativePath: string;
}

export async function processAndStoreImage(
  file: File,
  folder: string = "general",
): Promise<ProcessedImage> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(`Tipo no permitido: ${file.type}`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Obtener metadatos originales con sharp (esto valida que el archivo es imagen real)
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height) {
    throw new Error("No se pudo leer la imagen");
  }

  // Optimizar: resize a max 1920px y convertir a webp
  const optimized = await sharp(buffer)
    .rotate() // respeta EXIF orientation
    .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  const optimizedMeta = await sharp(optimized).metadata();

  // Generar estructura de carpetas por año/mes
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const safeFolder = folder.replace(/[^a-z0-9-_]/gi, "").toLowerCase() || "general";
  const dir = path.join(UPLOADS_ROOT, year, month, safeFolder);

  await mkdir(dir, { recursive: true });

  const uuid = randomUUID();
  const storedFilename = `${uuid}.webp`;
  const fullPath = path.join(dir, storedFilename);

  await writeFile(fullPath, optimized);

  // URL pública
  const url = `/uploads/${year}/${month}/${safeFolder}/${storedFilename}`;

  return {
    filename: file.name,
    url,
    mimeType: "image/webp",
    size: optimized.length,
    width: optimizedMeta.width ?? meta.width,
    height: optimizedMeta.height ?? meta.height,
    storedFilename,
    relativePath: path.join(year, month, safeFolder, storedFilename),
  };
}

export async function deleteImageFile(relativePath: string): Promise<void> {
  // Sanitizar para evitar path traversal
  const safePath = relativePath.replace(/\.\./g, "").replace(/^\/+/, "");
  const fullPath = path.join(UPLOADS_ROOT, safePath);
  if (fullPath.startsWith(UPLOADS_ROOT)) {
    try {
      await unlink(fullPath);
    } catch {
      // Archivo no existe, ignorar
    }
  }
}

export { ALLOWED_MIME_TYPES, MAX_UPLOAD_SIZE, EXT_BY_MIME, UPLOADS_ROOT };