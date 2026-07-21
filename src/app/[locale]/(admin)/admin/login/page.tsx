import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@/server/auth";
import { loginFormAction } from "@/server/auth/login-action";

import { LoginSubmitButton } from "./login-form";

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Si ya hay sesión, redirigir al dashboard
  const session = await auth();
  if (session) {
    redirect(`/${locale}/admin`);
  }

  return (
    <Suspense fallback={null}>
      <LoginScreen locale={locale} />
    </Suspense>
  );
}

async function LoginScreen({ locale }: { locale: string }) {
  const tAdmin = await getTranslations("admin");
  const tAuth = await getTranslations("auth");
  const callbackUrl = `/${locale}/admin`;

  return (
    <>
      <Toaster />
      <div className="flex min-h-screen items-center justify-center bg-surface-container-low px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-[var(--shadow-level-2)]">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-on-primary">
              <span className="font-display text-xl">R</span>
            </div>
            <h1 className="font-display text-headline-lg text-on-surface">{tAdmin("title")}</h1>
            <p className="mt-2 text-sm text-on-surface-variant">{tAuth("login.signInPrompt")}</p>
          </div>

          <form action={loginFormAction} className="space-y-4">
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <input type="hidden" name="locale" value={locale} />

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="admin@radiant-beauty.local"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">{tAuth("login.password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </div>

            <LoginSubmitButton />
          </form>

          <p className="mt-6 text-center text-xs text-on-surface-variant">
            🔒 {tAuth("login.securityNote")}
          </p>
        </div>
      </div>
    </>
  );
}