import { z } from "zod";

// ---------- ABOUT CONTENT (Perfil) ----------
export const aboutContentSchema = z.object({
  bioEs: z.string().trim().max(2000).optional().or(z.literal("")),
  bioEn: z.string().trim().max(2000).optional().or(z.literal("")),
  signatureText: z.string().trim().max(200).optional().or(z.literal("")),
  image: z.string().optional().or(z.literal("")),
});

export type AboutContentFormData = z.infer<typeof aboutContentSchema>;

// ---------- CREDENTIALS (Preparación) ----------
export const credentialSchema = z.object({
  titleEs: z.string().trim().min(1, "Título requerido").max(150),
  titleEn: z.string().trim().min(1, "Title required").max(150),
  institution: z.string().trim().min(1, "Institución requerida").max(150),
  year: z.coerce
    .number()
    .int()
    .min(1900, "Año inválido")
    .max(new Date().getFullYear(), "El año no puede ser futuro")
    .optional()
    .or(z.literal("")),
  image: z.string().optional().or(z.literal("")),
  order: z.coerce.number().int().min(0).default(0),
});

export type CredentialFormData = z.infer<typeof credentialSchema>;

// ---------- HOME CAROUSEL ----------
export const carouselSlideSchema = z.object({
  image: z.string().min(1, "Imagen requerida"),
  titleEs: z.string().trim().min(1, "Título requerido").max(150),
  titleEn: z.string().trim().min(1, "Title required").max(150),
  subtitleEs: z.string().trim().max(300).optional().or(z.literal("")),
  subtitleEn: z.string().trim().max(300).optional().or(z.literal("")),
  ctaLabelEs: z.string().trim().max(50).optional().or(z.literal("")),
  ctaLabelEn: z.string().trim().max(50).optional().or(z.literal("")),
  ctaUrl: z
    .string()
    .trim()
    .refine(
      (v) =>
        v === "" ||
        /^https?:\/\/.+/.test(v) ||
        /^\/(es|en)\//.test(v),
      { message: "Debe ser URL absoluta (http/https) o path interno (/es/...)" },
    )
    .optional()
    .or(z.literal("")),
  order: z.coerce.number().int().min(0).default(0),
  isActive: z.coerce.boolean().default(true),
});

export type CarouselSlideFormData = z.infer<typeof carouselSlideSchema>;