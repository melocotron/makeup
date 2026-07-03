"use server";

import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn } from "@/server/auth";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
  locale: z.string().optional(),
});

export async function loginAction(formData: FormData) {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    locale: formData.get("locale"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: true,
      redirectTo: `/${parsed.data.locale ?? "es"}/admin`,
    });

    // signIn con redirect:true lanza NEXT_REDIRECT que Next.js maneja
    return { success: true as const };
  } catch (error) {
    // Re-throw de NEXT_REDIRECT para que Next.js haga el redirect
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }

    // Detectar credenciales inválidas específicamente
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { success: false as const, error: "Credenciales inválidas" };
      }
      return { success: false as const, error: "Error de autenticación" };
    }

    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}