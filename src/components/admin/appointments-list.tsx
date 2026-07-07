"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Calendar, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import {
  updateAppointmentStatusAction,
} from "@/server/booking/actions";

export type AppointmentListItem = {
  id: string;
  scheduledAt: string; // ISO
  durationMin: number;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  notes: string | null;
  client: { id: string; name: string; email: string; phone: string | null };
  service: { id: string; name: Record<string, string>; durationMin: number };
};

const STATUS_FILTERS = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];

export function AppointmentsList({
  initialData,
  locale,
}: {
  initialData: AppointmentListItem[];
  locale: string;
}) {
  const t = useTranslations("admin.appointments");
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [items, setItems] = useState(initialData);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const now = new Date();
    const upcoming = items
      .filter((a) => filter === "ALL" || a.status === filter)
      .filter((a) => new Date(a.scheduledAt) >= now || a.status === "PENDING")
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    const past = items
      .filter((a) => new Date(a.scheduledAt) < now && a.status !== "PENDING")
      .filter((a) => filter === "ALL" || a.status === filter)
      .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
      .slice(0, 20);
    return { upcoming, past };
  }, [items, filter]);

  async function handleQuickAction(
    id: string,
    status: AppointmentListItem["status"],
  ) {
    startTransition(async () => {
      const result = await updateAppointmentStatusAction({ id, status });
      if (result.ok) {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status } : i)),
        );
      }
    });
  }

  function statusBadge(status: AppointmentListItem["status"]) {
    const map: Record<AppointmentListItem["status"], string> = {
      PENDING: "bg-yellow-100 text-yellow-900",
      CONFIRMED: "bg-green-100 text-green-900",
      COMPLETED: "bg-blue-100 text-blue-900",
      CANCELLED: "bg-gray-100 text-gray-900",
      NO_SHOW: "bg-red-100 text-red-900",
    };
    return (
      <Badge variant="secondary" className={cn("uppercase", map[status])}>
        {t(`status.${status}`)}
      </Badge>
    );
  }

  function formatRow(a: AppointmentListItem) {
    const d = new Date(a.scheduledAt);
    return `${d.toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })} · ${d.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  function pickLocalized(name: Record<string, string>) {
    return name[locale] ?? name.es ?? name.en ?? "—";
  }

  return (
    <div className="space-y-6">
      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            variant={filter === s ? "default" : "outline"}
            onClick={() => setFilter(s)}
            className="uppercase"
          >
            {s === "ALL" ? t("filterAll") : t(`status.${s}`)}
          </Button>
        ))}
      </div>

      {/* Upcoming */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-on-surface">
          <Calendar className="h-5 w-5" />
          {t("upcoming")}
          {pending && <Loader2 className="h-4 w-4 animate-spin text-outline" />}
        </h2>
        {filtered.upcoming.length === 0 ? (
          <p className="text-sm text-on-surface-variant">{t("noUpcoming")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-outline-variant">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("when")}</TableHead>
                  <TableHead>{t("client")}</TableHead>
                  <TableHead>{t("service")}</TableHead>
                  <TableHead>{t("statusLabel")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.upcoming.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {formatRow(a)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{a.client.name}</div>
                        <div className="text-outline">{a.client.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{pickLocalized(a.service.name)}</TableCell>
                    <TableCell>{statusBadge(a.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {a.status === "PENDING" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() => handleQuickAction(a.id, "CONFIRMED")}
                          >
                            {t("confirm")}
                          </Button>
                        )}
                        {(a.status === "PENDING" || a.status === "CONFIRMED") && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={pending}
                            onClick={() => handleQuickAction(a.id, "CANCELLED")}
                          >
                            {t("cancel")}
                          </Button>
                        )}
                        <Button asChild type="button" size="sm" variant="ghost">
<Link href={`/${locale}/admin/appointments/${a.id}`}>
                            {t("view")}
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Past */}
      {filtered.past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-on-surface">
            {t("recent")}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-outline-variant">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("when")}</TableHead>
                  <TableHead>{t("client")}</TableHead>
                  <TableHead>{t("service")}</TableHead>
                  <TableHead>{t("statusLabel")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.past.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap text-on-surface-variant">
                      {formatRow(a)}
                    </TableCell>
                    <TableCell className="text-sm">{a.client.name}</TableCell>
                    <TableCell className="text-sm">
                      {pickLocalized(a.service.name)}
                    </TableCell>
                    <TableCell>{statusBadge(a.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild type="button" size="sm" variant="ghost">
                        <Link href={`/${locale}/admin/citas/${a.id}`}>
                          {t("view")}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}