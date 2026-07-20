import { z } from "zod";

// ---------- CREATE ----------
export const createClientSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email inválido")
    .max(254, "Email demasiado largo"),
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres"),
  phone: z
    .string()
    .trim()
    .min(8, "Mínimo 8 caracteres")
    .max(20, "Máximo 20 caracteres"),
  notes: z.string().trim().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

// ---------- UPDATE ----------
export const updateClientSchema = createClientSchema.extend({
  id: z.string().min(1),
});

export type UpdateClientInput = z.infer<typeof updateClientSchema>;

// Form data shape (after FormData parsing)
export type ClientFormData = {
  id?: string;
  email: string;
  name: string;
  phone: string;
  notes?: string;
};
