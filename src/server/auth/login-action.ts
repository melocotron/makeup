"use server";

import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn } from "@/server/auth";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
  locale: z.string().optional(),
  callbackUrl: z.string().optional(),
});

function sanitizeCallbackUrl(raw: string | undefined, locale: string): string {
  const fallback = `/${locale}/admin`;

  if (!raw) return fallback;

  // Solo permitir paths internos admin (previene open redirect)
  if (raw.startsWith(`/${locale}/admin`)) {
    return raw;
  }

  // Si viene sin locale prefix, agregarlo
  if (raw.startsWith("/admin/")) {
    return `/${locale}${raw}`;
  }

  return fallback;
}

export async function loginAction(formData: FormData) {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    locale: formData.get("locale"),
    callbackUrl: formData.get("callbackUrl"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const locale = parsed.data.locale ?? "es";
  const callbackUrl = sanitizeCallbackUrl(
    parsed.data.callbackUrl ?? undefined,
    locale,
  );

  try {
    // redirect: false → signIn NO lanza NEXT_REDIRECT, devuelve resultado
    // y setea la cookie de sesión via Set-Cookie en la response
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    // Si llegamos aquí, login fue exitoso
    return { success: true as const, callbackUrl };
  } catch (error) {
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