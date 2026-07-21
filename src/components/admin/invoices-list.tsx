"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Locale } from "@/i18n/routing";

export type InvoiceStatus = "PENDING" | "PAID" | "CANCELLED";

export type InvoiceRow = {
  id: string;
  number: string;
  status: InvoiceStatus;
  clientName: string;
  appointmentDate: string;
  total: number;
  paidAt: string | null;
};

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function InvoicesList({ invoices }: { invoices: InvoiceRow[] }) {
  const t = useTranslations("admin.billing");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale() as Locale;
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) params.set("q", search);
      else params.delete("q");
      router.replace(`/${locale}/admin/facturas?${params.toString()}`);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("tableSearch")}
            className="pl-10"
          />
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low py-12 text-center">
          <p className="text-sm font-semibold text-on-surface">
            {t("empty.noInvoices")}
          </p>
          <p className="mt-1 max-w-sm text-xs text-on-surface-variant">
            {t("empty.noInvoicesDesc")}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.number")}</TableHead>
                <TableHead>{t("table.client")}</TableHead>
                <TableHead>{t("table.date")}</TableHead>
                <TableHead className="text-right">{t("table.total")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link
                      href={`/${locale}/admin/facturas/${inv.id}`}
                      className="block"
                    >
                      {inv.number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-on-surface-variant">
                    <Link
                      href={`/${locale}/admin/facturas/${inv.id}`}
                      className="block"
                    >
                      {inv.clientName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs text-on-surface-variant">
                    {new Date(inv.appointmentDate).toLocaleDateString(locale, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {new Intl.NumberFormat(locale, {
                      style: "currency",
                      currency: "USD",
                    }).format(inv.total)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[inv.status]}`}
                    >
                      {t(`status.${inv.status}`)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-on-surface-variant">
        {tCommon("total")}: {invoices.length}
      </p>
    </div>
  );
}
