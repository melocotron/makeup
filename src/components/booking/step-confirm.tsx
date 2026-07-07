"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type ConfirmData = {
  serviceName: string;
  date: string;
  slotDisplay: string;
  durationMin: number;
  customer: {
    name: string;
    email: string;
    phone: string;
    notes?: string;
  };
};

export function StepConfirm({
  data,
  onConfirm,
  onBack,
  submitting,
  error,
}: {
  data: ConfirmData;
  onConfirm: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const t = useTranslations("booking");

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-on-surface">
        {t("step4Title")}
      </h2>

      <Card className="space-y-4 p-5">
        <Row label={t("summary.service")} value={data.serviceName} />
        <Row
          label={t("summary.date")}
          value={formatLongDate(data.date)}
        />
        <Row label={t("summary.time")} value={data.slotDisplay} />
        <Row
          label={t("summary.duration")}
          value={t("duration", { min: data.durationMin })}
        />
        <hr className="border-outline-variant" />
        <Row label={t("summary.name")} value={data.customer.name} />
        <Row label={t("summary.email")} value={data.customer.email} />
        <Row label={t("summary.phone")} value={data.customer.phone} />
        {data.customer.notes && (
          <Row label={t("summary.notes")} value={data.customer.notes} />
        )}
      </Card>

      <p className="text-sm text-on-surface-variant">{t("step4Hint")}</p>

      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack} disabled={submitting}>
          {t("back")}
        </Button>
        <Button type="button" onClick={onConfirm} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("confirming")}
            </>
          ) : (
            t("confirm")
          )}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="text-xs uppercase tracking-wider text-outline sm:w-32">
        {label}
      </span>
      <span className="text-on-surface">{value}</span>
    </div>
  );
}

function formatLongDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}