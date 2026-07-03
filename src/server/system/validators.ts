import { z } from "zod";

const urlOrEmpty = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || /^https?:\/\/.+/.test(v),
    { message: "Debe ser una URL válida o estar vacío" },
  )
  .optional()
  .or(z.literal(""));

export const settingsSchema = z.object({
  // Identidad
  siteName: z.string().trim().min(1, "Requerido").max(80),

  // Contacto
  email: z.string().trim().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),

  // Redes sociales (URLs)
  instagram: urlOrEmpty,
  facebook: urlOrEmpty,
  tiktok: urlOrEmpty,
  youtube: urlOrEmpty,

  // SEO
  metaTitle: z.string().trim().max(120).optional().or(z.literal("")),
  metaDesc: z.string().trim().max(300).optional().or(z.literal("")),

  // Toggles de features
  blogEnabled: z.coerce.boolean().default(true),
  offersEnabled: z.coerce.boolean().default(true),
  loyaltyEnabled: z.coerce.boolean().default(true),

  // Políticas
  minAdvanceHours: z.coerce.number().int().min(0).max(720).default(24),
  cancelHours: z.coerce.number().int().min(0).max(720).default(24),

  // Mantenimiento
  maintenanceMode: z.coerce.boolean().default(false),
  maintenanceMessage: z.string().trim().max(500).optional().or(z.literal("")),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;