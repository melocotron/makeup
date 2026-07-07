"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import {
  deleteScheduleExceptionAction,
  upsertScheduleExceptionAction,
} from "@/server/booking/actions";

export type ExceptionRow = {
  date: string; // YYYY-MM-DD
  reason: string | null;
  isBlocked: boolean;
};

export function ScheduleExceptionsManager({
  initialExceptions,
  locale,
}: {
  initialExceptions: ExceptionRow[];
  locale: string;
}) {
  const t = useTranslations("admin.schedule");
  const [items, setItems] = useState<ExceptionRow[]>(initialExceptions);
  const [pending, startTransition] = useTransition();

  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [newBlocked, setNewBlocked] = useState(true);

  function dateToInputString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function formatDate(iso: string): string {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y!, m! - 1, d!).toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  async function handleAdd() {
    if (!newDate) {
      toast.error(t("dateRequired"));
      return;
    }
    startTransition(async () => {
      const result = await upsertScheduleExceptionAction({
        date: newDate,
        reason: newReason || undefined,
        isBlocked: newBlocked,
      });
      if (result.ok) {
        setItems((prev) => {
          const filtered = prev.filter((i) => i.date !== newDate);
          return [
            ...filtered,
            {
              date: newDate,
              reason: newReason || null,
              isBlocked: newBlocked,
            },
          ].sort((a, b) => a.date.localeCompare(b.date));
        });
        setNewDate("");
        setNewReason("");
        setNewBlocked(true);
        toast.success(t("saved"));
      } else {
        toast.error(result.error);
      }
    });
  }

  async function handleDelete(date: string) {
    if (!confirm(t("confirmDeleteException"))) return;
    startTransition(async () => {
      const result = await deleteScheduleExceptionAction(date);
      if (result.ok) {
        setItems((prev) => prev.filter((i) => i.date !== date));
        toast.success(t("deleted"));
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-semibold text-on-surface">
          {t("addException")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="ex-date" className="text-xs">
              {t("date")}
            </Label>
            <Input
              id="ex-date"
              type="date"
              value={newDate}
              min={dateToInputString(new Date())}
              onChange={(e) => setNewDate(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="ex-reason" className="text-xs">
              {t("reason")}
            </Label>
            <Input
              id="ex-reason"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              maxLength={200}
              disabled={pending}
              placeholder={t("reasonPlaceholder")}
            />
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="ex-blocked"
                checked={newBlocked}
                onCheckedChange={setNewBlocked}
                disabled={pending}
              />
              <Label htmlFor="ex-blocked" className="text-sm">
                {t("blockDay")}
              </Label>
            </div>
            <Button type="button" disabled={pending} onClick={handleAdd}>
              {t("add")}
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-on-surface">
          {t("existingExceptions")}
        </h2>
        {items.length === 0 ? (
          <p className="text-sm text-on-surface-variant">{t("noExceptions")}</p>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <Card
                key={it.date}
                className="flex items-center justify-between p-3"
              >
                <div>
                  <div className="font-medium text-on-surface capitalize">
                    {formatDate(it.date)}
                  </div>
                  {it.reason && (
                    <div className="text-sm text-outline">{it.reason}</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      it.isBlocked
                        ? "text-xs uppercase text-error"
                        : "text-xs uppercase text-outline"
                    }
                  >
                    {it.isBlocked ? t("blocked") : t("unblocked")}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(it.date)}
                    disabled={pending}
                    className="text-error"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}