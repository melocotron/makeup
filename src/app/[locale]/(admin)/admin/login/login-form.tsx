"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/server/auth/login-action";
import type { Locale } from "@/i18n/routing";

function createLoginSchema(t: (key: string) => string) {
  return z.object({
    email: z.string().email({ message: t("login.invalidEmail") }),
    password: z.string().min(1, { message: t("login.passwordRequired") }),
  });
}

type LoginFormData = {
  email: string;
  password: string;
};

export function LoginForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || `/${locale}/admin`;

  const loginSchema = React.useMemo(() => createLoginSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginFormData) {
    try {
      const formData = new FormData();
      formData.append("email", data.email);
      formData.append("password", data.password);
      formData.append("locale", locale);
      formData.append("callbackUrl", callbackUrl);

      const result = await loginAction(formData);

      if (!result.success) {
        toast.error(result.error);
        setError("password", { message: result.error });
        return;
      }

      toast.success(t("login.welcomeBack"));
      router.push(callbackUrl);
      router.refresh();
    } catch {
      // NEXT_REDIRECT se lanza cuando el login es exitoso y el redirect
      // empieza a procesarse. Next.js lo maneja automáticamente.
      toast.success(t("login.welcomeBack"));
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="admin@radiant-beauty.local"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-error" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">{t("login.password")}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-error" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {tCommon("loading")}
          </>
        ) : (
          tCommon("submit")
        )}
      </Button>
    </form>
  );
}