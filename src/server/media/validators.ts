import { z } from "zod";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB

export const uploadMediaSchema = z.object({
  file: z
    .instanceof(File, { message: "Se requiere un archivo" })
    .refine((file) => file.size > 0, "El archivo está vacío")
    .refine((file) => file.size <= MAX_UPLOAD_SIZE, "El archivo excede 10MB")
    .refine((file) => ALLOWED_MIME_TYPES.includes(file.type as never), "Tipo de archivo no permitido"),
  folder: z.string().optional().default("general"),
  altEs: z.string().optional(),
  altEn: z.string().optional(),
});

export const deleteMediaSchema = z.object({
  id: z.string().min(1),
});

export type UploadMediaInput = z.infer<typeof uploadMediaSchema>;

export { ALLOWED_MIME_TYPES };