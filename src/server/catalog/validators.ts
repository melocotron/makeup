import { z } from "zod";

// ---------- SERVICE ----------
export const extraInputSchema = z.object({
  nameEs: z.string().trim().min(1, "Nombre requerido").max(100),
  nameEn: z.string().trim().min(1, "Name required").max(100),
  price: z.coerce.number().min(0).max(99999.99),
});

export const serviceSchema = z.object({
  nameEs: z.string().trim().min(1, "Nombre requerido").max(150),
  nameEn: z.string().trim().min(1, "Name required").max(150),
  descriptionEs: z.string().trim().max(2000).optional().or(z.literal("")),
  descriptionEn: z.string().trim().max(2000).optional().or(z.literal("")),
  durationMin: z.coerce
    .number()
    .int("Duración debe ser entero")
    .min(5, "Mínimo 5 minutos")
    .max(480, "Máximo 8 horas"),
  basePrice: z.coerce.number().min(0, "Precio no puede ser negativo").max(99999.99),
  image: z.string().optional().or(z.literal("")),
  category: z.string().trim().max(50).optional().or(z.literal("")),
  order: z.coerce.number().int().min(0).default(0),
  isActive: z.coerce.boolean().default(true),
  extras: z.array(extraInputSchema).default([]),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;

// ---------- PACKAGE ----------
export const packageItemSchema = z.object({
  serviceId: z.string().min(1, "Selecciona un servicio"),
  quantity: z.coerce.number().int().min(1).max(10),
});

export const packageSchema = z.object({
  nameEs: z.string().trim().min(1, "Nombre requerido").max(150),
  nameEn: z.string().trim().min(1, "Name required").max(150),
  descriptionEs: z.string().trim().max(2000).optional().or(z.literal("")),
  descriptionEn: z.string().trim().max(2000).optional().or(z.literal("")),
  totalPrice: z.coerce.number().min(0).max(99999.99),
  image: z.string().optional().or(z.literal("")),
  order: z.coerce.number().int().min(0).default(0),
  isActive: z.coerce.boolean().default(true),
  items: z.array(packageItemSchema).min(1, "Agrega al menos un servicio"),
});

export type PackageFormData = z.infer<typeof packageSchema>;