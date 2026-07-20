"use client";

import { useTranslations } from "next-intl";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ClientHistoryRow = {
  id: string;
  scheduledAt: string;
  durationMin: number;
  status: string;
  serviceName: string;
  servicePrice: number;
};

const STATUS_BADGES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  NO_SHOW: "bg-gray-100 text-gray-800",
};

export function ClientHistory({ items }: { items: ClientHistoryRow[] }) {
  const t = useTranslations("admin.clients.history");

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-6 text-center text-sm text-on-surface-variant">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("date")}</TableHead>
            <TableHead>{t("service")}</TableHead>
            <TableHead className="text-right">{t("duration")}</TableHead>
            <TableHead className="text-right">{t("price")}</TableHead>
            <TableHead>{t("status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                {new Date(a.scheduledAt).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}{" "}
                ·{" "}
                {new Date(a.scheduledAt).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </TableCell>
              <TableCell className="font-medium">{a.serviceName}</TableCell>
              <TableCell className="text-right tabular-nums">
                {a.durationMin} min
              </TableCell>
              <TableCell className="text-right tabular-nums">
                ${a.servicePrice.toFixed(2)}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    STATUS_BADGES[a.status] ?? "bg-gray-100 text-gray-800"
                  }`}
                >
                  {a.status}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
