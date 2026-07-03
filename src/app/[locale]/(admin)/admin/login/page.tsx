import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { Toaster } from "@/components/ui/sonner";
import { auth } from "@/server/auth";

import { LoginForm } from "./login-form";

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

  return <LoginScreen />;
}

function LoginScreen() {
  const tAdmin = useTranslations("admin");
  const tAuth = useTranslations("auth");

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

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>

          <p className="mt-6 text-center text-xs text-on-surface-variant">
            🔒 {tAuth("login.securityNote")}
          </p>
        </div>
      </div>
    </>
  );
}