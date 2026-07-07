"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { updateAppointmentStatusAction } from "@/server/booking/actions";

export type AppointmentDetail = {
  id: string;
  scheduledAt: string;
  durationMin: number;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  notes: string | null;
  internalNotes: string | null;
  cancelReason: string | null;
  client: { id: string; name: string; email: string; phone: string | null };
  service: { id: string; name: Record<string, string>; durationMin: number };
};

export function AppointmentDetailView({
  appointment,
  locale,
}: {
  appointment: AppointmentDetail;
  locale: string;
}) {
  const t = useTranslations("admin.appointments");
  const router = useRouter();
  const [status, setStatus] = useState(appointment.status);
  const [cancelReason, setCancelReason] = useState(
    appointment.cancelReason ?? "",
  );
  const [pending, startTransition] = useTransition();

  function pickLocalized(name: Record<string, string>) {
    return name[locale] ?? name.es ?? name.en ?? "—";
  }

  function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function changeStatus(next: AppointmentDetail["status"]) {
    if (next === status) return;
    if (next === "CANCELLED" && !cancelReason.trim()) {
      toast.error(t("cancelReasonRequired"));
      return;
    }
    startTransition(async () => {
      const result = await updateAppointmentStatusAction({
        id: appointment.id,
        status: next,
        cancelReason: next === "CANCELLED" ? cancelReason : undefined,
      });
      if (result.ok) {
        setStatus(next);
        toast.success(t("statusUpdated"));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const statusColor: Record<AppointmentDetail["status"], string> = {
    PENDING: "bg-yellow-100 text-yellow-900",
    CONFIRMED: "bg-green-100 text-green-900",
    COMPLETED: "bg-blue-100 text-blue-900",
    CANCELLED: "bg-gray-100 text-gray-900",
    NO_SHOW: "bg-red-100 text-red-900",
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-on-surface">
            {pickLocalized(appointment.service.name)}
          </h2>
          <Badge
            variant="secondary"
            className={cn("uppercase", statusColor[status])}
          >
            {t(`status.${status}`)}
          </Badge>
        </div>
        <Row label={t("when")} value={formatDateTime(appointment.scheduledAt)} />
        <Row label={t("duration")} value={t("durationMin", { min: appointment.durationMin })} />
        <hr className="border-outline-variant" />
        <Row label={t("client")} value={appointment.client.name} />
        <Row label={t("email")} value={appointment.client.email} />
        {appointment.client.phone && (
          <Row label={t("phone")} value={appointment.client.phone} />
        )}
        {appointment.notes && (
          <>
            <hr className="border-outline-variant" />
            <Row label={t("clientNotes")} value={appointment.notes} />
          </>
        )}
        {appointment.cancelReason && (
          <>
            <hr className="border-outline-variant" />
            <Row
              label={t("cancelReason")}
              value={appointment.cancelReason}
            />
          </>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <h3 className="text-lg font-semibold text-on-surface">
          {t("changeStatus")}
        </h3>

        {status === "PENDING" && (
          <Button
            type="button"
            disabled={pending}
            onClick={() => changeStatus("CONFIRMED")}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("confirm")}
          </Button>
        )}

        {(status === "PENDING" || status === "CONFIRMED") && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface">
                {t("cancelReasonLabel")}
              </label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                placeholder={t("cancelReasonPlaceholder")}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => changeStatus("CANCELLED")}
              >
                {t("cancel")}
              </Button>
              {new Date(appointment.scheduledAt) < new Date() && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => changeStatus("COMPLETED")}
                  >
                    {t("markCompleted")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => changeStatus("NO_SHOW")}
                  >
                    {t("markNoShow")}
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </Card>
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