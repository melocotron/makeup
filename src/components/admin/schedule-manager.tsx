"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import {
  deleteScheduleAction,
  upsertScheduleAction,
} from "@/server/booking/actions";

export type ScheduleRow = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

const DAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ScheduleManager({
  initialSchedules,
  locale,
}: {
  initialSchedules: ScheduleRow[];
  locale: string;
}) {
  const t = useTranslations("admin.schedule");
  const [schedules, setSchedules] = useState<Map<number, ScheduleRow>>(
    () => new Map(initialSchedules.map((s) => [s.dayOfWeek, s])),
  );
  const [pending, startTransition] = useTransition();

  const days = locale === "es" ? DAYS_ES : DAYS_EN;

  function getOrDefault(dayOfWeek: number): ScheduleRow {
    return (
      schedules.get(dayOfWeek) ?? {
        dayOfWeek,
        startTime: "09:00",
        endTime: "18:00",
        isActive: false,
      }
    );
  }

  function update(dayOfWeek: number, patch: Partial<ScheduleRow>) {
    const cur = getOrDefault(dayOfWeek);
    const next = { ...cur, ...patch };
    if (next.endTime <= next.startTime && patch.startTime) {
      toast.error(t("invalidRange"));
      return;
    }
    setSchedules(new Map(schedules).set(dayOfWeek, next));
  }

  async function save(dayOfWeek: number) {
    const row = getOrDefault(dayOfWeek);
    startTransition(async () => {
      const result = await upsertScheduleAction(row);
      if (result.ok) {
        toast.success(t("saved"));
      } else {
        toast.error(result.error);
      }
    });
  }

  async function remove(dayOfWeek: number) {
    if (!confirm(t("confirmDelete"))) return;
    startTransition(async () => {
      const result = await deleteScheduleAction(dayOfWeek);
      if (result.ok) {
        const next = new Map(schedules);
        next.delete(dayOfWeek);
        setSchedules(next);
        toast.success(t("deleted"));
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {days.map((dayName, idx) => {
        const row = getOrDefault(idx);
        const exists = schedules.has(idx);
        return (
          <Card key={idx} className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-on-surface">{dayName}</h3>
              <div className="flex items-center gap-2">
                <Label htmlFor={`active-${idx}`} className="text-xs text-outline">
                  {t("active")}
                </Label>
                <Switch
                  id={`active-${idx}`}
                  checked={row.isActive}
                  onCheckedChange={(checked) => update(idx, { isActive: checked })}
                  disabled={pending}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor={`start-${idx}`} className="text-xs">
                  {t("from")}
                </Label>
                <Input
                  id={`start-${idx}`}
                  type="time"
                  value={row.startTime}
                  onChange={(e) => update(idx, { startTime: e.target.value })}
                  disabled={pending}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`end-${idx}`} className="text-xs">
                  {t("to")}
                </Label>
                <Input
                  id={`end-${idx}`}
                  type="time"
                  value={row.endTime}
                  onChange={(e) => update(idx, { endTime: e.target.value })}
                  disabled={pending}
                />
              </div>
            </div>
            <div className="flex justify-between gap-2">
              {exists && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => remove(idx)}
                  className="text-error"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => save(idx)}
                className="ml-auto"
              >
                {t("save")}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}