"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn } from "@/server/auth";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
  locale: z.string().nullish(),
  callbackUrl: z.string().nullish(),
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

export type LoginActionResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Server Action que autentica al admin y redirige atómicamente.
 *
 * - En éxito, `signIn({ redirect: true, redirectTo: callbackUrl })` lanza
 *   NEXT_REDIRECT que Next.js intercepta. La cookie de sesión y la
 *   redirección van en la misma response, sin race conditions.
 * - En error, redirigimos a /login?error=... para que el cliente muestre
 *   el mensaje.
 *
 * Esta action se usa desde <form action={loginFormAction}>, así que
 * funciona sin JavaScript (progressive enhancement).
 */
export async function loginFormAction(formData: FormData): Promise<void> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    locale: formData.get("locale"),
    callbackUrl: formData.get("callbackUrl"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const locale = (raw.locale as string) ?? "es";
    redirect(`/${locale}/admin/login?error=${encodeURIComponent("Datos inválidos")}`);
  }

  const locale = parsed.data.locale ?? "es";
  const callbackUrl = sanitizeCallbackUrl(
    parsed.data.callbackUrl ?? undefined,
    locale,
  );

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const message =
        error.type === "CredentialsSignin"
          ? "Credenciales inválidas"
          : "Error de autenticación";
      redirect(`/${locale}/admin/login?error=${encodeURIComponent(message)}`);
    }
    // Si es NEXT_REDIRECT, re-lanzarlo para que Next.js complete la nav.
    if (error && typeof error === "object" && "digest" in error) {
      const digest = String((error as { digest?: unknown }).digest);
      if (digest.startsWith("NEXT_REDIRECT")) {
        throw error;
      }
    }
    redirect(
      `/${locale}/admin/login?error=${encodeURIComponent("Error desconocido")}`,
    );
  }
}

/**
 * Variante cliente del action. Devuelve un objeto con success/error en
 * vez de redirigir, para que el cliente pueda mostrar toasts y manejar
 * el flujo JS.
 */
export async function loginAction(
  formData: FormData,
): Promise<LoginActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    locale: formData.get("locale"),
    callbackUrl: formData.get("callbackUrl"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const locale = parsed.data.locale ?? "es";
  const callbackUrl = sanitizeCallbackUrl(
    parsed.data.callbackUrl ?? undefined,
    locale,
  );

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { success: false, error: "Credenciales inválidas" };
      }
      return { success: false, error: "Error de autenticación" };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}