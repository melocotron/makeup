"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SlotData = {
  start: string; // ISO
  displayTime: string; // "HH:mm"
  available: boolean;
};

export function StepDatetime({
  serviceId,
  serviceName,
  onConfirm,
  onBack,
}: {
  serviceId: string;
  serviceName: string;
  onConfirm: (date: string, slot: SlotData) => void;
  onBack: () => void;
}) {
  const t = useTranslations("booking");
  const [monthStart, setMonthStart] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [slots, setSlots] = useState<SlotData[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const days = useMemo(() => buildMonthGrid(monthStart), [monthStart]);

  // Load slots when date selected
  useEffect(() => {
    if (!selectedDate) {
      setSlots(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/booking/slots?serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(selectedDate)}`,
        );
        if (!res.ok) throw new Error("Failed to fetch slots");
        const data = (await res.json()) as { slots: SlotData[] };
        if (!cancelled) setSlots(data.slots);
      } catch (err) {
        if (!cancelled) {
          setError(t("errors.loadFailed"));
          setSlots([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedDate, serviceId, t]);

  const monthLabel = useMemo(
    () =>
      monthStart.toLocaleDateString("es-ES", {
        month: "long",
        year: "numeric",
      }),
    [monthStart],
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-outline">{t("step2Service")}</p>
        <h2 className="text-2xl font-semibold text-on-surface">{serviceName}</h2>
      </div>

      {/* Calendar */}
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              setMonthStart(
                new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1),
              )
            }
            className="cursor-pointer rounded p-1 hover:bg-surface-container"
            aria-label={t("prevMonth")}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold capitalize text-on-surface">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() =>
              setMonthStart(
                new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1),
              )
            }
            className="cursor-pointer rounded p-1 hover:bg-surface-container"
            aria-label={t("nextMonth")}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-outline">
          {["D", "L", "M", "X", "J", "V", "S"].map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const dateStr = day ? formatDateISO(day) : "";
            const isPast = day ? day < today : false;
            const isSelected = dateStr === selectedDate;
            return (
              <div key={i} className="aspect-square">
                {day ? (
                  <button
                    type="button"
                    disabled={isPast}
                    onClick={() => setSelectedDate(dateStr)}
                    className={cn(
                      "h-full w-full rounded text-sm transition-colors",
                      isPast
                        ? "cursor-not-allowed text-outline/40"
                        : "cursor-pointer hover:bg-primary/10",
                      isSelected && "bg-primary text-on-primary hover:bg-primary",
                    )}
                  >
                    {day.getDate()}
                  </button>
                ) : (
                  <div />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Slots */}
      {selectedDate && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-on-surface">
            {t("availableSlots")}
          </h3>
          {loading ? (
            <div className="flex items-center gap-2 text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loading")}
            </div>
          ) : error ? (
            <p className="text-sm text-error">{error}</p>
          ) : !slots || slots.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              {t("noSlotsForDay")}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {slots.map((slot) => (
                <Button
                  key={slot.start}
                  type="button"
                  variant={slot.available ? "outline" : "ghost"}
                  disabled={!slot.available}
                  onClick={() => slot.available && onConfirm(selectedDate, slot)}
                  className="w-full"
                >
                  {slot.displayTime}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-start">
        <Button type="button" variant="ghost" onClick={onBack}>
          {t("back")}
        </Button>
      </div>
    </div>
  );
}

function buildMonthGrid(monthStart: Date): (Date | null)[] {
  const firstDay = monthStart.getDay(); // 0=Sun
  const lastDate = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
  ).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= lastDate; d++) {
    cells.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}