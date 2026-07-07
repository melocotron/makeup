"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function BookingSuccess({ appointmentId }: { appointmentId?: string }) {
  const t = useTranslations("booking.success");
  return (
    <div className="mx-auto max-w-md space-y-6 py-12 text-center">
      <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
      <h2 className="text-3xl font-semibold text-on-surface">{t("title")}</h2>
      <p className="text-on-surface-variant">{t("message")}</p>
      {appointmentId && (
        <p className="text-sm text-outline">
          {t("reference", { id: appointmentId })}
        </p>
      )}
      <div className="flex justify-center gap-3">
        <Button asChild>
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </div>
    </div>
  );
}